# Sintaxis de variables y expresiones en el Visor

Referencia de todas las formas de insertar valores dinámicos en los dos
contextos donde se usan: **longtexts** (nodos `bloque_de_texto` editados en
Drupal) y **configuración JS** (tablas y widgets declarados en
`config-tablas.js` y `config-widgets.js`).

> Para la estructura declarativa de los paneles (bloques, elementos, tipos,
> visibilidad por ámbito) ver **[Esquemas.md](Esquemas.md)**.

---

## 1. Longtexts (`bloque_de_texto`)

Los longtexts se editan en Drupal como contenido HTML normal. Las
sustituciones se procesan en el servidor (`InformeController::aplicarSustituciones`)
antes de enviar el HTML al navegador.

### 1.1 Variable simple

```
{{ campo }}
```

Sustituye el campo del registro activo del snapshot. El formato se deduce
automáticamente del diccionario de datos.

```
{{ rit }}              → 2.45
{{ poblacion }}        → 45.231
```

### 1.2 Variable con formato explícito

```
{{ campo | formato }}
```

Formatos disponibles: `entero`, `decimal_1`, `decimal_2`, `porcentaje_1`,
`porcentaje_2`.

```
{{ rit | decimal_2 }}                               → 2,45
{{ viviendas_vacias_viviendas_total | porcentaje_2 }} → 18,32 %
```

### 1.3 Período anterior o fecha concreta

```
{{ campo | p:anterior }}
{{ campo | p:YYYY-MM-DD }}
```

Busca el valor del campo en la serie histórica del registro activo.

```
{{ rit | p:anterior }}       → valor del período inmediatamente anterior
{{ rit | p:2022-01-01 }}     → valor en esa fecha exacta
```

### 1.4 Otra entidad (ámbito distinto)

```
{{ campo | e:NombreEntidad }}
```

Devuelve el campo de otra entidad del snapshot (por su `etiqueta`).

```
{{ rit | e:Lanzarote }}      → RIT de Lanzarote en el período actual
```

### 1.5 Combinación período + entidad

```
{{ campo | p:anterior | e:NombreEntidad }}
```

```
{{ rit | p:anterior | e:Lanzarote }}   → RIT de Lanzarote en el período anterior
```

### 1.5b Dataset extra + entidad (y año)

El modificador `e:` también funciona con datasets externos (notación de punto).
Busca la entidad en el snapshot por `etiqueta` y usa sus identificadores para
filtrar el dataset.

```
{{ dataset.campo | e:NombreEntidad }}
{{ dataset.campo | e:NombreEntidad | y:YYYY }}
{{ dataset.campo | y:YYYY | e:NombreEntidad }}
```

```
{{ historicoLlegadas.turistas | e:Lanzarote | y:2023 }}
{{ historicoTasaOcupacion.tasa | e:Fuerteventura | y:2022 | decimal_1 }}
{{ personas_hogar.miembros | e:Canarias | y:2021 | decimal_2 }}
```

### 1.6 Dataset extra (drupalSettings)

Cualquier key con prefijo `$` en `drupalSettings.visorProject` está
disponible mediante notación de punto. El prefijo `$` se omite en el token.

```
{{ nombre_dataset.campo }}
```

**Dataset key-value** — acceso directo por clave:

```js
// PHP/DashboardController inyecta:
drupalSettings.visorProject['$viviendas_terminadas'] = {
    2021: 3011, 2022: 2782, 2023: 2107, 2024: 2889, total: 13941
}
```

```
{{ viviendas_terminadas.2024 }}           → 2.889
{{ viviendas_terminadas.total | entero }} → 13.941
```

**Dataset array de objetos** — búsqueda automática por entidad activa:

Cuando el dataset es un array de objetos con campos `ambito`, `isla_id` y
`municipio_id`, el servidor busca automáticamente el registro que coincide
con la entidad que se está visualizando. La sintaxis es idéntica.

```js
// PHP/DashboardController inyecta:
drupalSettings.visorProject['$poblacion_2021'] = [
    { poblacion: 2172944, ambito: 'canarias', isla_id: null,  municipio_id: null },
    { poblacion:  156189, ambito: 'isla',     isla_id: '6',   municipio_id: null },
    { poblacion:   48733, ambito: 'municipio',isla_id: '7',   municipio_id: '58' },
    // ...
]
```

