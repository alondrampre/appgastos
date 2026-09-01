const STORAGE_KEY = 'cuentas-casa-datos';
let CLOUD_URL = 'https://script.google.com/macros/s/AKfycbwxv4SPFOPj7-KLN2DD1sesVmrfHoYRKPfkDCVQM2PfeYvFuwprsEBL4oInO6MV0mfR-w/exec';
let isSyncing = false;

const FRASES = [
  "Cada peso que no gastan hoy es un paso mas cerca de esa escapada que suenan hacer juntos.",
  "No es dejar de gastar: es elegir gastar en lo que de verdad los hace felices.",
  "El ahorro de este mes es la sonrisa del proximo viaje.",
  "Antes de comprar, preguntense: esto nos acerca o nos aleja de lo que queremos lograr.",
  "Pequenos ahorros, hoy. Grandes planes, manana.",
  "Gastar con cabeza hoy es invertir en el 'nosotros' de manana.",
  "La disciplina de este mes es la libertad del que viene.",
  "No se trata de privarse, se trata de priorizar lo que realmente importa.",
  "Cada cuota que pagan juntos es un peso menos que van a cargar despues.",
  "El mejor regalo que se pueden hacer como pareja es tranquilidad financiera.",
  "Anotar los gastos ya es la mitad del ahorro.",
  "Lo que no se gasta hoy, se disfruta el doble manana."
];

function pickQuote(){
  const el = document.getElementById('quoteText');
  const f = FRASES[Math.floor(Math.random()*FRASES.length)];
  el.textContent = f;
}

let state = {
  nameA: 'Alondra',
  nameB: 'Santi',
  gastosDiarios: [], 
  miaMedsLastDate: '',
  gastos: [
    {id:'colchon', nombre:'Cama (11 Cuotas)', categoria:'hogar', tipo:'cuotas', monto:116000, cuotas:11, responsable:'compartido', split:50, pagos:[]}
  ],
  presupuesto: {
    ingresos: 1042723,
    items: [
      {id:'p1', nombre:'Comida de Mía', categoria:'fijo', presupuesto:30000, actual:0, pagado:false},
      {id:'p2', nombre:'Casa', categoria:'fijo', presupuesto:0, actual:0, pagado:false}
    ]
  },
  meta: { nombre:'Algo lindo para los dos', objetivo:0, ahorrado:0 }
};

function ensureShape(){
  if(!state.presupuesto) state.presupuesto = {ingresos:0, items:[]};
  if(!Array.isArray(state.presupuesto.items)) state.presupuesto.items = [];
  if(!state.meta) state.meta = {nombre:'Algo lindo para los dos', objetivo:0, ahorrado:0};
  if(!Array.isArray(state.gastos)) state.gastos = [];
  if(!Array.isArray(state.gastosDiarios)) state.gastosDiarios = [];
  if(typeof state.miaMedsLastDate === 'undefined') state.miaMedsLastDate = '';
}

async function loadState(){
  try {
    let loadedFromCloud = false;
    if(CLOUD_URL) {
      document.getElementById('storageStatus').textContent = 'Sincronizando... ⏳';
      const res = await fetch(CLOUD_URL);
      const text = await res.text();
      if(text && text.length > 5 && text !== "{}") {
        try {
          const cloudData = JSON.parse(text);
          if(cloudData && cloudData.presupuesto) {
            state = Object.assign(state, cloudData);
            loadedFromCloud = true;
          }
        } catch(err) {}
      }
    }
    
    if(!loadedFromCloud) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw) {
        state = Object.assign(state, JSON.parse(raw));
        if(CLOUD_URL) { setTimeout(saveState, 1500); }
      }
    }
  } catch(e) {
    console.error("Error al cargar datos", e);
  }
  ensureShape();
  
  const statusEl = document.getElementById('storageStatus');
  const footEl = document.getElementById('footerNote');
  if(CLOUD_URL) {
      statusEl.textContent = '✅ Sincronizado en Google Sheets';
      footEl.textContent = 'La aplicación está conectada. Los cambios se actualizan en los celulares al instante.';
  } else {
      statusEl.textContent = 'Guardando en este navegador (Falta conectar)';
      footEl.textContent = 'Por ahora se está guardando localmente hasta que conectemos Google Sheets.';
  }
  
  pickQuote();
  render();
}

