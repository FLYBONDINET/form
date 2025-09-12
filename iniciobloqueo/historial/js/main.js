// ================== CONFIG ==================
const urlVuelos   = "https://script.google.com/macros/s/AKfycbxHzJ1tbXIn6HsvGQ79IaVsEYrXnIJADceV00YyDANRdLbutaSNeBHOzt2U8GDpip9_/exec";
const urlUsuarios = "https://script.google.com/macros/s/AKfycbwEz4pfgHUsmar2CNGaplmlgYDrsBzc0T8-0fS9Bj96y0eSeb1vTr3Lao51dIvIt4HC/exec";

// Auto-reload cada X ms (0 = desactivado). Ej: 60000 = 1 min
const AUTO_RELOAD_MS = 0;

// ================== DOM ==================
const tbody       = document.querySelector("#tablaVuelos tbody");
const inputFiltro = document.getElementById("busqueda");
const toggleBtn   = document.getElementById("toggleMode");
const bodyEl      = document.body;
const alertEl     = document.getElementById("alert");

const fDesde     = document.getElementById("fDesde");
const fHasta     = document.getElementById("fHasta");
const fEscala    = document.getElementById("fEscala");
const fMatricula = document.getElementById("fMatricula");
const btnClear   = document.getElementById("btnLimpiarFiltros");

// ================== STATE ==================
let state = {
  allData: [],
  filtered: [],
  sort: { key: null, dir: 1 } // 1=asc, -1=desc
};

// ================== UTILS ==================
const sessionId = '_' + Math.random().toString(36).slice(2, 11);

function showAlert(msg, type = "error") {
  console.error(`[ALERTA] ${msg}`);
  if (!alertEl) return;
  alertEl.textContent = msg;
  alertEl.className = `alert ${type}`;
  alertEl.hidden = false;
  setTimeout(() => (alertEl.hidden = true), 7000);
}

