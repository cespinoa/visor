# CLAUDE.md - Visor

## Qué hace este módulo

Visor de impacto de la vivienda vacacional y el turismo en Canarias. Presenta indicadores estadísticos (intensidad turística, presión humana, uso del suelo, déficit de vivienda...) a escala autonómica, insular, municipal y de localidad, con mapa interactivo, gráficos y tablas de datos.

## Stack y dependencias clave

- **Drupal 11** — framework base
- **PostgreSQL / PostGIS** — conexión secundaria con nombre `mapa_data`. Tablas consultadas: `municipios`, `diccionario_de_datos`
- **Martin** — servidor de teselas vectoriales. URL base: `https://vtp.carlosespino.es/martin/`. Dos endpoints activos:
  - `mv_full_snapshots_dashboard/{z}/{x}/{y}` — geometría + datos estadísticos del mapa
  - `v_mapa_etiquetas/{z}/{x}/{y}` — etiquetas de nombres para el mapa
- **JSON estáticos** en `public://visor/`:
  - `datos_dashboard.json` — snapshot actual: un registro por cada entidad (Canarias, islas, municipios)
  - `series.json` — series históricas para gráficos temporales (islas y municipios; NO localidades por peso)
  - `localidades.json` — datos de localidades (solo snapshot, sin histórico)
  - `public://assets/siluetas.json` — paths SVG de siluetas geográficas por clave (`canarias`, `isla_1`..`isla_7`, `muni_XXXXX`)

## Arquitectura del módulo

```
PostgreSQL (mapa_data)
  ├─ municipios          → nombres y claves de siluetas de municipios
  └─ diccionario_de_datos → indicadores visualizables + metadatos de campos

JSON estáticos (public://visor/)
  ├─ datos_dashboard.json  → snapshot actual
  ├─ series.json           → histórico temporal
  └─ localidades.json      → datos por localidad

         ↓

DashboardController::__invoke()
  - Lee los JSON de disco
  - Consulta PostgreSQL (diccionario + municipios)
  - Renderiza tema Twig 'visor_dashboard'
  - Inyecta TODO en drupalSettings.visorProject.*

         ↓

Twig (visor-dashboard.html.twig)
  - Layout: sidebar (selectores, vistas, compartir) + main (pestañas)
  - Incluye subtemplates en templates/includes/

         ↓

JavaScript (librería visor_dashboard, carga por peso declarado en .libraries.yml)

Martin (teselas vectoriales)
  - Consumido directamente desde panel-mapa.js via MapLibre GL
  - Las geometrías llevan los datos estadísticos embebidos en las propiedades
```

**Jerarquía de datos:**
```
Canarias → Isla (7) → Municipio (88) → Localidad (solo snapshot)
```

## Estructura de archivos (lo no obvio)

### PHP
- `src/Controller/DashboardController.php` — único controller de producción. Orquesta la carga de datos y la inyección en `drupalSettings`. No hay servicios separados; toda la lógica de datos vive aquí.
- `src/Controller/VisorController.php` — **NO TOCAR. Prueba de concepto, desaparecerá.**

### Templates Twig
- `templates/visor-dashboard.html.twig` — template raíz. Recibe `indicadores_visualizables` (array `id_campo => etiqueta` para el select). Todo lo demás llega vía `drupalSettings`.
- `templates/includes/selectors.html.twig` — selector de ámbito (radio: canarias/isla/municipio) y selector de indicador (select poblado desde PHP).
- `templates/includes/panel-*.html.twig` — contenedores vacíos que el JS rellena dinámicamente.
- `templates/includes/*-templates.html.twig` — templates HTML con `<template>` tags que el JS clona para construir el DOM (tablas, gráficos, contenedores).

### JavaScript — capas por orden de carga