async function saveState(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); // Backup local
    if(CLOUD_URL && !isSyncing) {
        isSyncing = true;
        document.getElementById('storageStatus').textContent = 'Guardando en la nube... ☁️';
        await fetch(CLOUD_URL, {
            method: 'POST',
            body: JSON.stringify(state)
        });
        document.getElementById('storageStatus').textContent = '✅ Sincronizado en Google Sheets';
        isSyncing = false;
    }
  }catch(e){
    console.error("Error al guardar en la nube", e);
    isSyncing = false;
  }
}

// Actualizar automáticamente cuando vuelven a abrir la app o cambian de pestaña en el celu
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        loadState();
    }
});

// Pestañas (Tabs) logic
window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  
  document.getElementById(tabId).classList.add('active');
  document.getElementById('btn-' + tabId).classList.add('active');
};

document.getElementById('btnOtraFrase').addEventListener('click', pickQuote);

document.getElementById('btnExport').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'cuentas-casa-copia.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('btnImport').addEventListener('click', ()=>{
  document.getElementById('fileImport').click();
});

document.getElementById('fileImport').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = async (ev)=>{
    try{
      const data = JSON.parse(ev.target.result);
      if(data && data.gastos){
        state = Object.assign(state, data);
        ensureShape();
        await saveState();
        render();
        alert('Copia cargada correctamente.');
      }
    }catch(err){ alert('No se pudo leer ese archivo.'); }
  };
  reader.readAsText(file);
});

function fmt(n){ return '$' + Math.round(n||0).toLocaleString('es-AR'); }
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

/* ================ GASTOS DIARIOS Y LÍMITE ================ */
function renderGastosDiarios() {
  const fijos = state.presupuesto.items.filter(i=>i.categoria==='fijo').reduce((s,i)=>s+i.presupuesto,0);
  const ahorro = state.presupuesto.items.filter(i=>i.categoria==='ahorro').reduce((s,i)=>s+i.presupuesto,0);
  const disponibleTotal = Math.max(0, (state.presupuesto.ingresos || 0) - fijos - ahorro);
  
  const limiteDiario = disponibleTotal / 30;

  const todayStr = getTodayDate();
  const gastosHoy = state.gastosDiarios.filter(g => g.fecha === todayStr);
  const gastadoHoy = gastosHoy.reduce((s, g) => s + g.monto, 0);
  const restante = limiteDiario - gastadoHoy;

  document.getElementById('dailyLimitOut').textContent = fmt(limiteDiario);
  document.getElementById('dailySpentOut').textContent = fmt(gastadoHoy);
  const remainEl = document.getElementById('dailyRemainOut');
  remainEl.textContent = fmt(restante);
  remainEl.style.color = restante < 0 ? 'var(--warn)' : 'var(--good)';

  const listEl = document.getElementById('gdList');
  if (gastosHoy.length === 0) {
    listEl.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--ink-soft)">No hay gastos registrados hoy.</td></tr>';
  } else {
    listEl.innerHTML = gastosHoy.map(g => `
      <tr>
        <td class="item-name">${g.desc}</td>
        <td style="text-align:right"><b>${fmt(g.monto)}</b></td>
        <td style="text-align:right"><button class="small danger" onclick="borrarGastoDiario('${g.id}')" title="Borrar gasto">❌</button></td>
      </tr>
    `).join('');
  }
}

document.getElementById('btnAddGd').addEventListener('click', async () => {
  const desc = document.getElementById('gdDesc').value.trim();
  const monto = parseFloat(document.getElementById('gdMonto').value);
  if (desc && monto > 0) {
    state.gastosDiarios.push({
      id: 'gd' + Date.now(),
      desc,
      monto,
      fecha: getTodayDate()
    });
    document.getElementById('gdDesc').value = '';
    document.getElementById('gdMonto').value = '';
    await saveState();
    render();
  }
});

window.borrarGastoDiario = async function(id) {
  if(confirm("¿Seguro que querés borrar este gasto de hoy?")) {
    state.gastosDiarios = state.gastosDiarios.filter(g => g.id !== id);
    await saveState();
    render();
  }
};

