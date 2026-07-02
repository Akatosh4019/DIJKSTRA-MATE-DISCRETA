const monedasInput = document.getElementById("monedas");
const actualizarMaquinaBtn = document.getElementById("actualizarMaquina");
const reiniciarMaquinaBtn = document.getElementById("reiniciarMaquina");
const botonesMonedas = document.getElementById("botonesMonedas");
const estadoActual = document.getElementById("estadoActual");
const conjuntoEstados = document.getElementById("conjuntoEstados");
const alfabetoEntrada = document.getElementById("alfabetoEntrada");
const saldoPantalla = document.getElementById("saldoPantalla");
const mensajePantalla = document.getElementById("mensajePantalla");
const productoVisual = document.getElementById("productoVisual");
const bandejaVuelto = document.getElementById("bandejaVuelto");
const maquinaVisual = document.querySelector(".digital-vending-machine");
const monedaAnimada = document.getElementById("monedaAnimada");
const recogerProductoBtn = document.getElementById("recogerProducto");
const ultimaEntrada = document.getElementById("ultimaEntrada");
const salidaProducto = document.getElementById("salidaProducto");
const salidaVuelto = document.getElementById("salidaVuelto");
const listaProductos = document.getElementById("listaProductos");
const tablaCaminosCortos = document.getElementById("tablaCaminosCortos");
const diagramaMaquina = document.getElementById("diagramaMaquina");
const diagramaEstados = document.getElementById("diagramaEstados");
const diagramaRecojo = document.getElementById("diagramaRecojo");
const tablaTransiciones = document.getElementById("tablaTransiciones");
const tablaMefPrincipal = document.getElementById("tablaMefPrincipal");
const tablaMefDinero = document.getElementById("tablaMefDinero");
const tablaMefRecojo = document.getElementById("tablaMefRecojo");
const tablasAceptacion = document.getElementById("tablasAceptacion");
const mefsInternosDinero = document.getElementById("mefsInternosDinero");
const toast = document.getElementById("toast");

const ctx = diagramaEstados.getContext("2d");
const ctxMaquina = diagramaMaquina.getContext("2d");
const ctxRecojo = diagramaRecojo.getContext("2d");

const productos = [
  { codigo: "A1", nombre: "Coca Cola", precio: 520, color: "#ef4444", imagen: "assets/productos/coca-cola.png" },
  { codigo: "A2", nombre: "Agua", precio: 350, color: "#38bdf8", imagen: "assets/productos/agua-ya.png" },
  { codigo: "A3", nombre: "Pepsi", precio: 520, color: "#2563eb", imagen: "assets/productos/pepsi.png" },
  { codigo: "A4", nombre: "Jugo", precio: 480, color: "#22c55e", imagen: "assets/productos/jugo.png" },
  { codigo: "B1", nombre: "Papas", precio: 620, color: "#eab308", imagen: "assets/productos/lays.png" },
  { codigo: "B2", nombre: "Galletas", precio: 620, color: "#f59e0b", imagen: "assets/productos/galletas.png" },
  { codigo: "B3", nombre: "Chocolate", precio: 650, color: "#7c2d12", imagen: "assets/productos/chocolate.png" },
  { codigo: "C1", nombre: "Mini galleta", precio: 250, color: "#fb923c", imagen: "assets/productos/mini-galletas.png" },
  { codigo: "C2", nombre: "Mini cereal", precio: 250, color: "#a855f7", imagen: "assets/productos/mini-cereal.png" }
];

const PASO_CENTIMOS = 10;
let monedas = [10, 20, 50, 100, 200, 500];
let saldo = 0;
let productoEntregado = null;
let estadoRecojo = "inactivo";
let transicionActiva = null;
let toastTimer = null;
let reinicioRecojoTimer = null;

const coloresMonedas = ["#2563eb", "#7c3aed", "#16a34a", "#db2777", "#0891b2", "#ca8a04", "#4f46e5"];

function maxPrecio() {
  return Math.max(...productos.map((producto) => producto.precio));
}

function estadoDesdeSaldo(valor) {
  return Math.min(valor, maxPrecio());
}

function estadosDinero() {
  const total = Math.floor(maxPrecio() / PASO_CENTIMOS) + 1;
  return Array.from({ length: total }, (_, indice) => indice * PASO_CENTIMOS);
}

function estadoId(valor) {
  return `q${estadoDesdeSaldo(valor)}`;
}

function formatoDinero(valor) {
  const soles = valor / 100;
  return `S/${soles.toFixed(2)}`;
}

function formatoMoneda(valor) {
  return valor < 100 ? `${valor}c` : formatoDinero(valor);
}

function parsearMonto(valor) {
  const limpio = valor
    .trim()
    .toLowerCase()
    .replace("s/", "")
    .replace("centimos", "c")
    .replace("centimo", "c")
    .replace("soles", "")
    .replace("sol", "")
    .replace("s", "")
    .replace(",", ".");

  if (!limpio) return null;

  if (limpio.endsWith("c")) {
    const centimos = Number(limpio.slice(0, -1));
    return Number.isInteger(centimos) && centimos > 0 ? centimos : null;
  }

  const soles = Number(limpio);
  if (!Number.isFinite(soles) || soles <= 0) return null;

  const centimos = Math.round(soles * 100);
  return centimos % PASO_CENTIMOS === 0 ? centimos : null;
}

function mostrarToast(mensaje) {
  toast.textContent = mensaje;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

function reiniciarAnimacion(elemento, clase) {
  if (!elemento) return;

  elemento.classList.remove(clase);
  void elemento.offsetWidth;
  elemento.classList.add(clase);
}

function limpiarSalidaVisual() {
  clearTimeout(reinicioRecojoTimer);
  estadoRecojo = "inactivo";
  if (recogerProductoBtn) {
    recogerProductoBtn.disabled = true;
    recogerProductoBtn.textContent = "Recoger producto";
  }

  if (productoVisual) {
    productoVisual.classList.remove("product-delivered");
    productoVisual.classList.remove("with-image");
    productoVisual.style.removeProperty("--drop-color");
    productoVisual.innerHTML = `<span id="productoEtiqueta">Elige un producto</span>`;
  }

  if (bandejaVuelto) {
    bandejaVuelto.innerHTML = `<span class="empty-change">Vuelto aqui</span>`;
  }
}

function reiniciarCicloCompra(mensaje = "La maquina vuelve a q0 y espera dinero.") {
  saldo = 0;
  productoEntregado = null;
  transicionActiva = null;
  limpiarSalidaVisual();
  actualizarPantalla({ mensaje });
  renderDiagramaMaquina();
  renderDiagrama();
  renderDiagramaRecojo();
  renderMefsInternosDinero();
}

function descomponerVuelto(vuelto) {
  if (vuelto <= 0) return [];

  const disponibles = [...monedas, PASO_CENTIMOS]
    .filter((moneda) => moneda > 0 && moneda <= vuelto)
    .sort((a, b) => b - a);
  const unicas = [...new Set(disponibles)];
  const resultado = [];
  let restante = vuelto;

  unicas.forEach((moneda) => {
    while (restante >= moneda) {
      resultado.push(moneda);
      restante -= moneda;
    }
  });

  return resultado;
}

function renderVueltoAnimado(vuelto) {
  if (!bandejaVuelto) return;

  bandejaVuelto.innerHTML = "";

  if (vuelto <= 0) {
    const sinVuelto = document.createElement("span");
    sinVuelto.className = "no-change";
    sinVuelto.textContent = "Sin vuelto";
    bandejaVuelto.appendChild(sinVuelto);
    return;
  }

  const monedasVuelto = descomponerVuelto(vuelto);
  const visibles = monedasVuelto.slice(0, 8);

  visibles.forEach((valor, indice) => {
    const moneda = document.createElement("span");
    moneda.className = "change-coin";
    moneda.textContent = formatoMoneda(valor);
    moneda.style.animationDelay = `${indice * 0.08}s`;
    bandejaVuelto.appendChild(moneda);
  });

  if (monedasVuelto.length > visibles.length) {
    const extra = document.createElement("span");
    extra.className = "change-extra";
    extra.textContent = `+${monedasVuelto.length - visibles.length}`;
    bandejaVuelto.appendChild(extra);
  }
}

function animarEntrega(producto, vuelto) {
  if (productoVisual) {
    productoVisual.style.setProperty("--drop-color", producto.color);
    productoVisual.classList.toggle("with-image", Boolean(producto.imagen));
    productoVisual.innerHTML = producto.imagen
      ? `<img src="${producto.imagen}" alt="${producto.nombre}"><span>${producto.nombre}</span>`
      : `<span>${producto.nombre}</span>`;
    reiniciarAnimacion(productoVisual, "product-delivered");
  }

  reiniciarAnimacion(maquinaVisual, "machine-vend");
  renderVueltoAnimado(vuelto);
}

function animarInsercionMoneda(moneda) {
  if (monedaAnimada) {
    monedaAnimada.textContent = formatoMoneda(moneda);
    reiniciarAnimacion(monedaAnimada, "coin-inserting");
  }

  reiniciarAnimacion(saldoPantalla, "saldo-updated");
  reiniciarAnimacion(estadoActual, "status-updated");
}

function parsearMonedas() {
  const valores = monedasInput.value
    .split(",")
    .map((valor) => parsearMonto(valor))
    .filter((valor) => Number.isInteger(valor) && valor > 0 && valor % PASO_CENTIMOS === 0);

  return [...new Set(valores)].sort((a, b) => a - b);
}

function estiloMoneda(moneda) {
  const indice = Math.max(0, monedas.indexOf(moneda));
  const color = coloresMonedas[indice % coloresMonedas.length];
  const mitad = (monedas.length - 1) / 2;
  const distancia = indice - mitad;
  const direccion = indice % 2 === 0 ? -1 : 1;
  const magnitud = Math.min(170, 34 + Math.abs(distancia) * 34 + indice * 8);

  return {
    color,
    curva: direccion * magnitud,
    offset: direccion * 10
  };
}

function calcularTransicion(estado, moneda) {
  const nuevoEstado = estadoDesdeSaldo(estado + moneda);
  return {
    nuevoEstado,
    etiqueta: `delta(${estadoId(estado)}, ${formatoMoneda(moneda)}) = ${estadoId(nuevoEstado)}`
  };
}

function productosHabilitados(estado) {
  return productos
    .filter((producto) => estado >= producto.precio)
    .map((producto) => producto.codigo)
    .join(", ");
}

function productosHabilitadosLista(estado) {
  return productos.filter((producto) => estado >= producto.precio);
}

function actualizarElementosFormales() {
  const estados = estadosDinero().map((estado) => estadoId(estado));
  conjuntoEstados.textContent = `{ ${estados.join(", ")} } donde ${estadoId(maxPrecio())} significa ${formatoDinero(maxPrecio())} o mas.`;
  alfabetoEntrada.textContent = `{ ${monedas.map(formatoMoneda).join(", ")} }`;
}

function renderBotonesMonedas() {
  botonesMonedas.innerHTML = "";

  monedas.forEach((moneda) => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "coin-button";
    boton.textContent = `+${formatoMoneda(moneda)}`;
    boton.addEventListener("click", () => insertarMoneda(moneda));
    botonesMonedas.appendChild(boton);
  });
}

