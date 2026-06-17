const canvas = document.getElementById("canvasGrafo");
const ctx = canvas.getContext("2d");

const btnModoNodo = document.getElementById("btnModoNodo");
const btnModoSeleccionar = document.getElementById("btnModoSeleccionar");
const btnAgregarArco = document.getElementById("btnAgregarArco");
const btnCalcular = document.getElementById("btnCalcular");
const btnLimpiar = document.getElementById("btnLimpiar");
const btnEliminarNodo = document.getElementById("btnEliminarNodo");

const txtOrigen = document.getElementById("txtOrigen");
const txtDestino = document.getElementById("txtDestino");
const txtPeso = document.getElementById("txtPeso");
const txtEliminarNodo = document.getElementById("txtEliminarNodo");
const matrizResultados = document.getElementById("matrizResultados");
const tituloResultados = document.getElementById("tituloResultados");
const modoActual = document.getElementById("modoActual");
const ayudaCanvas = document.getElementById("ayudaCanvas");
const contenedorVisualizaciones = document.getElementById("contenedorVisualizaciones");

const RADIO_NODO = 24;
const INF = Number.POSITIVE_INFINITY;
const COLORES_CAMINOS = ["#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

let nodos = [];
let arcos = [];
let modo = "seleccionar";
let ultimoResultado = null;
let temporizadorRedimension = null;

function ajustarCanvas() {
  const rect = canvas.getBoundingClientRect();
  const escala = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * escala);
  canvas.height = Math.floor(rect.height * escala);
  ctx.setTransform(escala, 0, 0, escala, 0, 0);
  dibujarGrafo();
}

function cambiarModo(nuevoModo) {
  modo = nuevoModo;
  const agregando = modo === "agregarNodo";
  canvas.classList.toggle("add-node", agregando);
  modoActual.textContent = agregando ? "Modo: agregar nodo" : "Modo: seleccionar";
  ayudaCanvas.textContent = agregando
    ? "Haz clic en el area blanca para colocar un nuevo nodo."
    : "Agrega arcos y calcula Floyd-Warshall para obtener todos los caminos.";
}

function mostrarMensaje(mensaje) {
  const anterior = document.querySelector(".toast");
  if (anterior) anterior.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = mensaje;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function obtenerPosicionCanvas(evento) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: evento.clientX - rect.left,
    y: evento.clientY - rect.top
  };
}

