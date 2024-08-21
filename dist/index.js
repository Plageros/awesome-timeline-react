"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Timeline: () => Timeline
});
module.exports = __toCommonJS(src_exports);

// src/timeline.tsx
var import_react23 = __toESM(require("react"));

// src/components/time-bar.tsx
var import_react4 = __toESM(require("react"));

// src/hooks/use-generate-blocks.tsx
var import_react = __toESM(require("react"));
var import_react2 = require("react");

// src/helpers/get-month-name.ts
var getMonthName = (monthIndex) => {
  let monthName = null;
  switch (monthIndex) {
    case 0:
      monthName = "Jan";
      break;
    case 1:
      monthName = "Feb";
      break;
    case 2:
      monthName = "Mar";
      break;
    case 3:
      monthName = "Apr";
      break;
    case 4:
      monthName = "May";
      break;
    case 5:
      monthName = "Jun";
      break;
    case 6:
      monthName = "Jul";
      break;
    case 7:
      monthName = "Aug";
      break;
    case 8:
      monthName = "Sep";
      break;
    case 9:
      monthName = "Oct";
      break;
    case 10:
      monthName = "Nov";
      break;
    case 11:
      monthName = "Dec";
      break;
    default:
      monthName = "Jan";
  }
  return monthName;
};
var get_month_name_default = getMonthName;

// src/helpers/get-week-day-name.ts
var getWeekDayName = (dayIndex) => {
  let dayName = null;
  switch (dayIndex) {
    case 0:
      dayName = "Mon";
      break;
    case 1:
      dayName = "Tue";
      break;
    case 2:
      dayName = "Wed";
      break;
    case 3:
      dayName = "Thu";
      break;
    case 4:
      dayName = "Fri";
      break;
    case 5:
      dayName = "Sat";
      break;
    case 6:
      dayName = "Sun";
      break;
    default:
      dayName = "Mon";
  }
  return dayName;
};
var get_week_day_name_default = getWeekDayName;

// src/hooks/use-generate-blocks.tsx
var useGenerateBlocks = ({
  windowTime,
  tick,
  contentWidth,
  blockWidth
}) => {
  const { dayBlocks, hourBlocks } = (0, import_react2.useMemo)(() => {
    let timePoint = windowTime[0];
    const dayBlocks2 = [];
    const hourBlocks2 = [];
    if (tick === null || contentWidth === null) {
      return { dayBlocks: [], hourBlocks: [] };
    }
    let widthLeft = contentWidth;
    let prevNumBlocks = 1;
    while (1) {
      let datePoint = new Date(timePoint * 1e3);
      const endDatePoint = new Date(
        datePoint.getFullYear(),
        datePoint.getMonth(),
        datePoint.getDate(),
        23,
        59,
        59
      );
      const dateDuration = endDatePoint.getTime() - datePoint.getTime();
      const dateWidth = dateDuration / 1e3 / tick;
      widthLeft -= dateWidth;
      if (Math.round(widthLeft) < 0) {
        const numBlocks2 = Math.round((dateWidth + widthLeft) / blockWidth);
        for (let i = 0; i < numBlocks2; i++) {
          hourBlocks2.push(
            /* @__PURE__ */ import_react.default.createElement(
              "div",
              {
                className: "hour-block",
                key: `${datePoint.getDate()}_hour_${i}`
              },
              i < 10 ? `0${i}:00` : `${i}:00`
            )
          );
        }
        dayBlocks2.push(
          /* @__PURE__ */ import_react.default.createElement(
            "div",
            {
              className: "day-block",
              key: `${datePoint.getDate()} ${datePoint.getMonth()}`,
              style: {
                gridColumn: `${prevNumBlocks} / ${prevNumBlocks + numBlocks2}`
                // width: dateWidth + widthLeft,
                // minWidth: dateWidth + widthLeft,
              }
            },
            get_week_day_name_default(datePoint.getDay()),
            " ",
            datePoint.getDate(),
            " ",
            get_month_name_default(datePoint.getMonth())
          )
        );
        prevNumBlocks += numBlocks2;
        break;
      }
      const numBlocks = Math.round(dateWidth / blockWidth);
      for (let i = 24 - numBlocks; i < 24; i++) {
        hourBlocks2.push(
          /* @__PURE__ */ import_react.default.createElement("div", { className: "hour-block", key: `${datePoint.getDate()}_hour_${i}` }, i < 10 ? `0${i}:00` : `${i}:00`)
        );
      }
      dayBlocks2.push(
        /* @__PURE__ */ import_react.default.createElement(
          "div",
          {
            className: "day-block",
            key: `${datePoint.getDate()} ${datePoint.getMonth()}`,
            style: {
              gridColumn: `${prevNumBlocks} / ${prevNumBlocks + numBlocks}`
              // width: dateWidth,
              // minWidth: dateWidth,
            }
          },
          get_week_day_name_default(datePoint.getDay()),
          " ",
          datePoint.getDate(),
          " ",
          get_month_name_default(datePoint.getMonth())
        )
      );
      prevNumBlocks += numBlocks;
      if (Math.round(widthLeft) === 0) {
        break;
      }
      timePoint = (endDatePoint.getTime() + 1e3) / 1e3;
    }
    return { dayBlocks: dayBlocks2, hourBlocks: hourBlocks2 };
  }, [tick, windowTime, contentWidth]);
  return { dayBlocks, hourBlocks };
};
var use_generate_blocks_default = useGenerateBlocks;

// src/hooks/use-get-block-properties.ts
var import_react3 = require("react");
var useGetBlockProperties = ({
  windowTime,
  contentWidth
}) => {
  const numberOfHourBlocks = (0, import_react3.useMemo)(
    () => (windowTime[1] - windowTime[0]) / 3600,
    [windowTime]
  );
  const blockWidth = contentWidth ? contentWidth / numberOfHourBlocks : 0;
  return { numberOfHourBlocks, blockWidth };
};
var use_get_block_properties_default = useGetBlockProperties;

// src/components/time-bar.tsx
var TimeBar = ({
  windowTime,
  tick,
  contentWidth,
  scrollWidth,
  additionalClassNames
}) => {
  const timeContentRef = (0, import_react4.useRef)(null);
  const { blockWidth } = use_get_block_properties_default({
    windowTime,
    contentWidth
  });
  const { dayBlocks, hourBlocks } = use_generate_blocks_default({
    windowTime,
    tick,
    contentWidth,
    blockWidth
  });
  const timeBarClassNames = (additionalClassNames == null ? void 0 : additionalClassNames.timeBar) ? "time-bar " + additionalClassNames.timeBar : "time-bar";
  const dayRowClassNames = (additionalClassNames == null ? void 0 : additionalClassNames.dayRow) ? "day-row " + additionalClassNames.dayRow : "day-row";
  const hourRowClassNames = (additionalClassNames == null ? void 0 : additionalClassNames.hourRow) ? "hour-row " + additionalClassNames.hourRow : "hour-row";
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: timeBarClassNames }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "empty-block" }), /* @__PURE__ */ import_react4.default.createElement(
    "div",
    {
      className: "time-content",
      ref: timeContentRef,
      style: { minWidth: contentWidth ? contentWidth : 0 }
    },
    /* @__PURE__ */ import_react4.default.createElement(
      "div",
      {
        className: dayRowClassNames,
        style: {
          gridTemplateColumns: `repeat(auto-fill, minmax(${blockWidth}px, 1fr))`
        }
      },
      dayBlocks.map((block) => block)
    ),
    /* @__PURE__ */ import_react4.default.createElement(
      "div",
      {
        className: hourRowClassNames,
        style: {
          gridTemplateColumns: `repeat(auto-fill, minmax(${blockWidth}px, 1fr))`
        }
      },
      hourBlocks.map((block) => block)
    )
  ), scrollWidth ? /* @__PURE__ */ import_react4.default.createElement(
    "div",
    {
      style: {
        width: scrollWidth,
        height: "100%",
        boxSizing: "border-box",
        borderLeft: "1px solid yellow"
      }
    }
  ) : null);
};
var time_bar_default = TimeBar;

