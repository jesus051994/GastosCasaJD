const SUPABASE_URL='https://bdpflidqavgtdcipcidd.supabase.co';
const SUPABASE_KEY='sb_publishable_EXdcAXMDvkBF4qMP3twwMA_mdNb6vLE';
const {createClient}=window.supabase;
const db=createClient(SUPABASE_URL,SUPABASE_KEY);

let movements=[], pendings=[], shopping=[], currentMonth=new Date();
const CRC=new Intl.NumberFormat('es-CR',{style:'currency',currency:'CRC',maximumFractionDigits:0});
const MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const GROUPS={
 'Casa':['Comida','Luz','Agua','Internet','Alquiler / Hipoteca','Gas','Limpieza','Mantenimiento','Muebles / Hogar','Seguridad','Otros'],
 'Carro':['Combustible','Aceite','Llantas','Mantenimiento','Repuestos','Lavado','Marchamo','Seguro','Parqueo / Peajes','Revisión técnica','Otros'],
 'Salud':['Consultas médicas','Medicamentos','Dentista','Exámenes','Cuidado personal','Otros'],
 'Educación':['Matrícula','Universidad / Colegio','Cursos','Libros','Materiales','Transporte','Otros'],
 'Transporte':['Bus / Taxi','Uber / DiDi','Tren','Pasajes','Otros'],
 'Alimentación':['Supermercado','Restaurantes','Comida rápida','Delivery','Otros'],
 'Mascotas':['Alimento','Veterinario','Medicamentos','Accesorios','Otros'],
 'Ropa':['Ropa','Calzado','Accesorios','Otros'],
 'Entretenimiento':['Salidas','Streaming','Cine','Eventos','Hobbies','Otros'],
 'Deudas':['Tarjetas','Préstamos','Cuotas','Otros'],
 'Seguros':['Seguro de vida','Seguro médico','Seguro del hogar','Otros'],
 'Impuestos':['Impuestos','Permisos','Multas','Otros'],
 'Suscripciones':['Internet','Telefonía','Streaming','Apps / Software','Otros'],
 'Viajes':['Hospedaje','Pasajes','Alimentación','Actividades','Otros'],
 'Trabajo':['Transporte','Alimentación','Materiales','Uniforme','Otros'],
 'Ahorro':['Ahorro','Fondo de emergencia','Inversión','Otros'],
 'Regalos':['Regalos','Donaciones','Celebraciones','Otros'],
 'Otros':['Otros']
};

const GROUP_EMOJI={
 'Casa':'🏠',
 'Carro':'🚗',
 'Salud':'❤️',
 'Educación':'🎓',
 'Transporte':'🚌',
 'Alimentación':'🛒',
 'Mascotas':'🐾',
 'Ropa':'👕',
 'Entretenimiento':'🎬',
 'Deudas':'💳',
 'Seguros':'🛡️',
 'Impuestos':'🧾',
 'Suscripciones':'📱',
 'Viajes':'✈️',
 'Trabajo':'💼',
 'Ahorro':'🏦',
 'Regalos':'🎁',
 'Otros':'📦'
};

function money(n){
 return CRC.format(n||0);
}

