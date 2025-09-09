const timeGrid = document.getElementById("timeGrid");
const horarios = ["Hora Inicio", "Hora Fin", "Hora Puerta", "Hora Despacho"];

horarios.forEach(h => {
  const div = document.createElement("div");
  div.classList.add("field");
  const label = document.createElement("label");
  label.textContent = h;
  const input = document.createElement("input");
  input.type = "time";
  input.id = h.replace(/\s/g,"");
  input.name = h.replace(/\s/g,"");
  div.appendChild(label);
  div.appendChild(input);
  timeGrid.appendChild(div);
});

// Botones para rellenar hora actual
const asuBlock = document.getElementById("asuBlock");
const btnAhora = document.createElement("button");
btnAhora.type = "button";
btnAhora.classList.add("btn");
btnAhora.textContent = "Hora Ahora";
btnAhora.addEventListener("click", ()=> {
  const d = new Date();
  const h = String(d.getHours()).padStart(2,"0");
  const m = String(d.getMinutes()).padStart(2,"0");
  document.querySelectorAll("input[type='time']").forEach(inp => inp.value = `${h}:${m}`);
});
asuBlock.appendChild(btnAhora);