function renderProductos() {
  listaProductos.innerHTML = "";

  productos.forEach((producto) => {
    const habilitado = saldo >= producto.precio;
    const tarjeta = document.createElement("button");
    tarjeta.type = "button";
    tarjeta.className = `product-option${producto.imagen ? " has-image" : ""}${habilitado ? " enabled" : " locked"}`;
    tarjeta.disabled = !habilitado;
    tarjeta.style.setProperty("--product-color", producto.color);
    const visualProducto = producto.imagen
      ? `<img class="product-thumb" src="${producto.imagen}" alt="${producto.nombre}">`
      : `<span>${producto.codigo}</span>`;
    tarjeta.innerHTML = `
      ${visualProducto}
      <strong>${producto.nombre}</strong>
      <span class="product-code">${producto.codigo}</span>
      <small>Precio: ${formatoDinero(producto.precio)}</small>
      <em>${habilitado ? "Comprar" : `Faltan ${formatoDinero(producto.precio - saldo)}`}</em>
    `;
    tarjeta.addEventListener("click", () => comprarProducto(producto));
    listaProductos.appendChild(tarjeta);
  });
}

function renderTablaTransiciones() {
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  const filaCabecera = document.createElement("tr");

  filaCabecera.innerHTML = `<th>Estado</th>${monedas.map((moneda) => `<th>Entrada ${formatoMoneda(moneda)}</th>`).join("")}`;
  thead.appendChild(filaCabecera);

  estadosDinero().forEach((estado) => {
    const fila = document.createElement("tr");
    const celdas = monedas.map((moneda) => {
      const transicion = calcularTransicion(estado, moneda);
      const habilitados = productosHabilitados(transicion.nuevoEstado);
      const detalle = habilitados ? `Habilita: ${habilitados}` : "Aun no habilita producto";
      const clase = habilitados ? "accept-cell" : "";
      return `<td class="${clase}"><strong>${estadoId(transicion.nuevoEstado)}</strong><small>${detalle}</small></td>`;
    });

    fila.innerHTML = `<th>${estadoId(estado)}<small>Saldo ${formatoDinero(estado)}${estado === maxPrecio() ? " o mas" : ""}</small></th>${celdas.join("")}`;
    tbody.appendChild(fila);
  });

  tablaTransiciones.innerHTML = "";
  tablaTransiciones.append(thead, tbody);
}

function renderTablaFormal(tabla, columnas, filas) {
  if (!tabla) return;

  tabla.innerHTML = `
    <thead>
      <tr>${columnas.map((columna) => `<th>${columna}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${filas.map((fila) => `
        <tr class="${fila.clase || ""}">
          ${fila.celdas.map((celda, indice) => indice === 0 ? `<th>${celda}</th>` : `<td>${celda}</td>`).join("")}
        </tr>
      `).join("")}
    </tbody>
  `;
}

function renderTablasFormalesMef() {
  const filasPrincipal = [
    {
      celdas: ["&rarr; qM0", "insertar moneda", "qM1", "Activa la MEF 2: control de dinero"]
    },
    {
      celdas: ["qM1", "saldo suficiente", "qM2", "La MEF 2 acepta y habilita productos"]
    },
    {
      celdas: ["qM2", "seleccionar producto", "qM3", "Se prepara la entrega del producto"]
    },
    {
      celdas: ["qM3", "producto y vuelto entregados", "qM4", "Activa la MEF 3: control de recojo"]
    },
    {
      celdas: ["qM4", "producto recogido", "qM5", "La MEF 3 acepta el recojo"]
    },
    {
      clase: "accept-row",
      celdas: ["&#9678; qM5", "reinicio automatico", "qM0", "Reinicio de maquina"]
    }
  ];

  renderTablaFormal(
    tablaMefPrincipal,
    ["Estado actual", "Entrada / evento", "Nuevo estado", "Salida"],
    filasPrincipal
  );

  const filasDinero = [];
  estadosDinero().forEach((estado) => {
    monedas.forEach((moneda) => {
      const destino = calcularTransicion(estado, moneda).nuevoEstado;
      const habilitados = productosHabilitados(destino);
      filasDinero.push({
        clase: habilitados ? "accept-row" : "",
        celdas: [
          estado === 0 ? `&rarr; ${estadoId(estado)}` : estadoId(estado),
          formatoMoneda(moneda),
          habilitados ? `&#9678; ${estadoId(destino)}` : estadoId(destino),
          habilitados ? `Habilita: ${habilitados}` : "Saldo insuficiente"
        ]
      });
    });
  });

  renderTablaFormal(
    tablaMefDinero,
    ["Estado actual", "Entrada", "Nuevo estado", "Salida"],
    filasDinero
  );

  const filasRecojo = [
    {
      celdas: ["&rarr; qR0", "producto cae en bandeja", "qR1", "Esperar que el usuario recoja"]
    },
    {
      clase: "accept-row",
      celdas: ["qR1", "usuario recoge producto", "&#9678; qR2", "Recojo aceptado"]
    },
    {
      celdas: ["&#9678; qR2", "retornar al principal", "qR0", "Notifica a MEF 1 para reiniciar"]
    }
  ];

  renderTablaFormal(
    tablaMefRecojo,
    ["Estado actual", "Entrada / evento", "Nuevo estado", "Salida"],
    filasRecojo
  );
}

function productosPorPrecio() {
  const grupos = new Map();

  productos.forEach((producto) => {
    if (!grupos.has(producto.precio)) {
      grupos.set(producto.precio, []);
    }
    grupos.get(producto.precio).push(producto);
  });

  return Array.from(grupos.entries()).sort((a, b) => a[0] - b[0]);
}