function key(d){
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function label(d){
 return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function esc(t){
 const x=document.createElement('div');
 x.textContent=t??'';
 return x.innerHTML;
}

function status(t,ok=true){
 const e=document.getElementById('sync-status');
 e.textContent=t;
 e.classList.toggle('offline',!ok);
}

function dateShort(v){
 if(!v)return '—';
 const [y,m,d]=v.split('-');
 return `${d}/${m}/${y.slice(2)}`;
}

function fillGroups(selectId){
 const s=document.getElementById(selectId);
 s.innerHTML='';
 Object.keys(GROUPS).forEach(g=>{
  const o=document.createElement('option');
  o.value=g;
  o.textContent=`${GROUP_EMOJI[g]} ${g}`;
  s.appendChild(o);
 });
}

function fillCategories(groupSelect,categorySelect){
 const g=document.getElementById(groupSelect).value;
 const s=document.getElementById(categorySelect);
 s.innerHTML='';
 (GROUPS[g]||['Otros']).forEach(c=>{
  const o=document.createElement('option');
  o.value=c;
  o.textContent=c;
  s.appendChild(o);
 });
}

function setType(t){
 const inc=t==='ingreso';
 document.getElementById('expense-fields').classList.toggle('hidden',inc);
 document.getElementById('income-fields').classList.toggle('hidden',!inc);
 document.getElementById('expense-option').classList.toggle('active',!inc);
 document.getElementById('income-option').classList.toggle('active',inc);
 document.getElementById('save-button').textContent=inc?'Agregar ingreso':'Agregar gasto';
}

async function loadAll(){
 status('☁️ Sincronizando...');

 const [a,b,c]=await Promise.all([
  db.from('gastos').select('id,descripcion,monto,fecha,categoria,grupo,tipo,creado_en').order('fecha',{ascending:false}),
  db.from('pendientes').select('*').order('fecha_pago',{ascending:true,nullsFirst:false}),
  db.from('compras').select('*').order('comprado',{ascending:true}).order('creado_en',{ascending:false})
 ]);

 if(a.error||b.error||c.error){
  console.error(a.error,b.error,c.error);
  status('⚠️ Revisa la configuración',false);
  return;
 }

 movements=a.data.map(x=>({
  id:x.id,
  desc:x.descripcion,
  amount:Number(x.monto),
  date:x.fecha||'',
  category:x.categoria,
  group:x.grupo||'Otros',
  type:x.tipo||'gasto'
 }));

 pendings=b.data;
 shopping=c.data;

 status('☁️ Sincronizado');
 renderAll();
}

function renderAll(){
 renderSummary();
 renderMovements();
 renderPending();
 renderShopping();
}

function renderSummary(){
 const k=key(currentMonth);
 const m=movements.filter(x=>x.date && x.date.startsWith(k));
 const inc=m.filter(x=>x.type==='ingreso').reduce((s,x)=>s+x.amount,0);
 const ex=m.filter(x=>x.type==='gasto');
 const total=ex.reduce((s,x)=>s+x.amount,0);

 document.getElementById('current-month-label').textContent=label(currentMonth);
 document.getElementById('current-month-label-2').textContent=label(currentMonth);
 document.getElementById('month-income').textContent=money(inc);
 document.getElementById('month-expenses').textContent=money(total);
 document.getElementById('month-balance').textContent=money(inc-total);

 const box=document.getElementById('group-summary');
 box.innerHTML='';

 const totals={};

 ex.forEach(x=>{
  totals[x.group]=(totals[x.group]||0)+x.amount;
 });

 Object.keys(GROUPS)
  .filter(g=>totals[g])
  .sort((a,b)=>totals[b]-totals[a])
  .forEach(g=>{
   const d=document.createElement('div');
   d.className='group-card';
   d.innerHTML=`<span>${GROUP_EMOJI[g]} ${g}</span><strong>${money(totals[g])}</strong>`;
   box.appendChild(d);
  });

 if(!box.children.length){
  box.innerHTML='<div class="mini-note">Todavía no hay gastos registrados este mes.</div>';
 }
}

function renderMovements(){
 const k=key(currentMonth);
 const q=document.getElementById('search').value.trim().toLowerCase();

 const m=movements.filter(x=>x.date && x.date.startsWith(k));

 const v=q
  ?m.filter(x=>`${x.desc} ${x.group} ${x.category} ${x.type}`.toLowerCase().includes(q))
  :m;

 const body=document.getElementById('expense-rows');
 body.innerHTML='';

 document.getElementById('empty-state').style.display=v.length?'none':'block';

 [...v]
  .sort((a,b)=>(b.date||'').localeCompare(a.date||''))
  .forEach(x=>{
   const tr=document.createElement('tr');

   tr.innerHTML=`
   <td>${dateShort(x.date)}</td>
   <td>
    <span class="type-pill ${x.type==='ingreso'?'income-pill':'expense-pill'}">
     ${x.type==='ingreso'?'Ingreso':'Gasto'}
    </span>
   </td>
   <td>${esc(x.desc)}</td>
   <td>${x.type==='ingreso'?'💰 Ingreso':GROUP_EMOJI[x.group]+' '+esc(x.group)}</td>
   <td><span class="cat-pill">${esc(x.category)}</span></td>
   <td class="num ${x.type==='ingreso'?'income-amount':'expense-amount'}">
    ${x.type==='ingreso'?'+':'-'}${money(x.amount)}
   </td>
   <td>
    <button class="delete-btn" data-id="${x.id}">Eliminar</button>
   </td>`;

   body.appendChild(tr);
  });
}

function pendingDateText(v){
 if(!v)return 'Sin fecha';

 const d=new Date(v+'T00:00:00');

 return d.toLocaleDateString('es-CR',{
  day:'2-digit',
  month:'short',
  year:'numeric'
 });
}

function renderPending(){
 const box=document.getElementById('pending-list');
 box.innerHTML='';

 document.getElementById('pending-empty').style.display=pendings.length?'none':'block';

 pendings.forEach(p=>{
  const card=document.createElement('div');
  card.className='pending-card';

  card.innerHTML=`
  <div class="card-main">
   <strong>${esc(p.descripcion)}</strong>
   <span>${GROUP_EMOJI[p.grupo]||'📦'} ${esc(p.grupo)} · ${esc(p.categoria)}</span>
   <small>
    📅 ${pendingDateText(p.fecha_pago)}
    ${p.monto?` · Estimado: ${money(Number(p.monto))}`:''}
   </small>
  </div>
  <div class="card-actions">
   <button class="convert-btn" data-id="${p.id}">Pasar a gasto</button>
   <button class="delete-btn pending-delete" data-id="${p.id}">Eliminar</button>
  </div>`;

  box.appendChild(card);
 });
}

function renderShopping(){
 const box=document.getElementById('shopping-list');
 box.innerHTML='';

 document.getElementById('shopping-empty').style.display=shopping.length?'none':'block';

 shopping.forEach(x=>{
  const card=document.createElement('div');

  card.className=`shopping-item ${x.comprado?'bought':''}`;

  card.innerHTML=`
  <label class="check-wrap">
   <input type="checkbox" class="buy-check" data-id="${x.id}" ${x.comprado?'checked':''}>
   <span></span>
  </label>
  <div class="shop-main">
   <strong>${esc(x.producto)}</strong>
   <small>
    ${esc(x.cantidad||'')}
    ${x.categoria?'· '+esc(x.categoria):''}
    ${x.nota?' · '+esc(x.nota):''}
   </small>
  </div>
  <button class="delete-btn shopping-delete" data-id="${x.id}">Eliminar</button>`;

  box.appendChild(card);
 });
}

document.querySelectorAll('.nav-btn').forEach(b=>
 b.addEventListener('click',()=>{
  document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));

  b.classList.add('active');
  document.getElementById('view-'+b.dataset.view).classList.add('active');
 })
);