/* ================ GASTOS DE MÍA ================ */
function renderMiaMeds() {
  document.getElementById('miaMedsDate').value = state.miaMedsLastDate;
  const statusEl = document.getElementById('miaMedsStatus');
  
  if (state.miaMedsLastDate) {
    const lastDate = new Date(state.miaMedsLastDate);
    const today = new Date();
    const diffMonths = (today.getFullYear() - lastDate.getFullYear()) * 12 + (today.getMonth() - lastDate.getMonth());
    
    if (diffMonths >= 2) {
      statusEl.textContent = '⚠️ Atención: Ya pasaron 2 meses, toca comprar medicación.';
      statusEl.style.color = 'var(--warn)';
    } else {
      statusEl.textContent = '✅ Medicación al día (Menos de 2 meses).';
      statusEl.style.color = 'var(--good)';
    }
  } else {
    statusEl.textContent = 'Sin registro. Ingresa la fecha de la última compra.';
    statusEl.style.color = 'var(--ink-soft)';
  }
}

document.getElementById('btnSaveMiaMeds').addEventListener('click', async () => {
  state.miaMedsLastDate = document.getElementById('miaMedsDate').value;
  await saveState();
  render();
});

/* ================ GASTOS COMPARTIDOS / PRESUPUESTO ================ */
function gastoPagado(g){ return (g.pagos||[]).reduce((s,p)=>s+p.monto,0); }
function gastoPendiente(g){ return Math.max(0, g.monto - gastoPagado(g)); }

function renderGastos(){
  const A = document.getElementById('nameA').value || 'A';
  const B = document.getElementById('nameB').value || 'B';
  const list = document.getElementById('gastosList');
  list.innerHTML = state.gastos.map(g=>{
    const pagado = gastoPagado(g);
    const pend = gastoPendiente(g);
    const pct = g.monto>0 ? Math.min(100, pagado/g.monto*100) : 0;
    const respLabel = g.responsable==='compartido' ? `<span class="pill pill-c">Compartido ${g.split}/${100-g.split}</span>` :
      g.responsable==='A' ? `<span class="pill pill-a">${A}</span>` : `<span class="pill pill-b">${B}</span>`;
    const cuotaInfo = g.tipo==='cuotas' ? ` · ${(g.pagos||[]).length}/${g.cuotas} cuotas` : '';
    const hist = (g.pagos||[]).slice(-3).reverse().map(p=>`<div><span>${p.por==='A'?A:B} — ${p.fecha}</span><span>${fmt(p.monto)}</span></div>`).join('');
    return `
      <div class="gasto">
        <div class="gasto-top">
          <div>
            <div class="gasto-nom">${g.nombre}</div>
            <div class="gasto-cat">${g.categoria}${cuotaInfo}</div>
          </div>
          <div>
            <div class="gasto-monto">${fmt(g.monto)}</div>
            <div class="gasto-pend">${pend>0? 'faltan '+fmt(pend) : 'pagado'}</div>
          </div>
        </div>
        <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
        <div class="gasto-row">
          ${respLabel}
          <div class="gasto-actions">
            <button class="small" onclick="registrarPago('${g.id}')">+ Registrar pago</button>
            <button class="small" onclick="editarGasto('${g.id}')">Editar</button>
            <button class="small danger" onclick="borrarGasto('${g.id}')">Borrar</button>
          </div>
        </div>
        ${hist? '<div class="hist">'+hist+'</div>' : ''}
      </div>
    `;
  }).join('') || '<div class="sub">Todavía no cargaste gastos o deudas grandes.</div>';
}

function renderDonut(){
  const cats = {};
  state.gastos.forEach(g=>{ cats[g.categoria] = (cats[g.categoria]||0) + g.monto; });
  const total = Object.values(cats).reduce((a,b)=>a+b,0);
  const colors = {salud:'#B5603E', hogar:'#2F6B6E', comida:'#8B9A5B', cuentas:'#6E5A9E', otro:'#9A8B6E'};
  const svg = document.getElementById('donut');
  if(total<=0){ svg.innerHTML = '<circle cx="100" cy="100" r="70" fill="none" stroke="#D8DBCE" stroke-width="24"/><text x="100" y="104" text-anchor="middle" font-size="11" fill="#5B6B63">Cargá montos para ver el gráfico</text>'; document.getElementById('donutLegend').innerHTML=''; return; }
  let acc = 0, paths = '';
  const legend = [];
  Object.entries(cats).forEach(([cat, val])=>{
    if(val<=0) return;
    const frac = val/total;
    const start = acc * 2*Math.PI - Math.PI/2; acc += frac;
    const end = acc * 2*Math.PI - Math.PI/2;
    const x1 = 100 + 70*Math.cos(start), y1 = 100 + 70*Math.sin(start);
    const x2 = 100 + 70*Math.cos(end), y2 = 100 + 70*Math.sin(end);
    const large = frac > 0.5 ? 1 : 0;
    const col = colors[cat] || '#999';
    paths += `<path d="M100 100 L${x1} ${y1} A70 70 0 ${large} 1 ${x2} ${y2} Z" fill="${col}" opacity="0.85"/>`;
    legend.push(`<span><span class="dot" style="background:${col}"></span>${cat} — ${fmt(val)}</span>`);
  });
  paths += `<circle cx="100" cy="100" r="38" fill="#FBFAF6"/>`;
  svg.innerHTML = paths;
  document.getElementById('donutLegend').innerHTML = legend.join('');
}

