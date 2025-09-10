/* ====================
   Configurables
==================== */

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyHK1IUOfV6Sz3vJU_sa_yXfJLBrOAv-wHvHQDYnq-V7LTbkakaxuSfVGG0SaQYpvjz/exec";

const DESTINOS_IATA = [
  "AEP","AUQ","BRC","CNF","CNQ","COR","CRD","ENO","EZE","FTE","FLN","GIG",
  "GRU","IGR","JUJ","MCZ","MDQ","MDZ","MVD","NQN","PDP","PMY","REL","RES",
  "SDE","SLA","TUC","USH","PSS"
];

const MATRICULAS = ["LV-KJD","LV-KJE","LV-KAY","LV-KAH","LV-KJF","LV-KCD","LV-KCE","LV-HKN","LV-KHO","LV-KEF","LV-KEG","LV-KEH","LV-KDR","LV-KDQ","LY-MLJ","LY-VEL","LY-NVL","PR-MLD"];

const TIME_FIELDS = [
  "Apertura de patio","Cierre de patio","GPU Encendido","GPU Conexión aeronave",
  "BT Apertura","BD Apertura", "BD Comienzo Carga","BD Fin Carga",
  "BT Inicio Carga","BT Fin Carga","BT Cierre","BD Cierre","Escalera Delantera Quite","Escalera Trasera Quite",
  "Pasarela Quite","ASU Encendido","ASU Conexión aeronave","ASU Desconexión aeronave","ASU Apagado",
  "GPU Desconexión aeronave","GPU Apagado","Calza Quite","Pushback"
];

const INTERNAL_FIELDS = [
  "Asistencias salida","GPU Interno","TL Interno","CT INTERNO","TP INTERNO","BR INTERNO",
  "ESCALERA DELANTERA INTERNO","ESCALERA TRASERA INTERNO","CM INTERNOS","MICROS INTERNOS","AM / AA Interno",
  "DM / DA  Interno","CÓDIGO DEMORA"
];

/* ====================
   Helpers
==================== */
const idOf = (label) =>
  label
    .replaceAll("  "," ")
    .replace(/[^\p{L}\p{N}]+/gu,"_")
    .replace(/^_+|_+$/g,"");

const COLS = [];  // Se llenará automáticamente para guardado

/* ====================
   NAMESPACE por página (¡NUEVO!)
   - Usa body[data-form], o si no, <title> o la URL
   - Así cada HTML guarda sus propias claves
==================== */
const NAMESPACE = (() => {
  const raw =
    (document.body?.dataset?.form) ||
    document.title ||
    location.pathname;

  const cleaned = raw
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // saca acentos
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .toLowerCase();

  return `fo:${cleaned}:`;
})();

const nsKey = (k) => `${NAMESPACE}${k}`;

const nsStorage = {
  set(k, v) { localStorage.setItem(nsKey(k), JSON.stringify(v)); },
  get(k, fallback = null) {
    const raw = localStorage.getItem(nsKey(k));
    return raw ? JSON.parse(raw) : fallback;
  },
  remove(k) { localStorage.removeItem(nsKey(k)); },
  clearAll() {
    const toDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(NAMESPACE)) toDelete.push(k);
    }
    toDelete.forEach(k => localStorage.removeItem(k));
  }
};

// Si preferís que el tema NO se comparta, descomentá y usá nsKey también.
// Por ahora lo dejamos global con "fo_theme".
const THEME_KEY = "fo_theme";

/* ====================
   Render estático
==================== */
const selEscala = document.getElementById("Escala");
DESTINOS_IATA.forEach(c=>{
  const op = document.createElement("option"); op.value=c; op.textContent=c; selEscala.appendChild(op);
});
const selMat = document.getElementById("Matricula");
MATRICULAS.forEach(m=>{
  const op = document.createElement("option"); op.value=m; op.textContent=m; selMat.appendChild(op);
});

// Fecha hoy por defecto
(function setToday(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  document.getElementById("Fecha").value = `${y}-${m}-${day}`;
})();

// Acordeones principales
document.querySelectorAll(".card .legend").forEach(legend=>{
  legend.querySelector(".icon").textContent = "+";
  legend.addEventListener("click", ()=>{
    const card = legend.parentElement;
    card.classList.toggle("open");
    legend.querySelector(".icon").textContent = card.classList.contains("open") ? "−" : "+";
  });
});

// Render Tiempos operativos y ASU
const timeGrid = document.getElementById("timeGrid");
const asuBlock = document.getElementById("asuBlock");