document.querySelectorAll('input[name="type"]').forEach(i=>
 i.addEventListener('change',e=>setType(e.target.value))
);

document.getElementById('group').addEventListener('change',()=>{
 fillCategories('group','category');
});

document.getElementById('pending-group').addEventListener('change',()=>{
 fillCategories('pending-group','pending-category');
});

document.getElementById('search').addEventListener('input',renderMovements);

async function addMovement(e){
 e.preventDefault();

 const type=document.querySelector('input[name="type"]:checked').value;
 const desc=document.getElementById('desc').value.trim();
 const amount=Number(document.getElementById('amount').value);
 const date=document.getElementById('date').value;

 if(!desc||!amount||amount<=0||!date)return;

 const group=type==='ingreso'
  ?'Ingresos'
  :document.getElementById('group').value;

 const category=type==='ingreso'
  ?document.getElementById('income-category').value
  :document.getElementById('category').value;

 status('☁️ Guardando...');

 const {error}=await db.from('gastos').insert({
  descripcion:desc,
  monto:amount,
  fecha:date,
  categoria:category,
  grupo:group,
  tipo:type
 });

 if(error){
  console.error(error);
  status('⚠️ No se pudo guardar',false);
  alert('No se pudo guardar.');
  return;
 }

 currentMonth=new Date(date+'T00:00:00');

 e.target.reset();

 document.getElementById('date').value=date;

 setType('gasto');
 fillGroups('group');
 fillCategories('group','category');

 await loadAll();
}

document.getElementById('movement-form').addEventListener('submit',addMovement);

document.getElementById('expense-rows').addEventListener('click',async e=>{
 const b=e.target.closest('.delete-btn');

 if(!b)return;

 if(!confirm('¿Eliminar este movimiento?'))return;

 status('☁️ Eliminando...');

 const {error}=await db.from('gastos').delete().eq('id',b.dataset.id);

 if(error){
  status('⚠️ No se pudo eliminar',false);
  return;
 }

 await loadAll();
});

