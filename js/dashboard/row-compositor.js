// row-compositor.js
(function ($, Drupal) {
  "use strict";

  window.visorProject = window.visorProject || {};

  window.visorProject.rowCompositor = {
    
    /**
     * Función Maestra: Procesa el esquema y construye el Dashboard
     */
    componer: function(esquema, props) {
      const $destinoGlobal = jQuery(esquema[0].destino).empty();
      if (!$destinoGlobal.length) return;

      esquema.forEach(bloque => {
        // 1. Creamos el marco del bloque (Título, intro, etc.)
        const wrapper = window.visorProject.utilsLayout.crearContenedor({
          titulo: bloque.tituloBloque,
          intro: bloque.intro,
          clases: bloque.clases || [],
          notas: bloque.notas || null,
          ancho: '12', // Los bloques suelen ir a ancho completo
        });

        // 2. Creamos la fila interna de Bootstrap para los elementos
        const $filaInterna = jQuery('<div class="row"></div>');
        
        // 3. Iteramos por cada elemento (Gráfico, Tabla, Imagen...)
        //~ bloque.elementos.forEach(item => {
          //~ const columna = this.crearColumna(item.ancho);
          //~ const contenido = this.fabricarElemento(item, props);

          //~ if (contenido) {
            //~ columna.appendChild(contenido);
            //~ $filaInterna.append(columna);
          //~ }
        //~ });

        this.procesarElementos(bloque.elementos, $filaInterna, props);

        // 4. Ensamblamos: Contenido -> Body del Wrapper -> Destino Final
        jQuery(wrapper.body).append($filaInterna);
        $destinoGlobal.append(wrapper.elemento);
      });
    },

    procesarElementos: function(elementos, $contenedorParent, props) {
        elementos.forEach(item => {
            
            if (item.tipo === 'pack') {
                const columnaPack = this.crearColumna(item.ancho);
                
                const packWrapper = document.createElement('div');
                // Inyectamos las clases base + la clase personalizada si existe
                const clasePersonalizada = item.clasePack || '';
                packWrapper.className = `dashboard-pack-container d-flex flex-column h-100 ${clasePersonalizada}`;

                if (item.tituloPack) {
                    const titulo = document.createElement('h4');
                    titulo.className = "pack-title mdc-typography--headline6";
                    titulo.textContent = item.tituloPack;
                    packWrapper.appendChild(titulo);
                }

                const packBody = document.createElement('div');
                packBody.className = "pack-body d-flex flex-column flex-grow-1";

                item.elementos.forEach(subItem => {
                    const contenido = this.fabricarElemento(subItem, props);
                    if (contenido) {
                        packBody.appendChild(contenido);
                    }
                });

                packWrapper.appendChild(packBody);
                columnaPack.appendChild(packWrapper);
                $contenedorParent.append(columnaPack);
            } 
            else {
                // Elemento simple (comportamiento normal)
                const columna = this.crearColumna(item.ancho);
                const contenido = this.fabricarElemento(item, props);
                if (contenido) {
                    columna.appendChild(contenido);
                    $contenedorParent.append(columna);
                }
            }
        });
    },

    /**
     * El "Discriminador": Decide qué utilidad llamar según el tipo
     */
    fabricarElemento: function(item, props) {
      let elementoDOM = null;

      switch (item.tipo) {
        case 'grafico':
          elementoDOM = this.manejarGrafico(item, props);
          break;
        
        case 'tabla':
          elementoDOM = this.manejarTabla(item, props);
          break;

        case 'imagen':
          elementoDOM = this.manejarImagen(item, props);
          break;

        case 'widget':
          elementoDOM = this.manejarWidget(item, props);
          break;
          

        default:
          console.warn(`Tipo de elemento no soportado: ${item.tipo}`);
      }

      return elementoDOM;
    },

    /**
     * Gestores específicos para cada tipo
     */
    manejarGrafico: function(item, props) {
        const config = window.CONFIG_GRAFICOS[item.id];
        if (!config) return null;

        const datosFinales = window.visorProject.dataSelector.seleccionar(props, config);
        if (!datosFinales || datosFinales.length === 0) return null;

        const uniqueId = `canvas-${item.id}-${Math.floor(Math.random() * 10000)}`;
        const instanciaConfig = { ...config, canvasId: uniqueId };

        // 1. Renderizar contenedor base
        const graficoDOM = window.visorProject.utilsGraficos.crearContenedorGrafico(instanciaConfig, datosFinales);
        
        // 2. INYECTAR BOTÓN FULLSCREEN
        this.añadirFuncionalidadFullscreen(graficoDOM);

        if (graficoDOM) {
            window.visorProject.utilsGraficos.activarObservador(graficoDOM, instanciaConfig, datosFinales);
        }
        
        return graficoDOM;
    },

    manejarWidget: function(item,props) {
      const config = window.CONFIG_WIDGETS[item.id];
      if (!config) return null;

      const widgetDOM = window.visorProject.utilsWidgets.crearWidget(config, props);

      return widgetDOM;
    },

    añadirFuncionalidadFullscreen: function(contenedor) {
        const tpl = document.getElementById('tpl-btn-fullscreen');
        if (!tpl) return;

        const btn = tpl.content.cloneNode(true).querySelector('button');
        
        btn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                if (contenedor.requestFullscreen) {
                    contenedor.requestFullscreen();
                } else if (contenedor.webkitRequestFullscreen) {
                    contenedor.webkitRequestFullscreen();
                }
            } else {
                document.exitFullscreen();
            }
        });

        // Buscamos el header (tanto gráfico-header como tabla-header si lo tienes así)
        const header = contenedor.querySelector('.header-tools');
        if (header) {
            header.appendChild(btn);
        }
    },

    añadirFuncionalidadDescarga: function(datos, titulo, contenedor) {
        const toolsContainer = contenedor.querySelector('.header-tools');

        if (toolsContainer) {
            const btnDescarga = document.createElement('button');
            btnDescarga.className = 'btn-descarga-csv';
            btnDescarga.style.cssText = "border: none; background: transparent; cursor: pointer; padding: 0 8px;";
            btnDescarga.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
            `;

            
            
            btnDescarga.onclick = () => {
                const fecha = new Date().toISOString().split('T')[0];
                const nombreArchivo = titulo + '_' + fecha;
                const datosLimpios = JSON.parse(contenedor.dataset.csvLimpio || "[]");
                window.visorProject.utils.descargarCSV(datosLimpios, nombreArchivo);
            };

            toolsContainer.appendChild(btnDescarga);
        }
    },


    manejarTabla: function(item, props) {
        const motorTablas = window.visorProject.utilsTablas;
        const selector = window.visorProject.dataSelector;
        const config = window.CONFIG_TABLAS[item.id];
        const descargable = config.descargable || false;
        const titulo = config.titulo;

        if (!motorTablas || !config || !selector) return null;

        // 1. OBTENCIÓN DE DATOS: El selector aplica filtros, agrupaciones y ORDENACIÓN
        const datosParaMotor = selector.seleccionar(props, config);
        
        // 2. Preparar el dataset (formateo de celdas, comparativas, etc.)
        const dataset = motorTablas.prepararDataset(config, datosParaMotor, props);

        // 3. Validación: ¿Hay algo que mostrar?
        if (!dataset || dataset.length === 0) return null;

        // 4. Fabricar el DOM de la tabla
        const tablaDOM = motorTablas.crearTabla(config, dataset);

        if (descargable) {
          this.añadirFuncionalidadDescarga(datosParaMotor, titulo, tablaDOM);
        }

        // 5. INYECTAR BOTÓN FULLSCREEN
        // Solo si la tabla se ha creado correctamente, le añadimos el botón de expansión
        if (tablaDOM) {
            this.añadirFuncionalidadFullscreen(tablaDOM);
        }

        return tablaDOM;
    },


    // row-compositor.js -> manejarImagen
    manejarImagen: function(item, props) {
        // Delegación absoluta. El compositor no sabe qué es un SVG ni qué es un Path.
        if (window.visorProject.utilsImagenes) {
            return window.visorProject.utilsImagenes.procesarImagen(item, props);
        }
        return null;
    },

    /**
     * Crea el div de la columna con las clases de Bootstrap
     */
    crearColumna: function(ancho) {
      const col = document.createElement('div');
      col.className = `col-md-${ancho || '12'} col-sm-12 mb-4 d-flex align-items-stretch`;
      return col;
    }
  };

})(window.jQuery, window.Drupal);
