const monedasInput = document.getElementById("monedas");
const actualizarMaquinaBtn = document.getElementById("actualizarMaquina");
const reiniciarMaquinaBtn = document.getElementById("reiniciarMaquina");
const botonesMonedas = document.getElementById("botonesMonedas");
const estadoActual = document.getElementById("estadoActual");
const conjuntoEstados = document.getElementById("conjuntoEstados");
const alfabetoEntrada = document.getElementById("alfabetoEntrada");
const saldoPantalla = document.getElementById("saldoPantalla");
const mensajePantalla = document.getElementById("mensajePantalla");
const productoEtiqueta = document.getElementById("productoEtiqueta");
const ultimaEntrada = document.getElementById("ultimaEntrada");
const salidaProducto = document.getElementById("salidaProducto");
const salidaVuelto = document.getElementById("salidaVuelto");
const listaProductos = document.getElementById("listaProductos");
const tablaCaminosCortos = document.getElementById("tablaCaminosCortos");
const diagramaEstados = document.getElementById("diagramaEstados");
const tablaTransiciones = document.getElementById("tablaTransiciones");
const toast = document.getElementById("toast");

const ctx = diagramaEstados.getContext("2d");

const productos = [
  { codigo: "A1", nombre: "Coca Cola", precio: 5, color: "#ef4444" },
  { codigo: "A2", nombre: "Agua", precio: 5, color: "#38bdf8" },
  { codigo: "A3", nombre: "Pepsi", precio: 5, color: "#2563eb" },
  { codigo: "A4", nombre: "Jugo", precio: 5, color: "#22c55e" },
  { codigo: "B1", nombre: "Papas", precio: 6, color: "#eab308" },
  { codigo: "B2", nombre: "Galletas", precio: 6, color: "#f59e0b" },
  { codigo: "B3", nombre: "Chocolate", precio: 6, color: "#7c2d12" },
  { codigo: "C1", nombre: "Mini galleta", precio: 3, color: "#fb923c" },
  { codigo: "C2", nombre: "Mini cereal", precio: 3, color: "#a855f7" }
];

let monedas = [1, 2, 5];
let saldo = 0;
let productoEntregado = null;
let transicionActiva = null;
let toastTimer = null;

function maxPrecio() {
  return Math.max(...productos.map((producto) => producto.precio));
}

function estadoDesdeSaldo(valor) {
  return Math.min(valor, maxPrecio());
}

