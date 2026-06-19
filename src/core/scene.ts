import { EventPatch, EventType, RowType } from "../types";
import sortEvents from "../helpers/sort-events";
import { assignLanes, LaneResult, rowMinHeight } from "./lanes";
import { Geometry, DEFAULT_GEOMETRY } from "./geometry";

export type { EventPatch };

type RowIndex = {
  row: RowType;
  // both arrays kept sorted with helpers/sort-events
  events: EventType[];
  staticEvents: EventType[];
  lanesDirty: boolean;
  lanes: LaneResult | null;
  // window the cached lanes were computed for (lanes depend on visibility)
  laneWindowStart: number;
  laneWindowEnd: number;
};

const binaryInsertIndex = (events: EventType[], event: EventType) => {
  let lo = 0;
  let hi = events.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortEvents(events[mid], event) < 0) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
};

/**
 * Imperative event store for the canvas renderer. Lives outside React state:
 * streaming patches mutate it directly and the renderer reads from it per
 * frame — React never reconciles individual event motion.
 *
 * Lane assignment (and therefore row height) is computed lazily per row, only
 * when that row is queried for the current window. Bursts of patches against
 * off-screen rows cost nothing beyond an index update.
 */
export class SceneStore {
  private rowIndexes = new Map<string, RowIndex>();
  private rowOrder: string[] = [];
  private eventRow = new Map<string, string>();
  // Group index for tag-based "connected" selection. eventGroup: eventId ->
  // groupId; groupMembers: groupId -> set of eventIds. Maintained alongside
  // eventRow so Cmd/Ctrl+click resolves the whole group in O(group size)
  // without scanning all rows.
  private eventGroup = new Map<string, string>();
  private groupMembers = new Map<string, Set<string>>();
  private listeners = new Set<() => void>();
  // Themeable vertical layout. Lanes are geometry-free (pure time logic), so a
  // geometry change only affects heights/offsets — the cached lanes stay valid
  // and we just bump to trigger a redraw.
  private geometry: Geometry = DEFAULT_GEOMETRY;
  // Per-row minimum height demanded by the (DOM-measured) row label when it
  // wraps to multiple lines. Measured in the shell and fed back here so the
  // canvas grid/dividers, hit-testing and the DOM header all agree on height.
  private labelMinHeights = new Map<string, number>();
  version = 0;

  setGeometry(geometry: Geometry) {
    this.geometry = geometry;
    this.bump();
  }

  getGeometry(): Geometry {
    return this.geometry;
  }

  setRows(rows: RowType[]) {
    const next = new Map<string, RowIndex>();
    for (const row of rows) {
      const existing = this.rowIndexes.get(row.id);
      next.set(
        row.id,
        existing
          ? { ...existing, row }
          : {
              row,
              events: [],
              staticEvents: [],
              lanesDirty: true,
              lanes: null,
              laneWindowStart: NaN,
              laneWindowEnd: NaN,
            }
      );
    }
    // events of removed rows drop with their index
    for (const [id, rowId] of this.eventRow) {
      if (!next.has(rowId)) {
        this.eventRow.delete(id);
        this.removeFromGroup(id);
      }
    }
    this.rowIndexes = next;
    this.rowOrder = rows.map((row) => row.id);
    this.bump();
  }

  setEvents(events: EventType[]) {
    for (const index of this.rowIndexes.values()) {
      index.events = [];
      index.lanesDirty = true;
    }
    this.eventRow.clear();
    this.eventGroup.clear();
    this.groupMembers.clear();
    for (const event of events) {
      const index = this.rowIndexes.get(event.rowId);
      if (!index) continue;
      index.events.push(event);
      this.eventRow.set(event.id, event.rowId);
      this.addToGroup(event.id, event.props?.groupId);
    }
    for (const index of this.rowIndexes.values()) {
      index.events.sort(sortEvents);
    }
    this.bump();
  }

  setStaticEvents(events: EventType[]) {
    for (const index of this.rowIndexes.values()) {
      index.staticEvents = [];
    }
    for (const event of events) {
      const index = this.rowIndexes.get(event.rowId);
      if (!index) continue;
      index.staticEvents.push(event);
    }
    for (const index of this.rowIndexes.values()) {
      index.staticEvents.sort(sortEvents);
    }
    this.bump();
  }

  applyPatches(patches: EventPatch[]) {
    for (const patch of patches) {
      if (patch.op === "upsert") {
        this.remove(patch.event.id);
        this.insert(patch.event);
      } else if (patch.op === "update") {
        const existing = this.getEvent(patch.id);
        if (!existing) continue;
        this.remove(patch.id);
        this.insert({ ...existing, ...patch.changes, id: patch.id });
      } else {
        this.remove(patch.id);
      }
    }
    this.bump();
  }

  getEvent(id: string): EventType | undefined {
    const rowId = this.eventRow.get(id);
    if (rowId === undefined) return undefined;
    return this.rowIndexes
      .get(rowId)
      ?.events.find((event) => event.id === id);
  }

