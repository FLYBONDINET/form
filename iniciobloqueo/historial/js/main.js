// Endpoints
const urlVuelos   = "https://script.google.com/macros/s/AKfycbxHzJ1tbXIn6HsvGQ79IaVsEYrXnIJADceV00YyDANRdLbutaSNeBHOzt2U8GDpip9_/exec";
const urlUsuarios = "https://script.google.com/macros/s/AKfycbwEz4pfgHUsmar2CNGaplmlgYDrsBzc0T8-0fS9Bj96y0eSeb1vTr3Lao51dIvIt4HC/exec";

// ===== Auto-refresh (ajustable) =====
const AUTO_REFRESH_MS = 60 * 1000; // 60s (cambiá a 30*1000 ó 5*60*1000 si querés)

// DOM
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

let state = {
  allData: [],
  filtered: [],
  sort: { key: null, dir: 1 } // 1=asc, -1=desc
};

// ------- Utils -------
const sessionId = '_' + Math.random().toString(36).slice(2, 11);

function showAlert(msg, type = "error") {
  if (!alertEl) return;
  alertEl.textContent = msg;
  alertEl.className = `alert ${type}`;
  alertEl.hidden = false;
  setTimeout(() => (alertEl.hidden = true), 6000);
}

function parseDateFlexible(s) {
  if (!s) return null;
  if (s instanceof Date) return isNaN(s) ? null : s;
  // ISO y formatos comunes
  const iso = new Date(s);
  if (!isNaN(iso)) return iso;
  const m = String(s).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const dd = +m[1], mm = +m[2] - 1, yyyy = +m[3];
    const d = new Date(yyyy, mm, dd);
    return isNaN(d) ? null : d;
  }
  return null;
}

function sameYMD(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function formatFecha(s) {
  const d = parseDateFlexible(s);
  if (!d) return s || "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function pick(obj, keys, def = "") {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== "") return obj[k];
  }
  return def;
}

function normalizeRow(row) {
  return {
    Fecha: pick(row, ["Fecha", "FECHA", "fecha"]),
    Escala: pick(row, ["Escala", "ESCALA", "escala"]),
    Matricula: pick(row, ["Matricula", "Matrícula", "MATRICULA", "matricula"]),
    "LLegada Numero Vuelo": pick(row, [
      "LLegada Numero Vuelo", "Llegada Numero Vuelo", "Llegada_Numero_Vuelo", "llegada_numero_vuelo"
    ]),
    "Salida Numero Vuelo": pick(row, [
      "Salida Numero Vuelo", "Salida_Numero_Vuelo", "salida_numero_vuelo"
    ])
  };
}

/* ================== CONTADORES ANIMADOS ================== */
const EASE_OUT_CUBIC = t => 1 - Math.pow(1 - t, 3);

function animateNumber(el, to, { from, duration = 800, formatter } = {}) {
  if (!el) return;
  const start = performance.now();
  const fromVal = typeof from === "number" ? from : (parseFloat(el.dataset.value) || 0);
  const fmt = formatter || (n => Math.round(n).toLocaleString("es-AR"));
  if (el._anim) cancelAnimationFrame(el._anim);
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const val = fromVal + (to - fromVal) * EASE_OUT_CUBIC(t);
    el.textContent = fmt(val);
    if (t < 1) el._anim = requestAnimationFrame(frame);
    else el.dataset.value = String(to);
  }
  el._anim = requestAnimationFrame(frame);
}

function animateLabeledCounter(elId, label, to, opts = {}) {
  const el = document.getElementById(elId);
  if (!el) return;
  const current = el.querySelector(".num")?.textContent || "0";
  el.innerHTML = `${label}<span class="num">${current}</span>`;
  animateNumber(el.querySelector(".num"), to, opts);
}

function animateNumbersIn(container) {
  if (!container) return;
  container.querySelectorAll(".num[data-target]").forEach(span => {
    const target = parseFloat(span.dataset.target) || 0;
    animateNumber(span, target, { duration: 700 });
    span.removeAttribute("data-target");
  });
}
/* ========================================================= */