function mostrarToast(mensaje) {
  toast.textContent = mensaje;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

function parsearMonedas() {
  const valores = monedasInput.value
    .split(",")
    .map((valor) => Number(valor.trim()))
    .filter((valor) => Number.isInteger(valor) && valor > 0);

  return [...new Set(valores)].sort((a, b) => a - b);
}

function calcularTransicion(estado, moneda) {
  const nuevoEstado = estadoDesdeSaldo(estado + moneda);
  return {
    nuevoEstado,
    etiqueta: `delta(q${estado}, ${moneda}) = q${nuevoEstado}`
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
  const estados = Array.from({ length: maxPrecio() + 1 }, (_, indice) => `q${indice}`);
  conjuntoEstados.textContent = `{ ${estados.join(", ")} } donde q${maxPrecio()} significa credito suficiente.`;
  alfabetoEntrada.textContent = `{ ${monedas.join(", ")} }`;
}

function renderBotonesMonedas() {
  botonesMonedas.innerHTML = "";

  monedas.forEach((moneda) => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "coin-button";
    boton.textContent = `+${moneda}`;
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
    tarjeta.className = `product-option${habilitado ? " enabled" : " locked"}`;
    tarjeta.disabled = !habilitado;
    tarjeta.style.setProperty("--product-color", producto.color);
    tarjeta.innerHTML = `
      <span>${producto.codigo}</span>
      <strong>${producto.nombre}</strong>
      <small>Precio: ${producto.precio}</small>
      <em>${habilitado ? "Comprar" : `Faltan ${producto.precio - saldo}`}</em>
    `;
    tarjeta.addEventListener("click", () => comprarProducto(producto));
    listaProductos.appendChild(tarjeta);
  });
}

function renderTablaTransiciones() {
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  const filaCabecera = document.createElement("tr");

  filaCabecera.innerHTML = `<th>Estado</th>${monedas.map((moneda) => `<th>Entrada ${moneda}</th>`).join("")}`;
  thead.appendChild(filaCabecera);

  for (let estado = 0; estado <= maxPrecio(); estado += 1) {
    const fila = document.createElement("tr");
    const celdas = monedas.map((moneda) => {
      const transicion = calcularTransicion(estado, moneda);
      const habilitados = productosHabilitados(transicion.nuevoEstado);
      const detalle = habilitados ? `Habilita: ${habilitados}` : "Aun no habilita producto";
      const clase = habilitados ? "accept-cell" : "";
      return `<td class="${clase}"><strong>q${transicion.nuevoEstado}</strong><small>${detalle}</small></td>`;
    });

    fila.innerHTML = `<th>q${estado}<small>Saldo ${estado}${estado === maxPrecio() ? " o mas" : ""}</small></th>${celdas.join("")}`;
    tbody.appendChild(fila);
  }

  tablaTransiciones.innerHTML = "";
  tablaTransiciones.append(thead, tbody);
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
  const grupos = [
    { nombre: "Mini snacks", objetivo: 3, productos: "Mini galleta, Mini cereal" },
    { nombre: "Bebidas", objetivo: 5, productos: "Coca Cola, Agua, Pepsi, Jugo" },
    { nombre: "Snacks completos", objetivo: 6, productos: "Papas, Galletas, Chocolate" }
  ];

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

    const rutaEstados = camino.estados.map((estado) => `q${estado}`).join(" -> ");
    const rutaMonedas = camino.monedasUsadas.map((moneda) => `S/${moneda}`).join(" + ");

    tarjeta.innerHTML = `
      <span>${grupo.nombre}</span>
      <h3>Meta: q${grupo.objetivo}</h3>
      <p>${grupo.productos}</p>
      <strong>${rutaEstados}</strong>
      <small>Entradas: ${rutaMonedas} | ${camino.monedasUsadas.length} moneda(s)</small>
    `;
    tablaCaminosCortos.appendChild(tarjeta);
  });
}

