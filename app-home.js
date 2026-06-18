const tarjetasAlgoritmo = document.querySelectorAll("[data-algoritmo]");
const selectorAristas = document.getElementById("selectorAristas");
const cerrarSelector = document.getElementById("cerrarSelector");
const opcionesAristas = document.querySelectorAll("[data-tipo]");

let paginaDestino = "";

function abrirSelector(evento) {
  evento.preventDefault();
  paginaDestino = evento.currentTarget.getAttribute("href");
  selectorAristas.hidden = false;
  document.body.classList.add("modal-open");
}

function cerrarModal() {
  selectorAristas.hidden = true;
  document.body.classList.remove("modal-open");
}

tarjetasAlgoritmo.forEach((tarjeta) => {
  tarjeta.addEventListener("click", abrirSelector);
});

opcionesAristas.forEach((opcion) => {
  opcion.addEventListener("click", () => {
    const tipo = opcion.dataset.tipo;
    window.location.href = `${paginaDestino}?tipo=${tipo}`;
  });
});

cerrarSelector.addEventListener("click", cerrarModal);

selectorAristas.addEventListener("click", (evento) => {
  if (evento.target === selectorAristas) cerrarModal();
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && !selectorAristas.hidden) cerrarModal();
});