TIME_FIELDS.forEach(lbl=>{
  const id = idOf(lbl);
  const wrap = document.createElement("div");
  wrap.className = "field col-3";
  wrap.innerHTML = `
    <label for="${id}">${lbl}</label>
    <div class="time-wrap">
      <input type="time" id="${id}">
      <button class="time-btn" type="button" data-for="${id}">⏱</button>
    </div>`;
  if(lbl.startsWith("ASU")) asuBlock.appendChild(wrap);
  else timeGrid.appendChild(wrap);
});

// Render Asistencias e internos
const internalGrid = document.getElementById("internalGrid");
INTERNAL_FIELDS.forEach(lbl=>{
  const id = idOf(lbl);
  const wrap = document.createElement("div");
  wrap.className = "field col-3";
  wrap.innerHTML = `<label for="${id}">${lbl}</label><input id="${id}" />`;
  internalGrid.appendChild(wrap);
});

/* ====================
   Botones de hora ⏱
==================== */
document.querySelectorAll(".time-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const id = btn.dataset.for;
    const el = document.getElementById(id);
    const now = new Date();
    el.value = String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0");
    schedulePartialSave();
  });
});

/* ====================
   Tema día/noche (global)
==================== */
document.getElementById("toggleTheme").addEventListener("click", ()=>{
  const cur = document.body.dataset.theme;
  document.body.dataset.theme = cur==="day" ? "night" : "day";
  localStorage.setItem(THEME_KEY, document.body.dataset.theme); // global por dominio
});
(function restoreTheme(){
  const t = localStorage.getItem(THEME_KEY); if(t) document.body.dataset.theme = t;
})();

/* ====================
   Dropdowns internos
==================== */
const toggleDropdown = (btnId, divId, showText, hideText, bgColor="---bg")=>{
  const btn = document.getElementById(btnId);
  const div = document.getElementById(divId);
  btn.addEventListener("click", ()=>{
    div.classList.toggle("show");
    btn.textContent = div.classList.contains("show") ? hideText : showText;
    if(div.classList.contains("show")){
      div.style.backgroundColor = bgColor; div.style.padding="12px"; div.style.borderRadius="12px";
    } else {
      div.style.backgroundColor = "transparent"; div.style.padding=""; div.style.borderRadius="";
    }
  });
};
toggleDropdown("toggleDropdown2","salisa","Salida","Ocultar Opciones Salida");
toggleDropdown("toggleDropdown3","carga1","Carga en Salida","Ocultar Opciones Carga");

document.getElementById("toggleAsu").addEventListener("click", ()=>{
  const asu = document.getElementById("asuBlock");
  asu.classList.toggle("show");
  const btn = document.getElementById("toggleAsu");
  btn.textContent = asu.classList.contains("show") ? "Ocultar ASU" : "ASU";
});

/* ====================
   Guardado local + parcial (NAMESPACED)
==================== */
const STORAGE_KEY = "form_temp";
const ROWID_KEY = "row_id";

// Construir COLS para guardado
const allFields = [
  "Fecha",
  "Escala",
  "Matricula",
  "Salida_Numero_Vuelo",
  "Llegada_Numero_Vuelo",
  "Posición",
  "SSR",
  "Colaboradores_en_plataforma",
  "Colaboradores_en_Patio_de_equipaje",
  "Conciliacion_de_equipaje",
  "Choferes_de_micro",
  "Load_Control",
  "Apertura de patio",
  "Cierre de patio",
  "LLegada_Cantidad_PAX",
  "Salida_Cantidad_PAX",
  "Llegada_KG_de_equipajes",
  "Llegada__Cantidad_de_bultos_equipajes",
  "Salida_KG_de_equipajes",
  "Salida_Cantidad_de_bultos_equipajes",
  "Llegada_KG_de_carga",
  "Llegada_Cantidad_de_bultos_carga",
  "Salida_KG_de_carga",
  "Salida_Cantidad_de_bultos_carga",
  "Estado_de_bolsin",
  "Numero_de_precinto",
  "Calzas Colocación",
  "Calza Quite",
  "GPU Encendido",
  "GPU Conexión aeronave",
  "GPU Desconexión aeronave",
  "GPU Apagado",
  "ASU Encendido",
  "ASU Conexión aeronave",
  "ASU Desconexión aeronave",
  "ASU Apagado",
  "Escalera Delantera Adose",
  "Escalera Delantera Quite",
  "Escalera Trasera Adose",
  "Escalera Trasera Quite",
  "Pasarela Adose",
  "Pasarela Quite",
  "BD Apertura",
  "BD Comienzo Descarga",
  "BD Fin Descarga",
  "BD Comienzo Carga",
  "BD Fin Carga",
  "BD Cierre",
  "BT Apertura",
  "BT Comienzo Descarga",
  "BT Fin Descarga",
  "BT Inicio Carga",
  "BT Fin Carga",
  "BT Cierre",
  "Pushback", 
  "Asistencias Llegada",
  "Asistencias salida",  
  "GPU Interno",
  "TL Interno",
  "CT INTERNO",
  "TP INTERNO",
  "BR INTERNO",
  "ESCALERA DELANTERA INTERNO",
  "ESCALERA TRASERA INTERNO",  
  "CM INTERNOS",
  "MICROS INTERNOS",
  "AM / AA Interno",
  "DM / DA  Interno",
  "CÓDIGO DEMORA",
  "Observaciones"
];
COLS.push(...allFields);