function ajustarCanvas() {
  const rect = diagramaEstados.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  diagramaEstados.width = Math.max(1, Math.floor(rect.width * ratio));
  diagramaEstados.height = Math.max(1, Math.floor(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function obtenerPuntosEstados() {
  const ancho = diagramaEstados.clientWidth;
  const alto = diagramaEstados.clientHeight;
  const layout = [
    { x: 0.1, y: 0.52 },
    { x: 0.28, y: 0.25 },
    { x: 0.28, y: 0.78 },
    { x: 0.48, y: 0.52 },
    { x: 0.68, y: 0.25 },
    { x: 0.68, y: 0.78 },
    { x: 0.9, y: 0.52 }
  ];

  return Array.from({ length: maxPrecio() + 1 }, (_, indice) => {
    const punto = layout[indice] || {
      x: 0.12 + (indice / maxPrecio()) * 0.76,
      y: indice % 2 === 0 ? 0.35 : 0.68
    };

    return {
      id: indice,
      x: ancho * punto.x,
      y: alto * punto.y
    };
  });
}

function dibujarFlecha(origen, destino, etiqueta, color, curvatura = 0, etiquetaAbajo = false) {
  const dx = destino.x - origen.x;
  const dy = destino.y - origen.y;
  const distancia = Math.hypot(dx, dy) || 1;
  const nx = dx / distancia;
  const ny = dy / distancia;
  const radioNodo = 24;
  const inicioX = origen.x + nx * radioNodo;
  const inicioY = origen.y + ny * radioNodo;
  const finX = destino.x - nx * radioNodo;
  const finY = destino.y - ny * radioNodo;
  const controlX = (inicioX + finX) / 2 - ny * curvatura;
  const controlY = (inicioY + finY) / 2 + nx * curvatura;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(inicioX, inicioY);
  ctx.quadraticCurveTo(controlX, controlY, finX, finY);
  ctx.stroke();

  const angulo = Math.atan2(finY - controlY, finX - controlX);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(finX, finY);
  ctx.lineTo(finX - 11 * Math.cos(angulo - Math.PI / 6), finY - 11 * Math.sin(angulo - Math.PI / 6));
  ctx.lineTo(finX - 11 * Math.cos(angulo + Math.PI / 6), finY - 11 * Math.sin(angulo + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  ctx.font = "800 12px Segoe UI";
  const textoX = controlX - ctx.measureText(etiqueta).width / 2;
  const textoY = controlY + (etiquetaAbajo ? 20 : -8);
  const anchoTexto = ctx.measureText(etiqueta).width + 12;
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  ctx.roundRect(textoX - 6, textoY - 15, anchoTexto, 22, 7);
  ctx.fill();
  ctx.fillStyle = "#334155";
  ctx.fillText(etiqueta, textoX, textoY);
}

function dibujarBucle(punto, etiqueta, color, indice) {
  const desplazamiento = indice % 2 === 0 ? -46 : 46;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(punto.x + desplazamiento, punto.y - 36, 28, 20, 0, 0, Math.PI * 2);
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
  ctx.fillText(etiqueta, punto.x + desplazamiento - 18, punto.y - 62);
}

function obtenerTransicionesAgrupadas() {
  const grupos = new Map();

  for (let estado = 0; estado <= maxPrecio(); estado += 1) {
    for (const moneda of monedas) {
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
    }
  }

  return Array.from(grupos.values());
}

function curvaturaParaArista(origen, destino, indice) {
  if (origen.id === destino.id) return 0;

  const distancia = Math.abs(destino.id - origen.id);
  const sube = destino.y < origen.y;
  const casiHorizontal = Math.abs(destino.y - origen.y) < 16;
  const signo = casiHorizontal ? (origen.id % 2 === 0 ? -1 : 1) : sube ? -1 : 1;
  return signo * (34 + distancia * 11 + (indice % 3) * 8);
}

function renderDiagrama() {
  ajustarCanvas();
  const ancho = diagramaEstados.clientWidth;
  const alto = diagramaEstados.clientHeight;
  ctx.clearRect(0, 0, ancho, alto);

  const puntos = obtenerPuntosEstados();
  const estadoActualDiagrama = estadoDesdeSaldo(saldo);

  ctx.fillStyle = "#0f172a";
  ctx.font = "900 17px Segoe UI";
  ctx.fillText("Diagrama de estados de la maquina expendedora", 22, 34);

  const leyendas = [
    { texto: "Estado normal", color: "#0f766e" },
    { texto: "Estado activo", color: "#f97316" },
    { texto: "Producto desbloqueado", color: "#16a34a" }
  ];
  leyendas.forEach((item, indice) => {
    const x = 22 + indice * 190;
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(x, 62, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#475569";
    ctx.font = "800 12px Segoe UI";
    ctx.fillText(item.texto, x + 13, 66);
  });

  ctx.strokeStyle = "#0ea5e9";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(24, puntos[0].y);
  ctx.lineTo(puntos[0].x - 35, puntos[0].y);
  ctx.stroke();
  ctx.fillStyle = "#0ea5e9";
  ctx.beginPath();
  ctx.moveTo(puntos[0].x - 30, puntos[0].y);
  ctx.lineTo(puntos[0].x - 43, puntos[0].y - 7);
  ctx.lineTo(puntos[0].x - 43, puntos[0].y + 7);
  ctx.closePath();
  ctx.fill();

  obtenerTransicionesAgrupadas().forEach((grupo, indice) => {
    const origen = puntos[grupo.origen];
    const destino = puntos[grupo.destino];
    const etiqueta = grupo.monedas.map((moneda) => `S/${moneda}`).join(", ");
    const destinoAcepta = productosHabilitadosLista(grupo.destino).length > 0;
    const color = grupo.activa ? "#f97316" : destinoAcepta ? "#16a34a" : "#2563eb";
    const etiquetaAbajo = destino.y >= origen.y;

    if (grupo.origen === grupo.destino) {
      dibujarBucle(origen, etiqueta, color, indice);
    } else {
      dibujarFlecha(
        origen,
        destino,
        etiqueta,
        color,
        curvaturaParaArista(origen, destino, indice),
        etiquetaAbajo
      );
    }
  });

  puntos.forEach((punto) => {
    const activo = punto.id === estadoActualDiagrama;
    const productosDelEstado = productosHabilitadosLista(punto.id);
    const suficiente = productosDelEstado.length > 0;
    const radio = suficiente ? 29 : 25;

    if (suficiente) {
      ctx.fillStyle = "#ecfdf5";
      ctx.strokeStyle = "#16a34a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(punto.x, punto.y, radio + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = activo ? "#fef3c7" : suficiente ? "#dcfce7" : "#ffffff";
    ctx.strokeStyle = activo ? "#f97316" : suficiente ? "#16a34a" : "#0f766e";
    ctx.lineWidth = activo ? 4 : 2.5;
    ctx.beginPath();
    ctx.arc(punto.x, punto.y, radio, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = activo ? "#9a3412" : "#134e4a";
    ctx.font = "900 15px Segoe UI";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`q${punto.id}`, punto.x, punto.y - 8);

    ctx.font = "800 10px Segoe UI";
    ctx.fillStyle = "#64748b";
    ctx.fillText(`${punto.id} dep.`, punto.x, punto.y + 7);

    if (suficiente) {
      ctx.font = "900 9px Segoe UI";
      ctx.fillStyle = "#15803d";
      const codigos = productosDelEstado.map((producto) => producto.codigo).slice(0, 3).join(",");
      const extra = productosDelEstado.length > 3 ? "+" : "";
      ctx.fillText(`${codigos}${extra}`, punto.x, punto.y + 21);
    }

    ctx.font = "800 12px Segoe UI";
    ctx.fillStyle = "#475569";
    ctx.fillText(punto.id === 0 ? "inicio" : `S/${punto.id}`, punto.x, punto.y + 54);
  });

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function actualizarPantalla({ moneda = "-", producto = null, vuelto = 0, mensaje = "" } = {}) {
  const estadoVisible = estadoDesdeSaldo(saldo);
  saldoPantalla.textContent = saldo;
  estadoActual.textContent = `Estado actual: q${estadoVisible}${saldo > maxPrecio() ? ` (saldo real ${saldo})` : ""}`;
  productoEtiqueta.textContent = producto ? producto.nombre : "Elige un producto";
  ultimaEntrada.textContent = moneda;
  salidaProducto.textContent = producto ? producto.nombre : "No";
  salidaVuelto.textContent = vuelto;
  mensajePantalla.textContent = mensaje || "Inserta dinero para desbloquear productos.";
  renderProductos();
}

function insertarMoneda(moneda) {
  const estadoAnterior = estadoDesdeSaldo(saldo);
  saldo += moneda;
  transicionActiva = { estado: estadoAnterior, moneda };
  productoEntregado = null;

  const disponibles = productos.filter((producto) => saldo >= producto.precio);
  const mensaje = disponibles.length
    ? `Saldo ${saldo}. Ya puedes elegir: ${disponibles.map((producto) => producto.nombre).join(", ")}.`
    : `Se recibio ${moneda}. Aun falta dinero para desbloquear productos.`;

  actualizarPantalla({ moneda, mensaje });
  renderDiagrama();
}

function comprarProducto(producto) {
  if (saldo < producto.precio) {
    mostrarToast(`Aun faltan ${producto.precio - saldo} para comprar ${producto.nombre}.`);
    return;
  }

  const vuelto = saldo - producto.precio;
  productoEntregado = producto;
  saldo = 0;
  transicionActiva = null;

  actualizarPantalla({
    producto,
    vuelto,
    mensaje: `Producto entregado: ${producto.nombre}. Vuelto: ${vuelto}. La maquina vuelve a q0.`
  });
  mostrarToast(`Salio ${producto.nombre}. Vuelto: ${vuelto}.`);
  renderDiagrama();
}

function actualizarMaquina() {
  const nuevasMonedas = parsearMonedas();

  if (nuevasMonedas.length === 0) {
    mostrarToast("Debes ingresar al menos una moneda valida.");
    monedasInput.value = monedas.join(",");
    return;
  }

  monedas = nuevasMonedas;
  saldo = 0;
  productoEntregado = null;
  transicionActiva = null;

  renderBotonesMonedas();
  actualizarElementosFormales();
  renderTablaTransiciones();
  renderCaminosCortos();
  actualizarPantalla({ mensaje: "Maquina actualizada. Inserta dinero y luego elige producto." });
  renderDiagrama();
}

actualizarMaquinaBtn.addEventListener("click", actualizarMaquina);
reiniciarMaquinaBtn.addEventListener("click", () => {
  saldo = 0;
  productoEntregado = null;
  transicionActiva = null;
  actualizarPantalla({ mensaje: "Compra reiniciada. La maquina vuelve a q0." });
  renderDiagrama();
});

window.addEventListener("resize", renderDiagrama);

actualizarMaquina();
