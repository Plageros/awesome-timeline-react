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
  // Row hierarchy for grouped (collapsible) rows. parentOf: childRowId ->
  // parentRowId; childRowsOf: parentRowId -> ordered child row ids. Rebuilt in
  // setRows from `row.parentId`. One level of nesting only in v1.
  private parentOf = new Map<string, string>();
  private childRowsOf = new Map<string, string[]>();
  // Rows the user has collapsed. Lives only here so it survives every data
  // update (setEvents / applyPatches / events-prop reset); setRows only prunes
  // entries for rows that no longer exist.
  private collapsedRows = new Set<string>();
  // Parent↔child EVENT index (distinct from the row hierarchy above).
  // childrenOf: parentEventId -> child event ids; parentEventOf: childEventId ->
  // parentEventId. Driven by props.parentEventId / props.isGroupParent. A parent
  // event's [startTime,endTime] is derived lazily from its children; any child
  // mutation marks the parent dirty and the span is recomputed on the next query
  // of the parent's row (flushParentSpans) — off-screen groups cost nothing.
  private childrenOf = new Map<string, Set<string>>();
  private parentEventOf = new Map<string, string>();
  private parentSpanDirty = new Set<string>();
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
    // rebuild the row hierarchy
    this.parentOf = new Map();
    this.childRowsOf = new Map();
    for (const row of rows) {
      if (row.parentId === undefined) continue;
      this.parentOf.set(row.id, row.parentId);
      let children = this.childRowsOf.get(row.parentId);
      if (!children) {
        children = [];
        this.childRowsOf.set(row.parentId, children);
      }
      children.push(row.id);
    }
    // drop collapse entries for rows that no longer exist; keep the rest so an
    // open/collapsed group survives a `rows` change
    if (this.collapsedRows.size > 0) {
      const rowIds = new Set(this.rowOrder);
      for (const id of [...this.collapsedRows]) {
        if (!rowIds.has(id)) this.collapsedRows.delete(id);
      }
    }
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
    this.childrenOf.clear();
    this.parentEventOf.clear();
    this.parentSpanDirty.clear();
    for (const event of events) {
      const index = this.rowIndexes.get(event.rowId);
      if (!index) continue;
      index.events.push(event);
      this.eventRow.set(event.id, event.rowId);
      this.addToGroup(event.id, event.props?.groupId);
      this.addToParentIndex(event);
      this.validateDroppable(event);
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

  /**
   * Row ids in display order, minus rows hidden inside a collapsed parent.
   * Drives offsets, drawing and hit-testing. The header still walks
   * `getRowIds()` so it can draw the carets and decide which rows to skip.
   */
  getVisibleRowIds(): string[] {
    if (this.collapsedRows.size === 0) return this.rowOrder;
    const visible: string[] = [];
    for (const rowId of this.rowOrder) {
      const parent = this.parentOf.get(rowId);
      if (parent !== undefined && this.collapsedRows.has(parent)) continue;
      visible.push(rowId);
    }
    return visible;
  }

  /** whether a row is a parent (owns at least one child row) */
  isRowParent(rowId: string): boolean {
    return (this.childRowsOf.get(rowId)?.length ?? 0) > 0;
  }

  /** whether a row is hidden because its parent row is collapsed */
  isRowHidden(rowId: string): boolean {
    const parent = this.parentOf.get(rowId);
    return parent !== undefined && this.collapsedRows.has(parent);
  }

  isRowCollapsed(rowId: string): boolean {
    return this.collapsedRows.has(rowId);
  }

  getCollapsedRowIds(): string[] {
    return [...this.collapsedRows];
  }

  setCollapsed(rowId: string, collapsed: boolean) {
    const has = this.collapsedRows.has(rowId);
    if (collapsed && !has) {
      this.collapsedRows.add(rowId);
      this.bump();
    } else if (!collapsed && has) {
      this.collapsedRows.delete(rowId);
      this.bump();
    }
  }

  toggleCollapsed(rowId: string) {
    this.setCollapsed(rowId, !this.collapsedRows.has(rowId));
  }

  /** child event ids of a parent (summary) event; empty if it has none */
  getChildEventIds(parentEventId: string): string[] {
    const children = this.childrenOf.get(parentEventId);
    return children ? [...children] : [];
  }

  getRow(rowId: string): RowType | undefined {
    return this.rowIndexes.get(rowId)?.row;
  }

  getRowEvents(rowId: string): EventType[] {
    this.flushParentSpans(rowId);
    return this.rowIndexes.get(rowId)?.events ?? [];
  }

  getRowStaticEvents(rowId: string): EventType[] {
    return this.rowIndexes.get(rowId)?.staticEvents ?? [];
  }

  getLanes(rowId: string, windowStart: number, windowEnd: number): LaneResult {
    this.flushParentSpans(rowId);
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
    for (const rowId of this.getVisibleRowIds()) {
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
    this.addToParentIndex(event);
    this.validateDroppable(event);
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
    this.removeFromParentIndex(id);
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

  /**
   * Enforce the authoring contract for `props.droppableRowIds`: if the event's
   * current row is not among its allowed rows, record a `droppableError` on
   * `props.metadata` (merged non-destructively); otherwise clear any stale one.
   * Cheap no-op for events without `droppableRowIds` and no prior error.
   */
  private validateDroppable(event: EventType) {
    const allowed = event.props?.droppableRowIds;
    const meta = event.props?.metadata;
    const metaObj =
      typeof meta === "object" && meta !== null
        ? (meta as Record<string, unknown>)
        : undefined;
    const hadError = metaObj !== undefined && "droppableError" in metaObj;
    const needsError = allowed !== undefined && !allowed.includes(event.rowId);

    if (!needsError && !hadError) return; // common path: nothing to do
    if (!event.props) return; // droppableRowIds/metadata imply props exists

    if (needsError) {
      event.props.metadata = {
        ...(metaObj ?? {}),
        droppableError: {
          rowId: event.rowId,
          droppableRowIds: allowed,
        },
      };
    } else {
      // clear the stale error, preserving any other app-provided metadata
      const rest = { ...(metaObj as Record<string, unknown>) };
      delete rest.droppableError;
      event.props.metadata = Object.keys(rest).length > 0 ? rest : undefined;
    }
  }

  private addToParentIndex(event: EventType) {
    const parentId = event.props?.parentEventId;
    if (parentId === undefined) return;
    this.parentEventOf.set(event.id, parentId);
    let children = this.childrenOf.get(parentId);
    if (!children) {
      children = new Set();
      this.childrenOf.set(parentId, children);
    }
    children.add(event.id);
    // the parent's derived span now needs recomputing
    this.parentSpanDirty.add(parentId);
  }

  private removeFromParentIndex(eventId: string) {
    const parentId = this.parentEventOf.get(eventId);
    if (parentId === undefined) return;
    this.parentEventOf.delete(eventId);
    const children = this.childrenOf.get(parentId);
    if (children) {
      children.delete(eventId);
      if (children.size === 0) this.childrenOf.delete(parentId);
    }
    this.parentSpanDirty.add(parentId);
  }

  /**
   * Recompute the derived span of any dirty parent event living on `rowId`
   * (earliest child start → latest child end), write it back into the parent
   * event, and re-sort the row so the sorted-array invariant holds. Cheap no-op
   * when nothing is dirty (the common no-groups case never touches this).
   */
  private flushParentSpans(rowId: string) {
    if (this.parentSpanDirty.size === 0) return;
    const index = this.rowIndexes.get(rowId);
    if (!index) return;
    let changed = false;
    for (const event of index.events) {
      if (!event.props?.isGroupParent) continue;
      if (!this.parentSpanDirty.has(event.id)) continue;
      this.parentSpanDirty.delete(event.id);
      const children = this.childrenOf.get(event.id);
      if (!children || children.size === 0) continue; // childless: keep supplied times
      let minStart = Infinity;
      let maxEnd = -Infinity;
      for (const childId of children) {
        const child = this.getEvent(childId);
        if (!child) continue;
        if (child.startTime < minStart) minStart = child.startTime;
        if (child.endTime > maxEnd) maxEnd = child.endTime;
      }
      if (
        minStart !== Infinity &&
        (event.startTime !== minStart || event.endTime !== maxEnd)
      ) {
        event.startTime = minStart;
        event.endTime = maxEnd;
        changed = true;
      }
    }
    if (changed) {
      index.events.sort(sortEvents);
      index.lanesDirty = true;
    }
  }

  private bump() {
    this.version++;
    for (const listener of this.listeners) listener();
  }
}
