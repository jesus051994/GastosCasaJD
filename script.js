const SUPABASE_URL = 'https://bdpflidqavgtdcipcidd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_EXdcAXMDvkBF4qMP3twwMA_mdNb6vLE';

const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
let expenses = [];
let currentMonth = new Date();

const CRC = new Intl.NumberFormat('es-CR',{style:'currency',currency:'CRC',maximumFractionDigits:0});
const MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function status(t,ok=true){const e=document.getElementById('sync-status');e.textContent=t;e.classList.toggle('offline',!ok);}
function money(n){return CRC.format(n);}
function key(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function label(d){return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
function shortDate(s){const [y,m,d]=s.split('-');return `${d}/${m}/${y.slice(2)}`;}

async function loadExpenses(){
 status('☁️ Sincronizando...');
 const {data,error}=await db.from('gastos').select('id,descripcion,monto,fecha,categoria,creado_en').order('fecha',{ascending:false});
 if(error){console.error(error);status('⚠️ Error de conexión',false);return;}
 expenses=data.map(e=>({id:e.id,desc:e.descripcion,amount:Number(e.monto),date:e.fecha,category:e.categoria,createdAt:e.creado_en}));
 status('☁️ Sincronizado'); render();
}

function render(){
 const k=key(currentMonth);
 const month=expenses.filter(e=>e.date.startsWith(k));
 const q=document.getElementById('search').value.trim().toLowerCase();
 const visible=q?month.filter(e=>e.desc.toLowerCase().includes(q)):month;
 document.getElementById('current-month-label').textContent=label(currentMonth);
 document.getElementById('month-total').textContent=money(month.reduce((s,e)=>s+e.amount,0));
 const cats={}; month.forEach(e=>cats[e.category]=(cats[e.category]||0)+e.amount);
 const ul=document.getElementById('category-breakdown');ul.innerHTML='';
 Object.entries(cats).sort((a,b)=>b[1]-a[1]).forEach(([c,a])=>{const li=document.createElement('li');li.innerHTML=`<span class="cat-name">${esc(c)}</span><span class="cat-amount">${money(a)}</span>`;ul.appendChild(li);});
 const tbody=document.getElementById('expense-rows');tbody.innerHTML='';
 const sorted=[...visible].sort((a,b)=>b.date.localeCompare(a.date));
 document.getElementById('empty-state').style.display=sorted.length?'none':'block';
 sorted.forEach(e=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${shortDate(e.date)}</td><td>${esc(e.desc)}</td><td><span class="cat-pill">${esc(e.category)}</span></td><td class="num">${money(e.amount)}</td><td><button class="delete-btn" data-id="${e.id}">Eliminar</button></td>`;tbody.appendChild(tr);});
}

document.getElementById('expense-form').addEventListener('submit',async ev=>{
 ev.preventDefault();
 const desc=document.getElementById('desc').value.trim(), amount=parseFloat(document.getElementById('amount').value), date=document.getElementById('date').value, category=document.getElementById('category').value;
 if(!desc||!date||Number.isNaN(amount)||amount<=0)return;
 const btn=ev.target.querySelector('button[type="submit"]');btn.disabled=true;status('☁️ Guardando...');
 const {error}=await db.from('gastos').insert({descripcion:desc,monto:amount,fecha:date,categoria:category});
 btn.disabled=false;
 if(error){console.error(error);status('⚠️ No se pudo guardar',false);alert('No se pudo guardar el gasto.');return;}
 currentMonth=new Date(date+'T00:00:00');ev.target.reset();document.getElementById('date').value=date;await loadExpenses();
});

document.getElementById('expense-rows').addEventListener('click',async ev=>{
 const btn=ev.target.closest('.delete-btn');if(!btn)return;
 if(!confirm('¿Eliminar este gasto?'))return;
 status('☁️ Eliminando...');
 const {error}=await db.from('gastos').delete().eq('id',btn.dataset.id);
 if(error){console.error(error);status('⚠️ No se pudo eliminar',false);alert('No se pudo eliminar el gasto.');return;}
 await loadExpenses();
});

document.getElementById('search').addEventListener('input',render);
document.getElementById('prev-month').addEventListener('click',()=>{currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()-1,1);render();});
document.getElementById('next-month').addEventListener('click',()=>{currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()+1,1);render();});
setInterval(loadExpenses,5000);

(function(){const today=new Date().toISOString().slice(0,10);document.getElementById('date').value=today;loadExpenses();})();