// src/components/rows-header.tsx
var import_react7 = __toESM(require("react"));

// src/components/row-header.tsx
var import_react6 = __toESM(require("react"));

// src/contexts/row-height-context.ts
var import_react5 = require("react");
var RowsHeightContext = (0, import_react5.createContext)(
  null
);

// src/components/row-header.tsx
var RowHeader = ({ name, id }) => {
  const rowsHeightContext = (0, import_react6.useContext)(RowsHeightContext);
  const minHeight = rowsHeightContext && rowsHeightContext.rowsHeight && rowsHeightContext.rowsHeight[id] ? rowsHeightContext.rowsHeight[id].minHeight : 40;
  return /* @__PURE__ */ import_react6.default.createElement("div", { className: "row-header", style: { minHeight } }, name);
};
var row_header_default = RowHeader;

// src/components/rows-header.tsx
var RowsHeader = ({
  rows,
  className
}) => {
  const classNames = className ? "rows-header-wrapper " + className : "rows-header-wrapper";
  return /* @__PURE__ */ import_react7.default.createElement("div", { className: classNames }, rows.map((row) => /* @__PURE__ */ import_react7.default.createElement(
    row_header_default,
    {
      key: `row_header_${row.id}`,
      id: row.id,
      name: row.name
    }
  )));
};
var rows_header_default = RowsHeader;

// src/components/content.tsx
var import_react19 = __toESM(require("react"));

