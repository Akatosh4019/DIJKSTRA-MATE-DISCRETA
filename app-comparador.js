const cantidadNodos = document.getElementById("cantidadNodos");
const densidadAristas = document.getElementById("densidadAristas");
const valorDensidad = document.getElementById("valorDensidad");
const repeticiones = document.getElementById("repeticiones");
const btnEjecutarComparacion = document.getElementById("btnEjecutarComparacion");
const resumenPrueba = document.getElementById("resumenPrueba");
const resultadosComparacion = document.getElementById("resultadosComparacion");
const pantallaCarga = document.getElementById("pantallaCarga");
const estadoCarga = document.getElementById("estadoCarga");
const tipoGrafoBadge = document.getElementById("tipoGrafoBadge");
const canvasDijkstra = document.getElementById("canvasDijkstra");
const canvasFloyd = document.getElementById("canvasFloyd");
const estadoGrafos = document.getElementById("estadoGrafos");
const tiempoDijkstraVisual = document.getElementById("tiempoDijkstraVisual");
const tiempoFloydVisual = document.getElementById("tiempoFloydVisual");

const TIPO_GRAFO = new URLSearchParams(window.location.search).get("tipo") || "dirigido";
const ES_DIRIGIDO = TIPO_GRAFO !== "no-dirigido";
const INF = Number.POSITIVE_INFINITY;
let ultimoGrafoVisual = null;
let ultimaConfiguracionVisual = null;

tipoGrafoBadge.textContent = ES_DIRIGIDO
  ? "Prueba comparativa | Grafo dirigido"
  : "Prueba comparativa | Grafo no dirigido";

densidadAristas.addEventListener("input", () => {
  valorDensidad.textContent = `${densidadAristas.value}%`;
});

btnEjecutarComparacion.addEventListener("click", ejecutarComparacion);
window.addEventListener("resize", redibujarUltimoGrafo);

async function ejecutarComparacion() {
  const n = Number(cantidadNodos.value);
  const densidad = Number(densidadAristas.value) / 100;
  const rondas = Number(repeticiones.value);

  if (!Number.isInteger(n) || n < 20 || n > 150) {
    window.alert("La cantidad de nodos debe ser un numero entero entre 20 y 150.");
    return;
  }

  try {
    const grafo = generarGrafo(n, densidad);
    const posiciones = crearPosiciones(n);
    const nodoInicial = Math.floor(Math.random() * n);
    ultimoGrafoVisual = grafo;
    ultimaConfiguracionVisual = { n, posiciones, nodoInicial };
    tiempoDijkstraVisual.textContent = "--";
    tiempoFloydVisual.textContent = "--";
    estadoGrafos.textContent = `Animando ${n} nodos y ${grafo.length} aristas compartidas...`;
    await animarGrafos(grafo, posiciones, n);

    pantallaCarga.hidden = false;
    estadoCarga.textContent = "Ejecutando ambos metodos sobre el grafo mostrado.";
    await permitirRenderizado();

    const lista = crearListaAdyacencia(n, grafo);
    const matrizBase = crearMatrizBase(n, grafo);

    estadoCarga.textContent = `Midiendo Dijkstra solamente desde el nodo ${nodoInicial + 1}.`;
    await permitirRenderizado();
    const medicionDijkstra = await medirVariasVeces(
      () => dijkstraConHeap(nodoInicial, n, lista),
      rondas
    );

    estadoCarga.textContent = "Midiendo Floyd-Warshall con su matriz.";
    await permitirRenderizado();
    const medicionFloyd = await medirVariasVeces(
      () => ejecutarFloyd(matrizBase),
      rondas
    );

    const iguales = filasIguales(
      medicionDijkstra.resultado,
      medicionFloyd.resultado[nodoInicial]
    );
    const caminoMuestra = elegirCaminoAleatorio(n, lista, nodoInicial);
    ultimaConfiguracionVisual.camino = caminoMuestra.camino;
    redibujarUltimoGrafo();
    tiempoDijkstraVisual.textContent = formatearTiempoLimpio(medicionDijkstra.mediana);
    tiempoFloydVisual.textContent = formatearTiempoLimpio(medicionFloyd.mediana);
    estadoGrafos.textContent =
      `Nodo inicial ${nodoInicial + 1}. Mismo camino ${caminoMuestra.origen + 1} -> ${caminoMuestra.destino + 1}: ` +
      caminoMuestra.camino.map((nodo) => nodo + 1).join(" -> ");
    mostrarResumen(n, grafo.length, nodoInicial, iguales);
    mostrarResultados(
      medicionDijkstra,
      medicionFloyd,
      n,
      grafo.length,
      densidad,
      nodoInicial,
      iguales
    );
  } finally {
    pantallaCarga.hidden = true;
  }
}

