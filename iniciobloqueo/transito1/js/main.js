// Toggle día/noche
document.getElementById("toggleTheme").addEventListener("click", () => {
  const cur = document.body.getAttribute("data-theme");
  const next = cur === "day" ? "night" : "day";
  document.body.setAttribute("data-theme", next);
  localStorage.setItem("fo_theme", next);
});

const savedTheme = localStorage.getItem("fo_theme");
if(savedTheme) document.body.setAttribute("data-theme", savedTheme);

// Acordeón
document.querySelectorAll(".card .legend").forEach(legend => {
  const icon = legend.querySelector(".icon");
  if(icon) icon.textContent = legend.parentElement.classList.contains("open") ? "−" : "+";
  legend.addEventListener("click", () => {
    const card = legend.parentElement;
    card.classList.toggle("open");
    const ic = legend.querySelector(".icon");
    if(ic) ic.textContent = card.classList.contains("open") ? "−" : "+";
  });
});

// Selects
const DESTINOS_IATA = ["AEP","AUQ","BRC","CNF","CNQ","COR","CRD","ENO","EZE","FTE","FLN","GIG","GRU","IGR","JUJ","MCZ","MDQ","MDZ","MVD","NQN","PDP","PMY","REL","RES","SDE","SLA","TUC","USH"];
const MATRICULAS = ["LV-KJD","LV-KJE","LV-KAY","LV-KAH","LV-KJF","LV-KCD","LV-KCE","LV-HKN","LV-KHO","LV-KEF","LV-KEG","LV-KEH","LV-KDR","LV-KDQ","LY-MLJ","LY-VEL","LY-NVL","PR-MLD"];

const selEscala = document.getElementById("Escala");
DESTINOS_IATA.forEach(c => {
  const op = document.createElement("option");
  op.value = c;
  op.textContent = c;
  selEscala.appendChild(op);
});

const selMat = document.getElementById("Matricula");
MATRICULAS.forEach(m => {
  const op = document.createElement("option");
  op.value = m;
  op.textContent = m;
  selMat.appendChild(op);
});

// Fecha hoy
(function setToday(){
  const d = new Date();
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
  document.getElementById("Fecha").value = `${y}-${m}-${day}`;
})();