// src/components/lines-canvas.tsx
var import_react8 = __toESM(require("react"));
var import_react9 = require("react");
var LinesCanvas = ({
  contentWidth,
  cellWidth,
  lineClassName
}) => {
  const lines = (0, import_react9.useMemo)(() => {
    const lines2 = [];
    const classNames = lineClassName ? "line " + lineClassName : "line";
    if (contentWidth) {
      for (let i = cellWidth; i < contentWidth; i = i + cellWidth) {
        lines2.push(/* @__PURE__ */ import_react8.default.createElement("div", { key: `line_${i}`, className: classNames }));
      }
    }
    return lines2;
  }, [cellWidth, contentWidth]);
  const minWidth = (0, import_react9.useMemo)(() => {
    return contentWidth ? contentWidth - lines.length * cellWidth : 0;
  }, [contentWidth, cellWidth, lines]);
  return /* @__PURE__ */ import_react8.default.createElement(
    "div",
    {
      className: minWidth < 1 ? "lines-canvas hide-last-line" : "lines-canvas",
      style: minWidth < 1 ? {
        gridTemplateColumns: `repeat(auto-fill, minmax(${cellWidth}px, 1fr))`
      } : {
        gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, ${cellWidth}px))`
      }
    },
    lines
  );
};
var lines_canvas_default = LinesCanvas;

// src/hooks/use-produce-content.tsx
var import_react17 = require("react");
var import_react18 = __toESM(require("react"));

// src/components/static-event.tsx
var import_react10 = __toESM(require("react"));
var StaticEvent = ({
  id,
  startPosition,
  width,
  top,
  height
}) => {
  return /* @__PURE__ */ import_react10.default.createElement(
    "div",
    {
      id: `static_event_${id}`,
      key: `static_event_${id}`,
      className: "static-event",
      onDrop: (event) => event.stopPropagation(),
      style: {
        left: startPosition,
        width,
        top,
        minHeight: height
      }
    }
  );
};
var static_event_default = StaticEvent;

// src/components/row-content.tsx
var import_react13 = __toESM(require("react"));

// node_modules/immer/dist/immer.mjs
var NOTHING = Symbol.for("immer-nothing");
var DRAFTABLE = Symbol.for("immer-draftable");
var DRAFT_STATE = Symbol.for("immer-state");
var errors = process.env.NODE_ENV !== "production" ? [
  // All error codes, starting by 0:
  function(plugin) {
    return `The plugin for '${plugin}' has not been loaded into Immer. To enable the plugin, import and call \`enable${plugin}()\` when initializing your application.`;
  },
  function(thing) {
    return `produce can only be called on things that are draftable: plain objects, arrays, Map, Set or classes that are marked with '[immerable]: true'. Got '${thing}'`;
  },
  "This object has been frozen and should not be mutated",
  function(data) {
    return "Cannot use a proxy that has been revoked. Did you pass an object from inside an immer function to an async process? " + data;
  },
  "An immer producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft.",
  "Immer forbids circular references",
  "The first or second argument to `produce` must be a function",
  "The third argument to `produce` must be a function or undefined",
  "First argument to `createDraft` must be a plain object, an array, or an immerable object",
  "First argument to `finishDraft` must be a draft returned by `createDraft`",
  function(thing) {
    return `'current' expects a draft, got: ${thing}`;
  },
  "Object.defineProperty() cannot be used on an Immer draft",
  "Object.setPrototypeOf() cannot be used on an Immer draft",
  "Immer only supports deleting array indices",
  "Immer only supports setting array indices and the 'length' property",
  function(thing) {
    return `'original' expects a draft, got: ${thing}`;
  }
  // Note: if more errors are added, the errorOffset in Patches.ts should be increased
  // See Patches.ts for additional errors
] : [];
function die(error, ...args) {
  if (process.env.NODE_ENV !== "production") {
    const e = errors[error];
    const msg = typeof e === "function" ? e.apply(null, args) : e;
    throw new Error(`[Immer] ${msg}`);
  }
  throw new Error(
    `[Immer] minified error nr: ${error}. Full error at: https://bit.ly/3cXEKWf`
  );
}
var getPrototypeOf = Object.getPrototypeOf;
function isDraft(value) {
  return !!value && !!value[DRAFT_STATE];
}
function isDraftable(value) {
  var _a;
  if (!value)
    return false;
  return isPlainObject(value) || Array.isArray(value) || !!value[DRAFTABLE] || !!((_a = value.constructor) == null ? void 0 : _a[DRAFTABLE]) || isMap(value) || isSet(value);
}
var objectCtorString = Object.prototype.constructor.toString();
function isPlainObject(value) {
  if (!value || typeof value !== "object")
    return false;
  const proto = getPrototypeOf(value);
  if (proto === null) {
    return true;
  }
  const Ctor = Object.hasOwnProperty.call(proto, "constructor") && proto.constructor;
  if (Ctor === Object)
    return true;
  return typeof Ctor == "function" && Function.toString.call(Ctor) === objectCtorString;
}
function each(obj, iter) {
  if (getArchtype(obj) === 0) {
    Reflect.ownKeys(obj).forEach((key) => {
      iter(key, obj[key], obj);
    });
  } else {
    obj.forEach((entry, index) => iter(index, entry, obj));
  }
}
function getArchtype(thing) {
  const state = thing[DRAFT_STATE];
  return state ? state.type_ : Array.isArray(thing) ? 1 : isMap(thing) ? 2 : isSet(thing) ? 3 : 0;
}
function has(thing, prop) {
  return getArchtype(thing) === 2 ? thing.has(prop) : Object.prototype.hasOwnProperty.call(thing, prop);
}
function set(thing, propOrOldValue, value) {
  const t = getArchtype(thing);
  if (t === 2)
    thing.set(propOrOldValue, value);
  else if (t === 3) {
    thing.add(value);
  } else
    thing[propOrOldValue] = value;
}
function is(x, y) {
  if (x === y) {
    return x !== 0 || 1 / x === 1 / y;
  } else {
    return x !== x && y !== y;
  }
}
function isMap(target) {
  return target instanceof Map;
}
function isSet(target) {
  return target instanceof Set;
}
function latest(state) {
  return state.copy_ || state.base_;
}
function shallowCopy(base, strict) {
  if (isMap(base)) {
    return new Map(base);
  }
  if (isSet(base)) {
    return new Set(base);
  }
  if (Array.isArray(base))
    return Array.prototype.slice.call(base);
  const isPlain = isPlainObject(base);
  if (strict === true || strict === "class_only" && !isPlain) {
    const descriptors = Object.getOwnPropertyDescriptors(base);
    delete descriptors[DRAFT_STATE];
    let keys = Reflect.ownKeys(descriptors);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const desc = descriptors[key];
      if (desc.writable === false) {
        desc.writable = true;
        desc.configurable = true;
      }
      if (desc.get || desc.set)
        descriptors[key] = {
          configurable: true,
          writable: true,
          // could live with !!desc.set as well here...
          enumerable: desc.enumerable,
          value: base[key]
        };
    }
    return Object.create(getPrototypeOf(base), descriptors);
  } else {
    const proto = getPrototypeOf(base);
    if (proto !== null && isPlain) {
      return __spreadValues({}, base);
    }
    const obj = Object.create(proto);
    return Object.assign(obj, base);
  }
}
function freeze(obj, deep = false) {
  if (isFrozen(obj) || isDraft(obj) || !isDraftable(obj))
    return obj;
  if (getArchtype(obj) > 1) {
    obj.set = obj.add = obj.clear = obj.delete = dontMutateFrozenCollections;
  }
  Object.freeze(obj);
  if (deep)
    Object.entries(obj).forEach(([key, value]) => freeze(value, true));
  return obj;
}
function dontMutateFrozenCollections() {
  die(2);
}
function isFrozen(obj) {
  return Object.isFrozen(obj);
}
var plugins = {};
function getPlugin(pluginKey) {
  const plugin = plugins[pluginKey];
  if (!plugin) {
    die(0, pluginKey);
  }
  return plugin;
}
var currentScope;
function getCurrentScope() {
  return currentScope;
}
function createScope(parent_, immer_) {
  return {
    drafts_: [],
    parent_,
    immer_,
    // Whenever the modified draft contains a draft from another scope, we
    // need to prevent auto-freezing so the unowned draft can be finalized.
    canAutoFreeze_: true,
    unfinalizedDrafts_: 0
  };
}
function usePatchesInScope(scope, patchListener) {
  if (patchListener) {
    getPlugin("Patches");
    scope.patches_ = [];
    scope.inversePatches_ = [];
    scope.patchListener_ = patchListener;
  }
}
function revokeScope(scope) {
  leaveScope(scope);
  scope.drafts_.forEach(revokeDraft);
  scope.drafts_ = null;
}
function leaveScope(scope) {
  if (scope === currentScope) {
    currentScope = scope.parent_;
  }
}
function enterScope(immer2) {
  return currentScope = createScope(currentScope, immer2);
}
function revokeDraft(draft) {
  const state = draft[DRAFT_STATE];
  if (state.type_ === 0 || state.type_ === 1)
    state.revoke_();
  else
    state.revoked_ = true;
}
function processResult(result, scope) {
  scope.unfinalizedDrafts_ = scope.drafts_.length;
  const baseDraft = scope.drafts_[0];
  const isReplaced = result !== void 0 && result !== baseDraft;
  if (isReplaced) {
    if (baseDraft[DRAFT_STATE].modified_) {
      revokeScope(scope);
      die(4);
    }
    if (isDraftable(result)) {
      result = finalize(scope, result);
      if (!scope.parent_)
        maybeFreeze(scope, result);
    }
    if (scope.patches_) {
      getPlugin("Patches").generateReplacementPatches_(
        baseDraft[DRAFT_STATE].base_,
        result,
        scope.patches_,
        scope.inversePatches_
      );
    }
  } else {
    result = finalize(scope, baseDraft, []);
  }
  revokeScope(scope);
  if (scope.patches_) {
    scope.patchListener_(scope.patches_, scope.inversePatches_);
  }
  return result !== NOTHING ? result : void 0;
}
function finalize(rootScope, value, path) {
  if (isFrozen(value))
    return value;
  const state = value[DRAFT_STATE];
  if (!state) {
    each(
      value,
      (key, childValue) => finalizeProperty(rootScope, state, value, key, childValue, path)
    );
    return value;
  }
  if (state.scope_ !== rootScope)
    return value;
  if (!state.modified_) {
    maybeFreeze(rootScope, state.base_, true);
    return state.base_;
  }
  if (!state.finalized_) {
    state.finalized_ = true;
    state.scope_.unfinalizedDrafts_--;
    const result = state.copy_;
    let resultEach = result;
    let isSet2 = false;
    if (state.type_ === 3) {
      resultEach = new Set(result);
      result.clear();
      isSet2 = true;
    }
    each(
      resultEach,
      (key, childValue) => finalizeProperty(rootScope, state, result, key, childValue, path, isSet2)
    );
    maybeFreeze(rootScope, result, false);
    if (path && rootScope.patches_) {
      getPlugin("Patches").generatePatches_(
        state,
        path,
        rootScope.patches_,
        rootScope.inversePatches_
      );
    }
  }
  return state.copy_;
}
function finalizeProperty(rootScope, parentState, targetObject, prop, childValue, rootPath, targetIsSet) {
  if (process.env.NODE_ENV !== "production" && childValue === targetObject)
    die(5);
  if (isDraft(childValue)) {
    const path = rootPath && parentState && parentState.type_ !== 3 && // Set objects are atomic since they have no keys.
    !has(parentState.assigned_, prop) ? rootPath.concat(prop) : void 0;
    const res = finalize(rootScope, childValue, path);
    set(targetObject, prop, res);
    if (isDraft(res)) {
      rootScope.canAutoFreeze_ = false;
    } else
      return;
  } else if (targetIsSet) {
    targetObject.add(childValue);
  }
  if (isDraftable(childValue) && !isFrozen(childValue)) {
    if (!rootScope.immer_.autoFreeze_ && rootScope.unfinalizedDrafts_ < 1) {
      return;
    }
    finalize(rootScope, childValue);
    if ((!parentState || !parentState.scope_.parent_) && typeof prop !== "symbol" && Object.prototype.propertyIsEnumerable.call(targetObject, prop))
      maybeFreeze(rootScope, childValue);
  }
}
function maybeFreeze(scope, value, deep = false) {
  if (!scope.parent_ && scope.immer_.autoFreeze_ && scope.canAutoFreeze_) {
    freeze(value, deep);
  }
}
function createProxyProxy(base, parent) {
  const isArray = Array.isArray(base);
  const state = {
    type_: isArray ? 1 : 0,
    // Track which produce call this is associated with.
    scope_: parent ? parent.scope_ : getCurrentScope(),
    // True for both shallow and deep changes.
    modified_: false,
    // Used during finalization.
    finalized_: false,
    // Track which properties have been assigned (true) or deleted (false).
    assigned_: {},
    // The parent draft state.
    parent_: parent,
    // The base state.
    base_: base,
    // The base proxy.
    draft_: null,
    // set below
    // The base copy with any updated values.
    copy_: null,
    // Called by the `produce` function.
    revoke_: null,
    isManual_: false
  };
  let target = state;
  let traps = objectTraps;
  if (isArray) {
    target = [state];
    traps = arrayTraps;
  }
  const { revoke, proxy } = Proxy.revocable(target, traps);
  state.draft_ = proxy;
  state.revoke_ = revoke;
  return proxy;
}
var objectTraps = {
  get(state, prop) {
    if (prop === DRAFT_STATE)
      return state;
    const source = latest(state);
    if (!has(source, prop)) {
      return readPropFromProto(state, source, prop);
    }
    const value = source[prop];
    if (state.finalized_ || !isDraftable(value)) {
      return value;
    }
    if (value === peek(state.base_, prop)) {
      prepareCopy(state);
      return state.copy_[prop] = createProxy(value, state);
    }
    return value;
  },
  has(state, prop) {
    return prop in latest(state);
  },
  ownKeys(state) {
    return Reflect.ownKeys(latest(state));
  },
  set(state, prop, value) {
    const desc = getDescriptorFromProto(latest(state), prop);
    if (desc == null ? void 0 : desc.set) {
      desc.set.call(state.draft_, value);
      return true;
    }
    if (!state.modified_) {
      const current2 = peek(latest(state), prop);
      const currentState = current2 == null ? void 0 : current2[DRAFT_STATE];
      if (currentState && currentState.base_ === value) {
        state.copy_[prop] = value;
        state.assigned_[prop] = false;
        return true;
      }
      if (is(value, current2) && (value !== void 0 || has(state.base_, prop)))
        return true;
      prepareCopy(state);
      markChanged(state);
    }
    if (state.copy_[prop] === value && // special case: handle new props with value 'undefined'
    (value !== void 0 || prop in state.copy_) || // special case: NaN
    Number.isNaN(value) && Number.isNaN(state.copy_[prop]))
      return true;
    state.copy_[prop] = value;
    state.assigned_[prop] = true;
    return true;
  },
  deleteProperty(state, prop) {
    if (peek(state.base_, prop) !== void 0 || prop in state.base_) {
      state.assigned_[prop] = false;
      prepareCopy(state);
      markChanged(state);
    } else {
      delete state.assigned_[prop];
    }
    if (state.copy_) {
      delete state.copy_[prop];
    }
    return true;
  },
  // Note: We never coerce `desc.value` into an Immer draft, because we can't make
  // the same guarantee in ES5 mode.
  getOwnPropertyDescriptor(state, prop) {
    const owner = latest(state);
    const desc = Reflect.getOwnPropertyDescriptor(owner, prop);
    if (!desc)
      return desc;
    return {
      writable: true,
      configurable: state.type_ !== 1 || prop !== "length",
      enumerable: desc.enumerable,
      value: owner[prop]
    };
  },
  defineProperty() {
    die(11);
  },
  getPrototypeOf(state) {
    return getPrototypeOf(state.base_);
  },
  setPrototypeOf() {
    die(12);
  }
};
var arrayTraps = {};
each(objectTraps, (key, fn) => {
  arrayTraps[key] = function() {
    arguments[0] = arguments[0][0];
    return fn.apply(this, arguments);
  };
});
arrayTraps.deleteProperty = function(state, prop) {
  if (process.env.NODE_ENV !== "production" && isNaN(parseInt(prop)))
    die(13);
  return arrayTraps.set.call(this, state, prop, void 0);
};
arrayTraps.set = function(state, prop, value) {
  if (process.env.NODE_ENV !== "production" && prop !== "length" && isNaN(parseInt(prop)))
    die(14);
  return objectTraps.set.call(this, state[0], prop, value, state[0]);
};
function peek(draft, prop) {
  const state = draft[DRAFT_STATE];
  const source = state ? latest(state) : draft;
  return source[prop];
}
function readPropFromProto(state, source, prop) {
  var _a;
  const desc = getDescriptorFromProto(source, prop);
  return desc ? `value` in desc ? desc.value : (
    // This is a very special case, if the prop is a getter defined by the
    // prototype, we should invoke it with the draft as context!
    (_a = desc.get) == null ? void 0 : _a.call(state.draft_)
  ) : void 0;
}
function getDescriptorFromProto(source, prop) {
  if (!(prop in source))
    return void 0;
  let proto = getPrototypeOf(source);
  while (proto) {
    const desc = Object.getOwnPropertyDescriptor(proto, prop);
    if (desc)
      return desc;
    proto = getPrototypeOf(proto);
  }
  return void 0;
}
function markChanged(state) {
  if (!state.modified_) {
    state.modified_ = true;
    if (state.parent_) {
      markChanged(state.parent_);
    }
  }
}
function prepareCopy(state) {
  if (!state.copy_) {
    state.copy_ = shallowCopy(
      state.base_,
      state.scope_.immer_.useStrictShallowCopy_
    );
  }
}
var Immer2 = class {
  constructor(config) {
    this.autoFreeze_ = true;
    this.useStrictShallowCopy_ = false;
    this.produce = (base, recipe, patchListener) => {
      if (typeof base === "function" && typeof recipe !== "function") {
        const defaultBase = recipe;
        recipe = base;
        const self = this;
        return function curriedProduce(base2 = defaultBase, ...args) {
          return self.produce(base2, (draft) => recipe.call(this, draft, ...args));
        };
      }
      if (typeof recipe !== "function")
        die(6);
      if (patchListener !== void 0 && typeof patchListener !== "function")
        die(7);
      let result;
      if (isDraftable(base)) {
        const scope = enterScope(this);
        const proxy = createProxy(base, void 0);
        let hasError = true;
        try {
          result = recipe(proxy);
          hasError = false;
        } finally {
          if (hasError)
            revokeScope(scope);
          else
            leaveScope(scope);
        }
        usePatchesInScope(scope, patchListener);
        return processResult(result, scope);
      } else if (!base || typeof base !== "object") {
        result = recipe(base);
        if (result === void 0)
          result = base;
        if (result === NOTHING)
          result = void 0;
        if (this.autoFreeze_)
          freeze(result, true);
        if (patchListener) {
          const p = [];
          const ip = [];
          getPlugin("Patches").generateReplacementPatches_(base, result, p, ip);
          patchListener(p, ip);
        }
        return result;
      } else
        die(1, base);
    };
    this.produceWithPatches = (base, recipe) => {
      if (typeof base === "function") {
        return (state, ...args) => this.produceWithPatches(state, (draft) => base(draft, ...args));
      }
      let patches, inversePatches;
      const result = this.produce(base, recipe, (p, ip) => {
        patches = p;
        inversePatches = ip;
      });
      return [result, patches, inversePatches];
    };
    if (typeof (config == null ? void 0 : config.autoFreeze) === "boolean")
      this.setAutoFreeze(config.autoFreeze);
    if (typeof (config == null ? void 0 : config.useStrictShallowCopy) === "boolean")
      this.setUseStrictShallowCopy(config.useStrictShallowCopy);
  }
  createDraft(base) {
    if (!isDraftable(base))
      die(8);
    if (isDraft(base))
      base = current(base);
    const scope = enterScope(this);
    const proxy = createProxy(base, void 0);
    proxy[DRAFT_STATE].isManual_ = true;
    leaveScope(scope);
    return proxy;
  }
  finishDraft(draft, patchListener) {
    const state = draft && draft[DRAFT_STATE];
    if (!state || !state.isManual_)
      die(9);
    const { scope_: scope } = state;
    usePatchesInScope(scope, patchListener);
    return processResult(void 0, scope);
  }
  /**
   * Pass true to automatically freeze all copies created by Immer.
   *
   * By default, auto-freezing is enabled.
   */
  setAutoFreeze(value) {
    this.autoFreeze_ = value;
  }
  /**
   * Pass true to enable strict shallow copy.
   *
   * By default, immer does not copy the object descriptors such as getter, setter and non-enumrable properties.
   */
  setUseStrictShallowCopy(value) {
    this.useStrictShallowCopy_ = value;
  }
  applyPatches(base, patches) {
    let i;
    for (i = patches.length - 1; i >= 0; i--) {
      const patch = patches[i];
      if (patch.path.length === 0 && patch.op === "replace") {
        base = patch.value;
        break;
      }
    }
    if (i > -1) {
      patches = patches.slice(i + 1);
    }
    const applyPatchesImpl = getPlugin("Patches").applyPatches_;
    if (isDraft(base)) {
      return applyPatchesImpl(base, patches);
    }
    return this.produce(
      base,
      (draft) => applyPatchesImpl(draft, patches)
    );
  }
};
function createProxy(value, parent) {
  const draft = isMap(value) ? getPlugin("MapSet").proxyMap_(value, parent) : isSet(value) ? getPlugin("MapSet").proxySet_(value, parent) : createProxyProxy(value, parent);
  const scope = parent ? parent.scope_ : getCurrentScope();
  scope.drafts_.push(draft);
  return draft;
}
function current(value) {
  if (!isDraft(value))
    die(10, value);
  return currentImpl(value);
}
function currentImpl(value) {
  if (!isDraftable(value) || isFrozen(value))
    return value;
  const state = value[DRAFT_STATE];
  let copy;
  if (state) {
    if (!state.modified_)
      return state.base_;
    state.finalized_ = true;
    copy = shallowCopy(value, state.scope_.immer_.useStrictShallowCopy_);
  } else {
    copy = shallowCopy(value, true);
  }
  each(copy, (key, childValue) => {
    set(copy, key, currentImpl(childValue));
  });
  if (state) {
    state.finalized_ = false;
  }
  return copy;
}
var immer = new Immer2();
var produce = immer.produce;
var produceWithPatches = immer.produceWithPatches.bind(
  immer
);
var setAutoFreeze = immer.setAutoFreeze.bind(immer);
var setUseStrictShallowCopy = immer.setUseStrictShallowCopy.bind(immer);
var applyPatches = immer.applyPatches.bind(immer);
var createDraft = immer.createDraft.bind(immer);
var finishDraft = immer.finishDraft.bind(immer);