function crearPosiciones(n) {
  const posiciones = [];
  const vueltas = n <= 24 ? 1 : n <= 70 ? 2 : 3;

  for (let i = 0; i < n; i++) {
    const anillo = i % vueltas;
    const indiceEnAnillo = Math.floor(i / vueltas);
    const totalAnillo = Math.ceil((n - anillo) / vueltas);
    const angulo = (indiceEnAnillo / totalAnillo) * Math.PI * 2 - Math.PI / 2;
    const radio = vueltas === 1 ? 0.39 : 0.2 + anillo * (0.25 / Math.max(1, vueltas - 1));

    posiciones.push({
      x: 0.5 + Math.cos(angulo) * radio,
      y: 0.5 + Math.sin(angulo) * radio
    });
  }

  return posiciones;
}

function animarGrafos(grafo, posiciones, n) {
  return new Promise((resolver) => {
    const duracion = 1000;
    const inicio = performance.now();

    function cuadro(ahora) {
      const progreso = Math.min(1, (ahora - inicio) / duracion);
      const suavizado = 1 - Math.pow(1 - progreso, 3);

      dibujarGrafoComparacion(canvasDijkstra, grafo, posiciones, n, suavizado, "dijkstra");
      dibujarGrafoComparacion(canvasFloyd, grafo, posiciones, n, suavizado, "floyd");

      if (progreso < 1) {
        requestAnimationFrame(cuadro);
      } else {
        resolver();
      }
    }

    requestAnimationFrame(cuadro);
  });
}

