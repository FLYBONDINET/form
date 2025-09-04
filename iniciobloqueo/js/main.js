// URLs de tus Web Apps
const urlVuelos = "https://script.google.com/macros/s/AKfycbyHK1IUOfV6Sz3vJU_sa_yXfJLBrOAv-wHvHQDYnq-V7LTbkakaxuSfVGG0SaQYpvjz/exec"; // Vuelos
const urlUsuarios = "https://script.google.com/macros/s/AKfycbybR0vF4dXgcGwead3I725cwpY6sgxz101RHFUV7Ff39zMyOwJPlGbv9lGebgWK1-ho/exec"; // Usuarios activos

let tablaData = [];

// Generar SessionID único para el usuario
const sessionId = '_' + Math.random().toString(36).substr(2, 9);

// ---------------- Contadores de vuelos ----------------
function actualizarContadores(){
  const hoy = new Date();
  const dia = hoy.toDateString();
  const mes = hoy.getMonth();
  const anio = hoy.getFullYear();

  const vuelosHoy = tablaData.filter(f => {
    const fecha = new Date(f.Fecha);
    return fecha.toDateString() === dia;
  }).length;

  const vuelosMes = tablaData.filter(f => {
    const fecha = new Date(f.Fecha);
    return fecha.getMonth() === mes && fecha.getFullYear() === anio;
  }).length;

  const vuelosAnio = tablaData.filter(f => {
    const fecha = new Date(f.Fecha);
    return fecha.getFullYear() === anio;
  }).length;

  document.getElementById("vuelosDia").textContent = `Vuelos hoy: ${vuelosHoy}`;
  document.getElementById("vuelosMes").textContent = `Vuelos mes: ${vuelosMes}`;
  document.getElementById("vuelosAnio").textContent = `Vuelos año: ${vuelosAnio}`;

  console.log("Contadores vuelos actualizados:", {vuelosHoy, vuelosMes, vuelosAnio});
}

// ---------------- Obtener vuelos ----------------
function obtenerVuelos(){
  fetch(urlVuelos)
    .then(res => res.json())
    .then(data => {
      if(Array.isArray(data)){
        tablaData = data.map(f => ({ Fecha: f.Fecha || "" }));
        console.log("Datos de vuelos recibidos:", tablaData);
        actualizarContadores();
      } else {
        console.error("Formato de datos incorrecto:", data);
      }
    })
    .catch(err => console.error("Error fetch vuelos:", err));
}

// ---------------- Registrar usuario activo ----------------
function actualizarUsuarioActivo(){
  fetch(urlUsuarios, {
    method: "POST",
    body: JSON.stringify({sessionId}),
  }).catch(err => console.error("Error registrar usuario activo:", err));
}

// ---------------- Contador de usuarios activos ----------------
function obtenerUsuariosActivos(){
  fetch(urlUsuarios)
    .then(res => res.json())
    .then(data => {
      if(data.activos !== undefined){
        document.getElementById("usuariosActivos").textContent = `Usuarios activos: ${data.activos}`;
        console.log("Usuarios activos:", data.activos);
      } else {
        console.error("Formato incorrecto usuarios:", data);
      }
    })
    .catch(err => console.error("Error fetch usuarios:", err));
}

// ---------------- Inicializar ----------------
actualizarUsuarioActivo();  // Registrar al usuario
obtenerUsuariosActivos();
obtenerVuelos();

// ---------------- Actualizar cada 10 segundos ----------------
setInterval(() => {
  actualizarUsuarioActivo();
  obtenerUsuariosActivos();
  obtenerVuelos();
}, 10000);