// src/contexts/drag-started-context.ts
var import_react11 = require("react");
var DragStartedContext = (0, import_react11.createContext)({
  dragStarted: false,
  setDragStarted: () => {
  }
});

// src/contexts/external-properties-context.ts
var import_react12 = require("react");
var ExternalPropertiesContext = (0, import_react12.createContext)(
  {}
);

// src/helpers/sort-events.ts
var sortEvents = (eventA, eventB) => {
  if (eventA.startTime - eventB.startTime < 0) return -1;
  if (eventA.startTime === eventB.startTime) {
    if (eventA.endTime < eventB.endTime) {
      return -1;
    } else {
      return 1;
    }
  } else {
    return 1;
  }
};
var sort_events_default = sortEvents;

// src/components/row-content.tsx
var RowContent = (0, import_react13.forwardRef)((props, ref) => {
  const { setEvents, tick, id, windowTime, cellWidth, children } = props;
  const { dragStarted, setDragStarted } = (0, import_react13.useContext)(DragStartedContext);
  const { onDrop } = (0, import_react13.useContext)(ExternalPropertiesContext);
  const handleOnDrop = (0, import_react13.useCallback)(
    (event) => {
      event.preventDefault();
      const element = event.target;
      const { left } = element.getBoundingClientRect();
      const draggedEventId = event.dataTransfer.getData("eventId");
      const closestCell = Math.round((event.clientX - left) / cellWidth);
      const newPosition = cellWidth * closestCell;
      setEvents(
        produce((draft) => {
          const event2 = draft.find((event3) => event3.id === draggedEventId);
          if (event2 && tick) {
            const newStartTime = windowTime[0] + newPosition * tick;
            const eventDuration = event2.endTime - event2.startTime;
            const newEndTime = windowTime[0] + eventDuration + newPosition * tick;
            if (onDrop) {
              onDrop({
                eventId: event2.id,
                oldRowId: event2.rowId,
                newRowId: props.id,
                startTime: newStartTime,
                endTime: newEndTime
              });
            }
            event2.startTime = newStartTime;
            event2.endTime = newEndTime;
            event2.rowId = props.id;
          }
          draft.sort(sort_events_default);
        })
      );
      setDragStarted(false);
    },
    [setEvents, tick, windowTime, cellWidth]
  );
  const rowsHeightContext = (0, import_react13.useContext)(RowsHeightContext);
  const minHeight = rowsHeightContext && rowsHeightContext.rowsHeight && rowsHeightContext.rowsHeight[id] ? rowsHeightContext.rowsHeight[id].minHeight : 40;
  return /* @__PURE__ */ import_react13.default.createElement(
    "div",
    {
      id: `row_${id}`,
      ref,
      onDragOver: (event) => event.preventDefault(),
      onDrop: handleOnDrop,
      className: dragStarted ? "row-content not-clickable" : "row-content",
      "data-index": id,
      style: {
        minHeight
      }
    },
    children
  );
});
var row_content_default = RowContent;

