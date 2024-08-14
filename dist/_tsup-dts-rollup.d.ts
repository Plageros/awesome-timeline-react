/// <reference types="react" />

import { Context } from "react";
import { CSSProperties } from "react";
import { default as React_2 } from "react";

declare type ContentType = {
  rows: RowType[];
  events: EventType[];
  staticEvents?: EventType[];
  setEvents: React_2.Dispatch<React_2.SetStateAction<EventType[]>>;
  tick: number | null;
  windowTime: number[];
  cellWidth: number;
  setWindowTime: React_2.Dispatch<React_2.SetStateAction<number[]>>;
  contentWidth: number | null;
  setCellWidth: React_2.Dispatch<React_2.SetStateAction<number>>;
  bodyRef: React_2.MutableRefObject<HTMLDivElement | null>;
  lineClassName?: string;
};

export declare const default_alias: {
  title: string;
};

export declare const default_alias_1: React_2.ForwardRefExoticComponent<
  ContentType & React_2.RefAttributes<HTMLDivElement>
>;

export declare const default_alias_10: ({
  windowTime,
  tick,
  contentWidth,
  scrollWidth,
  additionalClassNames,
}: {
  windowTime: number[];
  tick: number | null;
  contentWidth: number | null;
  scrollWidth: number;
  additionalClassNames?: PartialRecord<keyof ModifableElements, string>;
}) => React_2.JSX.Element;

export declare const default_alias_11: (monthIndex: number) => string;

export declare const default_alias_12: (dayIndex: number) => string;

export declare const default_alias_13: (
  eventA: EventType,
  eventB: EventType
) => 1 | -1;

export declare const default_alias_14: ({
  windowTime,
  tick,
  contentWidth,
  blockWidth,
}: {
  windowTime: number[];
  tick: number | null;
  contentWidth: number | null;
  blockWidth: number;
}) => {
  dayBlocks: JSX.Element[];
  hourBlocks: JSX.Element[];
};

export declare const default_alias_15: ({
  windowTime,
  contentWidth,
}: {
  windowTime: number[];
  contentWidth: number | null;
}) => {
  numberOfHourBlocks: number;
  blockWidth: number;
};

export declare const default_alias_16: ({
  bodyRef,
  rowsContentRef,
}: {
  bodyRef: React.MutableRefObject<HTMLDivElement | null>;
  rowsContentRef: React.MutableRefObject<HTMLDivElement[] | null>;
}) => void;

export declare const default_alias_17: ({
  rows,
  windowTime,
  tick,
  events,
  staticEvents,
  cellWidth,
  setEvents,
  bodyRef,
}: ProduceContentType) => React_2.JSX.Element[];

export declare const default_alias_18: ({
  windowTime,
  setTick,
  setCellWidth,
  contentRef,
}: {
  windowTime: number[];
  setTick: React.Dispatch<React.SetStateAction<number | null>>;
  setCellWidth: React.Dispatch<React.SetStateAction<number>>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
}) => void;

export declare const default_alias_2: ({
  id,
  startPosition,
  width,
  top,
  props,
  setEvents,
  tick,
}: {
  id: string;
  startPosition: number;
  width: number;
  top: CSSProperties["top"];
  props?: EventPropsType;
  setEvents: React_2.Dispatch<React_2.SetStateAction<EventType[]>>;
  tick: number | null;
}) => React_2.JSX.Element;

export declare const default_alias_3: ({
  contentWidth,
  cellWidth,
  lineClassName,
}: {
  contentWidth: number | null;
  cellWidth: number;
  lineClassName?: string;
}) => React_2.JSX.Element;

export declare const default_alias_4: () => React_2.JSX.Element;

export declare const default_alias_5: React_2.ForwardRefExoticComponent<
  RowContentProps & {
    children?: React_2.ReactNode;
  } & React_2.RefAttributes<HTMLDivElement>
>;

