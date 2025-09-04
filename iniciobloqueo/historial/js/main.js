const urlVuelos = "https://script.google.com/macros/s/AKfycbx1nIYYMsgd-a7V02QLzT6sBoHlQHkJ9Bt1gbBNCt9wIEP3dIzujYjiUAZ9M0cBVS1c/exec";
const urlUsuarios = "https://script.google.com/macros/s/AKfycbwEz4pfgHUsmar2CNGaplmlgYDrsBzc0T8-0fS9Bj96y0eSeb1vTr3Lao51dIvIt4HC/exec";

const tbody = document.querySelector("#tablaVuelos tbody");
const inputFiltro = document.getElementById("busqueda");
const toggleBtn = document.getElementById("toggleMode");
const bodyEl = document.body;
let tablaData = [];

// Generar SessionID aleatorio para el usuario
const sessionId = '_' + Math.random().toString(36).substr(2, 9);

function formatFecha(fechaStr){
  if(!fechaStr) return "";
  const date = new Date(fechaStr);
  if(isNaN(date)) return fechaStr;
  const dd = String(date.getDate()).padStart(2,"0");
  const mm = String(date.getMonth()+1).padStart(2,"0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function actualizarContadores(){
  const hoy = new Date();
  const dia = hoy.toDateString();
  const mes = hoy.getMonth();
  const anio = hoy.getFullYear();

  const vuelosHoy = tablaData.filter(f=>new Date(f.Fecha).toDateString()===dia).length;
  const vuelosMes = tablaData.filter(f=>new Date(f.Fecha).getMonth()===mes && new Date(f.Fecha).getFullYear()===anio).length;
  const vuelosAnio = tablaData.filter(f=>new Date(f.Fecha).getFullYear()===anio).length;

  document.getElementById("vuelosDia").textContent = `Vuelos hoy: ${vuelosHoy}`;
  document.getElementById("vuelosMes").textContent = `Vuelos este mes: ${vuelosMes}`;
  document.getElementById("vuelosAnio").textContent = `Vuelos este año: ${vuelosAnio}`;
}

// Renderizar tabla
function renderTabla(data){
  tbody.innerHTML="";
  if(!data || data.length===0){
    tbody.innerHTML=`<tr><td colspan="5">No hay datos disponibles</td></tr>`;
    return;
  }
  data.forEach(fila=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${formatFecha(fila["Fecha"])}</td>
      <td>${fila["Escala"]||""}</td>
      <td>${fila["Matricula"]||""}</td>
      <td>${fila["LLegada Numero Vuelo"]||""}</td>
      <td>${fila["Salida Numero Vuelo"]||""}</td>
    `;
    tbody.appendChild(tr);
  });
  actualizarContadores();
}

// Fetch datos de vuelos
fetch(urlVuelos)
.then(res=>res.json())
.then(data=>{
  tablaData=data;
  renderTabla(tablaData);
})
.catch(err=>{
  console.error(err);
  tbody.innerHTML=`<tr><td colspan="5">Error al cargar los datos</td></tr>`;
});

// Filtro
inputFiltro.addEventListener("input",()=>{
  const val=inputFiltro.value.toLowerCase();
  const filtrado=tablaData.filter(f=>Object.values(f).some(v=>String(v).toLowerCase().includes(val)));
  renderTabla(filtrado);
});

// Ordenamiento
document.querySelectorAll("th").forEach(th=>{
  th.addEventListener("click",()=>{
    const col=th.getAttribute("data-column");
    const isAsc=th.classList.contains("asc");
    document.querySelectorAll("th").forEach(h=>h.classList.remove("asc","desc"));
    th.classList.toggle(isAsc?"desc":"asc");
    tablaData.sort((a,b)=>{
      let va=a[col]||"", vb=b[col]||"";
      if(col==="Fecha"){ va=new Date(va); vb=new Date(vb);}
      return (va>vb?1:(va<vb?-1:0)) * (isAsc?-1:1);
    });
    renderTabla(tablaData);
  });
});

// Modo noche/día
toggleBtn.addEventListener("click",()=>{
  bodyEl.classList.toggle("night");
  toggleBtn.textContent = bodyEl.classList.contains("night") ? "Modo Día" : "Modo Noche";
});

// ----- USUARIOS ACTIVOS -----
function actualizarUsuarioActivo() {
  fetch(urlUsuarios, {
    method: "POST",
    body: JSON.stringify({sessionId}),
  }).catch(err => console.error(err));
}

function obtenerUsuariosActivos(){
  fetch(urlUsuarios)
  .then(res=>res.json())
  .then(data=>{
    document.getElementById("usuariosActivos").textContent = `Usuarios activos: ${data.activos}`;
  });
}

// Ciclo cada 10s
actualizarUsuarioActivo();
obtenerUsuariosActivos();
setInterval(()=>{
  actualizarUsuarioActivo();
  obtenerUsuariosActivos();
},10000);
