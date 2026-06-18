const canvas = document.getElementById("canvasGrafo");
const ctx = canvas.getContext("2d");

const btnModoNodo = document.getElementById("btnModoNodo");
const btnModoSeleccionar = document.getElementById("btnModoSeleccionar");
const btnEliminarNodo = document.getElementById("btnEliminarNodo");
const btnAgregarArco = document.getElementById("btnAgregarArco");
const btnConectarAleatorio = document.getElementById("btnConectarAleatorio");
const btnAnalizar = document.getElementById("btnAnalizar");
const btnLimpiar = document.getElementById("btnLimpiar");

const txtEliminarNodo = document.getElementById("txtEliminarNodo");
const txtOrigen = document.getElementById("txtOrigen");
const txtDestino = document.getElementById("txtDestino");
const txtPeso = document.getElementById("txtPeso");
const objetivoCalculo = document.getElementById("objetivoCalculo");
const nodoInicial = document.getElementById("nodoInicial");
const modoActual = document.getElementById("modoActual");
const ayudaCanvas = document.getElementById("ayudaCanvas");
const resultadoAnalisis = document.getElementById("resultadoAnalisis");
const pantallaCarga = document.getElementById("pantallaCarga");
const tipoGrafoBadge = document.getElementById("tipoGrafoBadge");
const calculoRecomendado = document.getElementById("calculoRecomendado");
const tituloCalculoRecomendado = document.getElementById("tituloCalculoRecomendado");
const contenidoCalculoRecomendado = document.getElementById("contenidoCalculoRecomendado");
const btnCerrarCalculo = document.getElementById("btnCerrarCalculo");

const RADIO_NODO = 24;
const INF = Number.POSITIVE_INFINITY;
const TIPO_GRAFO = new URLSearchParams(window.location.search).get("tipo") || "dirigido";
const ES_DIRIGIDO = TIPO_GRAFO !== "no-dirigido";

let nodos = [];
let aristas = [];
let modo = "seleccionar";
let ultimoAnalisis = null;

tipoGrafoBadge.textContent = ES_DIRIGIDO
  ? "Analizador automatico | Grafo dirigido"
  : "Analizador automatico | Grafo no dirigido";

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
    ? "Haz clic en la pizarra para colocar nodos."
    : "Agrega aristas y pulsa Analizar y Recomendar.";
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

function posicionCanvas(evento) {
  const rect = canvas.getBoundingClientRect();
  return { x: evento.clientX - rect.left, y: evento.clientY - rect.top };
}

function agregarNodo(posicion) {
  const rect = canvas.getBoundingClientRect();
  if (
    posicion.x < RADIO_NODO ||
    posicion.y < RADIO_NODO ||
    posicion.x > rect.width - RADIO_NODO ||
    posicion.y > rect.height - RADIO_NODO
  ) {
    mostrarMensaje("El nodo debe estar mas alejado del borde.");
    return;
  }

  if (nodos.some((nodo) => Math.hypot(nodo.x - posicion.x, nodo.y - posicion.y) < RADIO_NODO * 2)) {
    mostrarMensaje("El nodo esta demasiado cerca de otro nodo.");
    return;
  }

  nodos.push({ id: nodos.length + 1, ...posicion });
  actualizarNodosIniciales();
  invalidarAnalisis();
  dibujarGrafo();
}

function eliminarNodo() {
  const id = Number(txtEliminarNodo.value);
  if (!Number.isInteger(id) || !nodos.some((nodo) => nodo.id === id)) {
    mostrarMensaje("Ingrese un nodo existente.");
    return;
  }

  nodos = nodos.filter((nodo) => nodo.id !== id);
  aristas = aristas.filter((arista) => arista.origen !== id && arista.destino !== id);

  const mapa = new Map();
  nodos.sort((a, b) => a.id - b.id).forEach((nodo, indice) => {
    mapa.set(nodo.id, indice + 1);
    nodo.id = indice + 1;
  });
  aristas.forEach((arista) => {
    arista.origen = mapa.get(arista.origen);
    arista.destino = mapa.get(arista.destino);
  });

  txtEliminarNodo.value = "";
  actualizarNodosIniciales();
  invalidarAnalisis();
  dibujarGrafo();
}

