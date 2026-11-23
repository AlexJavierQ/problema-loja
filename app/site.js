const $ = id => document.getElementById(id);
const demoDay = new Date().toLocaleDateString('en-CA');
const examples = [
 ['audifonos','Audífonos de diadema','encontrado','Parque Central','Audífonos plateados de diadema con almohadillas claras.','#e0e8d9'],
 ['bolso','Bolso negro','perdido','Terminal Terrestre','Bolso de mano negro con dos asas.','#eadfd3'],
 ['gafas','Gafas de sol','encontrado','Plaza de San Sebastián','Lentes de sol con marco oscuro.','#ebe7cf'],
 ['reloj','Reloj de cuero','perdido','El Valle','Reloj de pulsera con correa de cuero café.','#dce6eb']
].map(([id,title,type,place,desc,bg])=>({id,title,type,place,desc,bg,date:demoDay,img:'img/'+id+'.webp',open:true,example:true}));
const key='hallazgos-tablero-v1';
let data=JSON.parse(localStorage.getItem(key)||'{"items":[],"messages":[]}');
const all=()=>[...data.items,...examples];
let mode='todos', active='', timer, modelPromise, captionPromise;
const own=r=>!r.example;
const mine=()=>location.hash==='#mios';
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function save(){localStorage.setItem(key,JSON.stringify(data))}
function txt(tag,s,root,cls){const n=document.createElement(tag);n.textContent=s;if(cls)n.className=cls;root.append(n);return n}
function btn(root,s,fn,cls){const n=txt('button',s,root,cls);n.type='button';n.onclick=fn;return n}
function toast(s){$('toast').textContent=s;clearTimeout(timer);timer=setTimeout(()=>$('toast').textContent='',3500)}
function openDialog(id){active=id;$('body').replaceChildren();if(!$('modal').open)$('modal').showModal();return $('body')}
function image(root,r,cls){if(!r.img)return;const img=document.createElement('img');img.src=r.img;img.alt=r.title;img.className=cls||'';root.append(img)}
function close(){active='';$('modal').close()}
function render(){
 $('hero').hidden=mine();$('hero').style.display=mine()?'none':'';
 $('title').textContent=mine()?'Mis reportes':'Tablero de objetos';
 $('sub').textContent=mine()?'Consulta coincidencias, mensajes y reportes cerrados.':'Explora los reportes de la comunidad.';
 document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.hash===(mine()?'#mios':'#explorar')));
 document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('on',b.dataset.filter===mode);b.setAttribute('aria-pressed',String(b.dataset.filter===mode))});
 const q=norm($('query').value),items=all().filter(r=>(mine()?own(r):r.open)&&(mode==='todos'||mode===r.type)&&norm([r.title,r.desc,r.place].join(' ')).includes(q));
 const root=$('cards');root.replaceChildren();
 if(!items.length){const e=txt('div',mine()?'Aquí aparecerán tus reportes.':'Ningún objeto coincide con esta búsqueda.',root,'empty');btn(e,'Crear reporte',()=>form('perdido'),'primary')}
 for(const r of items){const card=btn(root,'',()=>detail(r),'card'),pic=txt('span','',card,'pic');pic.style.background=r.bg||'#e1e9db';if(r.img)image(pic,r);else txt('span','◇',pic,'placeholder');
 txt('span',r.open?(r.type==='encontrado'?'● Encontrado':'● Perdido'):'Cerrado',pic,'flag '+(r.type==='encontrado'?'f':''));const content=txt('span','',card,'cardtext');txt('strong',r.title,content);txt('small','⌖ '+r.place,content);txt('small',r.example?'Reporte de ejemplo':r.date,content)}
}
async function thumbnail(f){const src=URL.createObjectURL(f);try{const im=new Image();im.src=src;await im.decode();const c=document.createElement('canvas'),k=Math.min(1,580/Math.max(im.width,im.height));c.width=Math.max(1,im.width*k);c.height=Math.max(1,im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.76)}finally{URL.revokeObjectURL(src)}}
function form(type){
 const root=openDialog('crear');txt('h2','Nuevo reporte',root);const f=document.createElement('form');root.append(f);
 function field(label,id,tag='input'){const l=txt('label',label,f),n=document.createElement(tag);n.name=id;l.append(n);return n}
 const t=field('¿Qué ocurrió?','tipo','select');for(const [v,s] of [['perdido','Perdí un objeto'],['encontrado','Encontré un objeto']]){const o=txt('option',s,t);o.value=v}t.value=type;
 const title=field('¿Qué objeto es?','objeto');title.required=true;title.maxLength=75;title.placeholder='Ej. Termo verde';
 const desc=field('Detalles que recuerdas','descripcion','textarea');desc.maxLength=500;
 const place=field('Sector o lugar aproximado','lugar');place.required=true;place.maxLength=90;
 const date=field('Fecha aproximada','fecha');date.type='date';date.required=true;date.value=date.max=demoDay;
 const photo=field('Foto del objeto (opcional)','foto');photo.type='file';photo.accept='image/png,image/jpeg,image/webp';
 txt('small','Reserva un detalle para verificar a quién pertenece.',f);const err=txt('p','',f,'hint');err.setAttribute('role','status');
 const submit=txt('button','Guardar y ver coincidencias',f,'primary');submit.type='submit';
 f.onsubmit=async ev=>{ev.preventDefault();submit.disabled=true;try{if(!title.value.trim()||!place.value.trim())throw Error('Completa el objeto y el lugar.');const img=photo.files[0]?await thumbnail(photo.files[0]):'';
 const r={id:crypto.randomUUID(),title:title.value.trim(),desc:desc.value.trim(),place:place.value.trim(),type:t.value,date:date.value,img,open:true};data.items.unshift(r);
 try{save()}catch(e){data.items.shift();throw Error('El navegador está lleno. Prueba con menos fotos.')}render();detail(r)}catch(e){err.textContent=e.message;submit.disabled=false}}
}
const vocab=[['audifonos','auriculares','cascos','headphones'],['botella','termo','tomatodo'],['gafas','lentes','anteojos'],['bolso','cartera','bolsa'],['reloj','watch'],['mochila','morral']];
function words(r){const tokens=norm(r.title+' '+r.desc).split(/[^a-z0-9]+/).filter(w=>w.length>2&&!['con','una','los','del','para','que','por','sin','las','perdi','encontre'].includes(w));return new Set(tokens.map(w=>vocab.find(g=>g.includes(w))?.[0]||w))}
function candidates(r){return all().filter(c=>c.open&&c.type!==r.type)}
function simple(r){const a=words(r);return candidates(r).map(c=>{const b=words(c),hits=[...a].filter(w=>b.has(w)).length;return {c,score:hits/Math.sqrt(Math.max(1,a.size*b.size))}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,5)}
let transformers;
async function pipes(){if(!transformers){transformers=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/dist/transformers.min.js');transformers.env.allowLocalModels=false;transformers.env.backends.onnx.wasm.numThreads=1}return transformers}
const vecs=new Map(),captions=new Map();
async function vector(r){if(vecs.has(r.id))return vecs.get(r.id);const t=await pipes();let source=r.title+' '+r.desc;
 if(r.img){captionPromise??=t.pipeline('image-to-text','Xenova/vit-gpt2-image-captioning',{dtype:'q8',device:'wasm'});const cap=await captionPromise;let line=captions.get(r.id);if(!line){line=(await cap(r.img,{max_new_tokens:22}))[0].generated_text;captions.set(r.id,line)}source+=' '+line}
 modelPromise??=t.pipeline('feature-extraction','Xenova/paraphrase-multilingual-MiniLM-L12-v2',{dtype:'q8',device:'wasm'});const encoder=await modelPromise;const output=await encoder(source,{pooling:'mean',normalize:true});vecs.set(r.id,output.data);return output.data}
function detail(r){
 const root=openDialog(r.id);txt('h2',r.title,root);txt('p',(r.type==='perdido'?'Perdido':'Encontrado')+' · '+r.place+' · '+r.date,root,'hint');image(root,r,'preview');txt('p',r.desc,root);
 if(!own(r)){txt('p','Reporte de ejemplo. Crea el reporte opuesto para ensayar la búsqueda.',root,'hint');btn(root,'Crear mi reporte',()=>form(r.type==='perdido'?'encontrado':'perdido'),'primary');return}
 const pair=txt('div','',root);
 function list(matches){pair.replaceChildren();if(!matches.length)txt('p','Todavía no hay candidatos compatibles.',pair,'hint');for(const {c} of matches){const b=txt('div','',pair,'mini');txt('strong',c.title,b);txt('p',c.place+(c.example?' · Ejemplo':''),b,'hint');btn(b,'Ver coincidencia',()=>chat(r,c),'small')}}
 if(r.open){txt('h3','Posibles coincidencias',root);root.append(pair);list(simple(r));const explain=txt('p','Vista rápida por palabras. Puedes comparar fotos y descripciones con los modelos de IA.',root,'hint');const ai=btn(root,'Comparar con IA',async()=>{ai.disabled=true;explain.textContent='Descargando o ejecutando modelos en este dispositivo. La primera vez puede tardar varios minutos.';try{const v=await vector(r),results=[];for(const c of candidates(r)){const u=await vector(c);let score=0;for(let i=0;i<u.length;i++)score+=v[i]*u[i];if(score>=.32)results.push({c,score})}list(results.sort((a,b)=>b.score-a.score).slice(0,5));explain.textContent='Resultados por similitud semántica. Verifica un detalle antes de devolver el objeto.'}catch{modelPromise=captionPromise=undefined;explain.textContent='No se pudo cargar la IA en este navegador. La búsqueda por palabras sigue disponible.'}finally{ai.disabled=false}},'primary')}
 const peers=new Set(data.messages.filter(m=>m.from===r.id||m.to===r.id).map(m=>m.from===r.id?m.to:m.from));if(peers.size){txt('h3','Conversaciones',root);for(const id of peers){const c=all().find(p=>p.id===id);if(c)btn(root,c.title,()=>chat(r,c),'minor')}}
 if(r.open)btn(txt('div','',root,'buttons'),'Cerrar reporte',()=>{if(confirm('¿Retirar este reporte de las búsquedas?')){r.open=false;save();render();detail(r)}});else txt('p','Este reporte está cerrado.',root)
}
function chat(r,c){const root=openDialog('chat');txt('h2',c.title,root);image(root,c,'preview');txt('p',c.desc,root);txt('p',c.place+' · '+c.date,root,'hint');txt('h3','Verificación del objeto',root);for(const m of data.messages.filter(m=>(m.from===r.id&&m.to===c.id)||(m.from===c.id&&m.to===r.id)))txt('p',(m.from===r.id?'Tú: ':'Respuesta: ')+m.text,root,'mini');
 if(c.example)txt('p','Esta conversación es de muestra. Puedes ensayar una pregunta aquí.',root,'hint');if(c.open&&r.open){const f=txt('form','',root),l=txt('label','Mensaje',f),input=txt('textarea','',l);input.required=true;input.maxLength=400;const b=txt('button','Guardar mensaje',f,'primary');b.type='submit';f.onsubmit=e=>{e.preventDefault();if(!input.value.trim())return;data.messages.push({from:r.id,to:c.id,text:input.value.trim()});save();chat(r,c)}}btn(txt('div','',root,'buttons'),'Volver a mi reporte',()=>detail(r))}
$('new').onclick=$('lost').onclick=()=>form('perdido');$('found').onclick=()=>form('encontrado');$('close').onclick=close;$('modal').addEventListener('close',()=>active='');$('query').oninput=render;document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{mode=b.dataset.filter;render()});window.onhashchange=()=>{mode='todos';$('query').value='';render()};render();