// -------- Contadores (globales) --------
function actualizarContadores(base = state.allData) {
  const hoy  = new Date();
  const mes  = hoy.getMonth();
  const anio = hoy.getFullYear();

  const vuelosHoy  = base.filter(f => { const d = parseDateFlexible(f.Fecha); return d && sameYMD(d, hoy); }).length;
  const vuelosMes  = base.filter(f => { const d = parseDateFlexible(f.Fecha); return d && d.getMonth() === mes && d.getFullYear() === anio; }).length;
  const vuelosAnio = base.filter(f => { const d = parseDateFlexible(f.Fecha); return d && d.getFullYear() === anio; }).length;

  // ANIMADOS
  animateLabeledCounter("vuelosDia",  "Vuelos hoy: ",       vuelosHoy,  { duration: 800 });
  animateLabeledCounter("vuelosMes",  "Vuelos este mes: ",  vuelosMes,  { duration: 900 });
  animateLabeledCounter("vuelosAnio", "Vuelos este año: ",  vuelosAnio, { duration: 1000 });
}

// -------- KPIs --------
function countBy(arr, key) {
  const map = new Map();
  for (const it of arr) {
    const v = (it[key] || '').toString().trim();
    if (!v) continue;
    map.set(v, (map.get(v) || 0) + 1);
  }
  return Array.from(map.entries());
}
function topN(pairs, n = 3) {
  return pairs.sort((a,b) => b[1] - a[1]).slice(0, n);
}
function setList(targetId, pairs) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.innerHTML = pairs.length
    ? pairs.map(([name, c]) => `<li>${name} — <strong class="num" data-target="${c}">0</strong></li>`).join('')
    : `<li>—</li>`;
  animateNumbersIn(el);
}

function updateKPIs(viewData) {
  const total      = viewData.length;
  const escalas    = new Set(viewData.map(x => (x.Escala || '').trim()).filter(Boolean)).size;
  const matriculas = new Set(viewData.map(x => (x.Matricula || '').trim()).filter(Boolean)).size;

  const topEscalas    = topN(countBy(viewData, 'Escala'), 3);
  const topMatriculas = topN(countBy(viewData, 'Matricula'), 3);

  animateNumber(document.getElementById('kpiTotal'),      total,      { duration: 700 });
  animateNumber(document.getElementById('kpiEscalas'),    escalas,    { duration: 800 });
  animateNumber(document.getElementById('kpiMatriculas'), matriculas, { duration: 900 });

  setList('kpiTopEscalas', topEscalas);
  setList('kpiTopMatriculas', topMatriculas);

  drawSparkline(viewData);
}

