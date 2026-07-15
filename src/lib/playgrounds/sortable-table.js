/* Family: sortable-table — a small dataset the reader can sort (tap a header;
   numeric-aware, aria-sort) and optionally filter live. For evidence tables and
   comparisons. Header cells are real <button>s; the filter is a labelled input.
   No storage, no network; everything ships in CONFIG. */
import { esc } from './index.js';

export default {
  id: 'sortable-table',
  name: 'Sortable table',
  category: 'Data',
  description: 'A table the reader can sort by any column (numbers sort numerically) and filter live — for evidence and comparison tables.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['columns', 'rows'],
    properties: {
      columns: { type: 'array', minItems: 2, maxItems: 6, title: 'Column headings', items: { type: 'string' } },
      rows: {
        type: 'array', minItems: 1, maxItems: 30, title: 'Rows (one cell per column)',
        items: { type: 'array', items: { type: 'string' } },
      },
      filterable: { type: 'boolean', default: true, title: 'Show a filter box above the table' },
    },
  },
  presets: [
    {
      name: 'Landmark shoulder trials',
      params: {
        columns: ['Trial', 'Year', 'N', 'Verdict'],
        rows: [
          ['ProFHER', '2015', '250', 'Surgery no better for displaced proximal humerus'],
          ['UKUFF', '2017', '460', 'Open ≈ arthroscopic cuff repair'],
          ['CSAW', '2018', '313', 'Decompression ≈ placebo surgery'],
          ['FISH', '2019', '210', 'Operative ≈ functional bracing for humeral shaft'],
        ],
        filterable: true,
      },
    },
    {
      name: 'Comparison grid',
      params: {
        columns: ['Option', 'Cost', 'Speed', 'Note'],
        rows: [
          ['A', '120', '3', 'The safe default'],
          ['B', '85', '5', 'Cheaper but slower'],
          ['C', '210', '1', 'Fast and dear'],
        ],
        filterable: false,
      },
    },
  ],
  build(params, domId) {
    const cols = (Array.isArray(params.columns) ? params.columns : []).slice(0, 6).map((c) => String(c == null ? '' : c));
    const rows = (Array.isArray(params.rows) ? params.rows : []).slice(0, 30)
      .map((r) => (Array.isArray(r) ? r : []).slice(0, cols.length).map((c) => String(c == null ? '' : c)));
    const filter = params.filterable !== false
      ? `<input class="pg-st-filter" data-role="filter" type="search" placeholder="Filter rows…" aria-label="Filter rows">`
      : '';
    let thead = '';
    cols.forEach((c, i) => {
      thead += `<th scope="col" aria-sort="none" data-role="th" data-idx="${i}">` +
        `<button type="button" class="pg-st-sort">${esc(c)}<span class="pg-st-arrow" aria-hidden="true"></span></button></th>`;
    });
    let tbody = '';
    rows.forEach((r) => {
      tbody += '<tr>' + cols.map((_, i) => `<td>${esc(r[i] == null ? '' : r[i])}</td>`).join('') + '</tr>';
    });
    const html =
      `<div class="pg-stage">${filter}` +
      `<div class="pg-st-scroll"><table class="pg-st" data-role="table">` +
      `<thead><tr>${thead}</tr></thead><tbody data-role="tbody">${tbody}</tbody>` +
      `</table></div>` +
      `<div class="pg-readout pg-st-count" data-role="count" aria-live="polite"></div>` +
      `</div>`;
    const css = [
      `#${domId} .pg-st-filter{width:100%;box-sizing:border-box;min-height:44px;margin:0 0 .6rem;background:rgba(140,160,200,.05);` +
        `border:1px solid var(--line,#23304a);border-radius:9px;color:var(--ink,#e9eef8);padding:.55rem .75rem;font:inherit;font-size:16px}`,
      `#${domId} .pg-st-filter:focus{outline:none;border-color:#22d3ee}`,
      `#${domId} .pg-st-scroll{overflow-x:auto;border:1px solid var(--line,#23304a);border-radius:10px}`,
      `#${domId} .pg-st{width:100%;border-collapse:collapse;font-size:.9rem}`,
      `#${domId} .pg-st th{position:sticky;top:0;background:rgba(20,28,46,.97);text-align:left;padding:0;border-bottom:1px solid var(--line,#23304a)}`,
      `#${domId} .pg-st-sort{width:100%;display:flex;align-items:center;gap:.35rem;min-height:44px;padding:.5rem .75rem;border:0;` +
        `background:transparent;color:var(--ink,#e9eef8);font:650 .82rem system-ui;cursor:pointer;white-space:nowrap}`,
      `#${domId} .pg-st-sort:hover{color:#22d3ee}`,
      `#${domId} .pg-st-sort:focus-visible{outline:2px solid #22d3ee;outline-offset:-2px}`,
      `#${domId} .pg-st th[aria-sort=ascending] .pg-st-arrow::after{content:"▲";font-size:.7em;color:#22d3ee}`,
      `#${domId} .pg-st th[aria-sort=descending] .pg-st-arrow::after{content:"▼";font-size:.7em;color:#22d3ee}`,
      `#${domId} .pg-st td{padding:.55rem .75rem;border-bottom:1px solid rgba(35,48,74,.55);color:var(--ink-dim,#cdd6e6);vertical-align:top}`,
      `#${domId} .pg-st tbody tr:last-child td{border-bottom:0}`,
      `#${domId} .pg-st tbody tr:hover td{background:rgba(34,211,238,.05)}`,
      `#${domId} .pg-st-count{margin-top:.5rem;font-size:.8rem;color:var(--ink-faint,#717d99)}`,
    ].join('\n');
    const jsBody = `
var COLS=(CONFIG.columns||[]).map(String);
var ROWS=(CONFIG.rows||[]).map(function(r){return (r||[]).map(function(c){return String(c==null?'':c);});});
var tbody=$('[data-role=tbody]');
var ths=$$('[data-role=th]');
var filter=$('[data-role=filter]');
var count=$('[data-role=count]');
if(!tbody||!ROWS.length)return;
var sortCol=-1,sortDir=1,query='';
function numeric(col){return ROWS.every(function(r){return r[col]===''||!isNaN(parseFloat(r[col]));});}
function view(){
  var rows=ROWS.slice();
  if(query){var q=query.toLowerCase();rows=rows.filter(function(r){return r.join(' ').toLowerCase().indexOf(q)>=0;});}
  if(sortCol>=0){
    var num=numeric(sortCol);
    rows.sort(function(a,b){
      var x=a[sortCol]||'',y=b[sortCol]||'';
      if(num)return (parseFloat(x)||0)>(parseFloat(y)||0)?sortDir:-sortDir;
      return x<y?-sortDir:x>y?sortDir:0;
    });
  }
  return rows;
}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');}
function paint(){
  var rows=view();
  tbody.innerHTML=rows.map(function(r){
    return '<tr>'+COLS.map(function(_,i){return '<td>'+esc(r[i]==null?'':r[i])+'</td>';}).join('')+'</tr>';
  }).join('');
  if(count)count.textContent=rows.length===ROWS.length?ROWS.length+' rows':rows.length+' of '+ROWS.length+' rows';
  ths.forEach(function(th,i){
    th.setAttribute('aria-sort',i!==sortCol?'none':(sortDir>0?'ascending':'descending'));
  });
}
ths.forEach(function(th){
  th.querySelector('button').addEventListener('click',function(){
    var i=parseInt(th.getAttribute('data-idx'),10)||0;
    if(sortCol===i)sortDir=-sortDir;else{sortCol=i;sortDir=1;}
    paint();
  });
});
if(filter)filter.addEventListener('input',function(){query=filter.value;paint();});
paint();
`;
    return { html, css, jsBody };
  },
};