// src/components/event.tsx
var import_react15 = __toESM(require("react"));

// src/components/resize-icon.tsx
var import_react14 = __toESM(require("react"));
var ResizeIcon = () => {
  return /* @__PURE__ */ import_react14.default.createElement("div", { style: { display: "flex", gap: "1px" } }, /* @__PURE__ */ import_react14.default.createElement("div", { className: "resize-bar" }), /* @__PURE__ */ import_react14.default.createElement("div", { className: "resize-bar" }));
};
var resize_icon_default = ResizeIcon;

// src/components/event.tsx
var Event = ({
  eventData,
  startPosition,
  width,
  top,
  setEvents,
  tick
}) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
  const { setDragStarted } = (0, import_react15.useContext)(DragStartedContext);
  const { onResize, eventsResize, eventPromptRef } = (0, import_react15.useContext)(
    ExternalPropertiesContext
  );
  const initialPositionForResizeRef = (0, import_react15.useRef)(0);
  const handleOnDragStart = (0, import_react15.useCallback)(
    (event) => {
      event.stopPropagation();
      event.dataTransfer.setData("eventId", eventData.id);
      setTimeout(() => setDragStarted(true), 0);
      const target = event.target;
      target.style.opacity = "50%";
      if (eventPromptRef == null ? void 0 : eventPromptRef.current) {
        eventPromptRef.current.setDisplay("none");
      }
    },
    [setDragStarted]
  );
  const handleOnDragEnd = (0, import_react15.useCallback)(
    (event) => {
      event.stopPropagation();
      setDragStarted(false);
      const target = event.target;
      target.style.opacity = "100%";
    },
    [setDragStarted]
  );
  const classNames = ((_a = eventData.props) == null ? void 0 : _a.classNames) ? "event " + eventData.props.classNames.join(" ") : "event";
  const [draggableEvent, setDraggableEvent] = (0, import_react15.useState)(true);
  const [resizeOffset, setResizeOffset] = (0, import_react15.useState)(0);
  const resizeOffsetRef = (0, import_react15.useRef)(0);
  const [resizeStarted, setResizeStarted] = (0, import_react15.useState)(false);
  const resizeDirectionRef = (0, import_react15.useRef)(null);
  const handleDocumentOnMouseMoveResize = (0, import_react15.useCallback)(
    (event) => {
      const offset = event.clientX - initialPositionForResizeRef.current;
      let internalResizeOffset = resizeDirectionRef.current === "left" ? offset * -1 : offset;
      setResizeOffset(internalResizeOffset);
      resizeOffsetRef.current = offset;
    },
    [setResizeOffset]
  );
  const handleDocumentOnMouseUp = (0, import_react15.useCallback)(
    (event, resizeDirection) => {
      initialPositionForResizeRef.current = 0;
      setResizeStarted(false);
      document.removeEventListener(
        "mousemove",
        handleDocumentOnMouseMoveResize
      );
      const lockedStyle = document.getElementById("lock-cursor");
      if (lockedStyle) {
        lockedStyle.remove();
      }
      setEvents(
        produce((draft) => {
          const event2 = draft.find((event3) => event3.id === eventData.id);
          if (event2 && tick) {
            if (resizeDirection === "left") {
              const newStartTime = Math.round(
                event2.startTime + resizeOffsetRef.current * tick
              );
              if (event2.endTime - newStartTime > 0) {
                event2.startTime = newStartTime;
              }
            } else {
              const newEndTime = Math.round(
                event2.endTime + resizeOffsetRef.current * tick
              );
              if (newEndTime - event2.startTime > 0) {
                event2.endTime = newEndTime;
              }
            }
            if (onResize) {
              onResize({
                eventId: event2.id,
                startTime: event2.startTime,
                endTime: event2.endTime
              });
            }
          }
          draft.sort(sort_events_default);
          resizeOffsetRef.current = 0;
          setResizeOffset(0);
        })
      );
    },
    [
      handleDocumentOnMouseMoveResize,
      setEvents,
      tick,
      setResizeOffset,
      sort_events_default
    ]
  );
  const handleOnMouseDownEventResizer = (0, import_react15.useCallback)(
    (event, resizeDirection) => {
      event.stopPropagation();
      resizeDirectionRef.current = resizeDirection;
      setResizeStarted(true);
      const style = document.createElement("style");
      style.id = "lock-cursor";
      style.innerHTML = "* { cursor: e-resize !important; }";
      document.head.appendChild(style);
      document.addEventListener("mousemove", handleDocumentOnMouseMoveResize);
      document.addEventListener(
        "mouseup",
        (event2) => handleDocumentOnMouseUp(event2, resizeDirection),
        { once: true }
      );
      initialPositionForResizeRef.current = event.clientX;
    },
    [handleDocumentOnMouseMoveResize, handleDocumentOnMouseUp]
  );
  const handleOnMouseMove = (0, import_react15.useCallback)(
    (event) => {
      if (!resizeStarted) {
        event.stopPropagation();
      }
    },
    [resizeStarted]
  );
  const handleOnMouseOver = (0, import_react15.useCallback)(
    (event) => {
      var _a2, _b2;
      event.stopPropagation();
      if (((_a2 = eventData.props) == null ? void 0 : _a2.showPrompt) || ((_b2 = eventData.props) == null ? void 0 : _b2.showPrompt) === void 0) {
        const target = event.target;
        if (eventPromptRef == null ? void 0 : eventPromptRef.current) {
          eventPromptRef.current.setDisplay("block");
          eventPromptRef.current.setRight(
            `calc(100% - ${target.getBoundingClientRect().left}px + 60px)`
          );
          eventPromptRef.current.setBottom(
            `calc(100% - ${target.getBoundingClientRect().top}px + 60px)`
          );
          eventPromptRef.current.setEvent(eventData);
        }
      }
    },
    [eventData]
  );
  const handleOnMouseOut = (0, import_react15.useCallback)(() => {
    if (eventPromptRef == null ? void 0 : eventPromptRef.current) {
      eventPromptRef.current.setDisplay("none");
    }
  }, []);
  return /* @__PURE__ */ import_react15.default.createElement(
    "div",
    {
      id: `event_${eventData.id}`,
      key: `event_${eventData.id}`,
      className: classNames,
      draggable: ((_b = eventData.props) == null ? void 0 : _b.isLocked) ? false : draggableEvent,
      onDragStart: handleOnDragStart,
      onDragEnd: handleOnDragEnd,
      onMouseDown: (event) => event.stopPropagation(),
      onMouseMove: handleOnMouseMove,
      onMouseOut: handleOnMouseOut,
      onDrop: (event) => event.stopPropagation(),
      style: {
        left: resizeDirectionRef.current === "left" ? startPosition - resizeOffset : startPosition,
        width: width + resizeOffset,
        top,
        cursor: ((_c = eventData.props) == null ? void 0 : _c.isLocked) ? "not-allowed" : "pointer"
      }
    },
    !((_d = eventData.props) == null ? void 0 : _d.isLocked) && (eventsResize && (((_e = eventData.props) == null ? void 0 : _e.isResizable) === true || ((_f = eventData.props) == null ? void 0 : _f.isResizable) === void 0) || !eventsResize && ((_g = eventData.props) == null ? void 0 : _g.isResizable)) && /* @__PURE__ */ import_react15.default.createElement(
      "div",
      {
        className: "event-resize",
        style: resizeStarted ? { opacity: "100%" } : void 0,
        draggable: false,
        onMouseEnter: () => setDraggableEvent(false),
        onMouseLeave: () => setDraggableEvent(true),
        onMouseDown: (event) => handleOnMouseDownEventResizer(event, "left"),
        onMouseOver: (event) => event.stopPropagation()
      },
      /* @__PURE__ */ import_react15.default.createElement(resize_icon_default, null)
    ),
    /* @__PURE__ */ import_react15.default.createElement("div", { className: "event-content", onMouseOver: handleOnMouseOver }, ((_h = eventData.props) == null ? void 0 : _h.content) ? eventData.props.content : null),
    !((_i = eventData.props) == null ? void 0 : _i.isLocked) && (eventsResize && (((_j = eventData.props) == null ? void 0 : _j.isResizable) === true || ((_k = eventData.props) == null ? void 0 : _k.isResizable) === void 0) || !eventsResize && ((_l = eventData.props) == null ? void 0 : _l.isResizable)) && /* @__PURE__ */ import_react15.default.createElement(
      "div",
      {
        className: "event-resize",
        style: resizeStarted ? { opacity: "100%" } : void 0,
        draggable: false,
        onMouseEnter: () => setDraggableEvent(false),
        onMouseLeave: () => setDraggableEvent(true),
        onMouseDown: (event) => handleOnMouseDownEventResizer(event, "right"),
        onMouseOver: (event) => event.stopPropagation()
      },
      /* @__PURE__ */ import_react15.default.createElement(resize_icon_default, null)
    )
  );
};
var event_default = Event;