function distancia(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function existeNodo(id) {
  return nodos.some((nodo) => nodo.id === id);
}

function buscarNodo(id) {
  return nodos.find((nodo) => nodo.id === id);
}

function invalidarResultados() {
  ultimoResultado = null;
  tituloResultados.textContent = "Matriz de distancias";
  matrizResultados.innerHTML = `<tr><td class="empty">Aun no hay resultados.</td></tr>`;
  contenedorVisualizaciones.innerHTML = `<div class="visual-empty">Calcule Floyd-Warshall para generar los caminos.</div>`;
}

function agregarNodo(posicion) {
  const ancho = canvas.getBoundingClientRect().width;
  const alto = canvas.getBoundingClientRect().height;

  if (
    posicion.x < RADIO_NODO ||
    posicion.y < RADIO_NODO ||
    posicion.x > ancho - RADIO_NODO ||
    posicion.y > alto - RADIO_NODO
  ) {
    mostrarMensaje("El nodo debe estar mas alejado del borde.");
    return;
  }

  const demasiadoCerca = nodos.some((nodo) => distancia(nodo.posicion, posicion) < RADIO_NODO * 2);
  if (demasiadoCerca) {
    mostrarMensaje("El nodo esta demasiado cerca de otro nodo.");
    return;
  }

  nodos.push({
    id: nodos.length + 1,
    posicion
  });

  invalidarResultados();
  dibujarGrafo();
}

function eliminarNodo() {
  const idEliminar = Number(txtEliminarNodo.value);

  if (!Number.isInteger(idEliminar)) {
    mostrarMensaje("Ingrese el numero del nodo que desea eliminar.");
    return;
  }

  if (!existeNodo(idEliminar)) {
    mostrarMensaje("El nodo indicado no existe.");
    return;
  }

  nodos = nodos.filter((nodo) => nodo.id !== idEliminar);
  arcos = arcos.filter((arco) => arco.origen !== idEliminar && arco.destino !== idEliminar);

  const mapaIds = new Map();
  nodos
    .sort((a, b) => a.id - b.id)
    .forEach((nodo, indice) => {
      const nuevoId = indice + 1;
      mapaIds.set(nodo.id, nuevoId);
      nodo.id = nuevoId;
    });

  arcos.forEach((arco) => {
    arco.origen = mapaIds.get(arco.origen);
    arco.destino = mapaIds.get(arco.destino);
  });

  txtEliminarNodo.value = "";
  invalidarResultados();
  dibujarGrafo();
}

function agregarArco() {
  const origen = Number(txtOrigen.value);
  const destino = Number(txtDestino.value);
  const peso = Number(txtPeso.value);

  if (!Number.isInteger(origen) || !Number.isInteger(destino) || !Number.isInteger(peso)) {
    mostrarMensaje("Origen, destino y peso deben ser numeros enteros.");
    return;
  }

  if (peso <= 0) {
    mostrarMensaje("El peso debe ser positivo.");
    return;
  }

  if (!existeNodo(origen) || !existeNodo(destino)) {
    mostrarMensaje("Deben existir los nodos origen y destino.");
    return;
  }

  if (origen === destino) {
    mostrarMensaje("No se permiten arcos hacia el mismo nodo.");
    return;
  }

  const arcoExistente = arcos.find((arco) => arco.origen === origen && arco.destino === destino);
  if (arcoExistente) {
    arcoExistente.peso = peso;
  } else {
    arcos.push({ origen, destino, peso });
  }

  txtOrigen.value = "";
  txtDestino.value = "";
  txtPeso.value = "";
  invalidarResultados();
  dibujarGrafo();
}

function floydWarshall() {
  const n = nodos.length;
  const dist = Array.from({ length: n }, () => Array(n).fill(INF));
  const siguiente = Array.from({ length: n }, () => Array(n).fill(null));

  for (let i = 0; i < n; i++) {
    dist[i][i] = 0;
    siguiente[i][i] = i;
  }

  arcos.forEach((arco) => {
    const i = arco.origen - 1;
    const j = arco.destino - 1;
    if (arco.peso < dist[i][j]) {
      dist[i][j] = arco.peso;
      siguiente[i][j] = j;
    }
  });

  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const nuevaDistancia = dist[i][k] + dist[k][j];
        if (nuevaDistancia < dist[i][j]) {
          dist[i][j] = nuevaDistancia;
          siguiente[i][j] = siguiente[i][k];
        }
      }
    }
  }

  return { dist, siguiente };
}

function reconstruirCamino(origen, destino, siguiente) {
  let i = origen - 1;
  const j = destino - 1;

  if (siguiente[i][j] === null) return null;

  const camino = [origen];
  while (i !== j) {
    i = siguiente[i][j];
    camino.push(i + 1);
  }

  return camino;
}

function calcularFloydWarshall() {
  if (nodos.length === 0) {
    mostrarMensaje("Agregue al menos un nodo.");
    return;
  }

  const resultado = floydWarshall();
  const caminos = [];

  for (let i = 1; i <= nodos.length; i++) {
    for (let j = 1; j <= nodos.length; j++) {
      const camino = reconstruirCamino(i, j, resultado.siguiente);
      caminos.push({
        origen: i,
        destino: j,
        distancia: resultado.dist[i - 1][j - 1],
        camino
      });
    }
  }

  tituloResultados.textContent = "Matriz de distancias minimas";
  mostrarMatriz(resultado.dist);
  crearVisualizaciones(caminos);
  ultimoResultado = { caminos };
}

