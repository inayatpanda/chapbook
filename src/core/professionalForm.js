// Shared site-details editor used by Chapbook and Atelier, including local Helm.
const fields=[
 ['eyebrow','Short label','text','Independent consultant'],
 ['heading','Homepage heading','text','Your main introduction'],
 ['intro','Introduction','textarea','What you do, who you help, and how you work.'],
 ['location','Location','text','City, area or practice address'],
 ['hours','Hours / availability note','textarea','By appointment'],
 ['email','Public email','email','hello@example.com'],
 ['phone','Public phone','tel',''],
 ['bookingUrl','Booking page','url','https://…'],
 ['bookingLabel','Booking button text','text','Book an appointment'],
 ['credentials','Qualifications or useful details — one per line','textarea',''],
];
function field(key,label,type,value,placeholder){
 const wrap=document.createElement('div'),lab=document.createElement('label'),input=document.createElement(type==='textarea'?'textarea':'input');
 input.id='pro-'+key;input.dataset.field=key;lab.htmlFor=input.id;lab.textContent=label;
 if(type!=='textarea')input.type=type;else input.rows=key==='intro'?3:2;
 input.value=value||'';input.placeholder=placeholder||'';input.style.width='100%';input.style.marginBottom='.7rem';
 wrap.append(lab,input);return wrap;
}
let serviceSequence=0;
function serviceRow(host,service={}){
 const rowId=++serviceSequence;
 const row=document.createElement('div');row.className='pro-service-editor';row.style.cssText='border-top:1px solid var(--line);padding:1rem 0';
 for(const [key,label] of [['name','Service name'],['description','Description'],['price','Price or price note (optional)'],['duration','Duration (optional)'],['bookingUrl','Service booking link (optional)']]){
  const wrap=field('service-'+rowId+'-'+key,label,key==='description'?'textarea':key==='bookingUrl'?'url':'text',service[key],'');
  wrap.querySelector('input,textarea').dataset.service=key;row.append(wrap);
 }
 const remove=document.createElement('button');remove.type='button';remove.className='btn ghost';remove.textContent='Remove service';remove.onclick=()=>row.remove();row.append(remove);host.append(row);
}
export function renderForm(root,value={}){
 if(!root)return;
 const p=value&&typeof value==='object'?value:{};root.replaceChildren();root.dataset.loaded='true';
 for(const [key,label,type,placeholder] of fields)root.append(field(key,label,type,key==='credentials'?(p.credentials||[]).join('\n'):p[key],placeholder));
 const hint=document.createElement('p');hint.className='sub';hint.textContent='Paste your Cal.com event link to offer an on-site calendar, or link to another booking service. Your provider saves appointments and handles confirmation emails. Connect your calendar and, for paid appointments, Stripe in your provider account. Prices below are display text; set the actual charge in the booking service.';root.append(hint);
 const title=document.createElement('h3');title.textContent='Services';root.append(title);
 const rows=document.createElement('div');rows.dataset.services='';root.append(rows);
 for(const service of (Array.isArray(p.services)?p.services:[]))serviceRow(rows,service);
 const add=document.createElement('button');add.type='button';add.className='btn ghost';add.textContent='Add a service';add.onclick=()=>{if(rows.children.length<8)serviceRow(rows);};root.append(add);
}
export function readForm(root,current={}){
 if(!root||root.dataset.loaded!=='true')return current;
 const result={...current};
 for(const [key] of fields){const input=root.querySelector('[data-field="'+key+'"]');if(!input.checkValidity()){input.reportValidity();throw Error('Please check '+key.replace(/([A-Z])/g,' $1').toLowerCase()+'.');}result[key]=input.value.trim();}
 if(result.bookingUrl){let u;try{u=new URL(result.bookingUrl);}catch{}if(!u||u.protocol!=='https:'||u.username||u.password)throw Error('Use a complete HTTPS booking link without a username or password.');}
 for(const input of root.querySelectorAll('[data-service=bookingUrl]')){if(input.value.trim()){let u;try{u=new URL(input.value.trim());}catch{}if(!u||u.protocol!=='https:'||u.username||u.password)throw Error('Use a complete HTTPS link for each service booking.');}}
 result.credentials=result.credentials.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,8);
 result.services=[...root.querySelectorAll('.pro-service-editor')].map(row=>Object.fromEntries([...row.querySelectorAll('[data-service]')].map(input=>[input.dataset.service,input.value.trim()]))).filter(s=>s.name).slice(0,8);
 return result;
}
