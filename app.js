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
const cboInicial = document.getElementById("cboInicial");
const tablaResultados = document.getElementById("tablaResultados");
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
    : "Escribe origen, destino y peso para agregar arcos dirigidos.";
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

function actualizarComboInicial() {
  const valorAnterior = Number(cboInicial.value);
  cboInicial.innerHTML = "";

  nodos.forEach((nodo) => {
    const opcion = document.createElement("option");
    opcion.value = nodo.id;
    opcion.textContent = `Nodo ${nodo.id}`;
    cboInicial.appendChild(opcion);
  });

  if (existeNodo(valorAnterior)) {
    cboInicial.value = valorAnterior;
  }
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

  ultimoResultado = null;
  actualizarComboInicial();
  limpiarTabla("Aun no hay resultados.");
  limpiarVisualizaciones("Calcule Dijkstra para generar los graficos de caminos.");
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
  ultimoResultado = null;
  actualizarComboInicial();
  limpiarTabla("Aun no hay resultados.");
  limpiarVisualizaciones("Calcule Dijkstra para generar los graficos de caminos.");
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
  ultimoResultado = null;
  limpiarTabla("Aun no hay resultados.");
  limpiarVisualizaciones("Calcule Dijkstra para generar los graficos de caminos.");
  dibujarGrafo();
}

function dijkstra(nodoInicial) {
  const distancias = {};
  const anteriores = {};
  const visitados = new Set();

  nodos.forEach((nodo) => {
    distancias[nodo.id] = INF;
    anteriores[nodo.id] = null;
  });

  distancias[nodoInicial] = 0;

  while (visitados.size < nodos.length) {
    let actual = null;
    let menorDistancia = INF;

    nodos.forEach((nodo) => {
      if (!visitados.has(nodo.id) && distancias[nodo.id] < menorDistancia) {
        menorDistancia = distancias[nodo.id];
        actual = nodo.id;
      }
    });

    if (actual === null) break;

    visitados.add(actual);

    arcos
      .filter((arco) => arco.origen === actual)
      .forEach((arco) => {
        if (visitados.has(arco.destino)) return;

        const nuevaDistancia = distancias[actual] + arco.peso;
        if (nuevaDistancia < distancias[arco.destino]) {
          distancias[arco.destino] = nuevaDistancia;
          anteriores[arco.destino] = actual;
        }
      });
  }

  return { distancias, anteriores };
}

function reconstruirCamino(nodoInicial, destino, anteriores) {
  const camino = [];
  let actual = destino;

  while (actual !== null) {
    camino.push(actual);
    if (actual === nodoInicial) break;
    actual = anteriores[actual];
  }

  camino.reverse();
  return camino[0] === nodoInicial ? camino : null;
}

function calcularDijkstra() {
  if (nodos.length === 0) {
    mostrarMensaje("Agregue al menos un nodo.");
    return;
  }

  const nodoInicial = Number(cboInicial.value);
  if (!existeNodo(nodoInicial)) {
    mostrarMensaje("Seleccione un nodo inicial valido.");
    return;
  }

  const { distancias, anteriores } = dijkstra(nodoInicial);
  tituloResultados.textContent = `Resultados desde nodo ${nodoInicial}`;
  tablaResultados.innerHTML = "";
  const caminosCalculados = [];

  nodos.forEach((nodo) => {
    const fila = document.createElement("tr");
    const camino = reconstruirCamino(nodoInicial, nodo.id, anteriores);

    if (distancias[nodo.id] === INF || camino === null) {
      fila.innerHTML = `
        <td>${nodo.id}</td>
        <td>No alcanzable</td>
        <td>No alcanzable</td>
      `;
    } else {
      caminosCalculados.push({
        destino: nodo.id,
        distancia: distancias[nodo.id],
        camino
      });

      fila.innerHTML = `
        <td>${nodo.id}</td>
        <td>${distancias[nodo.id]}</td>
        <td>${camino.join(" -> ")}</td>
      `;
    }

    tablaResultados.appendChild(fila);
  });

  ultimoResultado = {
    nodoInicial,
    caminosCalculados
  };
  crearVisualizaciones(nodoInicial, caminosCalculados);
  dibujarGrafo();
}

function limpiarTodo() {
  nodos = [];
  arcos = [];
  txtOrigen.value = "";
  txtDestino.value = "";
  txtPeso.value = "";
  cboInicial.innerHTML = "";
  tituloResultados.textContent = "Resultados";
  ultimoResultado = null;
  limpiarTabla("Aun no hay resultados.");
  limpiarVisualizaciones("Calcule Dijkstra para generar los graficos de caminos.");
  cambiarModo("seleccionar");
  dibujarGrafo();
}

