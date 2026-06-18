const canvas = document.getElementById("canvasGrafo");
const ctx = canvas.getContext("2d");

const btnModoNodo = document.getElementById("btnModoNodo");
const btnModoSeleccionar = document.getElementById("btnModoSeleccionar");
const btnAgregarArco = document.getElementById("btnAgregarArco");
const btnCalcular = document.getElementById("btnCalcular");
const btnLimpiar = document.getElementById("btnLimpiar");
const btnEliminarNodo = document.getElementById("btnEliminarNodo");
const btnConectarAleatorio = document.getElementById("btnConectarAleatorio");

const txtOrigen = document.getElementById("txtOrigen");
const txtDestino = document.getElementById("txtDestino");
const txtPeso = document.getElementById("txtPeso");
const txtEliminarNodo = document.getElementById("txtEliminarNodo");
const modoActual = document.getElementById("modoActual");
const ayudaCanvas = document.getElementById("ayudaCanvas");
const contenedorVisualizaciones = document.getElementById("contenedorVisualizaciones");
const matricesResultado = document.getElementById("matricesResultado");
const pantallaCarga = document.getElementById("pantallaCarga");
const textoCarga = document.getElementById("textoCarga");
const tiempoRespuesta = document.getElementById("tiempoRespuesta");

const RADIO_NODO = 24;
const INF = Number.POSITIVE_INFINITY;
const COLORES_CAMINOS = ["#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];
const TIPO_GRAFO = new URLSearchParams(window.location.search).get("tipo") || "dirigido";
const ES_DIRIGIDO = TIPO_GRAFO !== "no-dirigido";

let nodos = [];
let arcos = [];
let modo = "seleccionar";
let ultimoResultado = null;
let temporizadorRedimension = null;

const tipoGrafoBadge = document.getElementById("tipoGrafoBadge");
tipoGrafoBadge.textContent = ES_DIRIGIDO
  ? "Programacion dinamica | Grafo dirigido"
  : "Programacion dinamica | Grafo no dirigido";

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
    : ES_DIRIGIDO
      ? "Agrega aristas dirigidas y calcula Floyd-Warshall."
      : "Agrega aristas no dirigidas y calcula Floyd-Warshall.";
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
  tiempoRespuesta.textContent = "Tiempo de respuesta: --";
  tiempoRespuesta.classList.remove("ready");
  matricesResultado.innerHTML = `
    <div class="matrix-empty">
      <strong>La respuesta de Floyd-Warshall aparecera aqui</strong>
      <p>Agrega el grafo y pulsa “Calcular Floyd-Warshall” para comparar ambas matrices.</p>
    </div>
  `;
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

  const arcoExistente = arcos.find((arco) => {
    if (ES_DIRIGIDO) {
      return arco.origen === origen && arco.destino === destino;
    }

    return (
      (arco.origen === origen && arco.destino === destino) ||
      (arco.origen === destino && arco.destino === origen)
    );
  });
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

function conectarTodosAleatoriamente() {
  if (nodos.length === 0) {
    mostrarMensaje("No se puede conectar: no hay nodos en la pizarra.");
    return;
  }

  if (nodos.length < 2) {
    mostrarMensaje("Se necesitan al menos dos nodos para crear conexiones.");
    return;
  }

  const cantidad = ES_DIRIGIDO
    ? nodos.length * (nodos.length - 1)
    : (nodos.length * (nodos.length - 1)) / 2;
  const tipoTexto = ES_DIRIGIDO ? "dirigidas" : "no dirigidas";
  const confirmado = window.confirm(
    `¿Seguro que quieres conectar todos los nodos?\n\n` +
    `Se reemplazaran las conexiones actuales por ${cantidad} aristas ${tipoTexto} ` +
    `con pesos aleatorios entre 1 y 99.`
  );

  if (!confirmado) return;

  arcos = [];

  for (let i = 0; i < nodos.length; i++) {
    for (let j = 0; j < nodos.length; j++) {
      if (i === j) continue;
      if (!ES_DIRIGIDO && j <= i) continue;

      arcos.push({
        origen: nodos[i].id,
        destino: nodos[j].id,
        peso: Math.floor(Math.random() * 99) + 1
      });
    }
  }

  invalidarResultados();
  dibujarGrafo();
  mostrarMensaje(`Se generaron ${arcos.length} aristas aleatorias.`);
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

    if (!ES_DIRIGIDO && arco.peso < dist[j][i]) {
      dist[j][i] = arco.peso;
      siguiente[j][i] = i;
    }
  });

  const inicial = dist.map((fila) => [...fila]);

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

  return { inicial, dist, siguiente };
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

async function calcularFloydWarshall() {
  if (nodos.length === 0) {
    mostrarMensaje("Agregue al menos un nodo.");
    return;
  }

  mostrarPantallaCarga("Calculando Floyd-Warshall...");
  await permitirRenderizado();
  const inicio = performance.now();

  try {
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

    mostrarMatrices(resultado.inicial, resultado.dist, resultado.siguiente);
    crearVisualizaciones(caminos);
    ultimoResultado = {
      caminos,
      inicial: resultado.inicial,
      final: resultado.dist,
      siguiente: resultado.siguiente
    };
    mostrarTiempoRespuesta(performance.now() - inicio);
  } finally {
    ocultarPantallaCarga();
  }
}