```
{{ poblacion_2021.poblacion }}   → valor de la entidad activa
```

Si se está visualizando Lanzarote (isla_id=6) devuelve 156.189.
Si se está visualizando Canarias devuelve 2.172.944.

**Filtro por año (`y:`)** — datasets con múltiples registros por entidad:

Cuando el array contiene varias filas para la misma entidad (p.ej. una por año),
se añade la opción `y:YYYY` para seleccionar el año concreto.

```js
// PHP/DashboardController inyecta:
drupalSettings.visorProject['$personas_hogar'] = [
    { miembros: 2.61, year: '2011', ambito: 'canarias', isla_id: null, municipio_id: null },
    { miembros: 2.43, year: '2021', ambito: 'canarias', isla_id: null, municipio_id: null },
    // ... una fila por entidad × año
]
```

```
{{ personas_hogar.miembros | y:2021 | decimal_2 }}   → 2,43
{{ personas_hogar.miembros | y:2011 | decimal_2 }}   → 2,61
```

También funciona dentro de expresiones aritméticas:

```
[[ {{ personas_hogar.miembros | y:2021 }} - {{ personas_hogar.miembros | y:2011 }} | decimal_2 ]]
```

### 1.7 Expresión aritmética

```
[[ expresión | formato ]]
```

La expresión puede contener `{{ campo }}` (con todas sus opciones de
contexto), números y los operadores `+ - * / ( )`.

```
[[ {{ rit }} - {{ rit | p:anterior }} | decimal_2 ]]
[[ {{ viviendas_terminadas.total }} / 5 | entero ]]
[[ {{ pte_v }} / {{ pte_total }} * 100 | porcentaje_2 ]]
[[ {{ viviendas_habituales }} + {{ viviendas_terminadas.total }} | entero ]]
```

### 1.8 Condicionales

```
{% if condición %}
  Contenido si se cumple.
{% elseif otra_condición %}
  Contenido si se cumple la segunda.
{% else %}
  Contenido si ninguna se cumple.
{% endif %}
```

**Ramas disponibles:** `if` (obligatorio) + cualquier número de `elseif` + `else` opcional.

**Operadores:** `==` `!=` `>` `<` `>=` `<=`

**Cada lado de la comparación puede ser:**
- Un campo del snapshot: `ambito`, `rit`, `tipo_municipio`…
- Un dataset extra con notación de punto: `viviendas_terminadas.total`
- Un dataset con filtro de año: `personas_hogar.miembros | y:2021`
- Un literal entre comillas simples/dobles o sin ellas: `'canarias'`, `10000`

Los paréntesis alrededor de la condición son opcionales: `{% if( cond ) %}` equivale a `{% if cond %}`.

```
{% if ambito == 'canarias' %}
  Este texto solo aparece para Canarias.
{% endif %}

{% if ambito != 'municipio' %}
  Visible en Canarias e islas.
{% else %}
  Visible solo en municipios.
{% endif %}

{% if tipo_municipio == 'TURÍSTICO' %}
  Municipio con alta presión turística.
{% endif %}

{% if viviendas_terminadas.total > 10000 %}
  Producción de vivienda por encima de la media del período.
{% endif %}

{% if( personas_hogar.miembros | y:2021 > personas_hogar.miembros | y:2011 ) %}
  El tamaño medio de los hogares ha aumentado.
{% elseif( personas_hogar.miembros | y:2021 < personas_hogar.miembros | y:2011 ) %}
  El tamaño medio de los hogares ha disminuido.
{% else %}
  El tamaño medio de los hogares se ha mantenido estable.
{% endif %}
```

Los condicionales se resuelven **antes** que las variables, por lo que el
contenido de cada rama puede contener `{{ }}` y `[[ ]]` con normalidad.
No se soportan condicionales anidados.

---

## 2. Tablas (`config-tablas.js`)

Los valores de las celdas se especifican en los arrays `filas` o `columnas`
de cada entrada de `CONFIG_TABLAS`.

### 2.1 Campo simple (string)