function getValuesOrdered(){
  return COLS.map(lbl=>{
    const id = idOf(lbl);           // Transformamos el nombre a id real
    const el = document.getElementById(id);
    if(!el) return "";              // Si no existe, devolvemos vacío
    if(el.type === "checkbox") return el.checked ? "Sí" : "No";
    return el.value ?? "";
  });
}

function saveLocal(){
  const payload = { values: getValuesOrdered(), when: Date.now(), theme: document.body.dataset.theme };
  nsStorage.set(STORAGE_KEY, payload); // ⬅️ ahora con namespace
  setStatus("Guardado local", "ok");
}

function loadLocal(){
  const data = nsStorage.get(STORAGE_KEY);
  if(!data) return;
  try{
    const {values, theme} = data;
    if(theme) document.body.dataset.theme = theme;
    values.forEach((v, idx)=>{
      const el = document.getElementById(idOf(COLS[idx])); // ⬅️ FIX: usar idOf
      if(el) el.value = v;
    });
    setStatus("Recuperado desde el dispositivo", "ok");
  }catch{}
}

document.addEventListener("input", ()=>{
  saveLocal();
  schedulePartialSave();
});

document.getElementById("btnBorrarLocal").addEventListener("click", ()=>{
  nsStorage.clearAll(); // ⬅️ borra SOLO lo de esta página
  document.getElementById("chipRow").textContent = "";
  setStatus("Guardado local borrado (solo esta página)", "warn");
});

loadLocal();

/* ====================
   Guardado parcial / envío
==================== */
let debounce;
function schedulePartialSave(){ clearTimeout(debounce); debounce = setTimeout(savePartial,800); }

async function savePartial(){
  if(!APPS_SCRIPT_URL || APPS_SCRIPT_URL.startsWith("TU_URL_")){
    setStatus("Configura APPS_SCRIPT_URL para guardar en Sheet","warn"); 
    return;
  }
  try{
    const rowId = nsStorage.get(ROWID_KEY, ""); // ⬅️ namespaced
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({modo:"parcial", rowId, cols:COLS, values:getValuesOrdered()})
    });

    // Si tu Apps Script responde JSON + CORS correcto:
    try {
      const data = await res.json();
      if(data.ok && data.rowId){
        nsStorage.set(ROWID_KEY, data.rowId);
        document.getElementById("chipRow").textContent = data.rowId;
      }
    } catch {
      // En caso de no-CORS o sin JSON, seguimos sin romper
    }

    setStatus("Guardado parcial enviado (puede no confirmarse por CORS)","ok");

  }catch(e){
    setStatus("");
  }
}

document.getElementById("btnEnviar").addEventListener("click", async ()=>{
  saveLocal();
  try{
    const rowId = nsStorage.get(ROWID_KEY, "");
    await fetch(APPS_SCRIPT_URL, {
      method:"POST",
      mode:"no-cors",  // algunos deployments requieren no-cors para el final
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({modo:"final", rowId, cols:COLS, values:getValuesOrdered()})
    });

    setStatus("Vuelo enviado (no se puede confirmar por CORS)","ok");
    alert("Vuelo enviado ✅");

    // Limpieza SOLO del namespace actual
    nsStorage.clearAll();
    document.getElementById("chipRow").textContent="";

  }catch(e){
    setStatus("Error de red al enviar: "+e.message,"err");
    alert("No se pudo enviar: "+e.message);
  }
});

function setStatus(txt, kind){
  const el = document.getElementById("saveStatus");
  el.textContent = txt; el.className = "status "+(kind||"");
}