function limpiarTabla(mensaje) {
  tituloResultados.textContent = "Resultados";
  tablaResultados.innerHTML = `<tr><td colspan="3" class="empty">${mensaje}</td></tr>`;
}

function limpiarVisualizaciones(mensaje) {
  contenedorVisualizaciones.innerHTML = `<div class="visual-empty">${mensaje}</div>`;
}

function crearVisualizaciones(nodoInicial, caminosCalculados) {
  if (caminosCalculados.length === 0) {
    limpiarVisualizaciones("No hay caminos alcanzables para mostrar.");
    return;
  }

  contenedorVisualizaciones.innerHTML = "";

  const coloresPorArco = new Map();
  caminosCalculados.forEach((resultado, indice) => {
    const color = COLORES_CAMINOS[indice % COLORES_CAMINOS.length];
    obtenerArcosDelCamino(resultado.camino).forEach((clave) => {
      if (!coloresPorArco.has(clave)) {
        coloresPorArco.set(clave, color);
      }
    });
  });

  const general = crearTarjetaVisual(
    "Vista general de caminos minimos",
    `Inicio: nodo ${nodoInicial}`,
    true
  );
  contenedorVisualizaciones.appendChild(general.card);
  dibujarMiniGrafo(general.canvas, {
    coloresPorArco,
    mostrarSoloResaltados: false
  });

  caminosCalculados.forEach((resultado, indice) => {
    const color = COLORES_CAMINOS[indice % COLORES_CAMINOS.length];
    const arcosCamino = new Set(obtenerArcosDelCamino(resultado.camino));
    const tarjeta = crearTarjetaVisual(
      `Camino hacia nodo ${resultado.destino}`,
      `Distancia: ${resultado.distancia} | ${resultado.camino.join(" -> ")}`,
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

  arcos.forEach(dibujarArco);
  nodos.forEach(dibujarNodo);
}

function puntoEnBorde(origen, destino) {
  const dx = destino.x - origen.x;
  const dy = destino.y - origen.y;
  const largo = Math.hypot(dx, dy);

  return {
    x: origen.x + (dx / largo) * RADIO_NODO,
    y: origen.y + (dy / largo) * RADIO_NODO
  };
}

function dibujarArco(arco) {
  const nodoOrigen = buscarNodo(arco.origen);
  const nodoDestino = buscarNodo(arco.destino);
  if (!nodoOrigen || !nodoDestino) return;

  const inicio = puntoEnBorde(nodoOrigen.posicion, nodoDestino.posicion);
  const fin = puntoEnBorde(nodoDestino.posicion, nodoOrigen.posicion);
  const tieneArcoOpuesto = arcos.some(
    (otro) => otro.origen === arco.destino && otro.destino === arco.origen
  );
  const control = obtenerPuntoControl(inicio, fin, tieneArcoOpuesto ? 42 : 0);

  ctx.save();
  ctx.strokeStyle = "#344054";
  ctx.fillStyle = "#344054";
  ctx.lineWidth = 2.2;

  ctx.beginPath();
  ctx.moveTo(inicio.x, inicio.y);
  if (tieneArcoOpuesto) {
    ctx.quadraticCurveTo(control.x, control.y, fin.x, fin.y);
  } else {
    ctx.lineTo(fin.x, fin.y);
  }
  ctx.stroke();

  dibujarFlecha(inicio, fin, false, tieneArcoOpuesto ? control : null);
  dibujarPeso(arco.peso, inicio, fin, tieneArcoOpuesto ? control : null);
  ctx.restore();
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
  const unoMenosT = 1 - t;
  return {
    x: unoMenosT * unoMenosT * inicio.x + 2 * unoMenosT * t * control.x + t * t * fin.x,
    y: unoMenosT * unoMenosT * inicio.y + 2 * unoMenosT * t * control.y + t * t * fin.y
  };
}

function dibujarFlecha(inicio, fin, resaltado, control = null) {
  let angulo;
  if (control) {
    const puntoAntesDelFinal = puntoBezier(inicio, control, fin, 0.92);
    angulo = Math.atan2(fin.y - puntoAntesDelFinal.y, fin.x - puntoAntesDelFinal.x);
  } else {
    angulo = Math.atan2(fin.y - inicio.y, fin.x - inicio.x);
  }

  const largo = resaltado ? 16 : 13;

  ctx.beginPath();
  ctx.moveTo(fin.x, fin.y);
  ctx.lineTo(
    fin.x - largo * Math.cos(angulo - Math.PI / 6),
    fin.y - largo * Math.sin(angulo - Math.PI / 6)
  );
  ctx.lineTo(
    fin.x - largo * Math.cos(angulo + Math.PI / 6),
    fin.y - largo * Math.sin(angulo + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

function dibujarPeso(peso, inicio, fin, control = null) {
  const posicionPeso = control
    ? puntoBezier(inicio, control, fin, 0.5)
    : {
        x: (inicio.x + fin.x) / 2,
        y: (inicio.y + fin.y) / 2
      };

  const medioX = posicionPeso.x;
  const medioY = posicionPeso.y;
  const texto = String(peso);

  ctx.font = "700 14px Segoe UI";
  const anchoTexto = ctx.measureText(texto).width;

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#d0d5dd";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(medioX - anchoTexto / 2 - 8, medioY - 14, anchoTexto + 16, 26, 7);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#1f2937";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(texto, medioX, medioY);
}

function dibujarNodo(nodo) {
  const { x, y } = nodo.posicion;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, RADIO_NODO, 0, Math.PI * 2);
  ctx.fillStyle = "#2f80ed";
  ctx.shadowColor = "rgba(47, 128, 237, 0.32)";
  ctx.shadowBlur = 14;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#174ea6";
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 16px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(nodo.id, x, y);
  ctx.restore();
}

function dibujarMiniGrafo(canvasVisual, opciones) {
  const contexto = canvasVisual.getContext("2d");
  const rect = canvasVisual.getBoundingClientRect();
  const escalaPantalla = window.devicePixelRatio || 1;

  canvasVisual.width = Math.floor(rect.width * escalaPantalla);
  canvasVisual.height = Math.floor(rect.height * escalaPantalla);
  contexto.setTransform(escalaPantalla, 0, 0, escalaPantalla, 0, 0);
  contexto.clearRect(0, 0, rect.width, rect.height);

  if (nodos.length === 0) return;

  const posiciones = calcularPosicionesMini(rect.width, rect.height);

  arcos.forEach((arco) => {
    const clave = `${arco.origen}-${arco.destino}`;
    const colorGeneral = opciones.coloresPorArco?.get(clave);
    const resaltadoIndividual = opciones.arcosResaltados?.has(clave);
    const estaResaltado = Boolean(colorGeneral || resaltadoIndividual);

    if (opciones.mostrarSoloResaltados && !estaResaltado) {
      dibujarMiniArco(contexto, posiciones, arco, {
        color: "#cbd5e1",
        grosor: 1.4,
        opacidad: 0.55
      });
      return;
    }

    dibujarMiniArco(contexto, posiciones, arco, {
      color: colorGeneral || opciones.colorResaltado || "#344054",
      grosor: estaResaltado ? 4 : 1.7,
      opacidad: estaResaltado ? 1 : 0.45
    });
  });

  nodos.forEach((nodo) => {
    dibujarMiniNodo(contexto, posiciones.get(nodo.id), nodo.id);
  });
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
  const contenidoAncho = rangoX * escala;
  const contenidoAlto = rangoY * escala;
  const offsetX = (ancho - contenidoAncho) / 2;
  const offsetY = (alto - contenidoAlto) / 2;
  const posiciones = new Map();

  nodos.forEach((nodo) => {
    posiciones.set(nodo.id, {
      x: offsetX + (nodo.posicion.x - minX) * escala,
      y: offsetY + (nodo.posicion.y - minY) * escala
    });
  });

  return posiciones;
}

function dibujarMiniArco(contexto, posiciones, arco, estilo) {
  const origen = posiciones.get(arco.origen);
  const destino = posiciones.get(arco.destino);
  if (!origen || !destino) return;

  const inicio = puntoEnBordeMini(origen, destino);
  const fin = puntoEnBordeMini(destino, origen);
  const tieneArcoOpuesto = arcos.some(
    (otro) => otro.origen === arco.destino && otro.destino === arco.origen
  );
  const control = obtenerPuntoControlMini(inicio, fin, tieneArcoOpuesto ? 34 : 0);

  contexto.save();
  contexto.globalAlpha = estilo.opacidad;
  contexto.strokeStyle = estilo.color;
  contexto.fillStyle = estilo.color;
  contexto.lineWidth = estilo.grosor;
  contexto.lineCap = "round";

  contexto.beginPath();
  contexto.moveTo(inicio.x, inicio.y);
  if (tieneArcoOpuesto) {
    contexto.quadraticCurveTo(control.x, control.y, fin.x, fin.y);
  } else {
    contexto.lineTo(fin.x, fin.y);
  }
  contexto.stroke();

  dibujarFlechaMini(contexto, inicio, fin, tieneArcoOpuesto ? control : null, estilo.grosor);

  if (estilo.opacidad > 0.8) {
    dibujarPesoMini(contexto, arco.peso, inicio, fin, tieneArcoOpuesto ? control : null);
  }

  contexto.restore();
}

function dibujarMiniNodo(contexto, posicion, id) {
  contexto.save();
  contexto.beginPath();
  contexto.arc(posicion.x, posicion.y, 19, 0, Math.PI * 2);
  contexto.fillStyle = "#2f80ed";
  contexto.fill();
  contexto.lineWidth = 2.5;
  contexto.strokeStyle = "#174ea6";
  contexto.stroke();

  contexto.fillStyle = "#ffffff";
  contexto.font = "800 13px Segoe UI";
  contexto.textAlign = "center";
  contexto.textBaseline = "middle";
  contexto.fillText(id, posicion.x, posicion.y);
  contexto.restore();
}

function puntoEnBordeMini(origen, destino) {
  const dx = destino.x - origen.x;
  const dy = destino.y - origen.y;
  const largo = Math.hypot(dx, dy) || 1;

  return {
    x: origen.x + (dx / largo) * 20,
    y: origen.y + (dy / largo) * 20
  };
}

function obtenerPuntoControlMini(inicio, fin, separacion) {
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

function puntoBezierMini(inicio, control, fin, t) {
  const unoMenosT = 1 - t;
  return {
    x: unoMenosT * unoMenosT * inicio.x + 2 * unoMenosT * t * control.x + t * t * fin.x,
    y: unoMenosT * unoMenosT * inicio.y + 2 * unoMenosT * t * control.y + t * t * fin.y
  };
}

function dibujarFlechaMini(contexto, inicio, fin, control, grosor) {
  let angulo;
  if (control) {
    const puntoAntesDelFinal = puntoBezierMini(inicio, control, fin, 0.92);
    angulo = Math.atan2(fin.y - puntoAntesDelFinal.y, fin.x - puntoAntesDelFinal.x);
  } else {
    angulo = Math.atan2(fin.y - inicio.y, fin.x - inicio.x);
  }

  const largo = grosor >= 4 ? 15 : 11;
  contexto.beginPath();
  contexto.moveTo(fin.x, fin.y);
  contexto.lineTo(
    fin.x - largo * Math.cos(angulo - Math.PI / 6),
    fin.y - largo * Math.sin(angulo - Math.PI / 6)
  );
  contexto.lineTo(
    fin.x - largo * Math.cos(angulo + Math.PI / 6),
    fin.y - largo * Math.sin(angulo + Math.PI / 6)
  );
  contexto.closePath();
  contexto.fill();
}

function dibujarPesoMini(contexto, peso, inicio, fin, control) {
  const posicion = control
    ? puntoBezierMini(inicio, control, fin, 0.5)
    : {
        x: (inicio.x + fin.x) / 2,
        y: (inicio.y + fin.y) / 2
      };
  const texto = String(peso);

  contexto.font = "800 12px Segoe UI";
  const anchoTexto = contexto.measureText(texto).width;
  contexto.globalAlpha = 1;
  contexto.fillStyle = "#ffffff";
  contexto.strokeStyle = "#d0d5dd";
  contexto.lineWidth = 1;
  contexto.beginPath();
  contexto.roundRect(posicion.x - anchoTexto / 2 - 7, posicion.y - 12, anchoTexto + 14, 23, 6);
  contexto.fill();
  contexto.stroke();
  contexto.fillStyle = "#1f2937";
  contexto.textAlign = "center";
  contexto.textBaseline = "middle";
  contexto.fillText(texto, posicion.x, posicion.y);
}

canvas.addEventListener("click", (evento) => {
  if (modo !== "agregarNodo") return;
  agregarNodo(obtenerPosicionCanvas(evento));
});

function manejarRedimension() {
  ajustarCanvas();

  clearTimeout(temporizadorRedimension);
  temporizadorRedimension = setTimeout(() => {
    if (ultimoResultado) {
      crearVisualizaciones(ultimoResultado.nodoInicial, ultimoResultado.caminosCalculados);
    }
  }, 120);
}

btnModoNodo.addEventListener("click", () => cambiarModo("agregarNodo"));
btnModoSeleccionar.addEventListener("click", () => cambiarModo("seleccionar"));
btnAgregarArco.addEventListener("click", agregarArco);
btnCalcular.addEventListener("click", calcularDijkstra);
btnLimpiar.addEventListener("click", limpiarTodo);
btnEliminarNodo.addEventListener("click", eliminarNodo);
window.addEventListener("resize", manejarRedimension);

ajustarCanvas();
cambiarModo("seleccionar");