function renderCuotasChart(){
  const cuotasGastos = state.gastos.filter(x=>x.tipo==='cuotas');
  const svg = document.getElementById('cuotasChart');
  if(cuotasGastos.length === 0){ svg.innerHTML = '<text x="10" y="80" fill="#5B6B63" font-size="12">No hay deudas en cuotas cargadas.</text>'; return; }
  
  const g = cuotasGastos[0];
  const n = g.cuotas;
  const paid = (g.pagos||[]).length;
  const w = 320, padB = 20, barW = Math.max(4, Math.min(20, (w-20)/n - 4));
  let bars = `<text x="10" y="15" fill="#5B6B63" font-size="11">${g.nombre}</text>`;
  for(let i=0;i<n;i++){
    const x = 10 + i*((w-20)/n);
    const filled = i < paid;
    const bh = 100;
    bars += `<rect x="${x}" y="${padB}" width="${barW}" height="${bh}" rx="2" fill="${filled? '#2F6B6E':'#D8DBCE'}"/>`;
    if(i%2===0 || n<=12) bars += `<text x="${x+barW/2}" y="${padB+bh+14}" font-size="9" fill="#5B6B63" text-anchor="middle">${i+1}</text>`;
  }
  svg.innerHTML = bars;
}

function catLabel(c){ return c==='fijo' ? 'Gasto fijo' : c==='ocio' ? 'Ocio' : 'Ahorro'; }
function catClass(c){ return c==='fijo' ? 'cat-fijo' : c==='ocio' ? 'cat-ocio' : 'cat-ahorro'; }

function renderChecklist(){
  const body = document.getElementById('checkBody');
  body.innerHTML = state.presupuesto.items.map(it=>`
    <tr class="${it.pagado?'done':''}">
      <td><input type="checkbox" ${it.pagado?'checked':''} onchange="toggleItem('${it.id}', this.checked)"></td>
      <td class="item-name">${it.nombre}</td>
      <td><span class="cat-badge ${catClass(it.categoria)}">${catLabel(it.categoria)}</span></td>
      <td><input type="number" value="${it.presupuesto}" onchange="updateItem('${it.id}','presupuesto',this.value)"></td>
      <td><input type="number" value="${it.actual}" onchange="updateItem('${it.id}','actual',this.value)"></td>
      <td><button class="small danger" onclick="removeItem('${it.id}')">×</button></td>
    </tr>
  `).join('');
}

window.toggleItem = async function(id, val){
  const it = state.presupuesto.items.find(x=>x.id===id);
  if(it){ it.pagado = val; await saveState(); render(); }
};
window.updateItem = async function(id, field, val){
  const it = state.presupuesto.items.find(x=>x.id===id);
  if(it){ it[field] = parseFloat(val) || 0; await saveState(); render(); }
};
window.removeItem = async function(id){
  state.presupuesto.items = state.presupuesto.items.filter(x=>x.id!==id);
  await saveState(); render();
};

document.getElementById('btnAddItem').addEventListener('click', async ()=>{
  const nombre = document.getElementById('cNombre').value.trim();
  if(!nombre) return;
  state.presupuesto.items.push({
    id: 'p'+Date.now(),
    nombre,
    categoria: document.getElementById('cCategoria').value,
    presupuesto: parseFloat(document.getElementById('cPresupuesto').value)||0,
    actual: 0,
    pagado:false
  });
  document.getElementById('cNombre').value = '';
  document.getElementById('cPresupuesto').value = '';
  await saveState(); render();
});

document.getElementById('pIngresos').addEventListener('change', async e=>{
  state.presupuesto.ingresos = parseFloat(e.target.value)||0;
  await saveState(); render();
});

