// auth.js - control de sesión global

// Bloqueo de acceso directo
function verificarSesion() {
  const sesion = localStorage.getItem("usuarioActivo");
  if (!sesion) {
    window.location.href = "../index.html"; 
  }
}

// Función de logout
function cerrarSesion() {
  localStorage.removeItem("usuarioActivo");
  window.location.href = "../index.html";
}

// Ejecutar verificación automáticamente al cargar
verificarSesion();
