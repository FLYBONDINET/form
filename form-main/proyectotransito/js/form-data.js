const STORAGE_KEY = "fo_form_temp";
const ROWID_KEY = "fo_row_id";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwJbNtiAAMfNc-WXa0U3V-jXc3lZWBOWae55TUdaRQCw3PZbd3aLeEizXweGIHUozZ8/exec";

function getValuesOrdered(){
  const values = {};
  document.querySelectorAll("#formTránsito input, #formTránsito select, #formTránsito textarea")
    .forEach(el=> values[el.id] = el.value);
  return values;
}

function saveLocal(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getValuesOrdered()));
}

function loadLocal(){
  const data = localStorage.getItem(STORAGE_KEY);
  if(data){
    const obj = JSON.parse(data);
    for(let k in obj){
      const el = document.getElementById(k);
      if(el) el.value = obj[k];
    }
  }
}
window.addEventListener("load", loadLocal);

function enviarFinal(){
  const data = getValuesOrdered();
  fetch(APPS_SCRIPT_URL, {method:"POST", body:JSON.stringify(data)})
    .then(r=>r.text()).then(t=>{alert("Enviado correctamente"); localStorage.removeItem(STORAGE_KEY);})
    .catch(e=>alert("Error al enviar: "+e));
}

document.getElementById("btnEnviar").addEventListener("click", enviarFinal);
document.getElementById("btnBorrarLocal").addEventListener("click", ()=>{
  localStorage.removeItem(STORAGE_KEY);
});