function renderPresupuesto(){
  document.getElementById('pIngresos').value = state.presupuesto.ingresos || '';
  const items = state.presupuesto.items;
  const sum = (cat, field) => items.filter(i=>i.categoria===cat).reduce((s,i)=>s+(i[field]||0),0);
  const fijoReal = sum('fijo','actual');
  const ocioReal = sum('ocio','actual');
  const ahorroReal = sum('ahorro','actual');
  const totalGastado = fijoReal + ocioReal;
  const disponible = (state.presupuesto.ingresos||0) - totalGastado - ahorroReal;
  document.getElementById('presuStats').innerHTML = `
    <div class="stat"><div class="n">${fmt(state.presupuesto.ingresos)}</div><div class="l">Ingresos</div></div>
    <div class="stat"><div class="n">${fmt(totalGastado)}</div><div class="l">Total gastado</div></div>
    <div class="stat"><div class="n">${fmt(ahorroReal)}</div><div class="l">Ahorrado este mes</div></div>
    <div class="stat"><div class="n" style="color:${disponible<0?'#A8471F':'#4A7A3D'}">${fmt(disponible)}</div><div class="l">Disponible</div></div>
  `;
  renderChecklist();
  renderPresuDonut(fijoReal, ocioReal, ahorroReal, Math.max(0,disponible));
  return {ahorroReal, disponible, totalGastado};
}

function renderPresuDonut(fijo, ocio, ahorro, disp){
  const data = [
    {label:'Gastos fijos', val:fijo, col:'#B5603E'},
    {label:'Ocio', val:ocio, col:'#6E5A9E'},
    {label:'Ahorro', val:ahorro, col:'#2F6B6E'},
    {label:'Disponible', val:disp, col:'#D8DBCE'}
  ];
  const total = data.reduce((s,d)=>s+d.val,0);
  const svg = document.getElementById('presuDonut');
  const legendEl = document.getElementById('presuLegend');
  if(total<=0){ svg.innerHTML = '<circle cx="100" cy="100" r="70" fill="none" stroke="#D8DBCE" stroke-width="24"/>'; legendEl.innerHTML=''; return; }
  let acc = 0, paths = '';
  const legend = [];
  data.forEach(d=>{
    if(d.val<=0) return;
    const frac = d.val/total;
    const start = acc * 2*Math.PI - Math.PI/2; acc += frac;
    const end = acc * 2*Math.PI - Math.PI/2;
    const x1 = 100 + 70*Math.cos(start), y1 = 100 + 70*Math.sin(start);
    const x2 = 100 + 70*Math.cos(end), y2 = 100 + 70*Math.sin(end);
    const large = frac > 0.5 ? 1 : 0;
    paths += `<path d="M100 100 L${x1} ${y1} A70 70 0 ${large} 1 ${x2} ${y2} Z" fill="${d.col}" opacity="0.9"/>`;
    legend.push(`<span><span class="dot" style="background:${d.col}"></span>${d.label} — ${fmt(d.val)}</span>`);
  });
  paths += `<circle cx="100" cy="100" r="38" fill="#FBFAF6"/>`;
  svg.innerHTML = paths;
  legendEl.innerHTML = legend.join('');
}

document.getElementById('metaNombre').addEventListener('change', async e=>{ state.meta.nombre = e.target.value; await saveState(); render(); });
document.getElementById('metaObjetivo').addEventListener('change', async e=>{ state.meta.objetivo = parseFloat(e.target.value)||0; await saveState(); render(); });

function renderMeta(ahorroReal){
  document.getElementById('metaNombre').value = state.meta.nombre;
  document.getElementById('metaObjetivo').value = state.meta.objetivo || '';
  const objetivo = state.meta.objetivo || 0;
  const ahorrado = ahorroReal || 0;
  const pct = objetivo>0 ? Math.min(100, ahorrado/objetivo*100) : 0;
  document.getElementById('metaFill').style.width = pct + '%';
  document.getElementById('metaAhorrado').textContent = fmt(ahorrado);
  document.getElementById('metaObjetivoOut').textContent = fmt(objetivo);
  document.getElementById('metaPct').textContent = Math.round(pct) + '%';
  const msg = document.getElementById('metaMsg');
  if(objetivo<=0){
    msg.textContent = 'Ponele un número a la meta y cada ahorro que carguen arriba va a ir llenando esta barra.';
  } else if(pct>=100){
    msg.textContent = '¡Llegaron a la meta! Es momento de disfrutarla, se lo ganaron.';
  } else if(pct>=70){
    msg.textContent = 'Están cerca. No aflojen justo ahora.';
  } else if(pct>=30){
    msg.textContent = 'Vamos bien. Cada gasto que evitan hoy suma directo a esto.';
  } else {
    msg.textContent = 'Recién arrancando. Lo que no se gasta de más este mes, se convierte en esto.';
  }
}

