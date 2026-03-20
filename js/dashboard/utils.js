(function ($, Drupal) {
  "use strict";

  window.visorProject = window.visorProject || {};

  let bloqueadoPorHistorial = false;

  window.visorProject.utils = {
    

      calcularCortesJenks: function (datos, numClases = 5) {
          // 1. Validación de existencia de la librería y datos
          if (typeof ss === 'undefined' || !datos || datos.length === 0) {
              return [];
          }

          // 2. Limpieza de datos: Solo números válidos y quitamos duplicados
          // ckmeans falla si hay menos valores únicos que clases
          const valoresUnicos = [...new Set(datos.filter(d => typeof d === 'number' && !isNaN(d)))];

          if (valoresUnicos.length === 0) return [];

          // 3. Blindaje: Ajustamos el número de clases a la realidad de los datos
          // Si tenemos 3 valores únicos, no podemos pedir 5 clases. Máximo 3.
          const clasesReales = Math.min(numClases, valoresUnicos.length);

          try {
              // ckmeans devuelve arrays de clusters: [[v1, v2], [v3], [v4, v5]]
              // Obtenemos el valor máximo de cada cluster para los cortes
              return ss.ckmeans(datos.filter(d => !isNaN(d)), clasesReales)
                       .map(cluster => cluster[cluster.length - 1]);
          } catch (error) {
              console.error("Error en el cálculo de Jenks:", error);
              // Fallback: Si falla Jenks, devolvemos el valor máximo y mínimo como corte básico
              return [Math.min(...valoresUnicos), Math.max(...valoresUnicos)];
          }
      },


    // Verifica que en utils.js tengas exactamente esto:
    actualizarURL: function (visorEstado) {
        if (bloqueadoPorHistorial) return;

        const params = new URLSearchParams();
        params.set('ambito', visorEstado.ambito || 'municipio');
        params.set('tab', visorEstado.tab || 0);
        params.set('indicador', visorEstado.indicador || 'rit');
        
        // Si existe etiqueta (rellenada en difundirDatos), la metemos en la URL como 'nombre'
        if (visorEstado.etiqueta) {
            params.set('nombre', visorEstado.etiqueta);
        }

        const nuevaURL = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(Object.assign({}, visorEstado), '', nuevaURL);
    },

    inicializarDesdeURL: function (visorEstado) {
      const params = new URLSearchParams(window.location.search);
      
      if (params.has('ambito') || params.has('indicador')) {
        visorEstado.ambito = params.get('ambito') || visorEstado.ambito;
        visorEstado.tab = parseInt(params.get('tab')) || 0;
        visorEstado.indicador = params.get('indicador') || visorEstado.indicador;
        visorEstado.etiqueta = params.get('nombre') || null;
      }
    },

    configurarEscuchaHistorial: function () {
      window.onpopstate = (event) => {
        if (event.state) {
          bloqueadoPorHistorial = true;
          // Actualizamos el estado global con el del historial
          Object.assign(window.visorProject.estado, event.state);
          
          // REACCIÓN: Aquí llamamos a la función de aplicar cambios
          // que crearemos en el orquestador (main.js)
          if (window.visorProject.aplicarEstadoGlobal) {
            window.visorProject.aplicarEstadoGlobal();
          }
          
          setTimeout(() => { bloqueadoPorHistorial = false; }, 100);
        }
      };
    },

    
    /**
     * Transforma un texto en un slug válido para clases CSS
     * Ej: "Santa Cruz de Tenerife" -> "santa-cruz-de-tenerife"
     */
    slugificar: function (texto) {
        if (!texto) return '';
        return texto.toString().toLowerCase()
            .normalize('NFD') // Descompone caracteres con tildes
            .replace(/[\u0300-\u036f]/g, '') // Elimina las tildes
            .trim()
            .replace(/\s+/g, '-') // Espacios por guiones
            .replace(/[^\w-]+/g, '') // Elimina todo lo que no sea letra, número o guion
            .replace(/--+/g, '-'); // Evita guiones dobles
    },

    /**
     * Genera el css con las siluetas de las islas y municipios
     * Se ejecuta desde la consola con window.visorProject.utils.generarArchivoSiluetas()
     * El css generado queda copiado en el portapapeles
     */ 
    generarArchivoSiluetas: function() {
        const siluetas = drupalSettings.visorProject.imagenes || {};
        const nombres = drupalSettings.visorProject.nombres || {}; // Asumiendo que tienes ID -> Nombre Real
        let css = "/* --- DICCIONARIO DE MÁSCARAS (AUTO-GENERADO) --- */\n\n";

        Object.keys(siluetas).forEach(id => {
            const pathData = siluetas[id];
            
            // 1. Obtenemos el nombre real del objeto de nombres o usamos el ID como fallback
            const nombreReal = nombres[id] || id;
            
            // 2. Slugificamos usando nuestra función independiente
            const slug = window.visorProject.utils.slugificar(nombreReal);
            
            // 3. Determinamos prefijo (isla o muni) según el ID original
            const ambito = id.startsWith('isla_') ? 'isla' : 'muni';
            const nombreClase = `silueta-bg-${slug}`;

            // 4. Construimos el Data URI
            const svgString = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 -100 100 100'><path d='${pathData}'/></svg>`;
            const svgBase64 = btoa(svgString);
            const uri = `url("data:image/svg+xml;base64,${svgBase64}")`;

            // 5. Generamos la línea de CSS (usando la variable para las variantes)
            css += `.${nombreClase} { --mask-uri: ${uri}; mask-image: ${uri}; -webkit-mask-image: ${uri}; }\n`;
        });

        console.log(css);
        // Intentamos copiar al portapapeles si el navegador lo permite
        if (copy) {
            copy(css);
            console.log("¡Copiado al portapapeles! Pégalo en siluetas.css");
        }
    },

    formatearDato: function(valor, tipo) {
        // 1. Manejo de nulos y vacíos
        if (valor === null || valor === undefined || valor === "") return "-";
        if (tipo === 'literal') return valor;

        // 2. Intentar convertir a número (limpieza preventiva)
        const num = parseFloat(valor);
        if (isNaN(num)) return valor; // Si no es convertible (y no es literal), devolvemos tal cual

        // 3. Extraer base y precisión (ej: decimal_2 -> base: decimal, precision: 2)
        const parts = tipo.split('_');
        const formatoBase = parts[0];
        const precision = parseInt(parts[1]) || 0;

        // 4. Configuración común de Intl (incluyendo el "always" para alineación visual)
        const nf = new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision,
            useGrouping: 'always' 
        });

        // 5. Lógica según tipo
        switch (formatoBase) {
            case 'entero':
                // Forzamos precisión 0 para enteros independientemente de lo que diga el sufijo
                return new Intl.NumberFormat('es-ES', { 
                    minimumFractionDigits: 0, 
                    maximumFractionDigits: 0, 
                    useGrouping: 'always' 
                }).format(num);

            case 'decimal':
                return nf.format(num);

            case 'porcentaje':
                return `${nf.format(num)}%`;

            default:
                return valor;
        }
    },

    

    descargarCSV: function(datos, nombreArchivo) {
        if (!datos || !datos.length) return;

        // 1. Extraer cabeceras (las keys del primer objeto)
            const cabeceras = Object.keys(datos[0]);
            
            // 2. Construir el contenido CSV
            const filas = datos.map(row => 
                cabeceras.map(campo => {
                    let valor = row[campo] === null ? '' : row[campo];
                    // Escapar comillas dobles y envolver en comillas para evitar errores con comas
                    return `"${String(valor).replace(/"/g, '""')}"`;
                }).join(';') // Usamos punto y coma para mejor compatibilidad con Excel en España
            );

            const contenidoCSV = [cabeceras.join(';'), ...filas].join('\n');

            // 3. Crear el "Blob" y el enlace de descarga
            const blob = new Blob(["\ufeff" + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            
            link.setAttribute("href", url);
            link.setAttribute("download", `${nombreArchivo}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },

    actualizarBreadcrumb: function(props) {
        const $listas = jQuery('.panel-breadcrumb-lista');
        if (!$listas.length || !props) return;

        const snapshot = drupalSettings.visorProject.datosDashboard || [];
        const items = [];

        // Siempre Canarias
        const registroCanarias = snapshot.find(d => d.ambito === 'canarias');
        if (registroCanarias) {
            items.push({
                etiqueta: 'Canarias',
                record: registroCanarias,
                activo: props.ambito === 'canarias'
            });
        }

        // Si es isla o municipio, añadir la isla
        if (props.ambito === 'isla' || props.ambito === 'municipio') {
            const registroIsla = snapshot.find(d => d.ambito === 'isla' && d.isla_id === props.isla_id);
            if (registroIsla) {
                items.push({
                    etiqueta: registroIsla.etiqueta,
                    record: registroIsla,
                    activo: props.ambito === 'isla'
                });
            }
        }

        // Si es municipio, añadir el municipio
        if (props.ambito === 'municipio') {
            items.push({ etiqueta: props.etiqueta, record: props, activo: true });
        }

        $listas.empty();
        items.forEach(function(item) {
            const $li = jQuery('<li class="breadcrumb-item"></li>');
            if (item.activo) {
                $li.addClass('breadcrumb-item--activo').text(item.etiqueta);
            } else {
                const $btn = jQuery('<button class="breadcrumb-enlace" type="button"></button>').text(item.etiqueta);
                $btn.on('click', function() {
                    if (window.visorProject.difundirDatos) {
                        window.visorProject.difundirDatos(item.record);
                    }
                });
                $li.append($btn);
            }
            $listas.append($li);
        });
    }

  };

})(window.jQuery, window.Drupal);



/*
 *
 * -- Consulta optimizada para mayor definición
SELECT json_object_agg(clave, path) 
FROM (
  SELECT 
    clave,
    ST_AsSVG(
      ST_Scale(
        ST_Translate(geom, -ST_XMin(geom), -ST_YMin(geom)), 
        100/NULLIF(GREATEST(ST_XMax(geom)-ST_XMin(geom), ST_YMax(geom)-ST_YMin(geom)), 0), 
        100/NULLIF(GREATEST(ST_XMax(geom)-ST_XMin(geom), ST_YMax(geom)-ST_YMin(geom)), 0)
      ), 
      1, 3 -- <--- Cambiamos la precisión de 1 a 3 decimales
    ) AS path
  FROM (
    SELECT 'canarias' AS clave, ST_SimplifyPreserveTopology(geom, 0.0003) as geom FROM canarias
    UNION ALL
    SELECT 'isla_' || id, ST_SimplifyPreserveTopology(geom, 0.0001) as geom FROM islas
    UNION ALL
    SELECT 'muni_' || id, ST_SimplifyPreserveTopology(geom, 0.0001) as geom FROM municipios
  ) sub
) AS siluetas_finales;
 *
 */