function agregarArista() {
  const origen = Number(txtOrigen.value);
  const destino = Number(txtDestino.value);
  const peso = Number(txtPeso.value);

  if (!Number.isInteger(origen) || !Number.isInteger(destino) || !Number.isInteger(peso)) {
    mostrarMensaje("Origen, destino y peso deben ser enteros.");
    return;
  }
  if (peso <= 0) {
    mostrarMensaje("El peso debe ser positivo.");
    return;
  }
  if (!nodos.some((nodo) => nodo.id === origen) || !nodos.some((nodo) => nodo.id === destino)) {
    mostrarMensaje("Los nodos origen y destino deben existir.");
    return;
  }
  if (origen === destino) {
    mostrarMensaje("No se permiten aristas hacia el mismo nodo.");
    return;
  }

  const existente = aristas.find((arista) => {
    if (ES_DIRIGIDO) return arista.origen === origen && arista.destino === destino;
    return (
      (arista.origen === origen && arista.destino === destino) ||
      (arista.origen === destino && arista.destino === origen)
    );
  });

  if (existente) existente.peso = peso;
  else aristas.push({ origen, destino, peso });

  txtOrigen.value = "";
  txtDestino.value = "";
  txtPeso.value = "";
  invalidarAnalisis();
  dibujarGrafo();
}

function completarAleatoriamente() {
  if (nodos.length === 0) {
    mostrarMensaje("No se puede conectar: no hay nodos en la pizarra.");
    return;
  }
  if (nodos.length < 2) {
    mostrarMensaje("Se necesitan al menos dos nodos.");
    return;
  }

  const confirmado = window.confirm(
    "¿Seguro que quieres reemplazar las conexiones actuales por un grafo completo con pesos aleatorios?"
  );
  if (!confirmado) return;

  aristas = [];
  for (let i = 0; i < nodos.length; i++) {
    for (let j = 0; j < nodos.length; j++) {
      if (i === j || (!ES_DIRIGIDO && j <= i)) continue;
      aristas.push({
        origen: nodos[i].id,
        destino: nodos[j].id,
        peso: Math.floor(Math.random() * 99) + 1
      });
    }
  }

  invalidarAnalisis();
  dibujarGrafo();
  mostrarMensaje(`Se generaron ${aristas.length} aristas aleatorias.`);
}

function actualizarNodosIniciales() {
  const anterior = Number(nodoInicial.value);
  nodoInicial.innerHTML = "";
  nodos.forEach((nodo) => {
    const opcion = document.createElement("option");
    opcion.value = nodo.id;
    opcion.textContent = `Nodo ${nodo.id}`;
    nodoInicial.appendChild(opcion);
  });
  if (nodos.some((nodo) => nodo.id === anterior)) nodoInicial.value = anterior;
}

function invalidarAnalisis() {
  ultimoAnalisis = null;
  calculoRecomendado.hidden = true;
  resultadoAnalisis.innerHTML = `
    <div class="analyzer-empty">
      <strong>El grafo cambio</strong>
      <p>Pulsa “Analizar y Recomendar” para obtener un nuevo diagnostico.</p>
    </div>
  `;
}

