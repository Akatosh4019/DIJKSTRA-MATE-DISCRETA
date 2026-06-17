# Simulador de Caminos Mas Cortos

Proyecto hecho con HTML, CSS y JavaScript para ejecutar desde Visual Studio Code o cualquier navegador.

Autor: Roberto Samuel Valencia Saavedra

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

- La pagina principal muestra dos opciones: `Dijkstra` y `Floyd-Warshall`.
- En cada simulador, presione `Agregar Nodo` y haga clic en el area de dibujo.
- Escriba origen, destino y peso para agregar un arco dirigido.
- En Dijkstra, seleccione el nodo inicial y presione `Calcular Dijkstra`.
- En Floyd-Warshall, presione `Calcular Floyd-Warshall` para obtener la matriz de distancias entre todos los nodos.
- Los resultados se muestran en tablas y tambien como graficos separados.

## Archivos

- `index.html`: pagina principal con botones hacia cada algoritmo.
- `dijkstra.html`: simulador de Dijkstra.
- `floyd-warshall.html`: simulador de Floyd-Warshall.
- `style.css`: diseno visual de la aplicacion.
- `app-dijkstra.js`: logica del grafo, dibujo en canvas y algoritmo de Dijkstra.
- `app-floyd.js`: logica del grafo, dibujo en canvas y algoritmo de Floyd-Warshall.
