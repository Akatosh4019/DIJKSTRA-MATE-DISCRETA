# Simulador Dijkstra Web

Proyecto hecho con HTML, CSS y JavaScript para ejecutar desde Visual Studio Code o cualquier navegador.

## Como ejecutar

Opcion simple:

1. Abra la carpeta `SimuladorDijkstraWeb` en Visual Studio Code.
2. Abra el archivo `index.html`.
3. Haga clic derecho sobre `index.html`.
4. Elija `Reveal in File Explorer` o `Mostrar en el Explorador de archivos`.
5. Haga doble clic en `index.html` para abrirlo en el navegador.

Opcion con extension:

1. Instale la extension `Live Server` en Visual Studio Code.
2. Abra `index.html`.
3. Haga clic derecho y seleccione `Open with Live Server`.

## Funcionamiento

- Presione `Agregar Nodo` y haga clic en el area de dibujo.
- Escriba origen, destino y peso para agregar un arco dirigido.
- Seleccione el nodo inicial.
- Presione `Calcular Dijkstra`.
- La tabla muestra distancia minima y camino mas corto.
- Los arcos que forman caminos minimos se resaltan en color naranja.

## Archivos

- `index.html`: estructura de la interfaz.
- `style.css`: diseno visual de la aplicacion.
- `app.js`: logica del grafo, dibujo en canvas y algoritmo de Dijkstra.