async function analizarGrafo() {
  if (nodos.length < 2 || aristas.length === 0) {
    mostrarMensaje("Agregue al menos dos nodos y una arista.");
    return;
  }

  pantallaCarga.hidden = false;
  await permitirRenderizado();

  try {
    const n = nodos.length;
    const origen = Math.max(0, Number(nodoInicial.value) - 1);
    const lista = crearListaAdyacencia(n);
    const matriz = crearMatriz(n);
    const rondas = n < 20 ? 15 : 7;

    const dijkstraUno = await medir(() => dijkstra(origen, n, lista), rondas);
    const dijkstraTodos = await medir(() => {
      const resultado = [];
      for (let i = 0; i < n; i++) resultado.push(dijkstra(i, n, lista));
      return resultado;
    }, Math.min(5, rondas));
    const floyd = await medir(() => floydWarshall(matriz), Math.min(5, rondas));

    const filaValida = filasIguales(dijkstraUno.resultado, floyd.resultado[origen]);
    const matrizValida = matricesIguales(dijkstraTodos.resultado, floyd.resultado);
    const posibles = ES_DIRIGIDO ? n * (n - 1) : (n * (n - 1)) / 2;
    const densidad = posibles ? aristas.length / posibles : 0;
    const alcanzables = dijkstraUno.resultado.filter((valor) => valor !== INF).length;
    const objetivo = objetivoCalculo.value;
    const recomendacion = decidirAlgoritmo({
      objetivo,
      n,
      densidad,
      dijkstraUno: dijkstraUno.mediana,
      dijkstraTodos: dijkstraTodos.mediana,
      floyd: floyd.mediana
    });

    mostrarAnalisis({
      n,
      origen,
      densidad,
      alcanzables,
      filaValida,
      matrizValida,
      dijkstraUno,
      dijkstraTodos,
      floyd,
      recomendacion
    });
    ultimoAnalisis = {
      origen,
      lista,
      matriz,
      dijkstraUno,
      floyd,
      recomendacion
    };
  } finally {
    pantallaCarga.hidden = true;
  }
}

function decidirAlgoritmo(datos) {
  if (datos.objetivo === "un-origen") {
    return {
      algoritmo: "Dijkstra",
      razon: "Solo necesitas rutas desde un origen. Dijkstra calcula exactamente lo solicitado y evita construir toda la matriz."
    };
  }

  if (datos.objetivo === "todos-pares") {
    return {
      algoritmo: "Floyd-Warshall",
      razon: "Necesitas distancias entre todos los pares. Floyd-Warshall construye directamente la matriz completa."
    };
  }

  if (datos.dijkstraUno <= datos.floyd) {
    return {
      algoritmo: "Dijkstra",
      razon: "En la medicion automatica Dijkstra fue mas rapido y calcula solamente desde el nodo inicial."
    };
  }

  return {
    algoritmo: "Floyd-Warshall",
    razon: "En la medicion automatica Floyd-Warshall obtuvo el menor tiempo para este grafo."
  };
}

function mostrarAnalisis(datos) {
  const ganadorUno = datos.dijkstraUno.mediana <= datos.floyd.mediana ? "Dijkstra" : "Floyd-Warshall";
  const porcentaje = (datos.densidad * 100).toFixed(1);
  const medicionOrientativa = datos.n < 20;

  resultadoAnalisis.innerHTML = `
    <header class="analyzer-result-header">
      <div>
        <span>Recomendacion del sistema</span>
        <h2>${datos.recomendacion.algoritmo}</h2>
        <p>${datos.recomendacion.razon}</p>
      </div>
      <strong>${porcentaje}% de densidad</strong>
    </header>

    <div class="analyzer-metrics">
      <div><span>Nodos</span><strong>${datos.n}</strong></div>
      <div><span>Aristas</span><strong>${aristas.length}</strong></div>
      <div><span>Alcanzables desde ${datos.origen + 1}</span><strong>${datos.alcanzables}</strong></div>
      <div><span>Verificacion</span><strong>${datos.filaValida && datos.matrizValida ? "Correcta" : "Revisar"}</strong></div>
    </div>

    <div class="analyzer-times">
      <article class="${ganadorUno === "Dijkstra" ? "recommended" : ""}">
        <span>Dijkstra desde nodo ${datos.origen + 1}</span>
        <strong>${formatearTiempo(datos.dijkstraUno.mediana)}</strong>
        <p>Calcula una sola fila de distancias.</p>
      </article>
      <article>
        <span>Dijkstra desde todos</span>
        <strong>${formatearTiempo(datos.dijkstraTodos.mediana)}</strong>
        <p>Se ejecuta una vez por cada nodo.</p>
      </article>
      <article class="${ganadorUno === "Floyd-Warshall" ? "recommended" : ""}">
        <span>Floyd-Warshall completo</span>
        <strong>${formatearTiempo(datos.floyd.mediana)}</strong>
        <p>Calcula toda la matriz de una vez.</p>
      </article>
    </div>

    <div class="analyzer-conclusion">
      <strong>Lectura del resultado</strong>
      <p>
        Para un solo origen, el ganador cronometrado fue <b>${ganadorUno}</b>.
        Para todos los pares se comparan Dijkstra repetido (${formatearTiempo(datos.dijkstraTodos.mediana)})
        y Floyd-Warshall (${formatearTiempo(datos.floyd.mediana)}).
      </p>
    </div>

    ${medicionOrientativa ? `
      <div class="analysis-warning">
        <strong>Medicion orientativa</strong>
        <p>
          Este grafo tiene ${datos.n} nodos. Para comparar rendimiento con mayor claridad,
          realiza otra prueba con al menos 20 nodos y varias conexiones por nodo.
        </p>
      </div>
    ` : `
      <div class="analysis-reliable">
        <strong>Configuracion adecuada para comparar</strong>
        <p>El grafo tiene suficientes nodos para observar mejor la diferencia de tiempos.</p>
      </div>
    `}

    <div class="analyzer-action">
      <button id="btnCalcularRecomendado">
        Calcular ahora con ${datos.recomendacion.algoritmo}
      </button>
    </div>
  `;

  document
    .getElementById("btnCalcularRecomendado")
    .addEventListener("click", calcularConRecomendado);
}