async function addPending(e){
 e.preventDefault();

 const desc=document.getElementById('pending-desc').value.trim();
 const amount=Number(document.getElementById('pending-amount').value)||null;
 const date=document.getElementById('pending-date').value||null;
 const group=document.getElementById('pending-group').value;
 const category=document.getElementById('pending-category').value;

 if(!desc)return;

 status('☁️ Guardando pendiente...');

 const {error}=await db.from('pendientes').insert({
  descripcion:desc,
  monto:amount,
  fecha_pago:date,
  grupo:group,
  categoria:category
 });

 if(error){
  console.error(error);
  status('⚠️ No se pudo guardar',false);
  alert('No se pudo guardar el pendiente. Ejecuta primero el SQL de actualización.');
  return;
 }

 e.target.reset();

 fillCategories('pending-group','pending-category');

 await loadAll();
}

document.getElementById('pending-form').addEventListener('submit',addPending);

document.getElementById('pending-list').addEventListener('click',async e=>{
 const del=e.target.closest('.pending-delete');
 const conv=e.target.closest('.convert-btn');

 if(del){
  if(!confirm('¿Eliminar este pendiente?'))return;

  await db.from('pendientes').delete().eq('id',del.dataset.id);

  await loadAll();

  return;
 }

 if(conv){
  const p=pendings.find(x=>x.id===conv.dataset.id);

  if(!p)return;

  const date=p.fecha_pago||new Date().toISOString().slice(0,10);

  if(!p.monto){
   alert('Este pendiente no tiene monto. Puedes eliminarlo y registrarlo manualmente cuando tengas el monto.');
   return;
  }

  const {error}=await db.from('gastos').insert({
   descripcion:p.descripcion,
   monto:p.monto,
   fecha:date,
   categoria:p.categoria,
   grupo:p.grupo,
   tipo:'gasto'
  });

  if(error){
   alert('No se pudo convertir en gasto.');
   return;
  }

  await db.from('pendientes').delete().eq('id',p.id);

  await loadAll();
 }
});

async function addShopping(e){
 e.preventDefault();

 const producto=document.getElementById('shopping-product').value.trim();

 if(!producto)return;

 status('☁️ Guardando compra...');

 const {error}=await db.from('compras').insert({
  producto:producto,
  cantidad:document.getElementById('shopping-qty').value.trim(),
  categoria:document.getElementById('shopping-category').value,
  nota:document.getElementById('shopping-note').value.trim(),
  comprado:false
 });

 if(error){
  console.error(error);
  status('⚠️ No se pudo guardar',false);
  alert('No se pudo guardar la compra. Ejecuta primero el SQL.');
  return;
 }

 e.target.reset();

 await loadAll();
}

document.getElementById('shopping-form').addEventListener('submit',addShopping);

document.getElementById('shopping-list').addEventListener('change',async e=>{
 if(!e.target.classList.contains('buy-check'))return;

 await db.from('compras')
  .update({comprado:e.target.checked})
  .eq('id',e.target.dataset.id);

 await loadAll();
});

document.getElementById('shopping-list').addEventListener('click',async e=>{
 const b=e.target.closest('.shopping-delete');

 if(!b)return;

 await db.from('compras')
  .delete()
  .eq('id',b.dataset.id);

 await loadAll();
});

document.getElementById('clear-bought').addEventListener('click',async()=>{
 if(!confirm('¿Eliminar todos los productos marcados como comprados?'))return;

 await db.from('compras')
  .delete()
  .eq('comprado',true);

 await loadAll();
});

function changeMonth(delta){
 currentMonth=new Date(
  currentMonth.getFullYear(),
  currentMonth.getMonth()+delta,
  1
 );

 renderAll();
}

['prev-month','prev-month-2'].forEach(id=>
 document.getElementById(id).addEventListener('click',()=>changeMonth(-1))
);

['next-month','next-month-2'].forEach(id=>
 document.getElementById(id).addEventListener('click',()=>changeMonth(1))
);

(function init(){
 const today=new Date().toISOString().slice(0,10);

 document.getElementById('date').value=today;

 fillGroups('group');
 fillCategories('group','category');

 fillGroups('pending-group');
 fillCategories('pending-group','pending-category');

 setType('gasto');

 loadAll();

 setInterval(loadAll,5000);
})();