function renderTablasAceptacion() {
  if (!tablasAceptacion) return;

  tablasAceptacion.innerHTML = "";

  productosPorPrecio().forEach(([precio, grupo]) => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "acceptance-card";
    const productosTexto = grupo.map((producto) => `${producto.codigo} ${producto.nombre}`).join(", ");
    const estados = estadosDinero();
    const filas = estados.map((estado) => {
      const aceptado = estado >= precio;
      const esMeta = estado === precio;
      const marcadorInicial = estado === 0 ? "&rarr;" : "";
      const marcadorAceptacion = aceptado ? "&#9678;" : "";
      const marcador = `${marcadorInicial}${marcadorAceptacion}`;
      const celdas = monedas.map((moneda) => {
        const destino = calcularTransicion(estado, moneda).nuevoEstado;
        const destinoAcepta = destino >= precio;
        return `<td class="${destinoAcepta ? "accept-cell" : ""}">${estadoId(destino)}<small>${formatoDinero(destino)}</small></td>`;
      }).join("");

      return `
        <tr class="${aceptado ? "accept-row" : ""}">
          <td class="state-marker">${marcador}</td>
          <th>${estadoId(estado)}<small>${formatoDinero(estado)}${esMeta ? " meta" : ""}</small></th>
          ${celdas}
        </tr>
      `;
    }).join("");

    tarjeta.innerHTML = `
      <header>
        <span>Tabla de aceptacion</span>
        <h3>Precio ${formatoDinero(precio)}</h3>
        <p>Productos: ${productosTexto}. Objetivo: llegar a ${estadoId(precio)}. Estados con &#9678; aceptan y habilitan esta salida.</p>
      </header>
      <div class="acceptance-table-wrap">
        <table class="discrete-table">
          <thead>
            <tr>
              <th class="marker-head"></th>
              <th>Estado</th>
              <th colspan="${monedas.length}">Entrada</th>
            </tr>
            <tr>
              <th class="marker-head"></th>
              <th></th>
              ${monedas.map((moneda) => `<th>${formatoMoneda(moneda)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    `;

    tablasAceptacion.appendChild(tarjeta);
  });
}

function calcularCaminoCorto(objetivo) {
  const inicio = 0;
  const cola = [inicio];
  const visitado = new Set([inicio]);
  const anterior = new Map();

  while (cola.length > 0) {
    const estado = cola.shift();
    if (estado >= objetivo) break;

    monedas.forEach((moneda) => {
      const siguiente = calcularTransicion(estado, moneda).nuevoEstado;
      if (!visitado.has(siguiente)) {
        visitado.add(siguiente);
        anterior.set(siguiente, { estado, moneda });
        cola.push(siguiente);
      }
    });
  }

  const destino = Array.from(visitado)
    .filter((estado) => estado >= objetivo)
    .sort((a, b) => a - b)[0];

  if (destino === undefined) return null;

  const estados = [destino];
  const monedasUsadas = [];
  let actual = destino;

  while (actual !== inicio) {
    const paso = anterior.get(actual);
    if (!paso) break;
    monedasUsadas.unshift(paso.moneda);
    estados.unshift(paso.estado);
    actual = paso.estado;
  }

  return { destino, estados, monedasUsadas };
}

function renderCaminosCortos() {
  const grupos = productosPorPrecio().map(([precio, grupo]) => ({
    nombre: `Precio ${formatoDinero(precio)}`,
    objetivo: precio,
    productos: grupo.map((producto) => producto.nombre).join(", ")
  }));

  tablaCaminosCortos.innerHTML = "";

  grupos.forEach((grupo) => {
    const camino = calcularCaminoCorto(grupo.objetivo);
    const tarjeta = document.createElement("article");
    tarjeta.className = "shortest-card";

    if (!camino) {
      tarjeta.innerHTML = `
        <span>${grupo.nombre}</span>
        <h3>Sin camino</h3>
        <p>No se puede llegar con las monedas actuales.</p>
      `;
      tablaCaminosCortos.appendChild(tarjeta);
      return;
    }

    const rutaEstados = camino.estados.map((estado) => estadoId(estado)).join(" -> ");
    const rutaMonedas = camino.monedasUsadas.map(formatoMoneda).join(" + ");

    tarjeta.innerHTML = `
      <span>${grupo.nombre}</span>
      <h3>Meta: ${estadoId(grupo.objetivo)}</h3>
      <p>${grupo.productos}</p>
      <strong>${rutaEstados}</strong>
      <small>Entradas: ${rutaMonedas} | ${camino.monedasUsadas.length} moneda(s)</small>
    `;
    tablaCaminosCortos.appendChild(tarjeta);
  });
}

function ajustarCanvasMini(canvas, contexto) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  contexto.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function dibujarNodoMini(contexto, x, y, estado, activo, aceptacion) {
  const radio = aceptacion ? 27 : 24;

  contexto.fillStyle = activo ? "#ffedd5" : aceptacion ? "#dcfce7" : "#ffffff";
  contexto.strokeStyle = activo ? "#f97316" : aceptacion ? "#16a34a" : "#0f766e";
  contexto.lineWidth = activo ? 4 : 2.5;
  contexto.beginPath();
  contexto.arc(x, y, radio, 0, Math.PI * 2);
  contexto.fill();
  contexto.stroke();

  if (aceptacion) {
    contexto.strokeStyle = "#16a34a";
    contexto.lineWidth = 1.8;
    contexto.beginPath();
    contexto.arc(x, y, radio - 7, 0, Math.PI * 2);
    contexto.stroke();
  }

  contexto.fillStyle = activo ? "#9a3412" : "#134e4a";
  contexto.font = "900 12px Segoe UI";
  contexto.textAlign = "center";
  contexto.textBaseline = "middle";
  contexto.fillText(estadoId(estado), x, y - 6);
  contexto.font = "800 9px Segoe UI";
  contexto.fillStyle = "#64748b";
  contexto.fillText(formatoDinero(estado), x, y + 9);
}

function dibujarMefInternoDinero(canvas, precio, grupo) {
  const contexto = canvas.getContext("2d");
  ajustarCanvasMini(canvas, contexto);
  const ancho = canvas.clientWidth;
  const alto = canvas.clientHeight;
  contexto.clearRect(0, 0, ancho, alto);

  const camino = calcularCaminoCorto(precio);
  contexto.fillStyle = "#0f172a";
  contexto.font = "900 14px Segoe UI";
  contexto.textAlign = "left";
  contexto.fillText(`Objetivo: ${estadoId(precio)} (${formatoDinero(precio)})`, 16, 24);
  contexto.fillStyle = "#64748b";
  contexto.font = "800 11px Segoe UI";
  contexto.fillText(grupo.map((producto) => producto.codigo).join(", "), 16, 42);

  if (!camino) {
    contexto.fillStyle = "#991b1b";
    contexto.font = "900 13px Segoe UI";
    contexto.fillText("No existe ruta con las monedas actuales.", 16, alto / 2);
    return;
  }

  const estadosRuta = camino.estados;
  const margen = 54;
  const y = alto * 0.58;
  const espacio = estadosRuta.length > 1 ? (ancho - margen * 2) / (estadosRuta.length - 1) : 0;
  const puntos = estadosRuta.map((estado, indice) => ({
    estado,
    x: margen + indice * espacio,
    y
  }));

  contexto.strokeStyle = "#0ea5e9";
  contexto.lineWidth = 3;
  contexto.lineCap = "round";
  contexto.beginPath();
  contexto.moveTo(puntos[0].x - 46, y);
  contexto.lineTo(puntos[0].x - 27, y);
  contexto.stroke();
  contexto.lineCap = "butt";
  dibujarPuntaFlecha(contexto, puntos[0].x - 22, y, 0, "#0ea5e9", 14);
  contexto.fillStyle = "#0f766e";
  contexto.font = "900 10px Segoe UI";
  contexto.fillText("inicio", puntos[0].x - 52, y + 18);

  for (let indice = 0; indice < puntos.length - 1; indice += 1) {
    const origen = puntos[indice];
    const destino = puntos[indice + 1];
    const moneda = camino.monedasUsadas[indice];
    const angulo = Math.atan2(destino.y - origen.y, destino.x - origen.x);
    const inicioX = origen.x + Math.cos(angulo) * 29;
    const finX = destino.x - Math.cos(angulo) * 32;
    const medioX = (inicioX + finX) / 2;
    const medioY = y - 26;

    contexto.strokeStyle = "#0f766e";
    contexto.lineWidth = 3;
    contexto.beginPath();
    contexto.moveTo(inicioX, y);
    contexto.quadraticCurveTo(medioX, medioY, finX, y);
    contexto.stroke();
    dibujarPuntaFlecha(contexto, finX, y, Math.atan2(y - medioY, finX - medioX), "#0f766e", 15);

    contexto.fillStyle = "rgba(255, 255, 255, 0.96)";
    contexto.strokeStyle = "#0f766e";
    contexto.lineWidth = 1.2;
    const etiqueta = formatoMoneda(moneda);
    const anchoTexto = contexto.measureText(etiqueta).width + 14;
    contexto.beginPath();
    contexto.roundRect(medioX - anchoTexto / 2, medioY - 15, anchoTexto, 22, 8);
    contexto.fill();
    contexto.stroke();
    contexto.fillStyle = "#334155";
    contexto.font = "900 11px Segoe UI";
    contexto.textAlign = "center";
    contexto.fillText(etiqueta, medioX, medioY);
  }

  puntos.forEach((punto, indice) => {
    const aceptacion = indice === puntos.length - 1;
    const activo = saldo >= punto.estado && punto.estado > 0;
    dibujarNodoMini(contexto, punto.x, punto.y, punto.estado, activo, aceptacion);
  });

  contexto.textAlign = "left";
  contexto.fillStyle = "#475569";
  contexto.font = "800 11px Segoe UI";
  contexto.fillText("Doble circulo = aceptacion de esta MEF interna.", 16, alto - 18);
}

function renderMefsInternosDinero() {
  if (!mefsInternosDinero) return;

  mefsInternosDinero.innerHTML = "";

  productosPorPrecio().forEach(([precio, grupo], indice) => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "money-submef-card";
    tarjeta.innerHTML = `
      <header>
        <span>Sub-MEF ${indice + 1}</span>
        <h3>${formatoDinero(precio)}</h3>
        <p>${grupo.map((producto) => `${producto.codigo} ${producto.nombre}`).join(", ")}</p>
      </header>
      <canvas></canvas>
    `;
    mefsInternosDinero.appendChild(tarjeta);
    dibujarMefInternoDinero(tarjeta.querySelector("canvas"), precio, grupo);
  });
}

function ajustarCanvas() {
  const rect = diagramaEstados.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  diagramaEstados.width = Math.max(1, Math.floor(rect.width * ratio));
  diagramaEstados.height = Math.max(1, Math.floor(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function ajustarCanvasGenerico(canvas, contexto) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  contexto.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function dibujarFlechaContexto(contexto, origen, destino, etiqueta, color, curvatura = 0) {
  const dx = destino.x - origen.x;
  const dy = destino.y - origen.y;
  const distancia = Math.hypot(dx, dy) || 1;
  const nx = dx / distancia;
  const ny = dy / distancia;
  const origenBorde = distanciaBordeEstado(origen, nx, ny);
  const destinoBorde = distanciaBordeEstado(destino, nx, ny);
  const inicioX = origen.x + nx * (origenBorde + 5);
  const inicioY = origen.y + ny * (origenBorde + 5);
  const finX = destino.x - nx * (destinoBorde + 6);
  const finY = destino.y - ny * (destinoBorde + 6);
  let controlX = (inicioX + finX) / 2 - ny * curvatura;
  let controlY = (inicioY + finY) / 2 + nx * curvatura;

  if (origen.exterior && destino.exterior) {
    const centroX = contexto.canvas.clientWidth * 0.5;
    const centroY = contexto.canvas.clientHeight * 0.56;
    const medioX = (inicioX + finX) / 2;
    const medioY = (inicioY + finY) / 2;
    const vx = medioX - centroX;
    const vy = medioY - centroY;
    const magnitud = Math.hypot(vx, vy) || 1;
    controlX = medioX + (vx / magnitud) * Math.abs(curvatura);
    controlY = medioY + (vy / magnitud) * Math.abs(curvatura);
  }

  contexto.strokeStyle = color;
  contexto.lineWidth = 4.2;
  contexto.lineCap = "round";
  contexto.beginPath();
  contexto.moveTo(inicioX, inicioY);
  contexto.quadraticCurveTo(controlX, controlY, finX, finY);
  contexto.stroke();
  contexto.lineCap = "butt";

  dibujarPuntaFlecha(contexto, finX, finY, Math.atan2(finY - controlY, finX - controlX), color, 21);

  contexto.font = "900 13px Segoe UI";
  const ancho = contexto.measureText(etiqueta).width + 18;
  const textoX = controlX - ancho / 2 + 6;
  const textoY = controlY - 10;
  contexto.fillStyle = "rgba(255, 255, 255, 0.96)";
  contexto.beginPath();
  contexto.roundRect(textoX - 9, textoY - 18, ancho, 26, 9);
  contexto.fill();
  contexto.strokeStyle = color;
  contexto.lineWidth = 1.5;
  contexto.stroke();
  contexto.fillStyle = "#334155";
  contexto.fillText(etiqueta, textoX, textoY);
}

function distanciaBordeEstado(estado, nx, ny) {
  if (!estado.w || !estado.h) return estado.r || 44;

  const mitadAncho = estado.w / 2;
  const mitadAlto = estado.h / 2;
  const distanciaX = Math.abs(nx) < 0.001 ? Infinity : mitadAncho / Math.abs(nx);
  const distanciaY = Math.abs(ny) < 0.001 ? Infinity : mitadAlto / Math.abs(ny);
  return Math.min(distanciaX, distanciaY);
}

function dibujarPuntaFlecha(contexto, x, y, angulo, color, tamano = 18) {
  contexto.save();
  contexto.fillStyle = color;
  contexto.strokeStyle = "#ffffff";
  contexto.lineWidth = 1.4;
  contexto.beginPath();
  contexto.moveTo(x, y);
  contexto.lineTo(x - tamano * Math.cos(angulo - Math.PI / 6), y - tamano * Math.sin(angulo - Math.PI / 6));
  contexto.lineTo(x - tamano * 0.45 * Math.cos(angulo), y - tamano * 0.45 * Math.sin(angulo));
  contexto.lineTo(x - tamano * Math.cos(angulo + Math.PI / 6), y - tamano * Math.sin(angulo + Math.PI / 6));
  contexto.closePath();
  contexto.fill();
  contexto.stroke();
  contexto.restore();
}

function dibujarEstadoMaquina(contexto, estado, activo = false, compuesto = false, aceptacion = false) {
  const radio = estado.r || 54;
  contexto.fillStyle = activo ? "#fef3c7" : compuesto ? "#dbeafe" : aceptacion ? "#dcfce7" : "#ffffff";
  contexto.strokeStyle = activo ? "#f97316" : compuesto ? "#2563eb" : aceptacion ? "#16a34a" : "#0f766e";
  contexto.lineWidth = activo ? 4 : 2.8;
  contexto.beginPath();
  contexto.arc(estado.x, estado.y, radio, 0, Math.PI * 2);
  contexto.fill();
  contexto.stroke();

  if (aceptacion) {
    contexto.strokeStyle = "#16a34a";
    contexto.lineWidth = 2;
    contexto.beginPath();
    contexto.arc(estado.x, estado.y, radio - 8, 0, Math.PI * 2);
    contexto.stroke();
  }

  if (compuesto) {
    contexto.setLineDash([4, 5]);
    contexto.strokeStyle = "rgba(37, 99, 235, 0.55)";
    contexto.lineWidth = 1.5;
    contexto.beginPath();
    contexto.arc(estado.x, estado.y, radio + 9, 0, Math.PI * 2);
    contexto.stroke();
    contexto.setLineDash([]);
  }

  contexto.fillStyle = activo ? "#9a3412" : compuesto ? "#1d4ed8" : "#134e4a";
  contexto.font = "950 15px Segoe UI";
  contexto.textAlign = "center";
  contexto.textBaseline = "middle";
  contexto.fillText(estado.id, estado.x, estado.y - 19);

  contexto.font = "900 11px Segoe UI";
  estado.lineas.forEach((linea, indice) => {
    contexto.fillText(linea, estado.x, estado.y + indice * 14);
  });
}

function renderDiagramaMaquina() {
  ajustarCanvasGenerico(diagramaMaquina, ctxMaquina);
  const ancho = diagramaMaquina.clientWidth;
  const alto = diagramaMaquina.clientHeight;
  ctxMaquina.clearRect(0, 0, ancho, alto);

  const estadoMaquina = estadoRecojo === "aceptado"
    ? "reinicio"
    : estadoRecojo === "esperando"
      ? "recojo"
      : saldo > 0
        ? "dinero"
        : "espera";

  const centroX = ancho * 0.5;
  const centroY = alto * 0.54;
  const margenX = Math.max(92, ancho * 0.13);
  const arriba = Math.max(120, alto * 0.23);
  const medio = alto * 0.52;
  const abajo = Math.min(alto - 118, alto * 0.78);

  const estados = {
    espera: { id: "qM0", x: margenX, y: medio, r: 58, lineas: ["Esperando", "dinero"], exterior: true },
    dinero: { id: "qM1", x: centroX, y: arriba, r: 66, lineas: ["Control dinero", "MEF 2"], exterior: true },
    producto: { id: "qM2", x: ancho - margenX, y: medio, r: 58, lineas: ["Producto", "habilitado"], exterior: true },
    vuelto: { id: "qM3", x: ancho - margenX * 1.45, y: abajo, r: 58, lineas: ["Entregar", "y vuelto"], exterior: true },
    recojo: { id: "qM4", x: centroX, y: abajo, r: 62, lineas: ["Control recojo", "MEF 3"], exterior: true },
    reinicio: { id: "qM5", x: margenX * 1.45, y: abajo, r: 58, lineas: ["Reinicio", "maquina"], exterior: true }
  };

  ctxMaquina.fillStyle = "#0f172a";
  ctxMaquina.font = "900 16px Segoe UI";
  ctxMaquina.textAlign = "left";
  ctxMaquina.fillText("MEF 1 principal: control externo de la maquina", 18, 30);

  ctxMaquina.fillStyle = "#475569";
  ctxMaquina.font = "800 12px Segoe UI";
  ctxMaquina.fillText("Qm = {qM0, qM1, qM2, qM3, qM4, qM5}    qM1 contiene MEF 2 y qM4 contiene MEF 3", 18, 52);

  ctxMaquina.strokeStyle = "#0ea5e9";
  ctxMaquina.lineWidth = 3.4;
  ctxMaquina.lineCap = "round";
  ctxMaquina.beginPath();
  ctxMaquina.moveTo(estados.espera.x - 116, estados.espera.y);
  ctxMaquina.lineTo(estados.espera.x - estados.espera.r - 10, estados.espera.y);
  ctxMaquina.stroke();
  ctxMaquina.lineCap = "butt";
  dibujarPuntaFlecha(ctxMaquina, estados.espera.x - estados.espera.r - 2, estados.espera.y, 0, "#0ea5e9", 21);
  ctxMaquina.font = "900 12px Segoe UI";
  ctxMaquina.fillStyle = "#0f766e";
  ctxMaquina.fillText("inicio", estados.espera.x - 158, estados.espera.y + 4);

  dibujarFlechaContexto(ctxMaquina, estados.espera, estados.dinero, "insertar moneda", "#2563eb", 64);
  dibujarFlechaContexto(ctxMaquina, estados.dinero, estados.producto, "saldo suficiente", "#16a34a", 64);
  dibujarFlechaContexto(ctxMaquina, estados.producto, estados.vuelto, "seleccionar producto", "#f97316", 58);
  dibujarFlechaContexto(ctxMaquina, estados.vuelto, estados.recojo, "producto en bandeja", "#0f766e", 36);
  dibujarFlechaContexto(ctxMaquina, estados.recojo, estados.reinicio, "recoger producto", "#16a34a", 36);
  dibujarFlechaContexto(ctxMaquina, estados.reinicio, estados.espera, "volver a qM0", "#64748b", 70);

  dibujarEstadoMaquina(ctxMaquina, estados.espera, estadoMaquina === "espera");
  dibujarEstadoMaquina(ctxMaquina, estados.dinero, estadoMaquina === "dinero", true);
  dibujarEstadoMaquina(ctxMaquina, estados.producto, productosHabilitadosLista(estadoDesdeSaldo(saldo)).length > 0);
  dibujarEstadoMaquina(ctxMaquina, estados.vuelto);
  dibujarEstadoMaquina(ctxMaquina, estados.recojo, estadoMaquina === "recojo", true);
  dibujarEstadoMaquina(ctxMaquina, estados.reinicio, estadoMaquina === "reinicio", false, true);

  ctxMaquina.fillStyle = "#475569";
  ctxMaquina.font = "800 12px Segoe UI";
  ctxMaquina.fillText("Doble circulo = reinicio automatico despues de recoger el producto.", 18, alto - 24);

  ctxMaquina.textAlign = "left";
  ctxMaquina.textBaseline = "alphabetic";
}

function renderDiagramaRecojo() {
  ajustarCanvasGenerico(diagramaRecojo, ctxRecojo);
  const ancho = diagramaRecojo.clientWidth;
  const alto = diagramaRecojo.clientHeight;
  ctxRecojo.clearRect(0, 0, ancho, alto);

  const estadoActivo = estadoRecojo === "aceptado"
    ? "aceptado"
    : estadoRecojo === "esperando"
      ? "esperando"
      : "reposo";
  const y = alto * 0.54;
  const margen = Math.max(110, ancho * 0.16);
  const estados = {
    reposo: { id: "qR0", x: margen, y, r: 58, lineas: ["Sin producto", "pendiente"], exterior: true },
    esperando: { id: "qR1", x: ancho * 0.5, y, r: 64, lineas: ["Esperando", "recojo"], exterior: true },
    aceptado: { id: "qR2", x: ancho - margen, y, r: 58, lineas: ["Producto", "recogido"], exterior: true }
  };

  ctxRecojo.fillStyle = "#0f172a";
  ctxRecojo.font = "900 18px Segoe UI";
  ctxRecojo.textAlign = "left";
  ctxRecojo.fillText("MEF 3: retiro del producto", 22, 34);
  ctxRecojo.fillStyle = "#475569";
  ctxRecojo.font = "800 12px Segoe UI";
  ctxRecojo.fillText("Qr = {qR0, qR1, qR2}. qR2 es aceptacion: el usuario recogio el producto.", 22, 56);

  ctxRecojo.fillStyle = "rgba(248, 250, 252, 0.92)";
  ctxRecojo.strokeStyle = "#dbe3ee";
  ctxRecojo.lineWidth = 1.5;
  ctxRecojo.beginPath();
  ctxRecojo.roundRect(22, 92, ancho - 44, alto - 132, 12);
  ctxRecojo.fill();
  ctxRecojo.stroke();

  ctxRecojo.strokeStyle = "#0ea5e9";
  ctxRecojo.lineWidth = 3.4;
  ctxRecojo.lineCap = "round";
  ctxRecojo.beginPath();
  ctxRecojo.moveTo(estados.reposo.x - 96, estados.reposo.y);
  ctxRecojo.lineTo(estados.reposo.x - estados.reposo.r - 10, estados.reposo.y);
  ctxRecojo.stroke();
  ctxRecojo.lineCap = "butt";
  dibujarPuntaFlecha(ctxRecojo, estados.reposo.x - estados.reposo.r - 2, estados.reposo.y, 0, "#0ea5e9", 21);
  ctxRecojo.font = "900 12px Segoe UI";
  ctxRecojo.fillStyle = "#0f766e";
  ctxRecojo.fillText("inicio", estados.reposo.x - 134, estados.reposo.y + 4);

  dibujarFlechaContexto(ctxRecojo, estados.reposo, estados.esperando, "producto cae", "#f97316", 42);
  dibujarFlechaContexto(ctxRecojo, estados.esperando, estados.aceptado, "usuario recoge", "#16a34a", 42);
  dibujarFlechaContexto(ctxRecojo, estados.aceptado, estados.reposo, "reiniciar a q0", "#64748b", 90);

  dibujarEstadoMaquina(ctxRecojo, estados.reposo, estadoActivo === "reposo");
  dibujarEstadoMaquina(ctxRecojo, estados.esperando, estadoActivo === "esperando");
  dibujarEstadoMaquina(ctxRecojo, estados.aceptado, estadoActivo === "aceptado", false, true);

  ctxRecojo.fillStyle = "#475569";
  ctxRecojo.font = "800 13px Segoe UI";
  ctxRecojo.textAlign = "left";
  ctxRecojo.fillText("La compra no finaliza hasta que se presiona 'Recoger producto'.", 40, alto - 48);
  ctxRecojo.textBaseline = "alphabetic";
}

function obtenerPuntosEstados() {
  const ancho = diagramaEstados.clientWidth;
  const alto = diagramaEstados.clientHeight;
  const total = maxPrecio() + 1;
  const centroX = ancho * 0.5;
  const centroY = alto * 0.55;
  const radio = Math.min(ancho * 0.34, alto * 0.34);

  return Array.from({ length: total }, (_, indice) => {
    const angulo = -Math.PI / 2 + (Math.PI * 2 * indice) / total;

    return {
      id: indice,
      x: centroX + Math.cos(angulo) * radio,
      y: centroY + Math.sin(angulo) * radio,
      angulo
    };
  });
}

function dibujarFlecha(origen, destino, etiqueta, color, curvatura = 0, etiquetaAbajo = false, exterior = false) {
  const dx = destino.x - origen.x;
  const dy = destino.y - origen.y;
  const distancia = Math.hypot(dx, dy) || 1;
  const nx = dx / distancia;
  const ny = dy / distancia;
  const radioNodo = 24;
  const inicioX = origen.x + nx * radioNodo;
  const inicioY = origen.y + ny * radioNodo;
  const finX = destino.x - nx * (radioNodo + 8);
  const finY = destino.y - ny * (radioNodo + 8);
  let controlX = (inicioX + finX) / 2 - ny * curvatura;
  let controlY = (inicioY + finY) / 2 + nx * curvatura;

  if (exterior) {
    const centroX = diagramaEstados.clientWidth * 0.5;
    const centroY = diagramaEstados.clientHeight * 0.55;
    const medioX = (inicioX + finX) / 2;
    const medioY = (inicioY + finY) / 2;
    const vx = medioX - centroX;
    const vy = medioY - centroY;
    const magnitud = Math.hypot(vx, vy) || 1;
    controlX = medioX + (vx / magnitud) * Math.abs(curvatura);
    controlY = medioY + (vy / magnitud) * Math.abs(curvatura);
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = grupoActivaColor(color) ? 4.5 : 3.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(inicioX, inicioY);
  ctx.quadraticCurveTo(controlX, controlY, finX, finY);
  ctx.stroke();
  ctx.lineCap = "butt";

  dibujarPuntaFlecha(ctx, finX, finY, Math.atan2(finY - controlY, finX - controlX), color, 20);

  ctx.font = "900 13px Segoe UI";
  const textoX = controlX - ctx.measureText(etiqueta).width / 2;
  const textoY = controlY + (etiquetaAbajo ? 20 : -8);
  const anchoTexto = ctx.measureText(etiqueta).width + 18;
  ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
  ctx.beginPath();
  ctx.roundRect(textoX - 9, textoY - 18, anchoTexto, 26, 9);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#334155";
  ctx.fillText(etiqueta, textoX, textoY);
}

function grupoActivaColor(color) {
  return color === "#f97316";
}

function dibujarBucle(punto, etiqueta, color, indice) {
  const desplazamiento = punto.x < diagramaEstados.clientWidth / 2 ? -56 : 56;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.ellipse(punto.x + desplazamiento, punto.y - 38, 34, 24, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(punto.x + desplazamiento + 22, punto.y - 24);
  ctx.lineTo(punto.x + desplazamiento + 9, punto.y - 23);
  ctx.lineTo(punto.x + desplazamiento + 17, punto.y - 34);
  ctx.closePath();
  ctx.fill();

  ctx.font = "700 12px Segoe UI";
  ctx.fillStyle = "#334155";
  ctx.fillText(etiqueta, punto.x + desplazamiento - 24, punto.y - 70);
}

function obtenerTransicionesAgrupadas() {
  const grupos = new Map();

  for (let estado = 0; estado <= maxPrecio(); estado += 1) {
    monedas.forEach((moneda) => {
      const destino = calcularTransicion(estado, moneda).nuevoEstado;
      const clave = `${estado}-${destino}`;

      if (!grupos.has(clave)) {
        grupos.set(clave, {
          origen: estado,
          destino,
          monedas: [],
          activa: false
        });
      }

      const grupo = grupos.get(clave);
      grupo.monedas.push(moneda);

      if (
        transicionActiva
        && transicionActiva.estado === estado
        && transicionActiva.moneda === moneda
      ) {
        grupo.activa = true;
      }
    });
  }

  return Array.from(grupos.values());
}

function dibujarArcoCircular(grupo, puntos, color, indice) {
  const origen = puntos[grupo.origen];
  const destino = puntos[grupo.destino];

  if (grupo.origen === grupo.destino) {
    dibujarBucle(origen, grupo.monedas.map((moneda) => `S/${moneda}`).join(", "), color, indice);
    return;
  }

  const centroX = diagramaEstados.clientWidth * 0.5;
  const centroY = diagramaEstados.clientHeight * 0.55;
  const baseRadio = Math.hypot(origen.x - centroX, origen.y - centroY);
  const monedaMayor = Math.max(...grupo.monedas);
  const carrilMoneda = monedaMayor === 1 ? 34 : monedaMayor === 2 ? 74 : 122;
  const carrilOrigen = (grupo.origen % 3) * 9;
  const radioArco = baseRadio + carrilMoneda + carrilOrigen;
  const anguloInicio = origen.angulo;
  let anguloFin = destino.angulo;

  while (anguloFin <= anguloInicio) {
    anguloFin += Math.PI * 2;
  }

  const margen = 0.12;
  const inicio = anguloInicio + margen;
  const fin = anguloFin - margen;

  ctx.strokeStyle = color;
  ctx.lineWidth = grupo.activa ? 4.8 : 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(centroX, centroY, radioArco, inicio, fin);
  ctx.stroke();
  ctx.lineCap = "butt";

  const puntaX = centroX + Math.cos(fin) * radioArco;
  const puntaY = centroY + Math.sin(fin) * radioArco;
  dibujarPuntaFlecha(ctx, puntaX, puntaY, fin + Math.PI / 2, color, grupo.activa ? 22 : 19);

  const medio = (inicio + fin) / 2;
  const etiqueta = grupo.monedas.map((moneda) => `S/${moneda}`).join(", ");
  const etiquetaRadio = radioArco + 18;
  const textoX = centroX + Math.cos(medio) * etiquetaRadio;
  const textoY = centroY + Math.sin(medio) * etiquetaRadio;
  const anchoTexto = ctx.measureText(etiqueta).width + 18;

  ctx.font = "900 13px Segoe UI";
  ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
  ctx.beginPath();
  ctx.roundRect(textoX - anchoTexto / 2, textoY - 15, anchoTexto, 26, 9);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#334155";
  ctx.fillText(etiqueta, textoX - ctx.measureText(etiqueta).width / 2, textoY + 3);
}

function dibujarNodoDinero(x, y, estado, activo = false) {
  const productosDelEstado = productosHabilitadosLista(estado);
  const suficiente = productosDelEstado.length > 0;
  const radio = suficiente ? 27 : 24;

  if (suficiente) {
    ctx.fillStyle = "#ecfdf5";
    ctx.strokeStyle = "#16a34a";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(x, y, radio + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = activo ? "#fef3c7" : suficiente ? "#dcfce7" : "#ffffff";
  ctx.strokeStyle = activo ? "#f97316" : suficiente ? "#16a34a" : "#0f766e";
  ctx.lineWidth = activo ? 4 : 2.5;
  ctx.beginPath();
  ctx.arc(x, y, radio, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = activo ? "#9a3412" : "#134e4a";
  ctx.font = "900 14px Segoe UI";
  ctx.fillText(`q${estado}`, x, y - 7);
  ctx.font = "800 10px Segoe UI";
  ctx.fillStyle = "#64748b";
  ctx.fillText(`S/${estado}`, x, y + 9);
}

function dibujarLineaDirigida(x1, y1, x2, y2, etiqueta, color, activa = false, curva = 0, etiquetaOffset = 0) {
  const angulo = Math.atan2(y2 - y1, x2 - x1);
  const inicioX = x1 + Math.cos(angulo) * 31;
  const inicioY = y1 + Math.sin(angulo) * 31;
  const finX = x2 - Math.cos(angulo) * 34;
  const finY = y2 - Math.sin(angulo) * 34;
  const medioX = (inicioX + finX) / 2;
  const medioY = (inicioY + finY) / 2;
  const normalX = -Math.sin(angulo);
  const normalY = Math.cos(angulo);
  const controlX = medioX + normalX * curva;
  const controlY = medioY + normalY * curva;
  const etiquetaX = controlX + normalX * etiquetaOffset;
  const etiquetaY = controlY + normalY * etiquetaOffset;

  ctx.strokeStyle = color;
  ctx.lineWidth = activa ? 4.8 : 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(inicioX, inicioY);
  ctx.quadraticCurveTo(controlX, controlY, finX, finY);
  ctx.stroke();
  ctx.lineCap = "butt";
  dibujarPuntaFlecha(ctx, finX, finY, Math.atan2(finY - controlY, finX - controlX), color, activa ? 22 : 19);

  if (!etiqueta) return;

  ctx.font = "900 12px Segoe UI";
  const anchoTexto = ctx.measureText(etiqueta).width + 16;
  ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
  ctx.beginPath();
  ctx.roundRect(etiquetaX - anchoTexto / 2, etiquetaY - 24, anchoTexto, 24, 8);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#334155";
  ctx.fillText(etiqueta, etiquetaX - ctx.measureText(etiqueta).width / 2, etiquetaY - 7);
}

function dibujarBucleNodo(x, y, etiqueta, color, activa = false) {
  ctx.strokeStyle = color;
  ctx.lineWidth = activa ? 4.8 : 3.2;
  ctx.beginPath();
  ctx.ellipse(x + 48, y - 28, 32, 22, 0, 0, Math.PI * 2);
  ctx.stroke();
  dibujarPuntaFlecha(ctx, x + 73, y - 15, Math.PI * 0.2, color, activa ? 22 : 19);

  if (!etiqueta) return;

  ctx.font = "900 12px Segoe UI";
  ctx.fillStyle = "#334155";
  ctx.fillText(etiqueta, x + 24, y - 58);
}

function dibujarPanelMoneda(titulo, moneda, x, y, ancho, alto) {
  ctx.fillStyle = "rgba(248, 250, 252, 0.9)";
  ctx.strokeStyle = "#dbe3ee";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, ancho, alto, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = moneda === 1 ? "#2563eb" : moneda === 2 ? "#7c3aed" : "#0f766e";
  ctx.font = "900 15px Segoe UI";
  ctx.textAlign = "left";
  ctx.fillText(titulo, x + 16, y + 28);

  const estados = Array.from({ length: maxPrecio() + 1 }, (_, estado) => estado);
  const puntos = new Map();
  const estadoActualDiagrama = estadoDesdeSaldo(saldo);

  if (moneda === 5) {
    const destinoX = x + ancho - 82;
    const destinoY = y + alto / 2;
    puntos.set(6, { x: destinoX, y: destinoY });

    estados.slice(0, 6).forEach((estado, indice) => {
      const px = x + 84;
      const py = y + 66 + indice * ((alto - 120) / 5);
      puntos.set(estado, { x: px, y: py });
    });
  } else {
    estados.forEach((estado, indice) => {
      const px = x + 64 + indice * ((ancho - 128) / 6);
      const py = y + alto * 0.58;
      puntos.set(estado, { x: px, y: py });
    });
  }

  estados.forEach((estado) => {
    const destino = calcularTransicion(estado, moneda).nuevoEstado;
    const origenPunto = puntos.get(estado);
    const destinoPunto = puntos.get(destino);
    const activa = transicionActiva
      && transicionActiva.estado === estado
      && transicionActiva.moneda === moneda;
    const destinoAcepta = productosHabilitadosLista(destino).length > 0;
    const color = activa ? "#f97316" : destinoAcepta ? "#16a34a" : moneda === 1 ? "#2563eb" : moneda === 2 ? "#7c3aed" : "#0f766e";

    if (estado === destino) {
      dibujarBucleNodo(origenPunto.x, origenPunto.y, `S/${moneda}`, color, activa);
    } else {
      dibujarLineaDirigida(origenPunto.x, origenPunto.y, destinoPunto.x, destinoPunto.y, `S/${moneda}`, color, activa);
    }
  });

  estados.forEach((estado) => {
    const punto = puntos.get(estado);
    dibujarNodoDinero(punto.x, punto.y, estado, estado === estadoActualDiagrama);
  });
}

function estadoControlDinero(valor) {
  if (valor <= 0) return "sin";
  if (valor <= 2) return "insuficiente";
  if (valor <= 4) return "mini";
  if (valor === 5) return "bebida";
  return "completo";
}

function dibujarEstadoNivel(estado, activo = false) {
  const { x, y, w, h, titulo, subtitulo, color } = estado;
  ctx.fillStyle = activo ? "#fef3c7" : "#ffffff";
  ctx.strokeStyle = activo ? "#f97316" : color;
  ctx.lineWidth = activo ? 4 : 2.6;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = "900 14px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(titulo, x, y - 10);
  ctx.fillStyle = "#64748b";
  ctx.font = "800 11px Segoe UI";
  ctx.fillText(subtitulo, x, y + 12);
}

function renderDiagrama() {
  ajustarCanvas();
  const ancho = diagramaEstados.clientWidth;
  const alto = diagramaEstados.clientHeight;
  ctx.clearRect(0, 0, ancho, alto);

  const estadoActualDiagrama = estadoDesdeSaldo(saldo);
  const precios = productosPorPrecio().map(([precio]) => precio);
  const estadosClave = [...new Set([0, ...precios, maxPrecio()])].sort((a, b) => a - b);
  const margenX = Math.max(72, ancho * 0.08);
  const baseY = alto * 0.55;
  const espacioX = estadosClave.length > 1 ? (ancho - margenX * 2) / (estadosClave.length - 1) : 0;
  const puntos = estadosClave.map((estado, indice) => ({
    id: estado,
    x: margenX + indice * espacioX,
    y: baseY + (indice % 2 === 0 ? -28 : 34)
  }));

  ctx.fillStyle = "#0f172a";
  ctx.font = "900 18px Segoe UI";
  ctx.textAlign = "left";
  ctx.fillText("MEF 2: Control de dinero ingresado", 22, 34);
  ctx.fillStyle = "#475569";
  ctx.font = "800 12px Segoe UI";
  ctx.fillText("El grafo resume estados clave. La tabla inferior muestra todas las transiciones en centimos.", 22, 56);

  ctx.fillStyle = "rgba(248, 250, 252, 0.92)";
  ctx.strokeStyle = "#dbe3ee";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(22, 92, ancho - 44, alto - 132, 12);
  ctx.fill();
  ctx.stroke();

  const leyendaMonedas = monedas.map((moneda) => ({
    texto: `Moneda ${formatoMoneda(moneda)}`,
    color: estiloMoneda(moneda).color
  }));
  leyendaMonedas.push({ texto: "Naranja = transicion actual", color: "#f97316" });
  leyendaMonedas.forEach((item, indice) => {
    const columna = indice % 3;
    const fila = Math.floor(indice / 3);
    const xBase = 42 + columna * 190;
    const y = 120 + fila * 22;
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(xBase, y);
    ctx.lineTo(xBase + 30, y);
    ctx.stroke();
    dibujarPuntaFlecha(ctx, xBase + 34, y, 0, item.color, 11);
    ctx.fillStyle = "#334155";
    ctx.font = "800 12px Segoe UI";
    ctx.fillText(item.texto, xBase + 48, y + 4);
  });

  const leyendaEstados = [
    { texto: "Precio bloqueado", color: "#16a34a" },
    { texto: "Precio desbloqueado", color: "#f97316" }
  ];
  const estadoLeyendaX = Math.max(42, ancho - 330);
  const estadoLeyendaY = 182;
  ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
  ctx.strokeStyle = "#dbe3ee";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(estadoLeyendaX - 14, estadoLeyendaY - 22, 300, 58, 10);
  ctx.fill();
  ctx.stroke();
  leyendaEstados.forEach((item, indice) => {
    const xBase = estadoLeyendaX;
    const y = estadoLeyendaY + indice * 22;
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(xBase, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#334155";
    ctx.font = "800 12px Segoe UI";
    ctx.fillText(item.texto, xBase + 16, y + 4);
  });

  ctx.strokeStyle = "rgba(15, 118, 110, 0.16)";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  puntos.forEach((punto, indice) => {
    if (indice === 0) ctx.moveTo(punto.x, punto.y);
    else ctx.lineTo(punto.x, punto.y);
  });
  ctx.stroke();
  ctx.lineCap = "butt";

  for (let indice = 0; indice < puntos.length - 1; indice += 1) {
    const origen = puntos[indice];
    const destino = puntos[indice + 1];
    const diferencia = destino.id - origen.id;
    const activa = transicionActiva
      && transicionActiva.estado <= origen.id
      && transicionActiva.estado + transicionActiva.moneda >= destino.id;
    const destinoDesbloqueado = destino.id > 0 && saldo >= destino.id;
    const colorTransicion = (activa || destinoDesbloqueado) ? "#f97316" : "#0f766e";
    dibujarLineaDirigida(
      origen.x,
      origen.y,
      destino.x,
      destino.y,
      `+${formatoDinero(diferencia)}`,
      colorTransicion,
      activa || destinoDesbloqueado,
      indice % 2 === 0 ? -26 : 26,
      0
    );
  }

  ctx.strokeStyle = "#0ea5e9";
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(puntos[0].x - 78, puntos[0].y);
  ctx.lineTo(puntos[0].x - 38, puntos[0].y);
  ctx.stroke();
  ctx.lineCap = "butt";
  dibujarPuntaFlecha(ctx, puntos[0].x - 32, puntos[0].y, 0, "#0ea5e9", 21);
  ctx.font = "900 12px Segoe UI";
  ctx.fillStyle = "#0f766e";
  ctx.fillText("inicio", puntos[0].x - 118, puntos[0].y + 4);

  puntos.forEach((punto) => {
    const activo = punto.id === estadoActualDiagrama;
    const productosDelEstado = productos.filter((producto) => producto.precio === punto.id);
    const aceptacion = productosDelEstado.length > 0;
    const desbloqueado = aceptacion && saldo >= punto.id;
    const colorEstado = desbloqueado ? "#f97316" : "#16a34a";
    const fondoEstado = desbloqueado ? "#ffedd5" : "#dcfce7";
    const aroEstado = desbloqueado ? "#fed7aa" : "#ecfdf5";
    const radio = aceptacion ? 31 : 27;

    if (aceptacion) {
      ctx.fillStyle = aroEstado;
      ctx.strokeStyle = colorEstado;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(punto.x, punto.y, radio + 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = aceptacion ? fondoEstado : activo ? "#fef3c7" : "#ffffff";
    ctx.strokeStyle = aceptacion ? colorEstado : activo ? "#f97316" : "#0f766e";
    ctx.lineWidth = activo ? 4 : 2.6;
    ctx.beginPath();
    ctx.arc(punto.x, punto.y, radio, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = activo ? "#9a3412" : "#134e4a";
    ctx.font = "900 13px Segoe UI";
    ctx.fillText(estadoId(punto.id), punto.x, punto.y - 8);
    ctx.font = "800 10px Segoe UI";
    ctx.fillStyle = "#64748b";
    ctx.fillText(formatoDinero(punto.id), punto.x, punto.y + 8);

    if (aceptacion) {
      ctx.font = "900 9px Segoe UI";
      ctx.fillStyle = desbloqueado ? "#9a3412" : "#15803d";
      const codigos = productosDelEstado.map((producto) => producto.codigo).join(",");
      ctx.fillText(codigos, punto.x, punto.y + 23);
    }
  });

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#475569";
  ctx.font = "800 13px Segoe UI";
  ctx.fillText("Verde = precio aun bloqueado. Naranja = productos desbloqueados por el saldo actual.", 40, alto - 48);
}

function actualizarPantalla({ moneda = "-", producto = null, vuelto = 0, mensaje = "" } = {}) {
  const estadoVisible = estadoDesdeSaldo(saldo);
  saldoPantalla.textContent = (saldo / 100).toFixed(2);
  estadoActual.textContent = `Estado ${estadoId(estadoVisible)} | Saldo real ${formatoDinero(saldo)}`;
  const etiquetaActual = productoVisual.querySelector("span");
  if (etiquetaActual && !producto) {
    etiquetaActual.textContent = "Elige un producto";
  }
  ultimaEntrada.textContent = moneda === "-" ? "-" : formatoMoneda(moneda);
  salidaProducto.textContent = producto ? producto.nombre : "No";
  salidaVuelto.textContent = formatoDinero(vuelto);
  mensajePantalla.textContent = mensaje || "Inserta dinero para desbloquear productos.";
  renderProductos();
}

function insertarMoneda(moneda) {
  if (estadoRecojo === "esperando") {
    mostrarToast("Primero recoge el producto de la bandeja.");
    return;
  }

  const estadoAnterior = estadoDesdeSaldo(saldo);
  saldo += moneda;
  transicionActiva = { estado: estadoAnterior, moneda };
  productoEntregado = null;
  limpiarSalidaVisual();

  const disponibles = productos.filter((producto) => saldo >= producto.precio);
  const mensaje = disponibles.length
    ? `Saldo ${formatoDinero(saldo)}. Ya puedes elegir: ${disponibles.map((producto) => producto.nombre).join(", ")}.`
    : `Se recibio ${formatoMoneda(moneda)}. Aun falta dinero para desbloquear productos.`;

  actualizarPantalla({ moneda, mensaje });
  animarInsercionMoneda(moneda);
  renderDiagramaMaquina();
  renderDiagrama();
  renderMefsInternosDinero();
}

function comprarProducto(producto) {
  if (saldo < producto.precio) {
    mostrarToast(`Aun faltan ${formatoDinero(producto.precio - saldo)} para comprar ${producto.nombre}.`);
    return;
  }

  const vuelto = saldo - producto.precio;
  productoEntregado = producto;
  estadoRecojo = "esperando";
  saldo = 0;
  transicionActiva = null;
  if (recogerProductoBtn) {
    recogerProductoBtn.disabled = false;
    recogerProductoBtn.textContent = `Recoger ${producto.nombre}`;
  }

  actualizarPantalla({
    producto,
    vuelto,
    mensaje: `Producto entregado: ${producto.nombre}. Vuelto: ${formatoDinero(vuelto)}. Ahora recoge el producto para aceptar la salida.`
  });
  animarEntrega(producto, vuelto);
  mostrarToast(`Salio ${producto.nombre}. Recogelo para finalizar.`);
  renderDiagramaMaquina();
  renderDiagrama();
  renderDiagramaRecojo();
  renderMefsInternosDinero();
}

function recogerProducto() {
  if (estadoRecojo !== "esperando" || !productoEntregado) {
    mostrarToast("No hay producto pendiente por recoger.");
    return;
  }

  const nombreProducto = productoEntregado.nombre;
  estadoRecojo = "aceptado";
  if (recogerProductoBtn) {
    recogerProductoBtn.disabled = true;
    recogerProductoBtn.textContent = "Producto recogido";
  }

  actualizarPantalla({
    producto: productoEntregado,
    mensaje: `Reinicio de maquina: recogiste ${nombreProducto}. Volviendo a q0...`
  });
  mostrarToast(`Producto recogido: ${nombreProducto}.`);
  renderDiagramaMaquina();
  renderDiagramaRecojo();
  renderMefsInternosDinero();

  reinicioRecojoTimer = setTimeout(() => {
    reiniciarCicloCompra("Listo. La maquina vuelve a q0 y espera dinero.");
  }, 1200);
}

function actualizarMaquina() {
  const nuevasMonedas = parsearMonedas();

  if (nuevasMonedas.length === 0) {
    mostrarToast("Debes ingresar al menos una moneda valida.");
    monedasInput.value = monedas.map((moneda) => (moneda / 100).toFixed(2)).join(",");
    return;
  }

  monedas = nuevasMonedas;
  saldo = 0;
  productoEntregado = null;
  transicionActiva = null;
  limpiarSalidaVisual();

  renderBotonesMonedas();
  actualizarElementosFormales();
  renderTablaTransiciones();
  renderTablasFormalesMef();
  renderTablasAceptacion();
  renderCaminosCortos();
  renderMefsInternosDinero();
  actualizarPantalla({ mensaje: "Maquina actualizada. Inserta dinero y luego elige producto." });
  renderDiagramaMaquina();
  renderDiagrama();
  renderDiagramaRecojo();
}

actualizarMaquinaBtn.addEventListener("click", actualizarMaquina);
recogerProductoBtn.addEventListener("click", recogerProducto);
reiniciarMaquinaBtn.addEventListener("click", () => {
  saldo = 0;
  productoEntregado = null;
  transicionActiva = null;
  limpiarSalidaVisual();
  actualizarPantalla({ mensaje: "Compra reiniciada. La maquina vuelve a q0." });
  renderDiagramaMaquina();
  renderDiagrama();
  renderDiagramaRecojo();
  renderMefsInternosDinero();
});

window.addEventListener("resize", () => {
  renderDiagramaMaquina();
  renderDiagrama();
  renderDiagramaRecojo();
  renderMefsInternosDinero();
});

actualizarMaquina();