export declare const default_alias_6: ({
  name,
  id,
}: {
  name: string;
  id: string;
}) => React_2.JSX.Element;

export declare const default_alias_7: ({
  rows,
  className,
}: {
  rows: RowType[];
  className?: string;
}) => React_2.JSX.Element;

export declare const default_alias_8: ({
  tick,
  windowTime,
}: {
  tick: number | null;
  windowTime: number[];
}) => React_2.JSX.Element;

export declare const default_alias_9: ({
  id,
  startPosition,
  width,
  top,
  height,
}: {
  id: string;
  startPosition: CSSProperties["left"];
  width: CSSProperties["width"];
  top: CSSProperties["top"];
  height: CSSProperties["height"];
}) => React_2.JSX.Element;

export declare const DragStartedContext: Context<DragStartedContext_2>;

declare type DragStartedContext_2 = {
  dragStarted: boolean;
  setDragStarted: React.Dispatch<React.SetStateAction<boolean>>;
};

export declare type EventPropsType = {
  isLocked?: boolean;
  content?: JSX.Element | string;
  classNames?: string[];
  isResizable?: boolean;
};

export declare type EventType = {
  id: string;
  rowId: string;
  startTime: number;
  endTime: number;
  props?: EventPropsType;
};

export declare const ExternalPropertiesContext: Context<ExternalPropertiesType>;

declare type ExternalPropertiesType = {
  onDrop?: (props: OnDropProps) => void;
  onResize?: (props: OnResizeProps) => void;
  eventsResize?: boolean;
};

export declare type ModifableElements = {
  timeBar: string;
  dayRow: string;
  hourRow: string;
  gridLine: string;
  rowsHeader: string;
};

export declare type OnDropProps = {
  eventId: string;
  oldRowId: string;
  newRowId: string;
  startTime: number;
  endTime: number;
};

export declare type OnResizeProps = {
  eventId: string;
  startTime: number;
  endTime: number;
};

export declare type PartialRecord<K extends keyof any, T> = Partial<
  Record<K, T>
>;

declare type ProduceContentType = {
  rows: RowType[];
  events: EventType[];
  staticEvents?: EventType[];
  setEvents: React_2.Dispatch<React_2.SetStateAction<EventType[]>>;
  tick: number | null;
  windowTime: number[];
  cellWidth: number;
  bodyRef: React_2.MutableRefObject<HTMLDivElement | null>;
};

declare type RowContentProps = {
  id: string;
  setEvents: React_2.Dispatch<React_2.SetStateAction<EventType[]>>;
  tick: number | null;
  windowTime: number[];
  cellWidth: number;
};

export declare const RowsHeightContext: Context<RowsHeightContextType | null>;

declare type RowsHeightContextType = {
  rowsHeight: Record<string, RowsHeightType> | null;
  setRowsHeight: React.Dispatch<
    React.SetStateAction<Record<string, RowsHeightType> | null>
  >;
  allRowsHeight: number;
  setAllRowsHeight: React.Dispatch<React.SetStateAction<number>>;
};

export declare type RowsHeightType = {
  minHeight: number;
};

export declare type RowType = {
  id: string;
  name: string;
};

declare const Timeline: ({
  rows,
  events,
  staticEvents,
  onDrop,
  onResize,
  startDate,
  endDate,
  additionalClassNames,
  showRTIndicator,
  eventsResize,
}: TimelineType) => React_2.JSX.Element;
export { Timeline };
export { Timeline as Timeline_alias_1 };

export declare const TimelinePrimary: () => React_2.JSX.Element;

export declare type TimelineType = {
  rows: RowType[];
  events: EventType[];
  staticEvents?: EventType[];
  onDrop?: (props: OnDropProps) => void;
  onResize?: (props: OnResizeProps) => void;
  startDate: Date;
  endDate: Date;
  additionalClassNames?: PartialRecord<keyof ModifableElements, string>;
  showRTIndicator?: boolean;
  eventsResize?: boolean;
};

export {};