// src/hooks/use-intersection-observer.ts
var import_react16 = require("react");
var useIntersectionObserver = ({
  bodyRef,
  rowsContentRef
}) => {
  const callback = (0, import_react16.useCallback)((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.remove("row-hidden");
      } else {
        entry.target.classList.add("row-hidden");
      }
    });
  }, []);
  const observer = new IntersectionObserver(callback, {
    root: bodyRef.current
  });
  (0, import_react16.useEffect)(() => {
    if (rowsContentRef.current) {
      rowsContentRef.current.forEach((row) => {
        observer.observe(row);
      });
    }
    return () => observer.disconnect();
  }, [observer]);
};
var use_intersection_observer_default = useIntersectionObserver;

// src/hooks/use-produce-content.tsx
var useProduceContent = ({
  rows,
  windowTime,
  tick,
  events,
  staticEvents,
  cellWidth,
  setEvents,
  bodyRef
}) => {
  const rowsHeightContext = (0, import_react17.useContext)(RowsHeightContext);
  const tempRowsHeightRef = (0, import_react17.useRef)(null);
  const rowsContentRef = (0, import_react17.useRef)([]);
  const [content, internalAllRowsHeight] = (0, import_react17.useMemo)(() => {
    let internalAllRowsHeight2 = 0;
    return [
      rows.map((row, i) => {
        let eventOrder = 0;
        let prevEvent = [];
        let highestEventOrder = 0;
        const rowEvents = tick ? events.filter((event) => event.rowId === row.id).map((event) => {
          if (event.endTime >= windowTime[0] && event.startTime <= windowTime[1]) {
            let tempEventOrder = 0;
            let assignEventOrder = true;
            for (let i2 = 0; i2 <= eventOrder; i2++) {
              if (prevEvent && prevEvent[i2] && prevEvent[i2].endTime > event.startTime) {
                tempEventOrder += 1;
              } else {
                if (eventOrder > highestEventOrder) {
                  highestEventOrder = eventOrder;
                }
                eventOrder = 0;
                assignEventOrder = false;
                break;
              }
            }
            if (assignEventOrder) {
              eventOrder = tempEventOrder;
            }
            prevEvent[tempEventOrder] = event;
            return /* @__PURE__ */ import_react18.default.createElement(
              event_default,
              {
                key: `event_${event.id}`,
                eventData: event,
                startPosition: (event.startTime - windowTime[0]) / tick,
                width: (event.endTime - event.startTime) / tick,
                top: 10 + 22 * tempEventOrder,
                setEvents,
                tick
              }
            );
          }
        }) : null;
        if (eventOrder > highestEventOrder) {
          highestEventOrder = eventOrder;
        }
        if (tempRowsHeightRef.current === null) {
          tempRowsHeightRef.current = {
            [row.id]: { minHeight: 40 + highestEventOrder * 22 }
          };
        } else {
          tempRowsHeightRef.current[row.id] = {
            minHeight: 40 + highestEventOrder * 22
          };
        }
        internalAllRowsHeight2 += 40 + highestEventOrder * 22;
        const rowStaticEvents = tick && staticEvents ? staticEvents.filter((event) => event.rowId === row.id).map((event) => {
          if (event.endTime >= windowTime[0] && event.startTime <= windowTime[1]) {
            return /* @__PURE__ */ import_react18.default.createElement(
              static_event_default,
              {
                key: `static_event_${event.id}`,
                id: event.id,
                startPosition: (event.startTime - windowTime[0]) / tick,
                width: (event.endTime - event.startTime) / tick,
                top: 10,
                height: 20 + highestEventOrder * 22
              }
            );
          }
        }) : null;
        return /* @__PURE__ */ import_react18.default.createElement(import_react18.default.Fragment, { key: `row_content_${row.id}` }, /* @__PURE__ */ import_react18.default.createElement(
          row_content_default,
          {
            id: row.id,
            ref: (el) => {
              if (rowsContentRef.current && rowsContentRef.current[i] && el) {
                rowsContentRef.current[i] = el;
              } else if (rowsContentRef.current && el) {
                rowsContentRef.current.push(el);
              }
            },
            setEvents,
            tick,
            windowTime,
            cellWidth
          },
          rowEvents,
          rowStaticEvents
        ));
      }),
      internalAllRowsHeight2
    ];
  }, [rows, events, tick, windowTime, cellWidth]);
  use_intersection_observer_default({
    rowsContentRef,
    bodyRef
  });
  (0, import_react17.useEffect)(() => {
    if (rowsHeightContext) {
      rowsHeightContext.setRowsHeight(tempRowsHeightRef.current);
      rowsHeightContext.setAllRowsHeight(internalAllRowsHeight);
    }
  }, [content, internalAllRowsHeight]);
  return content;
};
var use_produce_content_default = useProduceContent;