| Archivo | Responsabilidad |
|---|---|
| `namespace.js` | Crea `window.visorProject` |
| `config-colores.js` | Paletas de color nombradas |
| `config-tablas.js` | Definición declarativa de todas las tablas (`CONFIG_TABLAS`) |
| `config-graficos.js` | Definición declarativa de todos los gráficos (`CONFIG_GRAFICOS`) |
| `config-widgets.js` | Definición declarativa de widgets/cards (`CONFIG_WIDGETS`) |
| `utils.js` | URL (leer/escribir), cortes Jenks via simple-statistics, breadcrumb de panel |
| `utils-layout.js` | Creación de contenedores Bootstrap en el DOM |
| `utils-tablas.js` | Renderizado de tablas (modo ficha y lista) |
| `utils-graficos.js` | Renderizado de gráficos Chart.js |
| `utils-imagenes.js` | Renderizado de siluetas SVG |
| `utils-widgets.js` | Renderizado de cards de impacto, slider de noticias, odómetro |
| `data-selector.js` | **Motor de selección de datos** (ver abajo) |
| `row-compositor.js` | Ensambla el DOM del dashboard a partir de esquemas declarativos |
| `panel-datos.js` | Orquestador del panel de ficha/tablas |
| `panel-graficos.js` | Orquestador del panel de análisis territorial |
| `panel-dashboard.js` | Define el esquema de bloques del panel principal y delega al compositor |
| `panel-mapa.js` | Mapa MapLibre GL: carga teselas Martin, coloración Jenks, eventos hover/clic |
| `tabs.js` | Gestión de pestañas (home, mapa, gráficos, datos) |
| `social-manager.js` | Compartir vista en redes sociales y copiar URL |
| `vistas-manager.js` | Guardar, restaurar y eliminar vistas en localStorage |
| `main.js` | **Inicialización y bus de eventos central** (ver abajo) |

### El motor de datos (`data-selector.js`)

Función `visorProject.dataSelector.seleccionar(props, config)`. Recibe el registro activo y un objeto `{contexto, periodo, agrupacion}` y devuelve el subconjunto de datos correcto. Contextos disponibles:

- `SELF` / `SELF_HISTORIC` — el propio registro y su serie temporal
- `CHILDREN` / `CHILDREN_HISTORIC` — hijos jerárquicos
- `PEERS_GEO` / `PEERS_GEO_HISTORIC` — hermanos en la misma isla
- `PEERS_GEO_GLOBAL` — todos los registros del mismo ámbito
- `PEERS_GROUP` / `PEERS_GROUP_HISTORIC` — municipios del mismo `tipo_municipio`
- `PEERS_BLOCK` / `PEERS_BLOCK_HISTORIC` — islas del mismo `tipo_isla`
- `PARENT_RELATION` / `PARENT_RELATION_HISTORIC` — yo + padre + Canarias
- `PARENTS` — yo + isla (si municipio) + Canarias (si no es Canarias), ordenado de más específico a más general. Solo snapshot. Diseñado para tablas ficha en modo columnas jerárquicas.

Modos de periodo temporal: `ALL`, `LATEST`, `LAST_TWO`, `YEARLY_MAX`, fecha ISO como testigo.

### Tablas ficha con contexto `PARENTS` y `unidades: true` (`utils-tablas.js`)

Las tablas en modo `ficha` admiten dos parámetros adicionales de nivel superior en `CONFIG_TABLAS`:

- **`contexto: 'PARENTS'`** — en lugar de una columna de valor único (SELF), genera una columna por cada nivel jerárquico: municipio activo, su isla y Canarias (o isla + Canarias si el activo es una isla). Las cabeceras de columna son los nombres reales de cada entidad (dinámicos). Implementado en `prepararDatasetFichaParents()` en `utils-tablas.js`.

- **`unidades: true`** — añade automáticamente una columna "Unidades" final leyendo `drupalSettings.visorProject.diccionario[idCampo].unidades`. Elimina la necesidad de especificar unidades manualmente en `filas`. La función helper `obtenerUnidad(idCampo)` centraliza este acceso.

**Formato de `filas` con PARENTS:**
```js
filas: [
    ["Etiqueta de fila", "nombre_campo"],            // campo simple
    ["Etiqueta de fila", ["nombre_campo", "decimal_1"]], // con formato explícito
    ["Etiqueta destacada", "nombre_campo", "destacada"]  // fila resaltada
]
```

**Integración en `crearTabla`:** cuando el dataset lleva `_cabecerasTabla` (puesto por `prepararDatasetFichaParents`), se usa directamente en lugar de `config.cabecera` o `config.etiquetas`. Esto permite cabeceras totalmente dinámicas sin tocar el renderizador.

**Tabla `resumen-ambito`** es la primera tabla migrada a `PARENTS + unidades: true`.

