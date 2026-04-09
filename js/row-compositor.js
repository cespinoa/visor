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
        if (!this._ambitoPermitido(bloque, props)) return;

        // 1. Creamos el marco del bloque (Título, intro, etc.)
        const wrapper = window.visorProject.utilsLayout.crearContenedor({
          titulo: bloque.tituloBloque,
          intro: bloque.intro,
          clases: bloque.clases || [],
          notas: bloque.notas || null,
          ancho: '12', // Los bloques suelen ir a ancho completo
        });

        // Forzar break-inside:auto con estilo inline para que WeasyPrint
        // permita saltos de página dentro del bloque (más específico que CSS).
        if ((bloque.clases || []).includes('permite-saltos')) {
          wrapper.elemento.style.breakInside = 'auto';
          wrapper.elemento.style.pageBreakInside = 'auto';
        }

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

    _ambitoPermitido: function(item, props) {
        if (!item.ambito) return true;
        const permitidos = [].concat(item.ambito);
        return permitidos.includes(props.ambito);
    },

    procesarElementos: function(elementos, $contenedorParent, props) {
        elementos.forEach(item => {
            if (!this._ambitoPermitido(item, props)) return;

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
                    if (!this._ambitoPermitido(subItem, props)) return;
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
                // Si el elemento tiene ancho-pdf, la columna ocupa el ancho
                // completo para que el porcentaje se calcule sobre la página,
                // no sobre una columna estrecha.
                const anchoColumna = item['ancho-pdf'] ? '12' : item.ancho;
                const columna = this.crearColumna(anchoColumna);
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

        case 'longtext':
          elementoDOM = this.manejarLongtext(item);
          break;

        case 'radares-islas':
          elementoDOM = this.manejarRadaresIslas(item, props);
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
        const graficoDOM = window.visorProject.utilsGraficos.crearContenedorGrafico(instanciaConfig, datosFinales, item);
        
        // 2. INYECTAR BOTÓN FULLSCREEN
        this.añadirFuncionalidadFullscreen(graficoDOM);

        if (graficoDOM) {
            window.visorProject.utilsGraficos.activarObservador(graficoDOM, instanciaConfig, datosFinales);
        }
        
        return graficoDOM;
    },

    /**
     * Renderiza un radar por cada isla, ordenadas orientales → centrales →
     * occidentales y alfabéticamente dentro de cada grupo.
     * El nombre de la isla actúa como subtítulo h2 dentro de la sección.
     */
    manejarRadaresIslas: function(item, props) {
      const config = window.CONFIG_GRAFICOS[item.id];
      if (!config) return null;

      const snapshot = drupalSettings.visorProject.datosDashboard || [];
      const ORDEN = [
        ['Lanzarote', 'Fuerteventura'],
        ['Gran Canaria', 'Tenerife'],
        ['El Hierro', 'La Gomera', 'La Palma'],
      ];

      const islas = ORDEN.flatMap(grupo =>
        grupo
          .map(nombre => snapshot.find(d => d.ambito === 'isla' && d.etiqueta === nombre))
          .filter(Boolean)
      );

      const wrapper = document.createElement('div');
      wrapper.className = 'radares-islas';

      islas.forEach((isla, index) => {
        const islaBloque = document.createElement('div');
        islaBloque.className = 'radar-isla-bloque';
        // Salto después de cada isla excepto la última, para que el título
        // de la sección no quede solo en la primera página.
        if (index < islas.length - 1) islaBloque.classList.add('salto-despues');

        const titulo = document.createElement('h2');
        titulo.className = 'radar-isla-titulo';
        titulo.textContent = isla.etiqueta;
        islaBloque.appendChild(titulo);

        const uniqueId = `canvas-${item.id}-${isla.isla_id || isla.etiqueta}-${Math.floor(Math.random() * 10000)}`;
        const instanciaConfig = { ...config, canvasId: uniqueId };

        const graficoDOM = window.visorProject.utilsGraficos.crearContenedorGrafico(instanciaConfig, isla, item);
        if (graficoDOM) {
          islaBloque.appendChild(graficoDOM);
          window.visorProject.utilsGraficos.activarObservador(graficoDOM, instanciaConfig, isla);
        }

        wrapper.appendChild(islaBloque);
      });

      return wrapper;
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

        // Tabla especial: índice de presión (no pasa por el selector/dataset estándar)
        if (config.tipo === 'indice-presion') {
            return motorTablas.crearTablaIndicePression(props);
        }

        // Tabla desde drupalSettings: no pasa por el dataSelector de snapshot
        if (config.fuente) {
            const datosRaw = (drupalSettings.visorProject || {})[config.fuente];
            if (!datosRaw) return null;
            const dataset = motorTablas.prepararDatasetFuente(config, datosRaw);
            if (!dataset || dataset.length === 0) return null;
            const tablaDOM = motorTablas.crearTabla(config, dataset);
            if (tablaDOM) this.añadirFuncionalidadFullscreen(tablaDOM);
            return tablaDOM;
        }

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


    /**
     * Renderiza un bloque de texto narrativo pre-cargado por _prefetchLongtexts.
     * El HTML ya tiene las sustituciones aplicadas por el servidor.
     */
    manejarLongtext: function(item) {
      if (!item._html) return null;
      const div = document.createElement('div');
      div.className = 'bloque-texto';
      div.innerHTML = item._html;
      return div;
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