```js
["Etiqueta de fila", "nombre_campo"]
```

El formato se deduce automáticamente del diccionario de datos.

### 2.2 Campo con formato explícito (array)

```js
["Etiqueta de fila", ["nombre_campo", "formato"]]
```

```js
["Población", ["poblacion", "entero"]]
["RIT", ["rit", "decimal_2"]]
```

### 2.3 Valor literal (texto fijo)

```js
["Etiqueta de fila", ["texto fijo", "literal"]]
```

```js
["Total", ["100,00 %", "literal"]]
```

### 2.4 Dataset extra (drupalSettings)

Cualquier key con prefijo `$` en `drupalSettings.visorProject` (inyectada
desde PHP) es accesible en las tablas con la notación `$dataset.campo`.
A diferencia de los longtexts, en tablas JS el prefijo `$` es obligatorio.

```js
["Etiqueta de fila", ["$dataset.campo"]]
["Etiqueta de fila", ["$dataset.campo", "formato"]]
```

**Dataset key-value** — acceso directo por clave:

```js
["Viviendas terminadas 2021-2024", ["$viviendas_terminadas.total"]]
["Terminadas en 2023",             ["$viviendas_terminadas.2023", "entero"]]
```

**Dataset array de objetos** — búsqueda automática por entidad activa:

Cuando el dataset es un array de objetos con `ambito`/`isla_id`/`municipio_id`,
se busca automáticamente el registro que coincide con el registro que se
está renderizando (el mismo `registro` que el resto de la fila).

```js
["Población 2021", ["$poblacion_2021.poblacion"]]
```

### 2.5 Expresión aritmética

```js
["Etiqueta de fila", "[[expresión]]"]
["Etiqueta de fila", "[[expresión | formato]]"]
```

Los identificadores dentro de `[[ ]]` son nombres de campo directos (sin
corchetes adicionales). Se pueden mezclar campos del snapshot con campos de
datasets externos (`$dataset.clave`).

```js
// Solo snapshot
["PTE total",      "[[pte_r + pte_v]]"]
["Media anual VV", "[[uds_vv_total / 5 | decimal_2]]"]

// Mixta: snapshot + dataset externo
["Viviendas + terminadas", ["[[ viviendas_habituales + $viviendas_terminadas.total ]]", "entero"]]
```

**Operadores disponibles:** `+ - * / ( )`

Si un campo del snapshot no existe en el registro se sustituye por `0` y se
emite un `console.warn`. Si la expresión no es aritmética válida la celda
muestra `-`.

### 2.6 Fila destacada (totales)

Añadir la cadena `"destacada"` como último elemento del array de la fila.
Funciona con cualquiera de las formas anteriores (campo simple, dataset extra,
expresión aritmética).

```js
["Total", ["viviendas_total"], "destacada"]
["Total", ["100,00 %", "literal"], "destacada"]
```

---

## 3. Widgets (`config-widgets.js`)

Los textos de impacto (`titulo`, `descripcion`) admiten interpolación
directamente en la cadena de texto.

### 3.1 Variable simple

```
[nombre_campo]
```

El formato se deduce del diccionario. El campo debe existir en el registro
activo.

```js
descripcion: "La presión turística es de [rit] turistas por cada 100 residentes."
```

### 3.2 Expresión aritmética

```
[[expresión]]
[[expresión | formato]]
```

Los identificadores dentro de `[[ ]]` son nombres de campo sin corchetes.

```js
titulo:      "[[pte_r + pte_v | entero]] personas de carga total"
descripcion: "El [[uds_vv_total / viviendas_habituales * 100 | decimal_2]] % ..."
```

**Operadores disponibles:** `+ - * / ( )`

---

## Formatos disponibles

| Clave | Ejemplo de salida |
|---|---|
| `entero` | 45.231 |
| `decimal_1` | 2,4 |
| `decimal_2` | 2,45 |
| `porcentaje_1` | 18,3 % |
| `porcentaje_2` | 18,32 % |

Si no se especifica formato, se usa el del diccionario de datos
(`drupalSettings.visorProject.diccionario[campo].formato`). Si el campo
no está en el diccionario se aplica `entero`.