### La función central (`main.js`)

`visorProject.difundirDatos(props)` es el bus de eventos de la aplicación. Se dispara al clicar el mapa o al inicializar. Secuencialmente:
1. Actualiza `visorProject.estado` (ámbito, etiqueta)
2. Actualiza la URL y el historial del navegador (`history.pushState`) — permite compartir vistas y navegar con atrás/adelante
3. Gestiona el estado de las pestañas
4. Llama a `orquestadorDashboard.actualizarPanel()`
5. Llama a `orquestadorDatos.actualizarFicha()`
6. Llama a `orquestadorGraficos.actualizarPanel()`
7. Centra el mapa en el registro

### Historial del navegador (`utils.js`)

`actualizarURL` usa `history.pushState` en cada navegación y `history.replaceState` solo en la primera llamada (para no duplicar la entrada inicial del navegador). El estado guardado es mínimo: `{ambito, indicador, tab, etiqueta}` — no el registro completo para no saturar el historial.

`configurarEscuchaHistorial` registra un listener `popstate` (con `addEventListener`, no `onpopstate`, para evitar que otra librería lo sobrescriba). Al pulsar atrás/adelante:
1. Bloquea `actualizarURL` con `bloqueadoPorHistorial` para evitar bucle
2. Restaura el estado global con los datos del historial
3. Llama a `aplicarEstadoGlobal` (sincroniza selectores y filtros del mapa)
4. Busca el registro por `etiqueta` en `datosDashboard` y llama a `difundirDatos` (actualiza todos los paneles)
5. Restaura la pestaña con `setTimeout(100)` para ejecutarse después de la propagación de `difundirDatos`
6. Libera el bloqueo

Se activa una sola vez desde el bloque `once` de `main.js` (paso F de la inicialización).

### Compartir vista (`social-manager.js`)

Objeto global `window.SocialManager` (no es un Drupal behavior; necesita ser global por los `onclick` del template). Llamado desde `compartir.html.twig` con `window.SocialManager.share('red')`.

- `share(red)` — construye el texto con `visorProject.estado.etiqueta` en el momento del clic y la URL actual (ya sincronizada por `actualizarURL`). Redes soportadas: `whatsapp`, `telegram`, `bluesky`, `twitter`, `facebook`. Las abre con `window.open(..., 'noopener,noreferrer')`.
- `_copiarURL()` — usa `navigator.clipboard` con fallback a `execCommand` para HTTP o Safari antiguo. Feedback visual de 2 segundos: icono cambia a `check` / `error` y el botón recibe clase `.btn-share--copiado` (verde en `controls.css`).

El texto compartido es: *"Indicadores de vivienda vacacional y turismo en [etiqueta] — Visor VTPC"* + URL.

### Vistas guardadas (`vistas-manager.js`)

Objeto global `window.VistasManager` + llamada explícita desde `main.js` (paso G del bloque `once('visor-init-logic')`). El fichero también registra un Drupal behavior como respaldo, pero la inicialización fiable en carga de página depende de `main.js`. Llamado desde `vistas.html.twig` con `VistasManager.guardarActual()`.

**Persistencia:** `localStorage` clave `visor_vistas`. Máximo 10 entradas (elimina la más antigua). Cada vista guarda `{id, etiqueta, ambito, indicador, tab, recordId}` — no el registro completo, para que siempre se sirvan datos frescos al restaurar.

- `guardarActual()` — captura el estado activo. Previene duplicados por `recordId + indicador`. Feedback visual en el botón "Guardar" durante 2s (verde si guardó, gris si ya existía).
- `restaurar(id)` — aplica el indicador al estado, busca el registro por `recordId` en `datosDashboard` con fallback por `etiqueta`, llama a `difundirDatos()` y restaura la pestaña con `setTimeout(50)` para no pisarse con la propagación.
- `eliminar(id)` — filtra de localStorage y re-renderiza.
- `renderizar()` — muestra/oculta `#seccion-vistas-guardadas` según haya vistas. Construye los items con jQuery (no `innerHTML` para evitar XSS con nombres de municipios).

CSS de los items en `controls.css`, antes de la sección "Breadcrumb".

### El breadcrumb de panel (`utils.js` → `actualizarBreadcrumb`)

