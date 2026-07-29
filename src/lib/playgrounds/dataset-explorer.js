/* Family: dataset-explorer — a small inline dataset with search, category filter,
   sorting, and an accessible table/bar-view toggle. Data stays in the exported
   document. Row/column caps protect phone performance and keep the authoring form
   usable; the table is always available as the semantic source of truth. */
import { esc } from './index.js';

export default {
  id: 'dataset-explorer',
  name: 'Dataset explorer',
  category: 'Data',
  description: 'Search, filter, sort and chart a small inline dataset. For comparisons, ranked lists and evidence-led posts.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['columns', 'rows'],
    properties: {
      columns: { type: 'array', minItems: 2, maxItems: 8, title: 'Column names', items: { type: 'string' } },
      rows: {
        type: 'array', minItems: 1, maxItems: 100, title: 'Rows (one value per column)',
        items: { type: 'array', minItems: 2, maxItems: 8, items: { type: 'string' } },
      },
      labelColumn: { type: 'integer', minimum: 0, maximum: 7, default: 0, title: 'Label column number (0-based)' },
      categoryColumn: { type: 'integer', minimum: -1, maximum: 7, default: 1, title: 'Category filter column (-1 for none)' },
      valueColumn: { type: 'integer', minimum: -1, maximum: 7, default: 2, title: 'Numeric chart column (-1 for table only)' },
      initialView: { type: 'string', enum: ['table', 'bars'], default: 'table', title: 'Initial view' },
    },
  },
  presets: [
    {
      name: 'City weekend comparison',
      params: {
        columns: ['City', 'Region', 'Typical daily cost', 'Museums', 'Walkability'],
        rows: [
          ['Lisbon', 'Southern Europe', '95', '28', 'High'],
          ['Kraków', 'Central Europe', '72', '42', 'High'],
          ['Copenhagen', 'Northern Europe', '165', '55', 'High'],
          ['Edinburgh', 'Northern Europe', '140', '35', 'Medium'],
          ['Valencia', 'Southern Europe', '88', '19', 'High'],
          ['Ljubljana', 'Central Europe', '82', '16', 'High'],
        ],
        labelColumn: 0, categoryColumn: 1, valueColumn: 2, initialView: 'table',
      },
    },
  ],
  build(params, domId) {
    const cols = (Array.isArray(params.columns) ? params.columns : []).slice(0, 8).map((x) => String(x == null ? '' : x));
    const rows = (Array.isArray(params.rows) ? params.rows : []).slice(0, 100).map((r) =>
      (Array.isArray(r) ? r : []).slice(0, cols.length).map((x) => String(x == null ? '' : x))
    );
    const heads = cols.map((c, i) => `<th scope="col" aria-sort="none" data-role="th" data-idx="${i}"><button type="button">${esc(c)}<span aria-hidden="true"></span></button></th>`).join('');
    const body = rows.map((r) => `<tr>${cols.map((_, i) => `<td>${esc(r[i] || '')}</td>`).join('')}</tr>`).join('');
    const html =
      `<div class="pg-stage"><div class="pg-de-tools">` +
      `<input type="search" data-role="search" placeholder="Search rows…" aria-label="Search dataset">` +
      `<select data-role="category" aria-label="Filter category"><option value="">All categories</option></select>` +
      `<div class="pg-de-tabs" role="group" aria-label="Dataset view"><button type="button" data-view="table">Table</button><button type="button" data-view="bars">Bars</button></div></div>` +
      `<div class="pg-de-tablewrap" data-role="tableview"><table><thead><tr>${heads}</tr></thead><tbody data-role="tbody">${body}</tbody></table></div>` +
      `<div class="pg-de-bars" data-role="bars" hidden></div><div class="pg-readout pg-de-count" data-role="count" aria-live="polite"></div></div>`;
    const css = [
      `#${domId} .pg-de-tools{display:grid;grid-template-columns:minmax(9rem,1fr) minmax(9rem,.7fr) auto;gap:.5rem;margin-bottom:.65rem}`,
      `#${domId} .pg-de-tools input,#${domId} .pg-de-tools select{min-height:44px;border:1px solid var(--line,#23304a);border-radius:9px;background:rgba(140,160,200,.05);color:var(--ink,#e9eef8);font:inherit;font-size:16px;padding:.45rem .65rem}`,
      `#${domId} .pg-de-tools input:focus,#${domId} .pg-de-tools select:focus{outline:2px solid #22d3ee;outline-offset:1px}`,
      `#${domId} .pg-de-tabs{display:flex}`,
      `#${domId} .pg-de-tabs button{min-height:44px;border:1px solid var(--line,#23304a);background:transparent;color:var(--ink-dim,#9fb3c8);font:600 .8rem system-ui;padding:.4rem .65rem;cursor:pointer}`,
      `#${domId} .pg-de-tabs button:first-child{border-radius:9px 0 0 9px}#${domId} .pg-de-tabs button:last-child{border-radius:0 9px 9px 0}`,
      `#${domId} .pg-de-tabs button.is-on{background:rgba(34,211,238,.12);border-color:#22d3ee;color:#22d3ee}`,
      `#${domId} .pg-de-tablewrap{overflow:auto;border:1px solid var(--line,#23304a);border-radius:10px}`,
      `#${domId} table{width:100%;border-collapse:collapse;font-size:.86rem}`,
      `#${domId} th{background:rgba(20,28,46,.97);padding:0;border-bottom:1px solid var(--line,#23304a);text-align:left}`,
      `#${domId} th button{width:100%;min-height:44px;border:0;background:transparent;color:#fff;font:650 .8rem system-ui;text-align:left;padding:.45rem .65rem;white-space:nowrap;cursor:pointer}`,
      `#${domId} th[aria-sort=ascending] button span::after{content:" ▲";color:#22d3ee}#${domId} th[aria-sort=descending] button span::after{content:" ▼";color:#22d3ee}`,
      `#${domId} td{padding:.5rem .65rem;border-bottom:1px solid rgba(35,48,74,.55);color:var(--ink-dim,#cdd6e6)}`,
      `#${domId} .pg-de-bars{display:grid;gap:.55rem}`,
      `#${domId} .pg-de-bar{display:grid;grid-template-columns:minmax(6rem,1fr) minmax(8rem,2fr) auto;gap:.55rem;align-items:center}`,
      `#${domId} .pg-de-barname{color:var(--ink-dim,#cdd6e6);overflow:hidden;text-overflow:ellipsis}`,
      `#${domId} .pg-de-track{height:14px;border-radius:99px;background:rgba(140,160,200,.11);overflow:hidden}`,
      `#${domId} .pg-de-fill{height:100%;background:#22d3ee;border-radius:99px}`,
      `#${domId} .pg-de-val{font-variant-numeric:tabular-nums;color:#22d3ee}`,
      `#${domId} .pg-de-count{margin-top:.5rem;color:var(--ink-faint,#717d99);font-size:.8rem}`,
      `@media(max-width:620px){#${domId} .pg-de-tools{grid-template-columns:1fr 1fr}#${domId} .pg-de-tabs{grid-column:1/-1}#${domId} .pg-de-bar{grid-template-columns:1fr auto}#${domId} .pg-de-track{grid-column:1/-1;grid-row:2}}`,
    ].join('\n');
    const jsBody = `
var COLS=(CONFIG.columns||[]).slice(0,8).map(String),ROWS=(CONFIG.rows||[]).slice(0,100).map(function(r){return (r||[]).slice(0,COLS.length).map(function(x){return String(x==null?'':x);});});
var labelCol=Math.max(0,Math.min(COLS.length-1,(+CONFIG.labelColumn)||0));
var catCol=(+CONFIG.categoryColumn);if(!isFinite(catCol)||catCol<0||catCol>=COLS.length)catCol=-1;
var valueCol=(+CONFIG.valueColumn);if(!isFinite(valueCol)||valueCol<0||valueCol>=COLS.length)valueCol=-1;
var search=$('[data-role=search]'),category=$('[data-role=category]'),tbody=$('[data-role=tbody]'),bars=$('[data-role=bars]');
var tableView=$('[data-role=tableview]'),count=$('[data-role=count]'),ths=$$('[data-role=th]'),tabs=$$('[data-view]');
var query='',cat='',sortCol=-1,sortDir=1,view=(CONFIG.initialView==='bars'&&valueCol>=0)?'bars':'table';
function clean(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
if(catCol>=0){var cats={};ROWS.forEach(function(r){if(r[catCol])cats[r[catCol]]=1;});Object.keys(cats).sort().forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;category.appendChild(o);});}
else{category.hidden=true;}
if(valueCol<0){var barTab=tabs.filter(function(t){return t.getAttribute('data-view')==='bars';})[0];if(barTab)barTab.hidden=true;}
function current(){var out=ROWS.filter(function(r){return (!cat||r[catCol]===cat)&&(!query||r.join(' ').toLowerCase().indexOf(query)>=0);});
  if(sortCol>=0)out.sort(function(a,b){var x=a[sortCol]||'',y=b[sortCol]||'',nx=parseFloat(x),ny=parseFloat(y),cmp=(!isNaN(nx)&&!isNaN(ny))?(nx-ny):(x<y?-1:x>y?1:0);return cmp*sortDir;});return out;}
function paint(){
  var data=current();tbody.innerHTML=data.map(function(r){return '<tr>'+COLS.map(function(_,i){return '<td>'+clean(r[i]||'')+'</td>';}).join('')+'</tr>';}).join('');
  var vals=data.map(function(r){return parseFloat(r[valueCol]);}).filter(function(v){return isFinite(v);}),max=vals.length?Math.max.apply(Math,vals):0;
  bars.innerHTML=valueCol<0?'':data.slice(0,30).map(function(r){var v=parseFloat(r[valueCol]);if(!isFinite(v))v=0;var pct=max>0?Math.max(0,v/max*100):0;
    return '<div class="pg-de-bar" role="img" aria-label="'+clean(r[labelCol]||'Row')+': '+clean(r[valueCol]||'0')+'"><span class="pg-de-barname">'+clean(r[labelCol]||'Row')+'</span><span class="pg-de-track"><span class="pg-de-fill" style="width:'+pct.toFixed(1)+'%"></span></span><span class="pg-de-val">'+clean(r[valueCol]||'0')+'</span></div>';}).join('');
  tableView.hidden=view!=='table';bars.hidden=view!=='bars';tabs.forEach(function(t){t.classList.toggle('is-on',t.getAttribute('data-view')===view);});
  ths.forEach(function(th,i){th.setAttribute('aria-sort',i!==sortCol?'none':(sortDir>0?'ascending':'descending'));});
  count.textContent=data.length+' of '+ROWS.length+' rows'+(view==='bars'&&data.length>30?' · first 30 charted':'');
}
search.addEventListener('input',function(){query=search.value.toLowerCase();paint();});
category.addEventListener('change',function(){cat=category.value;paint();});
ths.forEach(function(th){th.querySelector('button').addEventListener('click',function(){var i=parseInt(th.getAttribute('data-idx'),10)||0;if(sortCol===i)sortDir=-sortDir;else{sortCol=i;sortDir=1;}paint();});});
tabs.forEach(function(t){t.addEventListener('click',function(){view=t.getAttribute('data-view');paint();});});
paint();
`;
    return { html, css, jsBody };
  },
};