function calcularConRecomendado() {
  if (!ultimoAnalisis) return;

  if (ultimoAnalisis.recomendacion.algoritmo === "Dijkstra") {
    mostrarResultadoDijkstra(
      ultimoAnalisis.origen,
      ultimoAnalisis.dijkstraUno.resultado
    );
  } else {
    mostrarResultadoFloyd(ultimoAnalisis.floyd.resultado);
  }

  calculoRecomendado.hidden = false;
  calculoRecomendado.scrollIntoView({ behavior: "smooth", block: "start" });
}

function mostrarResultadoDijkstra(origen, distancias) {
  tituloCalculoRecomendado.textContent = `Dijkstra desde nodo ${origen + 1}`;
  const lista = crearListaAdyacencia(nodos.length);
  const resultado = dijkstraConAnteriores(origen, nodos.length, lista);

  let filas = "";
  distancias.forEach((distancia, destino) => {
    const camino = reconstruirCamino(origen, destino, resultado.anteriores);
    filas += `
      <tr>
        <td>${destino + 1}</td>
        <td>${distancia === INF ? "No alcanzable" : distancia}</td>
        <td>${camino ? camino.map((nodo) => nodo + 1).join(" -> ") : "No alcanzable"}</td>
      </tr>
    `;
  });

  contenidoCalculoRecomendado.innerHTML = `
    <div class="recommended-table-wrap">
      <table>
        <thead><tr><th>Destino</th><th>Distancia</th><th>Camino</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  `;
}

