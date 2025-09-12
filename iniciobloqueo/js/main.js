// ================== CONFIG ==================
const urlVuelos   = "https://script.google.com/macros/s/AKfycbyHK1IUOfV6Sz3vJU_sa_yXfJLBrOAv-wHvHQDYnq-V7LTbkakaxuSfVGG0SaQYpvjz/exec";
const urlUsuarios = "https://script.google.com/macros/s/AKfycbybR0vF4dXgcGwead3I725cwpY6sgxz101RHFUV7Ff39zMyOwJPlGbv9lGebgWK1-ho/exec";

// ================== STATE ==================
let tablaData = [];
const sessionId = '_' + Math.random().toString(36).slice(2, 11);

// ================== DOM HELPERS ==================
const $ = (sel) => document.querySelector(sel);

// ================== SESIÓN ==================
(function initSession(){
  const raw = localStorage.getItem("usuarioActivo");
  if (!raw) {
    location.href = "../index.html";
    return;
  }
  let usuario;
  try { usuario = JSON.parse(raw); } catch { usuario = { email: raw }; }
  const email = usuario.email || "-";
  const legajo = usuario.legajo || "-";
  const userEl = $("#usuarioInfo");
  if (userEl) userEl.textContent = `Usuario: ${email} | Legajo: ${legajo}`;
})();

window.cerrarSesion = function(){
  localStorage.removeItem("usuarioActivo");
  location.href = "../index.html";
};

// ================== MODO NOCHE ==================
(function initTheme(){
  const saved = localStorage.getItem("theme"); // 'night' | 'day'
  if (saved) document.body.classList.toggle("night", saved === "night");

  const btn = $("#toggleMode");
  if (btn) {
    btn.addEventListener("click", () => {
      const isNight = document.body.classList.toggle("night");
      localStorage.setItem("theme", isNight ? "night" : "day");
    });
  }
})();

// ================== FECHAS ==================
function parseFecha(s){
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

// ================== CONTADORES ==================
function actualizarContadores(){
  const hoy  = new Date();
  const mes  = hoy.getMonth();
  const anio = hoy.getFullYear();

  const vuelosHoy = tablaData.filter(f => {
    const d = parseFecha(f.Fecha); return d && d.toDateString() === hoy.toDateString();
  }).length;

  const vuelosMes = tablaData.filter(f => {
    const d = parseFecha(f.Fecha); return d && d.getMonth()===mes && d.getFullYear()===anio;
  }).length;

  const vuelosAnio = tablaData.filter(f => {
    const d = parseFecha(f.Fecha); return d && d.getFullYear()===anio;
  }).length;

  const elDia  = $("#vuelosDia");
  const elMes  = $("#vuelosMes");
  const elAnio = $("#vuelosAnio");

  if (elDia)  elDia.textContent  = `Vuelos hoy: ${vuelosHoy}`;
  if (elMes)  elMes.textContent  = `Vuelos mes: ${vuelosMes}`;
  if (elAnio) elAnio.textContent = `Vuelos año: ${vuelosAnio}`;
}

// ================== FETCH ==================
function obtenerVuelos(){
  fetch(urlVuelos)
    .then(r => r.json())
    .then(data => {
      if (Array.isArray(data)) {
        tablaData = data.map(f => ({ Fecha: f.Fecha || "" }));
        actualizarContadores();
      } else {
        console.error("Formato de datos incorrecto:", data);
      }
    })
    .catch(err => console.error("Error fetch vuelos:", err));
}

function actualizarUsuarioActivo(){
  fetch(urlUsuarios, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ sessionId }),
  }).catch(err => console.error("Error registrar usuario activo:", err));
}

function obtenerUsuariosActivos(){
  const chip = $("#usuariosActivos");
  if (!chip) return;
  fetch(urlUsuarios)
    .then(r => r.json())
    .then(data => {
      const n = (data && typeof data.activos !== "undefined") ? data.activos : "-";
      chip.textContent = `Usuarios activos: ${n}`;
    })
    .catch(err => console.error("Error fetch usuarios:", err));
}

// ================== BOOT ==================
actualizarUsuarioActivo();
obtenerUsuariosActivos();
obtenerVuelos();

// refresco cada 10s
setInterval(() => {
  actualizarUsuarioActivo();
  obtenerUsuariosActivos();
  obtenerVuelos();
}, 10000);