function parseDateFlexible(s) {
  if (!s) return null;
  if (s instanceof Date) return isNaN(s) ? null : s;
  const iso = new Date(s);
  if (!isNaN(iso)) return iso;
  const m = String(s).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) { const d=new Date(+m[3], +m[2]-1, +m[1]); return isNaN(d)?null:d; }
  return null;
}
function sameYMD(a, b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function formatFecha(s){
  const d=parseDateFlexible(s); if(!d) return s||"";
  const dd=String(d.getDate()).padStart(2,"0");
  const mm=String(d.getMonth()+1).padStart(2,"0");
  const yyyy=d.getFullYear(); return `${dd}-${mm}-${yyyy}`;
}
function pick(obj, keys, def=""){ for(const k of keys){ if(obj && obj[k]!=null && obj[k]!=="") return obj[k]; } return def; }
function normalizeRow(row){
  return {
    Fecha: pick(row, ["Fecha","FECHA","fecha"]),
    Escala: pick(row, ["Escala","ESCALA","escala"]),
    Matricula: pick(row, ["Matricula","Matrícula","MATRICULA","matricula"]),
    "LLegada Numero Vuelo": pick(row, ["LLegada Numero Vuelo","Llegada Numero Vuelo","Llegada_Numero_Vuelo","llegada_numero_vuelo"]),
    "Salida Numero Vuelo": pick(row, ["Salida Numero Vuelo","Salida_Numero_Vuelo","salida_numero_vuelo"])
  };
}

// ================== CONTADORES ANIMADOS ==================
const EASE_OUT_CUBIC = t => 1 - Math.pow(1 - t, 3);
function animateNumber(el, to, { from, duration = 800, formatter } = {}) {
  if (!el) return;
  const start = performance.now();
  const fromVal = typeof from === "number" ? from : (parseFloat(el.dataset.value) || 0);
  const fmt = formatter || (n => Math.round(n).toLocaleString("es-AR"));
  if (el._anim) cancelAnimationFrame(el._anim);
  function frame(now){
    const t = Math.min(1, (now - start)/duration);
    const val = fromVal + (to - fromVal)*EASE_OUT_CUBIC(t);
    el.textContent = fmt(val);
    if (t < 1) el._anim = requestAnimationFrame(frame); else el.dataset.value = String(to);
  }
  el._anim = requestAnimationFrame(frame);
}
function animateLabeledCounter(elId, label, to, opts={}) {
  const el = document.getElementById(elId); if (!el) return;
  let num = el.querySelector(".num");
  if (!num) { el.innerHTML = `${label}<span class="num">0</span>`; num = el.querySelector(".num"); }
  else { el.firstChild.nodeValue = label; }
  animateNumber(num, to, opts);
}
function animateNumbersIn(container){
  if (!container) return;
  container.querySelectorAll(".num[data-target]").forEach(span=>{
    const target = parseFloat(span.dataset.target)||0;
    animateNumber(span, target, { duration: 700 });
    span.removeAttribute("data-target");
  });
}

// ================== CONTADORES (globales) ==================
function actualizarContadores(base = state.allData) {
  const hoy  = new Date(), mes=hoy.getMonth(), anio=hoy.getFullYear();
  const vuelosHoy  = base.filter(f=>{ const d=parseDateFlexible(f.Fecha); return d && sameYMD(d,hoy); }).length;
  const vuelosMes  = base.filter(f=>{ const d=parseDateFlexible(f.Fecha); return d && d.getMonth()===mes && d.getFullYear()===anio; }).length;
  const vuelosAnio = base.filter(f=>{ const d=parseDateFlexible(f.Fecha); return d && d.getFullYear()===anio; }).length;
  animateLabeledCounter("vuelosDia","Vuelos hoy: ",vuelosHoy,{duration:800});
  animateLabeledCounter("vuelosMes","Vuelos este mes: ",vuelosMes,{duration:900});
  animateLabeledCounter("vuelosAnio","Vuelos este año: ",vuelosAnio,{duration:1000});
}

// ================== KPIs ==================
function countBy(arr,key){ const m=new Map(); for(const it of arr){ const v=(it[key]||'').toString().trim(); if(!v) continue; m.set(v,(m.get(v)||0)+1);} return Array.from(m.entries()); }
function topN(pairs,n=3){ return pairs.sort((a,b)=>b[1]-a[1]).slice(0,n); }
function setList(id,pairs){
  const el=document.getElementById(id); if(!el) return;
  el.innerHTML = pairs.length ? pairs.map(([name,c])=>`<li>${name} — <strong class="num" data-target="${c}">0</strong></li>`).join('') : `<li>—</li>`;
  animateNumbersIn(el);
}
function updateKPIs(viewData){
  const total=viewData.length;
  const escalas=new Set(viewData.map(x=>(x.Escala||'').trim()).filter(Boolean)).size;
  const matriculas=new Set(viewData.map(x=>(x.Matricula||'').trim()).filter(Boolean)).size;
  setList('kpiTopEscalas', topN(countBy(viewData,'Escala'),3));
  setList('kpiTopMatriculas', topN(countBy(viewData,'Matricula'),3));
  animateNumber(document.getElementById('kpiTotal'), total, {duration:700});
  animateNumber(document.getElementById('kpiEscalas'), escalas, {duration:800});
  animateNumber(document.getElementById('kpiMatriculas'), matriculas, {duration:900});
  drawSparkline(viewData);
}

// Sparkline con días y valores por punto (mes actual)
function drawSparkline(viewData){
  const el=document.getElementById('kpiSparkline'); if(!el) return;
  const now=new Date(), y=now.getFullYear(), m=now.getMonth();
  const daysInMonth=new Date(y,m+1,0).getDate();
  const counts=new Array(daysInMonth).fill(0);
  for(const r of viewData){ const d=parseDateFlexible(r.Fecha); if(d && d.getFullYear()===y && d.getMonth()===m){ counts[d.getDate()-1]++; } }
  const w=320,h=80,pad=6, max=Math.max(1,...counts);
  const stepX=(w-pad*2)/Math.max(1,daysInMonth-1);
  const scaleY=(v)=> h-pad - (v/max)*(h-pad*2);
  const points=counts.map((c,i)=>`${pad+i*stepX},${scaleY(c)}`).join(' ');
  let dots=""; let labelsDay=""; let labelsVal="";
  for(let i=0;i<daysInMonth;i++){
    const x=pad+i*stepX, yv=scaleY(counts[i]);
    dots += `<circle cx="${x}" cy="${yv}" r="1.6"></circle>`;
    if ((i+1)%5===0 || i===0 || i===daysInMonth-1) {
      labelsDay += `<text class="spark-day" x="${x}" y="${h-2}" text-anchor="middle">${i+1}</text>`;
    }
    if (counts[i]>0){
      labelsVal += `<text class="spark-value" x="${x}" y="${Math.max(10,yv-6)}" text-anchor="middle">${counts[i]}</text>`;
    }
  }
  el.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none">
      <line class="spark-axis" x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}"></line>
      <polyline fill="none" stroke="currentColor" stroke-width="1.5" points="${points}"></polyline>
      ${dots}${labelsDay}${labelsVal}
    </svg>`;
}

// ================== RENDER TABLA ==================
function renderTabla(data){
  tbody.innerHTML="";
  if(!data || data.length===0){
    tbody.innerHTML=`<tr><td colspan="5">No hay datos disponibles</td></tr>`;
    updateKPIs([]); actualizarContadores(state.allData);
    return;
  }
  for(const fila of data){
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${formatFecha(fila.Fecha)}</td>
      <td>${fila.Escala||""}</td>
      <td>${fila.Matricula||""}</td>
      <td>${fila["LLegada Numero Vuelo"]||""}</td>
      <td>${fila["Salida Numero Vuelo"]||""}</td>`;
    tbody.appendChild(tr);
  }
  updateKPIs(data); actualizarContadores(state.allData);
}