// src/components/content.tsx
var Content = (0, import_react19.forwardRef)(
  ({
    rows,
    events,
    staticEvents,
    setEvents,
    tick,
    windowTime,
    cellWidth,
    setWindowTime,
    contentWidth,
    setCellWidth,
    bodyRef,
    lineClassName
  }, ref) => {
    const [mouseDown, setMouseDown] = (0, import_react19.useState)(false);
    const startMovePosition = (0, import_react19.useRef)(null);
    const [changeGrid, setChangeGrid] = (0, import_react19.useState)(false);
    const { blockWidth } = use_get_block_properties_default({ windowTime, contentWidth });
    const rowsHeightContext = (0, import_react19.useContext)(RowsHeightContext);
    const handleOnMouseMove = (0, import_react19.useCallback)(
      (event) => {
        event.preventDefault();
        if (!mouseDown) {
          return;
        }
        const element = event.target;
        const { left } = element.getBoundingClientRect();
        const movePosition = event.clientX - left;
        const moveTimestamp = tick ? Math.floor(tick * blockWidth) : 0;
        if (startMovePosition.current && startMovePosition.current - movePosition >= blockWidth) {
          startMovePosition.current = movePosition;
          setWindowTime((prev) => [
            prev[0] + moveTimestamp,
            prev[1] + moveTimestamp
          ]);
        } else if (startMovePosition.current && movePosition - startMovePosition.current >= blockWidth) {
          startMovePosition.current = movePosition;
          setWindowTime((prev) => [
            prev[0] - moveTimestamp,
            prev[1] - moveTimestamp
          ]);
        }
      },
      [blockWidth, setWindowTime, mouseDown]
    );
    const handleOnMouseDown = (0, import_react19.useCallback)(
      (event) => {
        setMouseDown(true);
        if (event.button === 1) {
          event.preventDefault();
        }
        const element = event.target;
        const { left } = element.getBoundingClientRect();
        startMovePosition.current = event.clientX - left;
      },
      [setMouseDown]
    );
    const handleOnMouseUp = (0, import_react19.useCallback)(() => {
      setMouseDown(false);
    }, [setMouseDown]);
    const handleOnMouseLeave = (0, import_react19.useCallback)(
      () => setMouseDown(false),
      [setMouseDown]
    );
    const content = use_produce_content_default({
      rows,
      windowTime,
      tick,
      events,
      staticEvents,
      cellWidth,
      setEvents,
      bodyRef
    });
    const handleAuxClick = (0, import_react19.useCallback)(
      (event) => {
        event.preventDefault();
        if (event.button === 1) {
          setChangeGrid((prev) => !prev);
        }
      },
      []
    );
    const handleOnWheel = (0, import_react19.useCallback)(
      (event) => {
        const pixelsToCalculate = tick ? 900 / tick : 0;
        if (changeGrid) {
          setCellWidth((cellWidth2) => {
            const newCellWidth = event.deltaY > 0 ? cellWidth2 + pixelsToCalculate : cellWidth2 - pixelsToCalculate;
            if (newCellWidth < pixelsToCalculate || newCellWidth > pixelsToCalculate * 12) {
              return cellWidth2;
            }
            return newCellWidth;
          });
        }
      },
      [changeGrid, cellWidth, tick]
    );
    (0, import_react19.useEffect)(() => {
      if (bodyRef.current) {
        bodyRef.current.style.overflow = changeGrid ? "hidden" : "auto";
      }
    }, [changeGrid]);
    return /* @__PURE__ */ import_react19.default.createElement(
      "div",
      {
        key: "content",
        ref,
        className: "content-wrapper",
        onMouseDown: handleOnMouseDown,
        onMouseUp: handleOnMouseUp,
        onMouseMove: handleOnMouseMove,
        onMouseLeave: handleOnMouseLeave,
        onAuxClick: handleAuxClick,
        onWheel: handleOnWheel,
        style: {
          cursor: mouseDown ? "grabbing" : "grab",
          height: rowsHeightContext == null ? void 0 : rowsHeightContext.allRowsHeight
        }
      },
      /* @__PURE__ */ import_react19.default.createElement(
        lines_canvas_default,
        {
          contentWidth,
          cellWidth,
          lineClassName
        }
      ),
      content
    );
  }
);
var content_default = Content;

// src/hooks/use-resize-observer.ts
var import_react20 = require("react");
var useResizeObserver = ({
  windowTime,
  setTick,
  setCellWidth,
  contentRef
}) => {
  const prevWidthRef = (0, import_react20.useRef)(0);
  const resizeObserver = (0, import_react20.useMemo)(() => {
    return new ResizeObserver((entries) => {
      var _a;
      for (const entry of entries) {
        const width = (_a = entry.borderBoxSize) == null ? void 0 : _a[0].inlineSize;
        if (typeof width === "number" && width !== prevWidthRef.current) {
          prevWidthRef.current = width;
          const windowDuration = windowTime[1] - windowTime[0];
          const numberOfHourBlocks = windowDuration / 3600;
          setTick(windowDuration / entry.contentRect.width);
          setCellWidth(entry.contentRect.width / numberOfHourBlocks);
        }
      }
    });
  }, [windowTime]);
  (0, import_react20.useEffect)(() => {
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current, { box: "border-box" });
    }
    return () => resizeObserver.disconnect();
  }, [resizeObserver]);
};
var use_resize_observer_default = useResizeObserver;