function render(){
  document.getElementById('nameA').value = state.nameA;
  document.getElementById('nameB').value = state.nameB;
  
  renderGastosDiarios();
  renderMiaMeds();
  
  const {ahorroReal} = renderPresupuesto();
  renderMeta(ahorroReal);
  renderGastos();
  renderDonut();
  renderCuotasChart();
}

document.getElementById('nameA').addEventListener('change', e=>{ state.nameA = e.target.value; saveState(); render(); });
document.getElementById('nameB').addEventListener('change', e=>{ state.nameB = e.target.value; saveState(); render(); });

document.getElementById('btnAddGasto').addEventListener('click', ()=>{ document.getElementById('addForm').classList.add('show'); });
document.getElementById('btnCancelGasto').addEventListener('click', ()=>{ document.getElementById('addForm').classList.remove('show'); });
document.getElementById('fTipo').addEventListener('change', e=>{ document.getElementById('fCuotasWrap').style.display = e.target.value==='cuotas' ? 'flex' : 'none'; });
document.getElementById('fResp').addEventListener('change', e=>{ document.getElementById('fSplitWrap').style.display = e.target.value==='compartido' ? 'flex' : 'none'; });

document.getElementById('btnSaveGasto').addEventListener('click', async ()=>{
  const nombre = document.getElementById('fNombre').value.trim();
  if(!nombre) return;
  const g = {
    id: 'g' + Date.now(),
    nombre,
    categoria: document.getElementById('fCategoria').value,
    tipo: document.getElementById('fTipo').value,
    monto: parseFloat(document.getElementById('fMonto').value) || 0,
    responsable: document.getElementById('fResp').value,
    split: parseFloat(document.getElementById('fSplit').value) || 50,
    pagos: []
  };
  if(g.tipo==='cuotas') g.cuotas = parseInt(document.getElementById('fCuotas').value) || 12;
  state.gastos.push(g);
  document.getElementById('addForm').classList.remove('show');
  document.getElementById('fNombre').value = '';
  document.getElementById('fMonto').value = '';
  await saveState(); render();
});

window.registrarPago = async function(id){
  const g = state.gastos.find(x=>x.id===id);
  if(!g) return;
  const A = document.getElementById('nameA').value || 'A';
  const B = document.getElementById('nameB').value || 'B';
  const quien = prompt(`¿Quién paga esta vez? Escribí "A" para ${A} o "B" para ${B}`, 'A');
  if(quien !== 'A' && quien !== 'B') return;
  let sugerido = g.tipo==='cuotas' ? (g.monto/g.cuotas) : gastoPendiente(g);
  const montoStr = prompt('Monto del pago', Math.round(sugerido));
  const monto = parseFloat(montoStr);
  if(!monto || monto<=0) return;
  g.pagos = g.pagos || [];
  g.pagos.push({por: quien, monto, fecha: new Date().toLocaleDateString('es-AR')});
  await saveState(); render();
};

window.editarGasto = async function(id){
  const g = state.gastos.find(x=>x.id===id);
  if(!g) return;
  const nuevoMonto = prompt('Monto total de "'+g.nombre+'"', g.monto);
  if(nuevoMonto === null) return;
  g.monto = parseFloat(nuevoMonto) || 0;
  if(g.tipo==='cuotas'){
    const nuevasCuotas = prompt('Cantidad de cuotas', g.cuotas);
    if(nuevasCuotas !== null) g.cuotas = parseInt(nuevasCuotas) || g.cuotas;
  }
  await saveState(); render();
};

window.borrarGasto = async function(id){
  if(!confirm('¿Seguro que querés borrar este gasto/deuda grande?')) return;
  state.gastos = state.gastos.filter(x=>x.id!==id);
  await saveState(); render();
};

window.checkPass = function() {
  const pwd = document.getElementById('passInput').value;
  if(pwd === 'SantiAlo' || pwd === 'santialo') {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appWrap').style.display = 'block';
    loadState();
  } else {
    document.getElementById('passError').style.display = 'block';
  }
};