function mostrarMatriz(dist) {
  let html = "<thead><tr><th>Desde/Hacia</th>";
  nodos.forEach((nodo) => {
    html += `<th>${nodo.id}</th>`;
  });
  html += "</tr></thead><tbody>";

  nodos.forEach((nodoOrigen, i) => {
    html += `<tr><th>${nodoOrigen.id}</th>`;
    nodos.forEach((_, j) => {
      html += `<td>${dist[i][j] === INF ? "No alcanzable" : dist[i][j]}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody>";
  document.getElementById("tablaMatriz").innerHTML = html;
}

function limpiarTodo() {
  nodos = [];
  arcos = [];
  txtOrigen.value = "";
  txtDestino.value = "";
  txtPeso.value = "";
  txtEliminarNodo.value = "";
  invalidarResultados();
  cambiarModo("seleccionar");
  dibujarGrafo();
}

function crearVisualizaciones(caminos) {
  const caminosAlcanzables = caminos.filter((item) => item.camino && item.origen !== item.destino);

  if (caminosAlcanzables.length === 0) {
    contenedorVisualizaciones.innerHTML = `<div class="visual-empty">No hay caminos entre nodos distintos para mostrar.</div>`;
    return;
  }

  contenedorVisualizaciones.innerHTML = "";

  const coloresPorArco = new Map();
  caminosAlcanzables.forEach((item, indice) => {
    const color = COLORES_CAMINOS[indice % COLORES_CAMINOS.length];
    obtenerArcosDelCamino(item.camino).forEach((clave) => {
      if (!coloresPorArco.has(clave)) coloresPorArco.set(clave, color);
    });
  });

  const general = crearTarjetaVisual("Vista general Floyd-Warshall", "Todos los caminos minimos alcanzables", true);
  contenedorVisualizaciones.appendChild(general.card);
  dibujarMiniGrafo(general.canvas, { coloresPorArco, mostrarSoloResaltados: false });

  caminosAlcanzables.forEach((item, indice) => {
    const color = COLORES_CAMINOS[indice % COLORES_CAMINOS.length];
    const arcosCamino = new Set(obtenerArcosDelCamino(item.camino));
    const tarjeta = crearTarjetaVisual(
      `Camino ${item.origen} hacia ${item.destino}`,
      `Distancia: ${item.distancia} | ${item.camino.join(" -> ")}`,
      false
    );

    contenedorVisualizaciones.appendChild(tarjeta.card);
    dibujarMiniGrafo(tarjeta.canvas, {
      arcosResaltados: arcosCamino,
      colorResaltado: color,
      mostrarSoloResaltados: true
    });
  });
}

function obtenerArcosDelCamino(camino) {
  const claves = [];
  for (let i = 0; i < camino.length - 1; i++) {
    claves.push(`${camino[i]}-${camino[i + 1]}`);
  }
  return claves;
}

function crearTarjetaVisual(titulo, subtitulo, general) {
  const card = document.createElement("article");
  card.className = general ? "visual-card general" : "visual-card";

  const encabezado = document.createElement("div");
  encabezado.className = "visual-title";
  encabezado.innerHTML = `${titulo}<span>${subtitulo}</span>`;

  const canvasVisual = document.createElement("canvas");
  card.appendChild(encabezado);
  card.appendChild(canvasVisual);

  return { card, canvas: canvasVisual };
}

function dibujarGrafo() {
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  arcos.forEach((arco) => dibujarArco(ctx, arco, "#344054", 2.2, true));
  nodos.forEach((nodo) => dibujarNodo(ctx, nodo.posicion, nodo.id, 24));
}

function puntoEnBorde(origen, destino, radio = RADIO_NODO) {
  const dx = destino.x - origen.x;
  const dy = destino.y - origen.y;
  const largo = Math.hypot(dx, dy) || 1;
  return {
    x: origen.x + (dx / largo) * radio,
    y: origen.y + (dy / largo) * radio
  };
}

function obtenerPuntoControl(inicio, fin, separacion) {
  const medioX = (inicio.x + fin.x) / 2;
  const medioY = (inicio.y + fin.y) / 2;
  const dx = fin.x - inicio.x;
  const dy = fin.y - inicio.y;
  const largo = Math.hypot(dx, dy) || 1;
  return {
    x: medioX + (-dy / largo) * separacion,
    y: medioY + (dx / largo) * separacion
  };
}

function puntoBezier(inicio, control, fin, t) {
  const u = 1 - t;
  return {
    x: u * u * inicio.x + 2 * u * t * control.x + t * t * fin.x,
    y: u * u * inicio.y + 2 * u * t * control.y + t * t * fin.y
  };
}

function dibujarArco(contexto, arco, color, grosor, mostrarPeso) {
  const nodoOrigen = buscarNodo(arco.origen);
  const nodoDestino = buscarNodo(arco.destino);
  if (!nodoOrigen || !nodoDestino) return;

  const inicio = puntoEnBorde(nodoOrigen.posicion, nodoDestino.posicion);
  const fin = puntoEnBorde(nodoDestino.posicion, nodoOrigen.posicion);
  const tieneArcoOpuesto = arcos.some((otro) => otro.origen === arco.destino && otro.destino === arco.origen);
  const control = obtenerPuntoControl(inicio, fin, tieneArcoOpuesto ? 42 : 0);

  contexto.save();
  contexto.strokeStyle = color;
  contexto.fillStyle = color;
  contexto.lineWidth = grosor;
  contexto.lineCap = "round";
  contexto.beginPath();
  contexto.moveTo(inicio.x, inicio.y);
  if (tieneArcoOpuesto) contexto.quadraticCurveTo(control.x, control.y, fin.x, fin.y);
  else contexto.lineTo(fin.x, fin.y);
  contexto.stroke();

  dibujarFlecha(contexto, inicio, fin, tieneArcoOpuesto ? control : null, grosor);
  if (mostrarPeso) dibujarPeso(contexto, arco.peso, inicio, fin, tieneArcoOpuesto ? control : null);
  contexto.restore();
}

function dibujarFlecha(contexto, inicio, fin, control, grosor) {
  let angulo;
  if (control) {
    const antes = puntoBezier(inicio, control, fin, 0.92);
    angulo = Math.atan2(fin.y - antes.y, fin.x - antes.x);
  } else {
    angulo = Math.atan2(fin.y - inicio.y, fin.x - inicio.x);
  }

  const largo = grosor >= 4 ? 15 : 12;
  contexto.beginPath();
  contexto.moveTo(fin.x, fin.y);
  contexto.lineTo(fin.x - largo * Math.cos(angulo - Math.PI / 6), fin.y - largo * Math.sin(angulo - Math.PI / 6));
  contexto.lineTo(fin.x - largo * Math.cos(angulo + Math.PI / 6), fin.y - largo * Math.sin(angulo + Math.PI / 6));
  contexto.closePath();
  contexto.fill();
}

function dibujarPeso(contexto, peso, inicio, fin, control) {
  const posicion = control
    ? puntoBezier(inicio, control, fin, 0.5)
    : { x: (inicio.x + fin.x) / 2, y: (inicio.y + fin.y) / 2 };
  const texto = String(peso);

  contexto.font = "800 13px Segoe UI";
  const ancho = contexto.measureText(texto).width;
  contexto.fillStyle = "#ffffff";
  contexto.strokeStyle = "#d0d5dd";
  contexto.lineWidth = 1;
  contexto.beginPath();
  contexto.roundRect(posicion.x - ancho / 2 - 8, posicion.y - 13, ancho + 16, 25, 7);
  contexto.fill();
  contexto.stroke();
  contexto.fillStyle = "#1f2937";
  contexto.textAlign = "center";
  contexto.textBaseline = "middle";
  contexto.fillText(texto, posicion.x, posicion.y);
}

function dibujarNodo(contexto, posicion, id, radio) {
  contexto.save();
  contexto.beginPath();
  contexto.arc(posicion.x, posicion.y, radio, 0, Math.PI * 2);
  contexto.fillStyle = "#2f80ed";
  contexto.shadowColor = "rgba(47, 128, 237, 0.32)";
  contexto.shadowBlur = 14;
  contexto.fill();
  contexto.shadowBlur = 0;
  contexto.lineWidth = 3;
  contexto.strokeStyle = "#174ea6";
  contexto.stroke();
  contexto.fillStyle = "#ffffff";
  contexto.font = `800 ${radio === 24 ? 16 : 13}px Segoe UI`;
  contexto.textAlign = "center";
  contexto.textBaseline = "middle";
  contexto.fillText(id, posicion.x, posicion.y);
  contexto.restore();
}

function dibujarMiniGrafo(canvasVisual, opciones) {
  const contexto = canvasVisual.getContext("2d");
  const rect = canvasVisual.getBoundingClientRect();
  const escalaPantalla = window.devicePixelRatio || 1;
  canvasVisual.width = Math.floor(rect.width * escalaPantalla);
  canvasVisual.height = Math.floor(rect.height * escalaPantalla);
  contexto.setTransform(escalaPantalla, 0, 0, escalaPantalla, 0, 0);
  contexto.clearRect(0, 0, rect.width, rect.height);

  const posiciones = calcularPosicionesMini(rect.width, rect.height);

  arcos.forEach((arco) => {
    const clave = `${arco.origen}-${arco.destino}`;
    const colorGeneral = opciones.coloresPorArco?.get(clave);
    const resaltadoIndividual = opciones.arcosResaltados?.has(clave);
    const resaltado = Boolean(colorGeneral || resaltadoIndividual);
    const color = colorGeneral || opciones.colorResaltado || "#344054";

    contexto.globalAlpha = opciones.mostrarSoloResaltados && !resaltado ? 0.35 : 1;
    dibujarMiniArco(contexto, posiciones, arco, resaltado ? color : "#cbd5e1", resaltado ? 4 : 1.5, resaltado);
    contexto.globalAlpha = 1;
  });

  nodos.forEach((nodo) => dibujarMiniNodo(contexto, posiciones.get(nodo.id), nodo.id));
}

function calcularPosicionesMini(ancho, alto) {
  const margen = 54;
  const xs = nodos.map((nodo) => nodo.posicion.x);
  const ys = nodos.map((nodo) => nodo.posicion.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangoX = Math.max(1, maxX - minX);
  const rangoY = Math.max(1, maxY - minY);
  const escala = Math.min((ancho - margen * 2) / rangoX, (alto - margen * 2) / rangoY, 1.15);
  const offsetX = (ancho - rangoX * escala) / 2;
  const offsetY = (alto - rangoY * escala) / 2;
  const posiciones = new Map();

  nodos.forEach((nodo) => {
    posiciones.set(nodo.id, {
      x: offsetX + (nodo.posicion.x - minX) * escala,
      y: offsetY + (nodo.posicion.y - minY) * escala
    });
  });

  return posiciones;
}

function dibujarMiniArco(contexto, posiciones, arco, color, grosor, mostrarPeso) {
  const origen = posiciones.get(arco.origen);
  const destino = posiciones.get(arco.destino);
  if (!origen || !destino) return;

  const inicio = puntoEnBorde(origen, destino, 20);
  const fin = puntoEnBorde(destino, origen, 20);
  const tieneArcoOpuesto = arcos.some((otro) => otro.origen === arco.destino && otro.destino === arco.origen);
  const control = obtenerPuntoControl(inicio, fin, tieneArcoOpuesto ? 34 : 0);

  contexto.save();
  contexto.strokeStyle = color;
  contexto.fillStyle = color;
  contexto.lineWidth = grosor;
  contexto.lineCap = "round";
  contexto.beginPath();
  contexto.moveTo(inicio.x, inicio.y);
  if (tieneArcoOpuesto) contexto.quadraticCurveTo(control.x, control.y, fin.x, fin.y);
  else contexto.lineTo(fin.x, fin.y);
  contexto.stroke();
  dibujarFlecha(contexto, inicio, fin, tieneArcoOpuesto ? control : null, grosor);
  if (mostrarPeso) dibujarPeso(contexto, arco.peso, inicio, fin, tieneArcoOpuesto ? control : null);
  contexto.restore();
}

function dibujarMiniNodo(contexto, posicion, id) {
  dibujarNodo(contexto, posicion, id, 19);
}

function manejarRedimension() {
  ajustarCanvas();
  clearTimeout(temporizadorRedimension);
  temporizadorRedimension = setTimeout(() => {
    if (ultimoResultado) crearVisualizaciones(ultimoResultado.caminos);
  }, 120);
}

canvas.addEventListener("click", (evento) => {
  if (modo !== "agregarNodo") return;
  agregarNodo(obtenerPosicionCanvas(evento));
});

btnModoNodo.addEventListener("click", () => cambiarModo("agregarNodo"));
btnModoSeleccionar.addEventListener("click", () => cambiarModo("seleccionar"));
btnAgregarArco.addEventListener("click", agregarArco);
btnEliminarNodo.addEventListener("click", eliminarNodo);
btnCalcular.addEventListener("click", calcularFloydWarshall);
btnLimpiar.addEventListener("click", limpiarTodo);
window.addEventListener("resize", manejarRedimension);

ajustarCanvas();
cambiarModo("seleccionar");