// ================== FETCH ROBUSTO ==================
async function fetchJSON(url){
  const noCache = url + (url.includes("?") ? "&" : "?") + "_ts=" + Date.now();
  const res = await fetch(noCache, { cache: "no-store" });
  const ctype = res.headers.get("content-type") || "";
  if(!res.ok){
    const txt = await res.text().catch(()=> "");
    throw new Error(`HTTP ${res.status} — ${txt.slice(0,200)}`);
  }
  if(ctype.includes("application/json")) return res.json();
  const txt = await res.text();
  try{ return JSON.parse(txt); }
  catch{
    console.error("Respuesta no JSON (primeros 400 chars):\n", txt.slice(0,400));
    throw new Error(`Respuesta no JSON desde Apps Script (ver consola).`);
  }
}
function coerceArray(raw){
  if(Array.isArray(raw)) return raw;
  if(raw && Array.isArray(raw.data)) return raw.data;
  if(raw && Array.isArray(raw.rows)) return raw.rows;
  return [];
}

// ================== FILTROS & SORT ==================
function applyFilters(){
  const q=(inputFiltro?.value||"").toLowerCase().trim();
  const dDesde=fDesde?.value ? new Date(fDesde.value) : null;
  const dHasta=fHasta?.value ? new Date(fHasta.value) : null;
  const escalaSel=(fEscala?.value||"").toLowerCase().trim();
  const matSel=(fMatricula?.value||"").toLowerCase().trim();

  let data = state.allData.filter(r=>{
    const hitsText = !q || Object.values(r).some(v=> String(v??"").toLowerCase().includes(q));
    const d = parseDateFlexible(r.Fecha);
    const hitsFecha = (!dDesde || (d && d>=dDesde)) && (!dHasta || (d && d<=dHasta));
    const hitsEsc = !escalaSel || String(r.Escala||"").toLowerCase()===escalaSel;
    const hitsMat = !matSel    || String(r.Matricula||"").toLowerCase()===matSel;
    return hitsText && hitsFecha && hitsEsc && hitsMat;
  });

  if(state.sort.key){
    const { key, dir } = state.sort;
    data.sort((a,b)=>{
      let va=a[key]??"", vb=b[key]??"";
      if(key==="Fecha"){ va=parseDateFlexible(va)||new Date(0); vb=parseDateFlexible(vb)||new Date(0); }
      return (va>vb?1:(va<vb?-1:0))*dir;
    });
  }
  state.filtered = data;
  renderTabla(state.filtered);
}
function buildSelectOptions(){
  const escSet=new Set(), matSet=new Set();
  for(const r of state.allData){ if(r.Escala) escSet.add(r.Escala); if(r.Matricula) matSet.add(r.Matricula); }
  const toOptions = set => ["", ...Array.from(set).sort()]
    .map(v=>`<option value="${v}">${v||'Todas'}</option>`).join("");
  if(fEscala)    fEscala.innerHTML    = toOptions(escSet);
  if(fMatricula) fMatricula.innerHTML = toOptions(matSet);
}