function mostrarPantallaCarga(mensaje) {
  textoCarga.textContent = mensaje;
  pantallaCarga.hidden = false;
}

function ocultarPantallaCarga() {
  pantallaCarga.hidden = true;
}

function permitirRenderizado() {
  return new Promise((resolver) => {
    requestAnimationFrame(() => requestAnimationFrame(resolver));
  });
}

function mostrarTiempoRespuesta(milisegundos) {
  const texto = milisegundos < 1000
    ? `${milisegundos.toFixed(2)} ms`
    : `${(milisegundos / 1000).toFixed(3)} s`;

  tiempoRespuesta.textContent = `Tiempo de respuesta: ${texto}`;
  tiempoRespuesta.classList.add("ready");
}

function mostrarMatrices(inicial, final, siguiente) {
  const cambios = contarMejoras(inicial, final);

  matricesResultado.innerHTML = `
    <article class="matrix-card initial-matrix">
      <div class="matrix-card-header">
        <div>
          <span>Antes del algoritmo</span>
          <h3>Matriz inicial</h3>
        </div>
        <strong>Pesos directos</strong>
      </div>
      <div class="matrix-scroll">
        ${crearTablaMatriz(inicial, inicial, null)}
      </div>
    </article>

    <article class="matrix-card final-matrix">
      <div class="matrix-card-header">
        <div>
          <span>Respuesta final</span>
          <h3>Matriz de distancias minimas</h3>
        </div>
        <strong>${cambios} ${cambios === 1 ? "celda mejorada" : "celdas mejoradas"}</strong>
      </div>
      <div class="matrix-scroll">
        ${crearTablaMatriz(final, inicial, siguiente)}
      </div>
    </article>
  `;
}

function crearTablaMatriz(matriz, inicial, siguiente) {
  let html = '<table class="floyd-matrix"><thead><tr><th>Desde / Hacia</th>';
  nodos.forEach((nodo) => {
    html += `<th>${nodo.id}</th>`;
  });
  html += "</tr></thead><tbody>";

  nodos.forEach((nodoOrigen, i) => {
    html += `<tr><th>${nodoOrigen.id}</th>`;
    nodos.forEach((_, j) => {
      const valor = matriz[i][j];
      const mejorada = siguiente && valor < inicial[i][j];
      const noAlcanzable = valor === INF;
      const clases = [
        i === j ? "matrix-diagonal" : "",
        mejorada ? "matrix-improved" : "",
        noAlcanzable ? "matrix-infinite" : ""
      ].filter(Boolean).join(" ");

      let detalle = "";
      if (mejorada) {
        const camino = reconstruirCamino(i + 1, j + 1, siguiente);
        detalle = `<small>${inicial[i][j] === INF ? "∞" : inicial[i][j]} → ${valor}<br>${camino.join(" → ")}</small>`;
      }

      html += `
        <td class="${clases}">
          <strong>${noAlcanzable ? "∞" : valor}</strong>
          ${detalle}
        </td>
      `;
    });
    html += "</tr>";
  });

  html += "</tbody>";
  return html;
}

function contarMejoras(inicial, final) {
  let total = 0;

  for (let i = 0; i < inicial.length; i++) {
    for (let j = 0; j < inicial.length; j++) {
      if (final[i][j] < inicial[i][j]) total++;
    }
  }

  return total;
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
    claves.push(claveArco(camino[i], camino[i + 1]));
  }
  return claves;
}

function claveArco(origen, destino) {
  if (ES_DIRIGIDO) return `${origen}-${destino}`;
  return origen < destino ? `${origen}-${destino}` : `${destino}-${origen}`;
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
  const tieneArcoOpuesto = ES_DIRIGIDO && arcos.some(
    (otro) => otro.origen === arco.destino && otro.destino === arco.origen
  );
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

  if (ES_DIRIGIDO) {
    dibujarFlecha(contexto, inicio, fin, tieneArcoOpuesto ? control : null, grosor);
  }
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
    const clave = claveArco(arco.origen, arco.destino);
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
  const tieneArcoOpuesto = ES_DIRIGIDO && arcos.some(
    (otro) => otro.origen === arco.destino && otro.destino === arco.origen
  );
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
  if (ES_DIRIGIDO) {
    dibujarFlecha(contexto, inicio, fin, tieneArcoOpuesto ? control : null, grosor);
  }
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
    if (ultimoResultado) {
      mostrarMatrices(ultimoResultado.inicial, ultimoResultado.final, ultimoResultado.siguiente);
      crearVisualizaciones(ultimoResultado.caminos);
    }
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
btnConectarAleatorio.addEventListener("click", conectarTodosAleatoriamente);
btnCalcular.addEventListener("click", calcularFloydWarshall);
btnLimpiar.addEventListener("click", limpiarTodo);
window.addEventListener("resize", manejarRedimension);

ajustarCanvas();
cambiarModo("seleccionar");