  /**
   * Event ids "connected" to the given event via a shared `props.groupId`.
   * Returns every member of the group (including the event itself), or just
   * `[eventId]` when the event has no group / no other members / is unknown.
   */
  getConnectedEventIds(eventId: string): string[] {
    const groupId = this.eventGroup.get(eventId);
    if (groupId === undefined) return [eventId];
    const members = this.groupMembers.get(groupId);
    if (!members || members.size === 0) return [eventId];
    return [...members];
  }

  /**
   * Whether an event may enter the selection. False only when the event is
   * present and explicitly opted out (`props.isSelectable === false`); unknown
   * ids are treated as selectable so a selection can be set before data loads
   * and survives streaming.
   */
  isEventSelectable(id: string): boolean {
    const event = this.getEvent(id);
    return event === undefined || event.props?.isSelectable !== false;
  }

  getRowIds(): string[] {
    return this.rowOrder;
  }

  getRow(rowId: string): RowType | undefined {
    return this.rowIndexes.get(rowId)?.row;
  }

  getRowEvents(rowId: string): EventType[] {
    return this.rowIndexes.get(rowId)?.events ?? [];
  }

  getRowStaticEvents(rowId: string): EventType[] {
    return this.rowIndexes.get(rowId)?.staticEvents ?? [];
  }

  getLanes(rowId: string, windowStart: number, windowEnd: number): LaneResult {
    const index = this.rowIndexes.get(rowId);
    if (!index) return { laneOf: new Map(), highestLane: 0 };
    if (
      index.lanesDirty ||
      index.lanes === null ||
      index.laneWindowStart !== windowStart ||
      index.laneWindowEnd !== windowEnd
    ) {
      index.lanes = assignLanes(index.events, windowStart, windowEnd);
      index.laneWindowStart = windowStart;
      index.laneWindowEnd = windowEnd;
      index.lanesDirty = false;
    }
    return index.lanes;
  }

  /**
   * Report the per-row label heights measured against the live DOM header
   * (key: rowId, value: the minimum row height the wrapped label needs,
   * already including vertical padding). Replaces the previous map wholesale
   * and only bumps when a value actually changed, so re-measuring identical
   * labels is a no-op and can't feed back into an infinite render loop.
   */
  setLabelMinHeights(heights: Map<string, number>) {
    let changed = heights.size !== this.labelMinHeights.size;
    if (!changed) {
      for (const [id, h] of heights) {
        if (this.labelMinHeights.get(id) !== h) {
          changed = true;
          break;
        }
      }
    }
    if (!changed) return;
    this.labelMinHeights = heights;
    this.bump();
  }

  getRowHeight(rowId: string, windowStart: number, windowEnd: number): number {
    const laneHeight = rowMinHeight(
      this.getLanes(rowId, windowStart, windowEnd).highestLane,
      this.geometry
    );
    const labelHeight = this.labelMinHeights.get(rowId) ?? 0;
    return Math.max(laneHeight, labelHeight);
  }

  /**
   * y offset of each row's top edge (content coordinates, before scroll) plus
   * the total content height — drives both drawing and the scroll spacer.
   */
  getRowOffsets(
    windowStart: number,
    windowEnd: number
  ): { offsetOf: Map<string, number>; totalHeight: number } {
    const offsetOf = new Map<string, number>();
    let y = 0;
    for (const rowId of this.rowOrder) {
      offsetOf.set(rowId, y);
      y += this.getRowHeight(rowId, windowStart, windowEnd);
    }
    return { offsetOf, totalHeight: y };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private insert(event: EventType) {
    const index = this.rowIndexes.get(event.rowId);
    if (!index) return;
    index.events.splice(binaryInsertIndex(index.events, event), 0, event);
    index.lanesDirty = true;
    this.eventRow.set(event.id, event.rowId);
    this.addToGroup(event.id, event.props?.groupId);
  }

  private remove(id: string) {
    const rowId = this.eventRow.get(id);
    if (rowId === undefined) return;
    const index = this.rowIndexes.get(rowId);
    if (index) {
      const at = index.events.findIndex((event) => event.id === id);
      if (at !== -1) index.events.splice(at, 1);
      index.lanesDirty = true;
    }
    this.eventRow.delete(id);
    this.removeFromGroup(id);
  }

  private addToGroup(eventId: string, groupId: string | undefined) {
    if (groupId === undefined) return;
    this.eventGroup.set(eventId, groupId);
    let members = this.groupMembers.get(groupId);
    if (!members) {
      members = new Set();
      this.groupMembers.set(groupId, members);
    }
    members.add(eventId);
  }

  private removeFromGroup(eventId: string) {
    const groupId = this.eventGroup.get(eventId);
    if (groupId === undefined) return;
    this.eventGroup.delete(eventId);
    const members = this.groupMembers.get(groupId);
    if (members) {
      members.delete(eventId);
      if (members.size === 0) this.groupMembers.delete(groupId);
    }
  }

  private bump() {
    this.version++;
    for (const listener of this.listeners) listener();
  }
}