`visorProject.utils.actualizarBreadcrumb(props)` se llama al inicio de `actualizarFicha` y `actualizarPanel`. Construye la cadena jerárquica consultando `datosDashboard`:

- **Canarias** — siempre presente. Clickable si el ámbito activo no es `canarias`.
- **Isla** — presente si `ambito` es `isla` o `municipio`. Se localiza con `snapshot.find(d => d.ambito === 'isla' && d.isla_id === props.isla_id)`. Clickable si el ámbito activo es `municipio`.
- **Municipio** — presente solo si `ambito === 'municipio'`. Siempre texto plano (ítem activo).

Los ítems clickables son `<button>` que llaman a `difundirDatos(record)` con el registro completo del nivel padre, actualizando todo el dashboard igual que un clic en el mapa. El HTML destino es `<ol class="panel-breadcrumb-lista">`, presente en ambos paneles; la función actualiza los dos a la vez con `jQuery('.panel-breadcrumb-lista')`.

### El panel de gráficos (`panel-graficos.js`)

Define el esquema de bloques para la pestaña Gráficos y delega al `rowCompositor`. Los bloques del esquema usan la clave `elementos` (no `graficos`). Ejemplo de estructura mínima:

```js
const esquema = [{
    tituloBloque: "Título del bloque",
    destino: '#panel-graficos-contenido',
    elementos: [
        { tipo: 'grafico', id: 'gauge-rit', ancho: '4' },
        ...
    ]
}];
```

Los gráficos de tipo `gauge` no tienen `contexto` en su config (usan `SELF` por defecto), de modo que `dataSelector` devuelve `[props]`. `crearContenedorGrafico` en `utils-graficos.js` desenvuelve el array antes de acceder a `campo_max` y `campo_media` con `Array.isArray(datosRaw) ? datosRaw[datosRaw.length - 1] : datosRaw`.

### El mapa (`panel-mapa.js`)

- Usa **MapLibre GL** (latest via CDN)
- Coloración de coropletas por cortes **Jenks** calculados en cliente con `simple-statistics`
- Rampa de 5 colores en escala de rojos: `['#fcd5d5', '#f8a1a1', '#ed6d6d', '#c53030', '#a70000']`
- Al clicar un polígono, recupera el registro completo de `datosDashboard` por `id` y llama a `difundirDatos()`

## Diccionario de datos (`diccionario_de_datos`)

Tabla en PostgreSQL. Se inyecta completa en `drupalSettings.visorProject.diccionario` (indexada por `id_campo`). El JS accede a `diccionario[idCampo].formato` y `diccionario[idCampo].unidades`.

### Patrón de nomenclatura

Cada indicador principal tiene dos variantes automáticas sin unidades:
- `{campo}_avg` — media canaria (usado como referencia en gauges)
- `{campo}_max` — máximo registrado (usado como techo de escala en gauges)

### Indicadores visualizables (`visualizable = true`)

| id_campo | Etiqueta | Formato | Unidades |
|---|---|---|---|
| `rit` | Ratio de Intensidad Turística | decimal_2 | Turistas/100 residentes |
| `rit_r` | RIT reglada | decimal_2 | Turistas/100 residentes |
| `rit_v` | RIT vacacional | decimal_2 | Turistas/100 residentes |
| `rit_km2` | RIT / km² | decimal_2 | turistas/km² |
| `rit_r_km2` | RIT reglada / km² | decimal_2 | turistas/km² |
| `rit_v_km2` | RIT vacacional / km² | decimal_2 | turistas/km² |
| `presion_humana_km2` | Presión humana /km² | decimal_2 | personas/km² |
| `residentes_km2` | Residentes / km² | decimal_2 | residentes/km² |
| `uds_vv_habitantes` | Vacacionales cada 100 habitantes | decimal_2 | viviendas/100 habitantes |
| `plazas_suelo_residencial_porc` | Desplazamiento de la actividad turística a zonas residenciales | porcentaje_2 | plazas |
| `plazas_vacacionales_plazas_total_porc` | Peso de la oferta vacacional | porcentaje_2 | plazas |
| `vacacional_por_viviendas_habituales` | Presión de VV sobre viviendas habituales | porcentaje_2 | viviendas |
| `viviendas_vacias_viviendas_total` | Presión de la vivienda vacía | porcentaje_2 | viviendas |
| `viviendas_esporadicas_viviendas_total` | Presión de la vivienda ocasional | porcentaje_2 | viviendas |
| `deficit_oferta_viviendas` | Déficit teórico de viviendas | decimal_2 | viviendas |