function mostrarResultadoFloyd(matriz) {
  tituloCalculoRecomendado.textContent = "Matriz final de Floyd-Warshall";
  let html = '<div class="recommended-table-wrap"><table class="recommended-matrix"><thead><tr><th>Desde / Hacia</th>';
  nodos.forEach((nodo) => {
    html += `<th>${nodo.id}</th>`;
  });
  html += "</tr></thead><tbody>";

  matriz.forEach((fila, i) => {
    html += `<tr><th>${i + 1}</th>`;
    fila.forEach((valor) => {
      html += `<td>${valor === INF ? "∞" : valor}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table></div>";
  contenidoCalculoRecomendado.innerHTML = html;
}

function dijkstraConAnteriores(origen, n, lista) {
  const distancias = Array(n).fill(INF);
  const anteriores = Array(n).fill(null);
  const visitados = Array(n).fill(false);
  distancias[origen] = 0;

  for (let paso = 0; paso < n; paso++) {
    let actual = -1;
    for (let i = 0; i < n; i++) {
      if (!visitados[i] && (actual === -1 || distancias[i] < distancias[actual])) actual = i;
    }
    if (actual === -1 || distancias[actual] === INF) break;
    visitados[actual] = true;

    for (const [destino, peso] of lista[actual]) {
      const nueva = distancias[actual] + peso;
      if (nueva < distancias[destino]) {
        distancias[destino] = nueva;
        anteriores[destino] = actual;
      }
    }
  }

  return { distancias, anteriores };
}

function reconstruirCamino(origen, destino, anteriores) {
  const camino = [];
  let actual = destino;

  while (actual !== null) {
    camino.push(actual);
    if (actual === origen) break;
    actual = anteriores[actual];
  }

  camino.reverse();
  return camino[0] === origen ? camino : null;
}

function crearListaAdyacencia(n) {
  const lista = Array.from({ length: n }, () => []);
  aristas.forEach((arista) => {
    const origen = arista.origen - 1;
    const destino = arista.destino - 1;
    lista[origen].push([destino, arista.peso]);
    if (!ES_DIRIGIDO) lista[destino].push([origen, arista.peso]);
  });
  return lista;
}

function crearMatriz(n) {
  const matriz = Array.from({ length: n }, () => Array(n).fill(INF));
  for (let i = 0; i < n; i++) matriz[i][i] = 0;

  aristas.forEach((arista) => {
    const origen = arista.origen - 1;
    const destino = arista.destino - 1;
    matriz[origen][destino] = Math.min(matriz[origen][destino], arista.peso);
    if (!ES_DIRIGIDO) matriz[destino][origen] = Math.min(matriz[destino][origen], arista.peso);
  });
  return matriz;
}

function dijkstra(origen, n, lista) {
  const distancias = Array(n).fill(INF);
  const visitados = Array(n).fill(false);
  distancias[origen] = 0;

  for (let paso = 0; paso < n; paso++) {
    let actual = -1;
    for (let i = 0; i < n; i++) {
      if (!visitados[i] && (actual === -1 || distancias[i] < distancias[actual])) actual = i;
    }
    if (actual === -1 || distancias[actual] === INF) break;
    visitados[actual] = true;

    for (const [destino, peso] of lista[actual]) {
      const nueva = distancias[actual] + peso;
      if (nueva < distancias[destino]) distancias[destino] = nueva;
    }
  }
  return distancias;
}

function floydWarshall(base) {
  const dist = base.map((fila) => [...fila]);
  const n = dist.length;
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      if (dist[i][k] === INF) continue;
      for (let j = 0; j < n; j++) {
        const nueva = dist[i][k] + dist[k][j];
        if (nueva < dist[i][j]) dist[i][j] = nueva;
      }
    }
  }
  return dist;
}

async function medir(funcion, rondas) {
  funcion();
  const tiempos = [];
  let resultado;
  for (let i = 0; i < rondas; i++) {
    await permitirRenderizado();
    const inicio = performance.now();
    resultado = funcion();
    tiempos.push(performance.now() - inicio);
  }
  tiempos.sort((a, b) => a - b);
  return { resultado, mediana: tiempos[Math.floor(tiempos.length / 2)] };
}

function filasIguales(a, b) {
  return a.every((valor, indice) => valor === b[indice]);
}

function matricesIguales(a, b) {
  return a.every((fila, i) => filasIguales(fila, b[i]));
}

function formatearTiempo(ms) {
  return ms < 1 ? `${(ms * 1000).toFixed(1)} us` : `${ms.toFixed(3)} ms`;
}

function permitirRenderizado() {
  return new Promise((resolver) => requestAnimationFrame(() => requestAnimationFrame(resolver)));
}

function limpiarTodo() {
  nodos = [];
  aristas = [];
  txtEliminarNodo.value = "";
  txtOrigen.value = "";
  txtDestino.value = "";
  txtPeso.value = "";
  actualizarNodosIniciales();
  ultimoAnalisis = null;
  calculoRecomendado.hidden = true;
  resultadoAnalisis.innerHTML = `
    <div class="analyzer-empty">
      <strong>Tu recomendacion aparecera aqui</strong>
      <p>Construye un grafo con al menos dos nodos y una arista.</p>
    </div>
  `;
  cambiarModo("seleccionar");
  dibujarGrafo();
}

function dibujarGrafo() {
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  aristas.forEach(dibujarArista);
  nodos.forEach(dibujarNodo);
}

function dibujarArista(arista) {
  const origen = nodos.find((nodo) => nodo.id === arista.origen);
  const destino = nodos.find((nodo) => nodo.id === arista.destino);
  if (!origen || !destino) return;

  const inicio = puntoBorde(origen, destino);
  const fin = puntoBorde(destino, origen);
  const opuesta = ES_DIRIGIDO && aristas.some(
    (otra) => otra.origen === arista.destino && otra.destino === arista.origen
  );
  const control = puntoControl(inicio, fin, opuesta ? 42 : 0);

  ctx.save();
  ctx.strokeStyle = "#475569";
  ctx.fillStyle = "#475569";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(inicio.x, inicio.y);
  if (opuesta) ctx.quadraticCurveTo(control.x, control.y, fin.x, fin.y);
  else ctx.lineTo(fin.x, fin.y);
  ctx.stroke();

  if (ES_DIRIGIDO) dibujarFlecha(inicio, fin, opuesta ? control : null);
  dibujarPeso(arista.peso, inicio, fin, opuesta ? control : null);
  ctx.restore();
}

function puntoBorde(origen, destino) {
  const dx = destino.x - origen.x;
  const dy = destino.y - origen.y;
  const largo = Math.hypot(dx, dy) || 1;
  return {
    x: origen.x + (dx / largo) * RADIO_NODO,
    y: origen.y + (dy / largo) * RADIO_NODO
  };
}

function puntoControl(inicio, fin, separacion) {
  const dx = fin.x - inicio.x;
  const dy = fin.y - inicio.y;
  const largo = Math.hypot(dx, dy) || 1;
  return {
    x: (inicio.x + fin.x) / 2 + (-dy / largo) * separacion,
    y: (inicio.y + fin.y) / 2 + (dx / largo) * separacion
  };
}

function puntoBezier(inicio, control, fin, t) {
  const u = 1 - t;
  return {
    x: u * u * inicio.x + 2 * u * t * control.x + t * t * fin.x,
    y: u * u * inicio.y + 2 * u * t * control.y + t * t * fin.y
  };
}

function dibujarFlecha(inicio, fin, control) {
  const anterior = control ? puntoBezier(inicio, control, fin, 0.92) : inicio;
  const angulo = Math.atan2(fin.y - anterior.y, fin.x - anterior.x);
  const largo = 13;
  ctx.beginPath();
  ctx.moveTo(fin.x, fin.y);
  ctx.lineTo(fin.x - largo * Math.cos(angulo - Math.PI / 6), fin.y - largo * Math.sin(angulo - Math.PI / 6));
  ctx.lineTo(fin.x - largo * Math.cos(angulo + Math.PI / 6), fin.y - largo * Math.sin(angulo + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function dibujarPeso(peso, inicio, fin, control) {
  const punto = control
    ? puntoBezier(inicio, control, fin, 0.5)
    : { x: (inicio.x + fin.x) / 2, y: (inicio.y + fin.y) / 2 };
  const texto = String(peso);
  ctx.font = "800 13px Segoe UI";
  const ancho = ctx.measureText(texto).width;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.roundRect(punto.x - ancho / 2 - 7, punto.y - 12, ancho + 14, 23, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1e293b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(texto, punto.x, punto.y);
}

function dibujarNodo(nodo) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(nodo.x, nodo.y, RADIO_NODO, 0, Math.PI * 2);
  ctx.fillStyle = "#e11d48";
  ctx.shadowColor = "rgba(225, 29, 72, 0.3)";
  ctx.shadowBlur = 13;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#881337";
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 16px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(nodo.id, nodo.x, nodo.y);
  ctx.restore();
}

canvas.addEventListener("click", (evento) => {
  if (modo === "agregarNodo") agregarNodo(posicionCanvas(evento));
});
btnModoNodo.addEventListener("click", () => cambiarModo("agregarNodo"));
btnModoSeleccionar.addEventListener("click", () => cambiarModo("seleccionar"));
btnEliminarNodo.addEventListener("click", eliminarNodo);
btnAgregarArco.addEventListener("click", agregarArista);
btnConectarAleatorio.addEventListener("click", completarAleatoriamente);
btnAnalizar.addEventListener("click", analizarGrafo);
btnLimpiar.addEventListener("click", limpiarTodo);
btnCerrarCalculo.addEventListener("click", () => {
  calculoRecomendado.hidden = true;
});
window.addEventListener("resize", ajustarCanvas);

ajustarCanvas();
cambiarModo("seleccionar");
