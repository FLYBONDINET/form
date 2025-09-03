const ENDPOINT = "https://script.google.com/macros/s/AKfycbyNSAOFHHw0qih39D28U1HYVSKfP-sC7VlDl1oBS3XgMsWsP76xsWj_rIOVWOpt31oZ/exec"; // reemplaza con tu Web App

// Verificar sesión
window.onload = () => {
  if(sessionStorage.getItem("usuario")) {
    window.location.href = "menu.html";
  }
};

function login() {
  const mail = document.getElementById('mail').value;
  const legajo = document.getElementById('legajo').value;
  const errorMsg = document.getElementById('errorMsg');

  fetch(ENDPOINT, {
    method: "POST",
    body: JSON.stringify({ mail, legajo }),
    headers: { "Content-Type": "application/json" }
  })
  .then(res => res.json())
  .then(data => {
    if(data.success){
      errorMsg.textContent = "";
      sessionStorage.setItem("usuario", mail); // Guardar sesión
      window.location.href = "menu.html";      // Redirigir al menú
    } else {
      errorMsg.textContent = "Ingreso incorrecto";
    }
  })
  .catch(err => {
    errorMsg.textContent = "Error de conexión";
    console.error(err);
  });
}
