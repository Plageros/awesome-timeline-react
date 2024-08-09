"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _react = require('react'); var _react2 = _interopRequireDefault(_react);var he=o=>{let e=null;switch(o){case 0:e="Jan";break;case 1:e="Feb";break;case 2:e="Mar";break;case 3:e="Apr";break;case 4:e="May";break;case 5:e="Jun";break;case 6:e="Jul";break;case 7:e="Aug";break;case 8:e="Sep";break;case 9:e="Oct";break;case 10:e="Nov";break;case 11:e="Dec";break;default:e="Jan"}return e},J=he;var ge=o=>{let e=null;switch(o){case 0:e="Mon";break;case 1:e="Tue";break;case 2:e="Wed";break;case 3:e="Thu";break;case 4:e="Fri";break;case 5:e="Sat";break;case 6:e="Sun";break;default:e="Mon"}return e},X=ge;var be=({windowTime:o,tick:e,contentWidth:r,blockWidth:n})=>{let{dayBlocks:t,hourBlocks:i}=_react.useMemo.call(void 0, ()=>{let c=o[0],d=[],g=[];if(e===null||r===null)return{dayBlocks:[],hourBlocks:[]};let s=r,a=1;for(;;){let u=new Date(c*1e3),w=new Date(u.getFullYear(),u.getMonth(),u.getDate(),23,59,59),f=(w.getTime()-u.getTime())/1e3/e;if(s-=f,Math.round(s)<0){let p=Math.round((f+s)/n);for(let b=0;b<p;b++)g.push(_react2.default.createElement("div",{className:"hour-block",key:`${u.getDate()}_hour_${b}`},b<10?`0${b}:00`:`${b}:00`));d.push(_react2.default.createElement("div",{className:"day-block",key:`${u.getDate()} ${u.getMonth()}`,style:{gridColumn:`${a} / ${a+p}`}},X(u.getDay())," ",u.getDate()," ",J(u.getMonth()))),a+=p;break}let m=Math.round(f/n);for(let p=24-m;p<24;p++)g.push(_react2.default.createElement("div",{className:"hour-block",key:`${u.getDate()}_hour_${p}`},p<10?`0${p}:00`:`${p}:00`));if(d.push(_react2.default.createElement("div",{className:"day-block",key:`${u.getDate()} ${u.getMonth()}`,style:{gridColumn:`${a} / ${a+m}`}},X(u.getDay())," ",u.getDate()," ",J(u.getMonth()))),a+=m,Math.round(s)===0)break;c=(w.getTime()+1e3)/1e3}return{dayBlocks:d,hourBlocks:g}},[e,o,r]);return{dayBlocks:t,hourBlocks:i}},q=be;var ve=({windowTime:o,contentWidth:e})=>{let r=_react.useMemo.call(void 0, ()=>(o[1]-o[0])/3600,[o]),n=e?e/r:0;return{numberOfHourBlocks:r,blockWidth:n}},A=ve;var ye=({windowTime:o,tick:e,contentWidth:r,scrollWidth:n,additionalClassNames:t})=>{let i=_react.useRef.call(void 0, null),{blockWidth:c}=A({windowTime:o,contentWidth:r}),{dayBlocks:d,hourBlocks:g}=q({windowTime:o,tick:e,contentWidth:r,blockWidth:c}),s=t!=null&&t.timeBar?"time-bar "+t.timeBar:"time-bar",a=t!=null&&t.dayRow?"day-row "+t.dayRow:"day-row",u=t!=null&&t.hourRow?"hour-row "+t.hourRow:"hour-row";return _react2.default.createElement("div",{className:s},_react2.default.createElement("div",{className:"empty-block"}),_react2.default.createElement("div",{className:"time-content",ref:i,style:{minWidth:r||0}},_react2.default.createElement("div",{className:a,style:{gridTemplateColumns:`repeat(auto-fill, minmax(${c}px, 1fr))`}},d.map(w=>w)),_react2.default.createElement("div",{className:u,style:{gridTemplateColumns:`repeat(auto-fill, minmax(${c}px, 1fr))`}},g.map(w=>w))),n?_react2.default.createElement("div",{style:{width:n,height:"100%",boxSizing:"border-box",borderLeft:"1px solid yellow"}}):null)},K=ye;var D=_react.createContext.call(void 0, null);var ke=({name:o,id:e})=>{let r=_react.useContext.call(void 0, D),n=r&&r.rowsHeight&&r.rowsHeight[e]?r.rowsHeight[e].minHeight:40;return _react2.default.createElement("div",{className:"row-header",style:{minHeight:n}},o)},Q=ke;var De=({rows:o,className:e})=>{let r=e?"rows-header-wrapper "+e:"rows-header-wrapper";return _react2.default.createElement("div",{className:r},o.map(n=>_react2.default.createElement(Q,{key:`row_header_${n.id}`,id:n.id,name:n.name})))},Z=De;var He=({contentWidth:o,cellWidth:e,lineClassName:r})=>{let n=_react.useMemo.call(void 0, ()=>{let i=[],c=r?"line "+r:"line";if(o)for(let d=e;d<o;d=d+e)i.push(_react2.default.createElement("div",{key:`line_${d}`,className:c}));return i},[e,o]),t=_react.useMemo.call(void 0, ()=>o?o-n.length*e:0,[o,e,n]);return _react2.default.createElement("div",{className:t<1?"lines-canvas hide-last-line":"lines-canvas",style:t<1?{gridTemplateColumns:`repeat(auto-fill, minmax(${e}px, 1fr))`}:{gridTemplateColumns:`repeat(auto-fill, minmax(${t}px, ${e}px))`}},n)},oe=He;var Se=({id:o,startPosition:e,width:r,top:n,height:t})=>_react2.default.createElement("div",{id:`static_event_${o}`,key:`static_event_${o}`,className:"static-event",onDrop:i=>i.stopPropagation(),style:{left:e,width:r,top:n,minHeight:t}}),re=Se;var _immer = require('immer');var B=_react.createContext.call(void 0, {dragStarted:!1,setDragStarted:()=>{}});var N=_react.createContext.call(void 0, {});var Le=(o,e)=>o.startTime-e.startTime<0||o.startTime===e.startTime&&o.endTime<e.endTime?-1:1,j=Le;var We=_react.forwardRef.call(void 0, (o,e)=>{let{setEvents:r,tick:n,id:t,windowTime:i,cellWidth:c,children:d}=o,{dragStarted:g,setDragStarted:s}=_react.useContext.call(void 0, B),{onDrop:a}=_react.useContext.call(void 0, N),u=_react.useCallback.call(void 0, f=>{f.preventDefault();let m=f.target,{left:p}=m.getBoundingClientRect(),b=f.dataTransfer.getData("eventId"),T=Math.round((f.clientX-p)/c),R=c*T;r(_immer.produce.call(void 0, l=>{let v=l.find(y=>y.id===b);if(v&&n){let y=i[0]+R*n,E=v.endTime-v.startTime,L=i[0]+E+R*n;a&&a({eventId:v.id,oldRowId:v.rowId,newRowId:o.id,startTime:y,endTime:L}),v.startTime=y,v.endTime=L,v.rowId=o.id}l.sort(j)})),s(!1)},[r,n,i,c]),w=_react.useContext.call(void 0, D),h=w&&w.rowsHeight&&w.rowsHeight[t]?w.rowsHeight[t].minHeight:40;return _react2.default.createElement("div",{id:`row_${t}`,ref:e,onDragOver:f=>f.preventDefault(),onDrop:u,className:g?"row-content not-clickable":"row-content","data-index":t,style:{minHeight:h}},d)}),ne=We;var Ie=({id:o,startPosition:e,width:r,top:n,props:t})=>{let{setDragStarted:i}=_react.useContext.call(void 0, B),c=_react.useCallback.call(void 0, s=>{s.stopPropagation(),s.dataTransfer.setData("eventId",o),setTimeout(()=>i(!0),0);let a=s.target;a.style.opacity="50%"},[i]),d=_react.useCallback.call(void 0, s=>{s.stopPropagation(),i(!1);let a=s.target;a.style.opacity="100%"},[i]),g=t!=null&&t.classNames?"event "+t.classNames.join(" "):"event";return _react2.default.createElement("div",{id:`event_${o}`,key:`event_${o}`,className:g,draggable:!(t!=null&&t.isLocked),onDragStart:c,onDragEnd:d,onMouseDown:s=>s.stopPropagation(),onMouseMove:s=>s.stopPropagation(),onDrop:s=>s.stopPropagation(),style:{left:e,width:r,top:n,cursor:t!=null&&t.isLocked?"not-allowed":"pointer"}},_react2.default.createElement("div",{className:"event-content"},t!=null&&t.content?t.content:null))},le=Ie;var je=({bodyRef:o,rowsContentRef:e})=>{let r=_react.useCallback.call(void 0, t=>{t.forEach(i=>{i.isIntersecting?i.target.classList.remove("row-hidden"):i.target.classList.add("row-hidden")})},[]),n=new IntersectionObserver(r,{root:o.current});_react.useEffect.call(void 0, ()=>(e.current&&e.current.forEach(t=>{n.observe(t)}),()=>n.disconnect()),[n])},ae=je;var Ye=({rows:o,windowTime:e,tick:r,events:n,staticEvents:t,cellWidth:i,setEvents:c,bodyRef:d})=>{let g=_react.useContext.call(void 0, D),s=null,a=_react.useRef.call(void 0, []),u=0,w=_react.useMemo.call(void 0, ()=>o.map((h,f)=>{let m=0,p=[],b=0,T=r?n.filter(l=>l.rowId===h.id).map(l=>{if(l.endTime>=e[0]&&l.startTime<=e[1]){let v=0,y=!0;for(let E=0;E<=m;E++)if(p&&p[E]&&p[E].endTime>l.startTime)v+=1;else{m>b&&(b=m),m=0,y=!1;break}return y&&(m=v),p[v]=l,_react2.default.createElement(le,{key:`event_${l.id}`,id:l.id,startPosition:(l.startTime-e[0])/r,width:(l.endTime-l.startTime)/r,top:10+22*v,props:l.props})}}):null;m>b&&(b=m),s===null?s={[h.id]:{minHeight:40+b*22}}:s[h.id]={minHeight:40+b*22},u+=40+b*22;let R=r&&t?t.filter(l=>l.rowId===h.id).map(l=>{if(l.endTime>=e[0]&&l.startTime<=e[1])return _react2.default.createElement(re,{key:`static_event_${l.id}`,id:l.id,startPosition:(l.startTime-e[0])/r,width:(l.endTime-l.startTime)/r,top:10,height:20+b*22})}):null;return _react2.default.createElement(_react2.default.Fragment,{key:`row_content_${h.id}`},_react2.default.createElement(ne,{id:h.id,ref:l=>{a.current&&a.current[f]&&l?a.current[f]=l:a.current&&l&&a.current.push(l)},setEvents:c,tick:r,windowTime:e,cellWidth:i},T,R))}),[o,n,r,e,i]);return ae({rowsContentRef:a,bodyRef:d}),_react.useEffect.call(void 0, ()=>{g&&(g.setRowsHeight(s),g.setAllRowsHeight(u))},[w]),w},ce=Ye;var Ve=_react.forwardRef.call(void 0, ({rows:o,events:e,staticEvents:r,setEvents:n,tick:t,windowTime:i,cellWidth:c,setWindowTime:d,contentWidth:g,setCellWidth:s,bodyRef:a,lineClassName:u},w)=>{let[h,f]=_react.useState.call(void 0, !1),m=_react.useRef.call(void 0, null),[p,b]=_react.useState.call(void 0, !1),{blockWidth:T}=A({windowTime:i,contentWidth:g}),R=_react.useContext.call(void 0, D),l=_react.useCallback.call(void 0, x=>{if(x.preventDefault(),!h)return;let k=x.target,{left:P}=k.getBoundingClientRect(),M=x.clientX-P,_=t?Math.floor(t*T):0;m.current&&m.current-M>=T?(m.current=M,d(z=>[z[0]+_,z[1]+_])):m.current&&M-m.current>=T&&(m.current=M,d(z=>[z[0]-_,z[1]-_]))},[T,d,h]),v=_react.useCallback.call(void 0, x=>{f(!0),x.button===1&&x.preventDefault();let k=x.target,{left:P}=k.getBoundingClientRect();m.current=x.clientX-P},[f]),y=_react.useCallback.call(void 0, ()=>{f(!1)},[f]),E=_react.useCallback.call(void 0, ()=>f(!1),[f]),L=ce({rows:o,windowTime:i,tick:t,events:e,staticEvents:r,cellWidth:c,setEvents:n,bodyRef:a}),G=_react.useCallback.call(void 0, x=>{x.preventDefault(),x.button===1&&b(k=>!k)},[]),H=_react.useCallback.call(void 0, x=>{let k=t?900/t:0;p&&s(P=>{let M=x.deltaY>0?P+k:P-k;return M<k||M>k*12?P:M})},[p,c,t]);return _react.useEffect.call(void 0, ()=>{a.current&&(a.current.style.overflow=p?"hidden":"auto")},[p]),_react2.default.createElement("div",{key:"content",ref:w,className:"content-wrapper",onMouseDown:v,onMouseUp:y,onMouseMove:l,onMouseLeave:E,onAuxClick:G,onWheel:H,style:{cursor:h?"grabbing":"grab",height:R==null?void 0:R.allRowsHeight}},_react2.default.createElement(oe,{contentWidth:g,cellWidth:c,lineClassName:u}),L)}),me=Ve;var ot=({windowTime:o,setTick:e,setCellWidth:r,contentRef:n})=>{let t=_react.useRef.call(void 0, 0),i=_react.useMemo.call(void 0, ()=>new ResizeObserver(c=>{var d;for(let g of c){let s=(d=g.borderBoxSize)==null?void 0:d[0].inlineSize;if(typeof s=="number"&&s!==t.current){t.current=s;let a=o[1]-o[0],u=a/3600;e(a/g.contentRect.width),r(g.contentRect.width/u)}}}),[o]);_react.useEffect.call(void 0, ()=>(n.current&&i.observe(n.current,{box:"border-box"}),()=>i.disconnect()),[i])},pe=ot;var Lo=({rows:o,events:e,staticEvents:r,onDrop:n,startDate:t,endDate:i,additionalClassNames:c})=>{let[d,g]=_react.useState.call(void 0, [new Date(t.getFullYear(),t.getMonth(),t.getDate(),t.getHours(),0,0).getTime()/1e3,new Date(i.getFullYear(),i.getMonth(),i.getDate(),i.getHours(),0,0).getTime()/1e3]),[s,a]=_react.useState.call(void 0, 0),[u,w]=_react.useState.call(void 0, []),h=_react.useRef.call(void 0, null),f=_react.useRef.call(void 0, null),m=_react.useRef.call(void 0, null),[p,b]=_react.useState.call(void 0, null),[T,R]=_react.useState.call(void 0, 0),[l,v]=_react.useState.call(void 0, null),[y,E]=_react.useState.call(void 0, 0);_react.useEffect.call(void 0, ()=>{if(h.current){let H=d[1]-d[0],x=H/3600;b(H/h.current.getBoundingClientRect().width),a(h.current.getBoundingClientRect().width/x)}},[]),_react.useEffect.call(void 0, ()=>{m.current&&R(m.current.getBoundingClientRect().width-m.current.scrollWidth)},[]),_react.useEffect.call(void 0, ()=>{w(e.sort(j))},[e]);let[L,G]=_react.useState.call(void 0, !1);return _react.useEffect.call(void 0, ()=>{let H=null;o.forEach(x=>{H===null?H={[x.id]:{minHeight:40}}:H[x.id]={minHeight:40}}),v(H)},[o]),pe({contentRef:h,setCellWidth:a,setTick:b,windowTime:d}),_react2.default.createElement("div",{className:"main-wrapper",ref:f},_react2.default.createElement(K,{windowTime:d,tick:p,contentWidth:h.current?h.current.getBoundingClientRect().width:null,scrollWidth:T}),_react2.default.createElement("div",{className:"body-wrapper",ref:m},_react2.default.createElement(D.Provider,{value:{rowsHeight:l,setRowsHeight:v,allRowsHeight:y,setAllRowsHeight:E}},_react2.default.createElement(Z,{rows:o,className:c==null?void 0:c.rowsHeader}),_react2.default.createElement(B.Provider,{value:{dragStarted:L,setDragStarted:G}},_react2.default.createElement(N.Provider,{value:{onDrop:n}},_react2.default.createElement(me,{events:u,staticEvents:r,rows:o,setEvents:w,tick:p,windowTime:d,cellWidth:s,setWindowTime:g,ref:h,setCellWidth:a,contentWidth:h.current?h.current.getBoundingClientRect().width:null,bodyRef:m,lineClassName:c==null?void 0:c.gridLine}))))))};exports.Timeline = Lo;
//# sourceMappingURL=index.js.map