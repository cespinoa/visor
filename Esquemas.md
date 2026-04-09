# Esquemas de panel — Row Compositor

Referencia de la estructura declarativa que usan los orquestadores
(`panel-datos.js`, `panel-dashboard.js`, `panel-informe.js`) para definir
el contenido de cada panel. El procesamiento lo realiza
`row-compositor.js` + `utils-informes.js` (prefetch de longtexts).

---

## Estructura general

Un esquema es un **array de bloques**. Cada bloque agrupa elementos
relacionados bajo un título opcional y se vuelca en un contenedor del DOM.

```js
const esquema = [
    {
        tituloBloque: "Título de sección",   // opcional
        intro:        "Texto introductorio", // opcional
        clases:       ['clase-css'],         // opcional
        notas:        "Nota al pie",         // opcional
        destino:      '#id-contenedor',      // selector jQuery del contenedor
        ambito:       'canarias',            // opcional — ver sección Visibilidad
        elementos:    [ /* array de elementos */ ],
    },
    // ...
];
```

> `destino` solo es necesario en el primer bloque del esquema; el compositor
> lo usa para vaciar el contenedor antes de renderizar. Los bloques
> siguientes lo ignoran.

---

## Propiedades de bloque

| Propiedad | Tipo | Descripción |
|---|---|---|
| `tituloBloque` | string | Cabecera H2 del bloque |
| `intro` | string | Párrafo introductorio bajo el título |
| `clases` | string[] | Clases CSS extra en el wrapper del bloque |
| `notas` | string | Nota al pie del bloque |
| `destino` | string | Selector jQuery del contenedor DOM |
| `ambito` | string \| string[] | Filtro de visibilidad (ver más abajo) |
| `elementos` | Elemento[] | Contenido del bloque |

**Clase especial `permite-saltos`:** añadir a `clases` para que WeasyPrint
permita saltos de página dentro del bloque (por defecto los bloques son
`break-inside: avoid`).

**Clase especial `salto-antes`:** fuerza un salto de página antes del bloque
en PDF.

---

## Tipos de elemento

### `tabla`

```js
{ tipo: 'tabla', id: 'nombre-config', ancho: '6' }
```

Busca `CONFIG_TABLAS['nombre-config']` y delega en `utils-tablas.js`.
Ver `Sintaxis.md` §2 para la sintaxis de `filas` y `columnas`.

### `grafico`

```js
{ tipo: 'grafico', id: 'nombre-config', ancho: '6' }
```

Busca `CONFIG_GRAFICOS['nombre-config']` y delega en `utils-graficos.js`.

### `widget`

```js
{ tipo: 'widget', id: 'nombre-config', ancho: '4' }
```

Busca `CONFIG_WIDGETS['nombre-config']` y delega en `utils-widgets.js`.

### `imagen`

```js
{ tipo: 'imagen', tipo_imagen: 'silueta', id: 'canarias', ancho: '3' }
{ tipo: 'imagen', tipo_imagen: 'silueta', id: idSilueta,  ancho: '3' }
```

`id` es la clave de silueta: `canarias`, `isla_1`…`isla_7`, `muni_XXXXX`.

### `longtext`

```js
{ tipo: 'longtext', id: 'id-alternativo-del-nodo', ancho: '12' }
```

`id` corresponde al campo `field_id_alternativo` del nodo Drupal
`bloque_de_texto`. El HTML se pre-carga antes de renderizar mediante
`_prefetchLongtexts`. Ver `Sintaxis.md` §1 para las expresiones dentro
del contenido.

### `radares-islas`

```js
{ tipo: 'radares-islas', id: 'radar-sintesis', ancho: '12' }
```

Renderiza un radar Chart.js por cada isla, en orden
oriental → central → occidental.

### `salto`

Fuerza un salto de línea dentro de la fila Bootstrap (`w-100`). No necesita
`id` ni `ancho`. Útil para empujar elementos al siguiente renglón sin abrir
un bloque nuevo.