// ===== Sparkline con días y valores =====
function drawSparkline(viewData) {
  const el = document.getElementById('kpiSparkline');
  if (!el) return;

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  // Conteo por día del mes actual
  const counts = new Array(daysInMonth).fill(0);
  for (const r of viewData) {
    const d = parseDateFlexible(r.Fecha);
    if (d && d.getFullYear() === y && d.getMonth() === m) {
      const idx = d.getDate() - 1;
      if (idx >= 0 && idx < daysInMonth) counts[idx]++;
    }
  }

  // Lienzo lógico
  const w = 320, h = 80, pad = 8;
  const maxY = Math.max(1, ...counts);
  const stepX = (w - pad * 2) / Math.max(1, (daysInMonth - 1));
  const axisY = h - pad;

  const scaleY = (val) => {
    const usable = h - pad * 2 - 14; // deja lugar a etiquetas arriba
    return pad + (usable - (val / maxY) * usable);
  };

  // Línea
  const points = counts.map((c, i) => `${pad + i * stepX},${scaleY(c)}`).join(' ');

  // Densidad de etiquetas (mostramos ~10 marcas)
  const maxDayLabels = 10;
  const tickEvery = Math.max(1, Math.ceil(daysInMonth / maxDayLabels));
  // Si querés TODOS los días: const tickEvery = 1;

  const circles = [];
  const valueLabels = [];
  const dayLabels = [];

  for (let i = 0; i < daysInMonth; i++) {
    const cx = pad + i * stepX;
    const cy = scaleY(counts[i]);

    // Punto
    circles.push(`<circle cx="${cx}" cy="${cy}" r="2"></circle>`);

    // Valor (solo si >0 y en marcas espaciadas)
    if (counts[i] > 0 && (i % tickEvery === 0 || i === daysInMonth - 1)) {
      valueLabels.push(`<text x="${cx}" y="${cy - 5}" class="spark-value" text-anchor="middle">${counts[i]}</text>`);
    }

    // Etiqueta de día en eje X
    if (i % tickEvery === 0 || i === daysInMonth - 1) {
      dayLabels.push(`<text x="${cx}" y="${axisY}" dy="12" class="spark-day" text-anchor="middle">${i + 1}</text>`);
    }
  }

  el.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="80" preserveAspectRatio="none">
      <!-- Eje X -->
      <line x1="${pad}" y1="${axisY}" x2="${w - pad}" y2="${axisY}" class="spark-axis" />
      ${dayLabels.join('')}

      <!-- Línea -->
      <polyline fill="none" stroke="currentColor" stroke-width="1.5" points="${points}"></polyline>

      <!-- Puntos -->
      ${circles.join('')}

      <!-- Valores -->
      ${valueLabels.join('')}
    </svg>
  `;
}

// -------- Render tabla --------
function renderTabla(data) {
  tbody.innerHTML = "";
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">No hay datos disponibles</td></tr>`;
    updateKPIs([]);
    actualizarContadores(state.allData); // para que los contadores sean globales
    return;
  }
  for (const fila of data) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatFecha(fila.Fecha)}</td>
      <td>${fila.Escala || ""}</td>
      <td>${fila.Matricula || ""}</td>
      <td>${fila["LLegada Numero Vuelo"] || ""}</td>
      <td>${fila["Salida Numero Vuelo"] || ""}</td>
    `;
    tbody.appendChild(tr);
  }
  updateKPIs(data);
  actualizarContadores(state.allData); // si preferís que siga la vista: pasá 'data'
}

// -------- Fetch robusto --------
async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  const ctype = res.headers.get("content-type") || "";
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} en ${url} — ${txt.slice(0, 200)}`);
  }
  if (ctype.includes("application/json")) {
    return res.json();
  } else {
    const txt = await res.text();
    try { return JSON.parse(txt); }
    catch { throw new Error(`Respuesta no JSON desde ${url}. Primeros 300 chars:\n${txt.slice(0, 300)}`); }
  }
}

function coerceArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.data)) return raw.data;
  if (raw && Array.isArray(raw.rows)) return raw.rows;
  return [];
}

// -------- Filtros & sort --------
function applyFilters() {
  const q = (inputFiltro.value || "").toLowerCase().trim();
  const dDesde = fDesde.value ? new Date(fDesde.value) : null;
  const dHasta = fHasta.value ? new Date(fHasta.value) : null;
  const escalaSel = (fEscala.value || "").toLowerCase().trim();
  const matSel    = (fMatricula.value || "").toLowerCase().trim();

  let data = state.allData.filter(r => {
    // texto libre
    const hitsText = !q || Object.values(r).some(v => String(v ?? "").toLowerCase().includes(q));
    // fecha
    const d = parseDateFlexible(r.Fecha);
    const hitsFecha = (!dDesde || (d && d >= dDesde)) &&
                      (!dHasta || (d && d <= dHasta));
    // combos
    const hitsEsc = !escalaSel || String(r.Escala || "").toLowerCase() === escalaSel;
    const hitsMat = !matSel    || String(r.Matricula || "").toLowerCase() === matSel;

    return hitsText && hitsFecha && hitsEsc && hitsMat;
  });

  // sort actual
  if (state.sort.key) {
    const { key, dir } = state.sort;
    data.sort((a, b) => {
      let va = a[key] ?? "", vb = b[key] ?? "";
      if (key === "Fecha") {
        va = parseDateFlexible(va) || new Date(0);
        vb = parseDateFlexible(vb) || new Date(0);
      }
      return (va > vb ? 1 : (va < vb ? -1 : 0)) * dir;
    });
  }

  state.filtered = data;
  renderTabla(state.filtered);
}

