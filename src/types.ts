export type RowType = {
  id: string;
  name: string;
};

export type RowsHeightType = {
  minHeight: number;
};

export type EventPropsType = {
  isLocked?: boolean;
  content?: JSX.Element | string;
  classNames?: string[];
  isResizable?: boolean;
  showPrompt?: boolean;
  metadata?: any;
};

export type EventType = {
  id: string;
  rowId: string;
  startTime: number;
  endTime: number;
  props?: EventPropsType;
};

export type OnDropProps = {
  eventId: string;
  oldRowId: string;
  newRowId: string;
  startTime: number;
  endTime: number;
};

export type OnResizeProps = {
  eventId: string;
  startTime: number;
  endTime: number;
};

export type ModifableElements = {
  timeBar: string;
  dayRow: string;
  hourRow: string;
  gridLine: string;
  rowsHeader: string;
};

export type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;

export type TimeBarPatternType = "hour" | "day" | "week";

export type TimelineType = {
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
  eventPromptTemplate?: (event: EventType) => JSX.Element;
  showEventPrompt?: boolean;
  timeBarPattern?: TimeBarPatternType;
};

export type EventPromptActionsType = {
  setDisplay: (value: string) => void;
  setRight: (value: string) => void;
  setBottom: (value: string) => void;
  setEvent: (event: EventType) => void;
};