```js
{ tipo: 'salto' }
{ tipo: 'salto', ambito: 'canarias' }  // también admite filtro de ámbito
```

```js
elementos: [
    { tipo: 'tabla', id: 'tabla-a', ancho: '6' },
    { tipo: 'tabla', id: 'tabla-b', ancho: '6' },
    { tipo: 'salto' },
    { tipo: 'tabla', id: 'tabla-c', ancho: '4' },
]
```

### `pack`

Agrupa sub-elementos en una columna compartida con título propio.

```js
{
    tipo:      'pack',
    ancho:     '6',
    tituloPack: 'Título del pack',  // opcional
    clasePack:  'clase-extra',      // opcional
    elementos: [
        { tipo: 'tabla',  id: 'tabla-a', ancho: '12' },
        { tipo: 'grafico', id: 'grafico-b', ancho: '12' },
    ]
}
```

Los sub-elementos de un pack también admiten la propiedad `ambito`.

---

## Propiedades comunes a todos los elementos

| Propiedad | Tipo | Descripción |
|---|---|---|
| `tipo` | string | Tipo de elemento (ver arriba) |
| `id` | string | Identificador de config o nodo |
| `ancho` | string | Columnas Bootstrap 1–12 |
| `ambito` | string \| string[] | Filtro de visibilidad (ver más abajo) |
| `ancho-pdf` | string | Ancho alternativo para PDF (columnas Bootstrap) |

**`ancho-pdf`:** cuando está presente, la columna se renderiza a ancho 12
en el compositor para que WeasyPrint calcule porcentajes sobre el ancho
completo de página, y `ancho-pdf` se usa como clase interna del elemento.

---

## Visibilidad condicional por ámbito

La propiedad `ambito` filtra elementos y bloques según `props.ambito`
(`'canarias'`, `'isla'`, `'municipio'`). Si no se especifica, el elemento
siempre se renderiza.

```js
// Solo para un ámbito
{ tipo: 'tabla', id: 'mi-tabla', ancho: '6', ambito: 'canarias' }

// Para varios ámbitos
{ tipo: 'longtext', id: 'intro-isla', ancho: '12', ambito: ['isla', 'municipio'] }

// Bloque entero condicionado
{
    tituloBloque: 'Solo municipios',
    ambito: 'municipio',
    elementos: [ /* ... */ ]
}
```

Funciona en: bloques, elementos de cualquier tipo y sub-elementos de pack.

---

## Flujo de renderizado

```
orquestador.actualizarPanel(props)
  │
  ├─ utilsInformes._prefetchLongtexts(esquema, props)
  │    └─ POST /api/visor/texto/{id}  (por cada longtext del esquema)
  │         └─ InformeController::texto() → aplicarSustituciones()
  │
  └─ rowCompositor.componer(esquema, props)
       └─ por cada bloque:
            └─ procesarElementos(elementos, $fila, props)
                 └─ _ambitoPermitido(item, props)  → skip si no aplica
                 └─ fabricarElemento(item, props)
                      └─ manejarTabla / manejarGrafico / manejarLongtext / …
```

---

## Ejemplo completo

```js
const esquema = [
    {
        tituloBloque: "Resumen",
        destino:      '#ficha-contenido',
        elementos: [
            { tipo: 'tabla',    id: 'resumen-ambito', ancho: '9' },
            { tipo: 'imagen',   tipo_imagen: 'silueta', id: idSilueta, ancho: '3' },
            { tipo: 'longtext', id: 'intro-canarias', ancho: '12', ambito: 'canarias' },
            { tipo: 'longtext', id: 'intro-isla',     ancho: '12', ambito: 'isla' },
            { tipo: 'longtext', id: 'intro-municipio',ancho: '12', ambito: 'municipio' },
        ]
    },
    {
        tituloBloque: "Distribución territorial",
        ambito:       ['canarias', 'isla'],
        destino:      '#ficha-contenido',
        elementos: [
            { tipo: 'tabla', id: 'lista-de-hijos', ancho: '12' },
        ]
    },
];
```