// ================== CARGA INICIAL ==================
async function cargarVuelos(){
  try{
    console.group("[cargarVuelos]");
    const raw = await fetchJSON(urlVuelos);
    if(raw && raw.ok===false){
      console.error("Apps Script devolvió error:", raw.error);
      showAlert(`Error del servidor: ${raw.error}`, "error");
      tbody.innerHTML = `<tr><td colspan="5">Error del servidor</td></tr>`;
      console.groupEnd();
      return;
    }
    const arr = coerceArray(raw);
    console.log("Filas recibidas:", Array.isArray(arr) ? arr.length : "(no array)");
    console.log("Muestra filas:", Array.isArray(arr) ? arr.slice(0,3) : raw);
    state.allData = (Array.isArray(arr) ? arr : []).map(normalizeRow);
    buildSelectOptions();
    state.sort = { key: "Fecha", dir: -1 }; // fecha desc
    applyFilters();
    console.groupEnd();
  }catch(err){
    console.groupEnd();
    showAlert(err.message || "Error al cargar los datos", "error");
    tbody.innerHTML = `<tr><td colspan="5">Error al cargar los datos</td></tr>`;
  }
}

// ================== EVENTOS ==================
inputFiltro?.addEventListener("input", applyFilters);
[fDesde, fHasta, fEscala, fMatricula].forEach(el=> el && el.addEventListener("change", applyFilters));

btnClear?.addEventListener("click", ()=>{
  if(inputFiltro) inputFiltro.value="";
  if(fDesde) fDesde.value="";
  if(fHasta) fHasta.value="";
  if(fEscala) fEscala.value="";
  if(fMatricula) fMatricula.value="";
  applyFilters();
});

const sortKeyMap = {
  "Fecha":"Fecha", "Escala":"Escala", "Matricula":"Matricula",
  "LLegada Numero Vuelo":"LLegada Numero Vuelo", "Salida Numero Vuelo":"Salida Numero Vuelo",
};
document.querySelectorAll("th").forEach(th=>{
  th.addEventListener("click", ()=>{
    const key = sortKeyMap[th.getAttribute("data-column")] || null;
    if(!key) return;
    const isCurrent = state.sort.key===key;
    state.sort = { key, dir: isCurrent ? state.sort.dir*-1 : 1 };
    applyFilters();
  });
});

toggleBtn?.addEventListener("click", ()=>{
  bodyEl.classList.toggle("night");
  toggleBtn.textContent = bodyEl.classList.contains("night") ? "Modo Día" : "Modo Noche";
});

// Usuarios activos (tolerante)
function actualizarUsuarioActivo(){
  fetch(urlUsuarios, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ sessionId }),
  }).catch(err=>console.error(err));
}
function obtenerUsuariosActivos(){
  const el=document.getElementById("usuariosActivos");
  if(!el) return;
  fetch(urlUsuarios)
    .then(res=>res.json())
    .then(data=>{ el.textContent = `Usuarios activos: ${data.activos ?? "-"}`; })
    .catch(err=>console.error(err));
}

// ================== BOOT ==================
cargarVuelos();
actualizarUsuarioActivo();
obtenerUsuariosActivos();

if (AUTO_RELOAD_MS > 0) {
  setInterval(()=>{ cargarVuelos(); }, AUTO_RELOAD_MS);
  setInterval(()=>{ actualizarUsuarioActivo(); obtenerUsuariosActivos(); }, 10000);
} else {
  setInterval(()=>{ actualizarUsuarioActivo(); obtenerUsuariosActivos(); }, 10000);
}