function dibujarGrafoComparacion(canvas, grafo, posiciones, n, progreso, tema) {
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const escala = window.devicePixelRatio || 1;
  const ancho = rect.width || 560;
  const alto = rect.height || 390;

  if (canvas.width !== Math.floor(ancho * escala) || canvas.height !== Math.floor(alto * escala)) {
    canvas.width = Math.floor(ancho * escala);
    canvas.height = Math.floor(alto * escala);
  }

  ctx.setTransform(escala, 0, 0, escala, 0, 0);
  ctx.clearRect(0, 0, ancho, alto);

  const puntos = posiciones.map((punto) => ({
    x: punto.x * ancho,
    y: punto.y * alto
  }));
  const aristasVisibles = Math.floor(grafo.length * Math.min(1, progreso * 1.5));
  const colorArista = tema === "dijkstra" ? "rgba(37, 99, 235, 0.18)" : "rgba(124, 58, 237, 0.18)";
  const colorNodo = tema === "dijkstra" ? "#0ea5e9" : "#8b5cf6";
  const colorBorde = tema === "dijkstra" ? "#075985" : "#5b21b6";
  const camino = ultimaConfiguracionVisual?.camino || [];
  const nodoInicial = ultimaConfiguracionVisual?.nodoInicial;
  const aristasCamino = new Set();

  for (let i = 0; i < camino.length - 1; i++) {
    aristasCamino.add(claveVisual(camino[i], camino[i + 1]));
  }

  for (let i = 0; i < aristasVisibles; i++) {
    const arista = grafo[i];
    const origen = puntos[arista.origen];
    const destino = puntos[arista.destino];
    const resaltada = aristasCamino.has(claveVisual(arista.origen, arista.destino));
    ctx.lineWidth = resaltada ? (n > 80 ? 2 : 3.5) : (n > 80 ? 0.7 : 1.1);
    ctx.strokeStyle = resaltada ? "#f59e0b" : colorArista;
    ctx.beginPath();
    ctx.moveTo(origen.x, origen.y);
    ctx.lineTo(destino.x, destino.y);
    ctx.stroke();
  }

  const nodosVisibles = Math.ceil(n * Math.max(0, (progreso - 0.25) / 0.75));
  const radio = n <= 25 ? 8 : n <= 70 ? 5.5 : 3.5;

  for (let i = 0; i < nodosVisibles; i++) {
    const punto = puntos[i];
    const esInicial = i === nodoInicial;
    ctx.beginPath();
    ctx.arc(punto.x, punto.y, esInicial ? radio + 3 : radio, 0, Math.PI * 2);
    ctx.fillStyle = esInicial ? "#f59e0b" : colorNodo;
    ctx.fill();
    ctx.lineWidth = esInicial ? 3 : 1.5;
    ctx.strokeStyle = esInicial ? "#92400e" : colorBorde;
    ctx.stroke();

    if (n <= 35) {
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${Math.max(8, radio + 2)}px Segoe UI`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(i + 1, punto.x, punto.y);
    }
  }
}

function claveVisual(origen, destino) {
  if (ES_DIRIGIDO) return `${origen}-${destino}`;
  return origen < destino ? `${origen}-${destino}` : `${destino}-${origen}`;
}

function elegirCaminoAleatorio(n, lista, origen) {
  let destino = Math.floor(Math.random() * n);
  while (destino === origen) destino = Math.floor(Math.random() * n);

  const distancias = Array(n).fill(INF);
  const anteriores = Array(n).fill(null);
  const heap = new MinHeap();
  distancias[origen] = 0;
  heap.push([0, origen]);

  while (heap.size > 0) {
    const [distanciaActual, actual] = heap.pop();
    if (distanciaActual !== distancias[actual]) continue;
    if (actual === destino) break;

    for (const [vecino, peso] of lista[actual]) {
      const nueva = distanciaActual + peso;
      if (nueva < distancias[vecino]) {
        distancias[vecino] = nueva;
        anteriores[vecino] = actual;
        heap.push([nueva, vecino]);
      }
    }
  }

  const camino = [];
  let actual = destino;
  while (actual !== null) {
    camino.push(actual);
    if (actual === origen) break;
    actual = anteriores[actual];
  }
  camino.reverse();

  return { origen, destino, camino };
}

function redibujarUltimoGrafo() {
  if (!ultimoGrafoVisual || !ultimaConfiguracionVisual) return;

  dibujarGrafoComparacion(
    canvasDijkstra,
    ultimoGrafoVisual,
    ultimaConfiguracionVisual.posiciones,
    ultimaConfiguracionVisual.n,
    1,
    "dijkstra"
  );
  dibujarGrafoComparacion(
    canvasFloyd,
    ultimoGrafoVisual,
    ultimaConfiguracionVisual.posiciones,
    ultimaConfiguracionVisual.n,
    1,
    "floyd"
  );
}

function generarGrafo(n, densidad) {
  const aristas = [];
  const existentes = new Set();

  function agregar(origen, destino) {
    const clave = ES_DIRIGIDO
      ? `${origen}-${destino}`
      : origen < destino ? `${origen}-${destino}` : `${destino}-${origen}`;

    if (origen === destino || existentes.has(clave)) return;
    existentes.add(clave);
    aristas.push({
      origen,
      destino,
      peso: Math.floor(Math.random() * 99) + 1
    });
  }

  for (let i = 0; i < n; i++) {
    agregar(i, (i + 1) % n);
    if (ES_DIRIGIDO) agregar((i + 1) % n, i);
  }

  if (ES_DIRIGIDO) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j && Math.random() < densidad) agregar(i, j);
      }
    }
  } else {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.random() < densidad) agregar(i, j);
      }
    }
  }

  return aristas;
}

function crearListaAdyacencia(n, aristas) {
  const lista = Array.from({ length: n }, () => []);

  aristas.forEach((arista) => {
    lista[arista.origen].push([arista.destino, arista.peso]);
    if (!ES_DIRIGIDO) {
      lista[arista.destino].push([arista.origen, arista.peso]);
    }
  });

  return lista;
}

function crearMatrizBase(n, aristas) {
  const matriz = Array.from({ length: n }, () => Array(n).fill(INF));
  for (let i = 0; i < n; i++) matriz[i][i] = 0;

  aristas.forEach((arista) => {
    matriz[arista.origen][arista.destino] = Math.min(
      matriz[arista.origen][arista.destino],
      arista.peso
    );

    if (!ES_DIRIGIDO) {
      matriz[arista.destino][arista.origen] = Math.min(
        matriz[arista.destino][arista.origen],
        arista.peso
      );
    }
  });

  return matriz;
}

function dijkstraConHeap(origen, n, lista) {
  const distancias = Array(n).fill(INF);
  const heap = new MinHeap();
  distancias[origen] = 0;
  heap.push([0, origen]);

  while (heap.size > 0) {
    const [distanciaActual, actual] = heap.pop();
    if (distanciaActual !== distancias[actual]) continue;

    for (const [destino, peso] of lista[actual]) {
      const nueva = distanciaActual + peso;
      if (nueva < distancias[destino]) {
        distancias[destino] = nueva;
        heap.push([nueva, destino]);
      }
    }
  }

  return distancias;
}

function ejecutarFloyd(matrizBase) {
  const dist = matrizBase.map((fila) => [...fila]);
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

async function medirVariasVeces(funcion, rondas) {
  const tiempos = [];
  let resultado = null;

  funcion();

  for (let i = 0; i < rondas; i++) {
    await permitirRenderizado();
    const inicio = performance.now();
    resultado = funcion();
    tiempos.push(performance.now() - inicio);
  }

  tiempos.sort((a, b) => a - b);
  return {
    resultado,
    tiempos,
    mediana: tiempos[Math.floor(tiempos.length / 2)]
  };
}

function filasIguales(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function mostrarResumen(nodos, aristas, nodoInicial, iguales) {
  const valores = resumenPrueba.querySelectorAll("strong");
  valores[0].textContent = nodos;
  valores[1].textContent = aristas;
  valores[2].textContent = `Nodo ${nodoInicial + 1}`;
  valores[3].textContent = iguales ? "Si" : "No";
  valores[3].className = iguales ? "verified" : "failed";
}

function mostrarResultados(dijkstra, floyd, nodos, aristas, densidad, nodoInicial, iguales) {
  const ganador = dijkstra.mediana <= floyd.mediana ? "Dijkstra" : "Floyd-Warshall";
  const menor = Math.min(dijkstra.mediana, floyd.mediana);
  const mayor = Math.max(dijkstra.mediana, floyd.mediana);
  const diferencia = menor > 0 ? mayor / menor : 1;
  const maximo = Math.max(dijkstra.mediana, floyd.mediana, 0.001);
  const anchoDijkstra = Math.max(5, (dijkstra.mediana / maximo) * 100);
  const anchoFloyd = Math.max(5, (floyd.mediana / maximo) * 100);
  const recomendacion = crearRecomendacionUnOrigen(ganador, nodos, aristas);

  resultadosComparacion.innerHTML = `
    <div class="winner-banner">
      <span>Ganador de esta prueba</span>
      <h2>${ganador}</h2>
      <p>Fue aproximadamente ${diferencia.toFixed(2)} veces mas rapido en esta configuracion.</p>
    </div>

    <div class="benchmark-algorithms">
      <article class="algorithm-result dijkstra-result ${ganador === "Dijkstra" ? "winner" : ""}">
        <div>
          <span>Dijkstra desde nodo ${nodoInicial + 1}</span>
          <strong>${formatearTiempoLimpio(dijkstra.mediana)}</strong>
        </div>
        <div class="time-bar"><i style="width: ${anchoDijkstra}%"></i></div>
        <small>Mediana de ${dijkstra.tiempos.length} ejecuciones.</small>
      </article>

      <article class="algorithm-result floyd-result ${ganador === "Floyd-Warshall" ? "winner" : ""}">
        <div>
          <span>Floyd-Warshall</span>
          <strong>${formatearTiempoLimpio(floyd.mediana)}</strong>
        </div>
        <div class="time-bar"><i style="width: ${anchoFloyd}%"></i></div>
        <small>Mediana de ${floyd.tiempos.length} ejecuciones.</small>
      </article>
    </div>

    <article class="benchmark-verification ${iguales ? "ok" : "error"}">
      <strong>${iguales ? "Resultados verificados" : "Resultados diferentes"}</strong>
      <p>${iguales
        ? `Dijkstra y la fila ${nodoInicial + 1} de Floyd produjeron las mismas distancias.`
        : "La prueba detecto diferencias y no debe considerarse valida."}</p>
    </article>

    <article class="benchmark-recommendation">
      <span>Conclusion</span>
      <h3>${recomendacion.titulo}</h3>
      <p>${recomendacion.texto}</p>
    </article>
  `;
}

function permitirRenderizado() {
  return new Promise((resolver) => {
    requestAnimationFrame(() => requestAnimationFrame(resolver));
  });
}

function crearRecomendacionUnOrigen(ganador, nodos, aristas) {
  return {
    titulo: ganador === "Dijkstra"
      ? "Dijkstra conviene para este objetivo"
      : "Dijkstra realiza menos trabajo para un solo origen",
    texto:
      `Solo se solicitaron caminos desde un nodo sobre un grafo de ${nodos} nodos y ${aristas} aristas. ` +
      `Dijkstra calculo exactamente esa fila. Floyd-Warshall proceso las ${nodos} filas de la matriz completa, ` +
      `aunque las otras ${nodos - 1} filas no eran necesarias para esta consulta.`
  };
}

function formatearTiempoLimpio(ms) {
  return ms < 1 ? `${(ms * 1000).toFixed(1)} us` : `${ms.toFixed(3)} ms`;
}

class MinHeap {
  constructor() {
    this.datos = [];
  }

  get size() {
    return this.datos.length;
  }

  push(valor) {
    this.datos.push(valor);
    let indice = this.datos.length - 1;

    while (indice > 0) {
      const padre = Math.floor((indice - 1) / 2);
      if (this.datos[padre][0] <= valor[0]) break;
      this.datos[indice] = this.datos[padre];
      indice = padre;
    }

    this.datos[indice] = valor;
  }

  pop() {
    const raiz = this.datos[0];
    const ultimo = this.datos.pop();
    if (this.datos.length === 0) return raiz;

    let indice = 0;
    while (true) {
      const izquierdo = indice * 2 + 1;
      const derecho = izquierdo + 1;
      if (izquierdo >= this.datos.length) break;

      let menor = izquierdo;
      if (derecho < this.datos.length && this.datos[derecho][0] < this.datos[izquierdo][0]) {
        menor = derecho;
      }

      if (this.datos[menor][0] >= ultimo[0]) break;
      this.datos[indice] = this.datos[menor];
      indice = menor;
    }

    this.datos[indice] = ultimo;
    return raiz;
  }
}

async function crearDemostracionInicial() {
  const n = Number(cantidadNodos.value);
  const densidad = Number(densidadAristas.value) / 100;
  const grafo = generarGrafo(n, densidad);
  const posiciones = crearPosiciones(n);
  ultimoGrafoVisual = grafo;
  ultimaConfiguracionVisual = {
    n,
    posiciones,
    nodoInicial: Math.floor(Math.random() * n)
  };
  await animarGrafos(grafo, posiciones, n);
  estadoGrafos.textContent = `Grafo de muestra: ${n} nodos y ${grafo.length} aristas.`;
}

crearDemostracionInicial();