function buildSelectOptions() {
  const escSet = new Set();
  const matSet = new Set();
  for (const r of state.allData) {
    if (r.Escala)    escSet.add(r.Escala);
    if (r.Matricula) matSet.add(r.Matricula);
  }
  const toOptions = (set) =>
    ["", ...Array.from(set).sort()].map(v => `<option value="${v}">${v || 'Todas'}</option>`).join("");

  if (fEscala)    fEscala.innerHTML    = toOptions(escSet);
  if (fMatricula) fMatricula.innerHTML = toOptions(matSet);
}

// -------- Carga (con preservación de filtros/sort) --------
async function cargarVuelos() {
  try {
    const raw = await fetchJSON(urlVuelos);

    if (raw && raw.ok === false) {
      console.error(raw.error);
      showAlert(`Error del servidor: ${raw.error}`, "error");
      tbody.innerHTML = `<tr><td colspan="5">Error del servidor</td></tr>`;
      return;
    }

    const arr = coerceArray(raw);
    state.allData = arr.map(normalizeRow);

    // Construir selects solo 1 vez
    if (!buildSelectOptions._done) {
      buildSelectOptions();
      buildSelectOptions._done = true;
    }

    // Sort por defecto solo si aún no fue definido
    if (!state.sort.key) {
      state.sort = { key: "Fecha", dir: -1 }; // más nuevo primero
    }

    applyFilters();
  } catch (err) {
    console.error(err);
    showAlert(err.message || "Error al cargar los datos", "error");
    tbody.innerHTML = `<tr><td colspan="5">Error al cargar los datos</td></tr>`;
  }
}

// -------- Eventos --------
inputFiltro.addEventListener("input", applyFilters);
[fDesde, fHasta, fEscala, fMatricula].forEach(el => el && el.addEventListener("change", applyFilters));

btnClear.addEventListener("click", () => {
  inputFiltro.value = "";
  fDesde.value = "";
  fHasta.value = "";
  fEscala.value = "";
  fMatricula.value = "";
  applyFilters();
});

const sortKeyMap = {
  "Fecha": "Fecha",
  "Escala": "Escala",
  "Matricula": "Matricula",
  "LLegada Numero Vuelo": "LLegada Numero Vuelo",
  "Salida Numero Vuelo": "Salida Numero Vuelo",
};

document.querySelectorAll("th").forEach(th => {
  th.addEventListener("click", () => {
    const key = sortKeyMap[th.getAttribute("data-column")] || null;
    if (!key) return;
    const isCurrent = state.sort.key === key;
    state.sort = { key, dir: isCurrent ? state.sort.dir * -1 : 1 };
    applyFilters();
  });
});

// Modo noche/día
if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    bodyEl.classList.toggle("night");
    toggleBtn.textContent = bodyEl.classList.contains("night") ? "Modo Día" : "Modo Noche";
  });
}

// Usuarios activos (tolerante)
function actualizarUsuarioActivo() {
  fetch(urlUsuarios, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  }).catch(err => console.error(err));
}
function obtenerUsuariosActivos() {
  const el = document.getElementById("usuariosActivos");
  if (!el) return;
  fetch(urlUsuarios)
    .then(res => res.json())
    .then(data => { el.textContent = `Usuarios activos: ${data.activos ?? "-"}`; })
    .catch(err => console.error(err));
}

// Boot + auto-refresh
cargarVuelos();
actualizarUsuarioActivo();
obtenerUsuariosActivos();
setInterval(() => {
  cargarVuelos();             // refresca datos
  actualizarUsuarioActivo();  // ping de presencia
  obtenerUsuariosActivos();   // contador de usuarios
}, AUTO_REFRESH_MS);
```0