// src/components/rt-indicator.tsx
var import_react21 = __toESM(require("react"));
var RTIndicator = ({
  tick,
  windowTime
}) => {
  const [currentTime, setCurrentTime] = (0, import_react21.useState)((/* @__PURE__ */ new Date()).getTime() / 1e3);
  const [leftOffset, setLeftOffset] = (0, import_react21.useState)(0);
  const intervalIdRef = (0, import_react21.useRef)(null);
  (0, import_react21.useEffect)(() => {
    if (tick) {
      const leftOffsetTime = currentTime - windowTime[0];
      setLeftOffset(Math.round(leftOffsetTime / tick));
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
      }
      const intervalId = setInterval(() => {
        setCurrentTime((/* @__PURE__ */ new Date()).getTime() / 1e3);
      }, tick * 1e3);
      intervalIdRef.current = intervalId;
    }
  }, [tick, windowTime, currentTime]);
  return /* @__PURE__ */ import_react21.default.createElement(import_react21.default.Fragment, null, windowTime[0] <= currentTime && currentTime <= windowTime[1] && /* @__PURE__ */ import_react21.default.createElement(import_react21.default.Fragment, null, /* @__PURE__ */ import_react21.default.createElement("div", { className: "rt-arrow", style: { left: 86 + leftOffset } }), /* @__PURE__ */ import_react21.default.createElement("div", { className: "rt-line", style: { left: 100 + leftOffset } })));
};
var rt_indicator_default = RTIndicator;

// src/components/event-prompt.tsx
var import_react22 = __toESM(require("react"));
var EventPrompt = (0, import_react22.forwardRef)(
  ({ template }, ref) => {
    const eventRef = (0, import_react22.useRef)(null);
    const [hoveredEvent, setHoveredEvent] = (0, import_react22.useState)();
    (0, import_react22.useImperativeHandle)(ref, () => {
      return {
        setDisplay(value) {
          if (eventRef.current) {
            eventRef.current.style.display = value;
          }
        },
        setRight(value) {
          if (eventRef.current) {
            eventRef.current.style.right = value;
          }
        },
        setBottom(value) {
          if (eventRef.current) {
            eventRef.current.style.bottom = value;
          }
        },
        setEvent(event) {
          setHoveredEvent(event);
        }
      };
    });
    return /* @__PURE__ */ import_react22.default.createElement("div", { className: "event-prompt", ref: eventRef }, template && hoveredEvent && template(hoveredEvent));
  }
);
var event_prompt_default = EventPrompt;

// src/timeline.tsx
var Timeline = ({
  rows,
  events,
  staticEvents,
  onDrop,
  onResize,
  startDate,
  endDate,
  additionalClassNames,
  showRTIndicator = true,
  eventsResize = true,
  eventPromptTemplate,
  showEventPrompt = true
}) => {
  const [windowTime, setWindowTime] = (0, import_react23.useState)([
    new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      startDate.getHours(),
      0,
      0
    ).getTime() / 1e3,
    new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
      endDate.getHours(),
      0,
      0
    ).getTime() / 1e3
  ]);
  const [cellWidth, setCellWidth] = (0, import_react23.useState)(0);
  const [internalEvents, setInternalEvents] = (0, import_react23.useState)([]);
  const contentRef = (0, import_react23.useRef)(null);
  const mainRef = (0, import_react23.useRef)(null);
  const bodyRef = (0, import_react23.useRef)(null);
  const [tick, setTick] = (0, import_react23.useState)(null);
  const [scrollWidth, setScrollWidth] = (0, import_react23.useState)(0);
  const [rowsHeight, setRowsHeight] = (0, import_react23.useState)(null);
  const [allRowsHeight, setAllRowsHeight] = (0, import_react23.useState)(0);
  const eventPromptRef = (0, import_react23.useRef)(null);
  (0, import_react23.useEffect)(() => {
    if (contentRef.current) {
      const windowDuration = windowTime[1] - windowTime[0];
      const numberOfHourBlocks = windowDuration / 3600;
      setTick(
        windowDuration / contentRef.current.getBoundingClientRect().width
      );
      setCellWidth(
        contentRef.current.getBoundingClientRect().width / numberOfHourBlocks
      );
    }
  }, []);
  (0, import_react23.useEffect)(() => {
    if (bodyRef.current) {
      setScrollWidth(
        bodyRef.current.getBoundingClientRect().width - bodyRef.current.scrollWidth
      );
    }
  }, []);
  (0, import_react23.useEffect)(() => {
    setInternalEvents(events.sort(sort_events_default));
  }, [events]);
  const [dragStarted, setDragStarted] = (0, import_react23.useState)(false);
  (0, import_react23.useEffect)(() => {
    let tempRowsHeight = null;
    rows.forEach((row) => {
      if (tempRowsHeight === null) {
        tempRowsHeight = { [row.id]: { minHeight: 40 } };
      } else {
        tempRowsHeight[row.id] = { minHeight: 40 };
      }
    });
    setRowsHeight(tempRowsHeight);
  }, [rows]);
  use_resize_observer_default({ contentRef, setCellWidth, setTick, windowTime });
  const eventPrompt = (0, import_react23.useMemo)(
    () => /* @__PURE__ */ import_react23.default.createElement(
      event_prompt_default,
      {
        ref: eventPromptRef,
        template: eventPromptTemplate
      }
    ),
    [eventPromptTemplate]
  );
  return /* @__PURE__ */ import_react23.default.createElement("div", { className: "main-wrapper", ref: mainRef }, showRTIndicator && /* @__PURE__ */ import_react23.default.createElement(rt_indicator_default, { tick, windowTime }), /* @__PURE__ */ import_react23.default.createElement(
    time_bar_default,
    {
      windowTime,
      tick,
      contentWidth: contentRef.current ? contentRef.current.getBoundingClientRect().width : null,
      scrollWidth
    }
  ), /* @__PURE__ */ import_react23.default.createElement("div", { className: "body-wrapper", ref: bodyRef }, /* @__PURE__ */ import_react23.default.createElement(
    RowsHeightContext.Provider,
    {
      value: { rowsHeight, setRowsHeight, allRowsHeight, setAllRowsHeight }
    },
    /* @__PURE__ */ import_react23.default.createElement(
      rows_header_default,
      {
        rows,
        className: additionalClassNames == null ? void 0 : additionalClassNames.rowsHeader
      }
    ),
    /* @__PURE__ */ import_react23.default.createElement(DragStartedContext.Provider, { value: { dragStarted, setDragStarted } }, /* @__PURE__ */ import_react23.default.createElement(
      ExternalPropertiesContext.Provider,
      {
        value: { onDrop, onResize, eventsResize, eventPromptRef }
      },
      /* @__PURE__ */ import_react23.default.createElement(
        content_default,
        {
          events: internalEvents,
          staticEvents,
          rows,
          setEvents: setInternalEvents,
          tick,
          windowTime,
          cellWidth,
          setWindowTime,
          ref: contentRef,
          setCellWidth,
          contentWidth: contentRef.current ? contentRef.current.getBoundingClientRect().width : null,
          bodyRef,
          lineClassName: additionalClassNames == null ? void 0 : additionalClassNames.gridLine
        }
      ),
      showEventPrompt && eventPrompt
    ))
  )));
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Timeline
});
//# sourceMappingURL=index.js.map