### Campos de datos (no visualizables)

**Metadata / identificadores:** `ambito`, `etiqueta`, `etiqueta_ambito_superior`, `isla_id`, `municipio_id`, `localidad_id`, `tipo_isla`, `tipo_municipio`, `fecha_calculo`, `superficie_km2`

**Población y hogares:** `poblacion`, `poblacion_total`, `personas_por_hogar`, `consumidores_vivienda`
- Porcentajes sobre total: `poblacion_total_poblacion_porc`, `pte_r_total_poblacion_porc`, `pte_v_total_poblacion_porc`

**PTE (Población Turística Equivalente):** `pte_total`, `pte_r`, `pte_v`
- Porcentajes sobre PTE: `pte_r_porc`, `pte_v_porc`

**Vivienda — stock:** `viviendas_total`, `viviendas_habituales`, `viviendas_vacias`, `viviendas_esporadicas`, `viviendas_disponibles`, `viviendas_necesarias`
- Ratios derivados: `vhabituales_consumidores`, `vhabituales_habitantes`
- Porcentajes sobre total: `viviendas_habituales_viviendas_total`, `viviendas_vacias_viviendas_total`, `viviendas_esporadicas_viviendas_total`, `viviendas_disponibles_viviendas_habituales`

**Vivienda — déficit:** `deficit_viviendas`, `deficit_oferta_viviendas`, `cobertura_demanda_viviendas`

**Presión VV sobre vivienda:** `vacacional_por_viviendas_habituales`, `vacacional_por_viviendas_total`

**VV — totales y desglose por zona:**
- Unidades: `uds_vv_total`, `uds_vv_turisticas`, `uds_vv_residenciales`
- Porcentajes: `uds_vv_turisticas_porc`, `uds_vv_residenciales_porc`
- Ratio habitantes: `uds_vv_residenciales_habitantes`

**Plazas — totales:** `plazas_total`, `plazas_regladas`, `plazas_vacacionales`
- Porcentajes sobre total: `plazas_regladas_plazas_total_porc`, `plazas_vacacionales_plazas_total_porc`

**Plazas — desglose por zona:**
- Regladas: `plazas_at_turisticas`, `plazas_at_residenciales` + `*_porc` + `plazas_at_residenciales_oferta_en_residencial`
- Vacacionales: `plazas_vv_turisticas`, `plazas_vv_residenciales` + `*_porc` + `plazas_vv_residenciales_oferta_en_residencial`
- Totales por zona: `plazas_suelo_residencial`, `plazas_suelo_turistico` + `*_porc`

**RIT desglose presión:** `rit_r_porc`, `rit_v_porc`, `rit_km2_presion_humana_km2`, `residentes_km2_presion_humana_km2`

### Aviso importante

El campo `r_deficit_oferta_viviendas` **no existe** en el diccionario. El campo correcto es `deficit_oferta_viviendas` (formato `decimal_2`).

## Convenciones propias

- **Estado global único**: `window.visorProject.estado` con `{ambito, indicador, tab, registroActivo, etiqueta}`. Todo el JS lee y escribe aquí.
- **Configuración declarativa**: Los paneles no saben cómo renderizar; leen `CONFIG_TABLAS`, `CONFIG_GRAFICOS`, `CONFIG_WIDGETS` y delegan a las utilidades.
- **Claves de siluetas**: `canarias`, `isla_1`..`isla_7`, `muni_XXXXX` (donde XXXXX es el id del municipio).
- **Tipos de municipio**: `GRANDE`, `MEDIANO`, `PEQUEÑO`, `TURÍSTICO`
- **Tipos de isla**: `central`, `oriental`, `occidental`
- Los datos históricos de localidades NO existen (`series.json` no las incluye; demasiado pesado).

## Librerías externas

| Librería | Versión | Uso |
|---|---|---|
| MapLibre GL | latest (CDN) | Mapa vectorial interactivo |
| Chart.js | 4.4.1 | Gráficos (bar, line, donut) |
| Luxon + adapter | 3.4.4 / 1.3.1 | Eje temporal en Chart.js |
| Gauge.js | 1.3.7 | Widgets tipo velocímetro |
| simple-statistics | 7.8.3 | Clasificación Jenks para coropletas |

## Lo que está incompleto o en progreso

- `panel-datos.js.antes_de_unificar` — versión anterior del panel de datos, conservada como referencia
- Algunos bloques en `panel-dashboard.js` están comentados (comparativa junio 2023, bloque déficit de vivienda con packs)
- `config-widgets.js`: el item `n3` (aleatorio) está comentado
- Histórico de localidades: reconocido como "demasiado pesado", no implementado

## Lo que NO debe tocar Claude

- `src/Controller/VisorController.php` — prueba de concepto inicial. No modificar. Desaparecerá al finalizar el desarrollo.
- `js/visor/` (todos los ficheros) — asociados al VisorController anterior. No modificar. Desaparecerán al finalizar el desarrollo.

## Contexto de negocio mínimo

- Datos oficiales únicamente (Registro General Turístico de Canarias y fuentes estadísticas públicas)
- Ámbito geográfico: Canarias — 7 islas, 88 municipios
- Los indicadores clave son: RIT (Ratio de Intensidad Turística), PTE (Población Turística Equivalente), presión humana por km², distribución de plazas regladas vs. vacacionales, uso del parque de viviendas y déficit de oferta
- La distinción zona turística / zona residencial es central en el análisis

## Decisiones metodológicas explícitas

- **VVVV en zona turística vs. residencial**: Los ratios de presión 
  sobre la vivienda residencial excluyen las viviendas vacacionales 
  ubicadas en zonas turísticas. La hipótesis es que estas no compiten 
  con el parque residencial de la población local en la misma escala 
  que las ubicadas en zonas residenciales. Esta distinción es 
  deliberada y no debe alterarse sin revisión explícita.

- **Solo datos oficiales**: Registro General Turístico de Canarias y
  fuentes estadísticas públicas. Nunca estimaciones ni datos de
  plataformas privadas (Airbnb, etc.). La credibilidad del análisis
  depende de la trazabilidad de las fuentes.

## Decisiones de diseño de UI

- **Los selectores de ámbito e indicador son exclusivos de la pestaña Mapa.**
  Arrancan con `display:none` en el HTML (evita flash en carga) y `tabs.js` los
  muestra/oculta con `fadeIn`/`fadeOut` según la pestaña activa. No deben
  añadirse en las pestañas de Gráficos ni Datos por dos razones:
  1. El selector de ámbito sin mapa no tiene utilidad: cambiar de municipio a
     isla requiere seleccionar *qué* entidad concreta, operación que solo el mapa
     permite. El breadcrumb Canarias/Isla/Municipio en esas pestañas es
     suficiente para orientar al usuario.
  2. El selector de indicador solo afecta a la coropleta del mapa. En Gráficos
     y Datos cada elemento tiene su campo configurado en `CONFIG_GRAFICOS` /
     `CONFIG_TABLAS`; mostrarlo allí generaría confusión al no producir ningún
     efecto visible.

- **Breadcrumb de panel en Gráficos y Datos.** Ambas pestañas muestran un
  breadcrumb `Canarias / Isla / Municipio` en la parte superior que indica el
  ámbito activo y permite navegar hacia niveles superiores. Implementación:
  - HTML: `<nav class="panel-breadcrumb"><ol class="panel-breadcrumb-lista"></ol></nav>`
    al inicio de `panel-graficos.html.twig` y `panel-datos.html.twig`.
  - JS: `visorProject.utils.actualizarBreadcrumb(props)` en `utils.js`. Construye
    la jerarquía consultando `datosDashboard` por `ambito` e `isla_id`. Los items
    intermedios son botones que llaman a `difundirDatos` con el registro completo
    del nivel padre. El item activo (último) es texto plano.
  - Se llama al inicio de `orquestadorGraficos.actualizarPanel()` y
    `orquestadorDatos.actualizarFicha()`, por lo que siempre está sincronizado
    con el resto del panel.
  - CSS en `components.css`, sección "BREADCRUMB DE PANEL". Color de enlace
    `#a70000` (consistente con el header del sidebar).