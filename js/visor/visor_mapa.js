(function ($, Drupal, drupalSettings, once) {
  Drupal.behaviors.visorMapa = {
    attach: function (context, settings) {
      const elements = once('visorMapa', '#mapa-visor', context);

      elements.forEach(function (el) {

          // --- DECLARAR VARIABLES DE COMPONENTES AQUÍ ---
          let tabBar;
          let bloqueadoPorHistorial = false;

          window.visorEstado = {
              ambito: 'isla', // canarias, isla, municipio
              etiqueta: null,
              tab: 'dashboard',       // dashboard, mapa, graficos, datos
              indicador: 'pvv_vh'  //presión sobre la vivienda vacacional
          };

          function actualizarURL(modo = 'push') {
              if (bloqueadoPorHistorial) return;
              const params = new URLSearchParams();
              
              params.set('ambito', visorEstado.ambito);
              //~ if (visorEstado.id) params.set('id', visorEstado.id);
              if (visorEstado.etiqueta) {
                  params.set('nombre', visorEstado.etiqueta);
              }
              params.set('tab', visorEstado.tab);
              params.set('indicador', visorEstado.indicador);

              const nuevaURL = `${window.location.pathname}?${params.toString()}`;
              
              // Esto cambia la URL en la barra del navegador de forma silenciosa y guarda una copia
              const copiaEstado = Object.assign({}, visorEstado);
              window.history.pushState(copiaEstado, '', nuevaURL);
              
          }

        function inicializarDesdeURL() {
          const params = new URLSearchParams(window.location.search);
          
          if (params.has('ambito')) {
              visorEstado.ambito = params.get('ambito');
              visorEstado.etiqueta = params.get('nombre');
              visorEstado.tab = params.get('tab') || 0;
              visorEstado.indicador = params.get('indicador') || 'pvv_vh';
              const copiaInicial = Object.assign({}, visorEstado);
              window.history.replaceState(copiaInicial, '', window.location.href);
              aplicarEstado(visorEstado);
          } else {
              aplicarEstado({ambito: 'canarias', tab: 0, indicador: 'pvv_vh'});
          }
        }

        window.actualizarBreadcrumb = function(props) {
            const $list = $('#breadcrumb-list');
            $list.empty();

            // Estilo para los items
            const itemStyle = 'margin-right: 8px;';
            const linkStyle = 'color: #a70000; text-decoration: none; cursor: pointer; font-weight: 500;';
            const separator = '<span style="margin-right: 8px; color: #ccc;">/</span>';

            // 1. Nivel Raíz: Canarias (Siempre presente)
            const $canarias = $(`<li style="${itemStyle}"><span style="${linkStyle}">Canarias</span></li>`);
            $canarias.on('click', () => {
                aplicarEstado({ambito: 'canarias', tab: visorEstado.tab, indicador: visorEstado.indicador});
                actualizarURL();
            });
            $list.append($canarias);

            // 2. Nivel Isla
            if (props.ambito === 'isla' || props.ambito === 'municipio') {
                $list.append(separator);
                const nombreIsla = props.ambito === 'isla' ? props.etiqueta : props.isla_nombre_ref;
                const $isla = $(`<li style="${itemStyle}"><span style="${linkStyle}">${nombreIsla}</span></li>`);
                
                $isla.on('click', () => {
                    aplicarEstado({ambito: 'isla', etiqueta: nombreIsla, tab: visorEstado.tab, indicador: visorEstado.indicador});
                    actualizarURL();
                });
                $list.append($isla);
            }

            // 3. Nivel Municipio (Solo si estamos en un municipio)
            if (props.ambito === 'municipio') {
                $list.append(separator);
                const $municipio = $(`<li style="${itemStyle}; color: #333;">${props.etiqueta}</li>`);
                $list.append($municipio);
            }
        };

        function actualizarConJenks() {
            if (!map.isSourceLoaded('municipios_source')) {
                map.once('sourcedata', actualizarConJenks);
                return;
            }

            const idInd = visorEstado.indicador;
            const ambitoActual = visorEstado.ambito;
            
            let features = map.querySourceFeatures('municipios_source', {
                sourceLayer: 'v_main_map'
            });

            filterAmbito = ambitoActual;
            if (filterAmbito === 'canarias') {
              filterAmbito = 'isla';
            }

            // 1. Filtrado de IDs únicos (imprescindible por las teselas)
            const uniqueFeatures = Array.from(
                new Map(features
                    .filter(f => f.properties.ambito === filterAmbito)
                    .map(f => [f.properties.id, f])
                ).values()
            );

            // 2. Extraer TODOS los valores (sin Set)
            const valores = uniqueFeatures
                .map(f => parseFloat(f.properties[idInd]))
                .filter(v => !isNaN(v))
                .sort((a, b) => a - b);


            if (valores.length > 0) {
                try {
                    // Calculamos el número de clases basándonos en VALORES ÚNICOS para no romper ss.ckmeans
                    const valoresUnicos = [...new Set(valores)];
                    const numClases = Math.min(5, valoresUnicos.length);
                    
                    if (numClases < 2) {
                        const cortesSimples = [valores[valores.length - 1]];
                        aplicarEstiloMapa(idInd, cortesSimples);
                        dibujarLeyendaJenks(idInd, cortesSimples);
                        return;
                    }

                    // --- LA CLAVE ---
                    // Pasamos 'valores' (los 88 registros), no 'valoresUnicos'
                    let cortes = ss.ckmeans(valores, numClases).map(cluster => cluster[cluster.length - 1]);
                    
                    // Si por precisión matemática ckmeans nos da cortes duplicados, los limpiamos
                    cortes = [...new Set(cortes)].sort((a, b) => a - b);

                    console.log("Cortes calculados:", cortes); // Para que verifiques en consola

                    aplicarEstiloMapa(idInd, cortes);
                    dibujarLeyendaJenks(idInd, cortes);


                } catch (error) {
                    console.error("Error calculando Jenks:", error);
                    const fallbackCortes = [valores[Math.floor(valores.length/2)], valores[valores.length-1]];
                    aplicarEstiloMapa(idInd, fallbackCortes);
                }
            }
        }

        

        function aplicarEstiloMapa(idInd, cortes) {
            if (!cortes || cortes.length === 0) return;
            console.log('Cortes' + cortes)
            // Paleta de rojos (5 niveles)
            const colores = ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'];

            // 1. Crear el estilo 'step' dinámico
            // 'step' funciona así: [color_base, corte_1, color_1, corte_2, color_2...]
            let estiloColor = ['step', ['to-number', ['get', idInd], 0], colores[0]];
            
            // IMPORTANTE: Iteramos hasta cortes.length - 1 para asegurar que
            // cada corte introducido tenga un color de cierre.
            // Además, limitamos a la longitud de nuestra paleta de colores.
            for (let i = 0; i < cortes.length - 1 && i < colores.length - 1; i++) {
                estiloColor.push(cortes[i]);    // El límite del rango
                estiloColor.push(colores[i+1]); // El color para valores superiores a ese límite
            }

            if (map.getLayer('municipios-fill')) {
                map.setPaintProperty('municipios-fill', 'fill-color', estiloColor);
            }

            // 2. Actualizar la Leyenda Discreta
            const scaleElem = document.getElementById('legend-scale');
            if (scaleElem) {
                scaleElem.innerHTML = '';
                
                let inicioRango = 0;
                const fmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

                // En la leyenda iteramos todos los cortes disponibles
                cortes.forEach((finRango, i) => {
                    // Seguridad: no intentar usar un color que no existe si hay más cortes que colores
                    const colorFondo = colores[i] || colores[colores.length - 1];
                    
                    const item = document.createElement('div');
                    item.className = 'legend-item';
                    item.innerHTML = `
                        <div class="legend-color-box" style="background: ${colorFondo}"></div>
                        <span>${fmt.format(inicioRango)} - ${fmt.format(finRango)}</span>
                    `;
                    scaleElem.appendChild(item);
                    inicioRango = finRango; 
                });
            }
        }

        function dibujarLeyendaJenks(idIndicador, cortes) {
            const scaleElem = document.getElementById('legend-scale');
            const titleElem = document.getElementById('legend-title');
            
            // 1. Título amigable
            titleElem.innerText = idIndicador.replace(/_/g, ' ').toUpperCase();

            // 2. Limpiar contenido anterior
            scaleElem.innerHTML = '';

            const colores = ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'];
            const fmt = new Intl.NumberFormat('es-ES', { 
                maximumFractionDigits: 2,
                minimumFractionDigits: 0 
            });

            let inicioRango = 0;

            cortes.forEach((finRango, i) => {
                const item = document.createElement('div');
                item.className = 'legend-item';
                
                // Formateo de los números para que no sean excesivamente largos
                const labelText = i === 0 
                    ? `< ${fmt.format(finRango)}` 
                    : `${fmt.format(inicioRango)} - ${fmt.format(finRango)}`;

                item.innerHTML = `
                    <div class="legend-color-box" style="background: ${colores[i]}"></div>
                    <span>${labelText}</span>
                `;
                
                scaleElem.appendChild(item);
                inicioRango = finRango;
            });
        }

        window.SocialManager = {
            share: (plataforma) => {
                // 1. Definimos las constantes al inicio para evitar ReferenceError
                const urlRaw = window.location.href;
                const etiqueta = $('#ficha-titulo').text() || 'Canarias';
                const textoBase = `Análisis de presión turística en ${etiqueta}: `;
                
                const urlEncoded = encodeURIComponent(urlRaw);
                const textEncoded = encodeURIComponent(textoBase);
                
                let shareUrl = '';

                switch (plataforma) {
                    case 'whatsapp':
                        shareUrl = `https://wa.me/?text=${textEncoded}${urlEncoded}`;
                        break;
                    case 'telegram':
                        shareUrl = `https://t.me/share/url?url=${urlEncoded}&text=${textEncoded}`;
                        break;
                    case 'bluesky':
                        shareUrl = `https://bsky.app/intent/compose?text=${textEncoded}${urlEncoded}`;
                        break;
                    case 'twitter':
                        shareUrl = `https://twitter.com/intent/tweet?text=${textEncoded}&url=${urlEncoded}`;
                        break;
                    case 'facebook':
                        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${urlEncoded}`;
                        break;
                    case 'email':
                        shareUrl = `mailto:?subject=Visor de Presión Turística - ${etiqueta}&body=${textEncoded}${urlEncoded}`;
                        break;
                    case 'copy':
                        // --- MÉTODO DE COPIADO ROBUSTO ---
                        if (navigator.clipboard && window.isSecureContext) {
                            navigator.clipboard.writeText(urlRaw).then(() => {
                                alert("Enlace copiado al portapapeles");
                            }).catch(err => {
                                console.error('Error con navigator.clipboard, usando fallback', err);
                                SocialManager.fallbackCopy(urlRaw);
                            });
                        } else {
                            SocialManager.fallbackCopy(urlRaw);
                        }
                        return; // Salimos de la función ya que no abrimos ventana
                }
                
                if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
            },

            // Función auxiliar para copiar en entornos no seguros (HTTP / IP local)
            fallbackCopy: (texto) => {
                const textArea = document.createElement("textarea");
                textArea.value = texto;
                // Aseguramos que el textarea no sea visible pero esté en el DOM
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    alert("Enlace copiado al portapapeles");
                } catch (err) {
                    alert("No se pudo copiar el enlace automáticamente.");
                }
                document.body.removeChild(textArea);
            }
        };
        

        window.onpopstate = function(event) {
            if (event.state) {
                bloqueadoPorHistorial = true; // Bloqueamos la escritura de URL
                visorEstado = Object.assign({}, event.state);
                aplicarEstado(visorEstado);
                
                // Desbloqueamos después de un breve instante
                setTimeout(() => { bloqueadoPorHistorial = false; }, 100);
            }
        };

        // --- ACTIVACIÓN ÚNICA DE PESTAÑAS (MDC WAY) ---
        const tabBarEl = document.querySelector('.mdc-tab-bar');
        if (tabBarEl) {
            tabBar = mdc.tabBar.MDCTabBar.attachTo(tabBarEl);
            
            tabBar.listen('MDCTabBar:activated', function (event) {
                const index = event.detail.index;

                if (index === 1) {
                    // Estamos en la pestaña MAPA: Mostrar selectores con una transición suave
                    $('.sidebar-controls').fadeIn(400);
                } else {
                    // Estamos en Gráficos o Datos: Ocultar selectores
                    $('.sidebar-controls').fadeOut(400);
                }

                $('.tab-panel').removeClass('tab-panel--active');

                if (index === 0) { 
                    $('#panel-dashboard').addClass('tab-panel--active');
                }
                
                else if (index === 1) { 
                    $('#panel-mapa').addClass('tab-panel--active'); 
                    setTimeout(() => { map.resize(); }, 100); 
                }
                else if (index === 2) { 
                    $('#panel-graficos').addClass('tab-panel--active'); 
                }
                else if (index === 3) { 
                    $('#panel-datos').addClass('tab-panel--active'); 
                }

                visorEstado.tab = index; // 1. Sincronizamos el estado
                actualizarURL(); // 2. Reflejamos en la barra de direcciones
            });
        }

        // --- B. ACTIVAR EFECTO RIPPLE EN BOTONES (Opcional pero recomendado) ---
        $(context).find('.mdc-button, .mdc-tab').each(function() {
          mdc.ripple.MDCRipple.attachTo(this);
        });

        // --- C. ACTIVAR CARDS (Elevación dinámica) ---
        $(context).find('.mdc-card').each(function() {
          // Si quieres que tengan interacción al pasar el ratón
          // mdc.ripple.MDCRipple.attachTo(this);
        });

        // --- D. DRAWER (Si has añadido la estructura de Sidebar MDC) ---
        const drawerEl = document.querySelector('.mdc-drawer');
        if (drawerEl) {
          const drawer = mdc.drawer.MDCDrawer.attachTo(drawerEl);
          // Para abrir/cerrar en móvil:
          $('#menu-toggle').on('click', () => drawer.open = !drawer.open);
        }
            

        const map = new maplibregl.Map({
            container: el,
            style: {
                "version": 8,
                "sources": {},
                "layers": [
                    {
                        "id": "background",
                        "type": "background",
                        "paint": { "background-color": "#f8f9fa" }
                    }
                ]
            },
            // Subimos la latitud de 28.3 a 28.6 para centrar visualmente el archipiélago
            center: [-15.7, 28.6], 
            zoom: 7.6,
            // Ajustamos el "techo" y el "suelo" para que el rebote sea más natural
            maxBounds: [[-21.0, 25.2], [-10.5, 32.0]]
        });

        // --- 2. FUNCIÓN MAESTRA DE ACTUALIZACIÓN (Tu lógica original intacta) ---
        window.actualizarDashboard = function(props) {
          if (!props) return;

          window.actualizarBreadcrumb(props);

          // Títulos
          $('#ficha-titulo').text(`${props.etiqueta}`);
          $('#grafico-titulo').text(`Análisis: ${props.etiqueta}`);

          // Tab DATOS: Inyectar componentes
          $('#ficha-resumen').html(VisorComponents.renderKPI(props));
          
          
          
          $('#ficha-contenido').html(
            VisorComponents.renderTablaViviendas(props) + 
            VisorComponents.renderTablaCarga(props) + 
            VisorComponents.renderTablaOferta(props) + 
            VisorComponents.renderTablaIntensidad(props) + 
            VisorComponents.renderTablaPresionHumana(props) +
            VisorComponents.renderTablaDistribucionVV(props) +
            VisorComponents.renderTablaPresionVVVivienda(props) +
            VisorComponents.renderTablaDistribucionReglado(props) +
            VisorComponents.renderTablaDistribucionPlazasVV(props) +
            VisorComponents.renderResumenResidencial(props)
          );

          $('#ficha-localidades').html(VisorComponents.renderSeccionLocalidades(props));

          const contPresionVivienda = 'wrapper-presion-vivienda';
          const tituloVivienda = "Presión sobre la Vivienda";
          const contPresionHumana = 'wrapper-presion';
          const tituloHumana = "Presión Humana";
          const contDistorsionModelo = 'wrapper-distorsion-modelo';
          const tituloDistorsionModelo = "Distorsión del modelo";
          // Tab GRÁFICOS: Inyectar UI
          $('#panel-graficos').html(VisorComponents.renderSeccionGraficos(props));
          //~ $('#wrapper-donuts').html(VisorComponents.renderDonutsUI());
          $('#wrapper-gauges').html(VisorComponents.renderGaugesUI(GAUGES_PRESION_VIVIENDA, contPresionVivienda, tituloVivienda));
          $('#wrapper-gauges').append(VisorComponents.renderGaugesUI(GAUGES_PRESION_HUMANA, contPresionHumana, tituloHumana));
          $('#wrapper-gauges').append(VisorComponents.renderGaugesUI(GAUGES_DISTORSION_MODELO, contDistorsionModelo, tituloDistorsionModelo));
          $('#wrapper-radar').html(VisorComponents.renderRadarUI(props));

          // Tab GRÁFICOS: Inicializar lógica técnica
          if (typeof inicializarDonuts === 'function') inicializarDonuts(props);
          if (typeof inicializarRadar === 'function') inicializarRadar(props);
          
          setTimeout(() => {
            if (typeof window.inicializarGauges === 'function') window.inicializarGauges(props, GAUGES_PRESION_VIVIENDA, contPresionVivienda);
            if (typeof window.inicializarGauges === 'function') window.inicializarGauges(props, GAUGES_PRESION_HUMANA, contPresionHumana);
            if (typeof window.inicializarGauges === 'function') window.inicializarGauges(props, GAUGES_DISTORSION_MODELO, contDistorsionModelo);
          }, 150);
        };



        // INICIO DE MAP ON LOAD
        // =====================
        map.on('load', () => {
            const layers = map.getStyle().layers;
            let firstLabelId = layers.find(l => l.type === 'symbol')?.id;

            map.addSource('municipios_source', {
                'type': 'vector',
                'tiles': ['https://vtp.carlosespino.es/martin/mv_full_snapshots_dashboard/{z}/{x}/{y}']
            });

            map.addSource('etiquetas_source', {
                'type': 'vector',
                'tiles': ['https://vtp.carlosespino.es/martin/v_mapa_etiquetas/{z}/{x}/{y}']
            });

            map.addLayer({
                'id': 'etiquetas-nombres',
                'type': 'symbol',
                'source': 'etiquetas_source', // La fuente que apunta a la nueva vista
                'source-layer': 'v_mapa_etiquetas',
                'filter': ['==', ['get', 'ambito'], visorEstado.ambito],
                'layout': {
                    'text-field': ['get', 'etiqueta'],
                    'text-font': ['Open Sans Regular'],
                    'text-size': 13,
                    'text-justify': 'center',
                    'text-anchor': 'center',
                    'text-padding': 10,

                    'text-allow-overlap': false 
                },
                'paint': {
                    'text-color': '#000',
                    'text-halo-color': 'rgba(255, 255, 255, 0.8)',
                    'text-halo-width': 3
                }
            });

            // Capa para el borde resaltado (inicialmente vacía)
            map.addLayer({
                'id': 'municipio-highlight',
                'type': 'line',
                'source': 'municipios_source',
                'source-layer': 'v_main_map',
                'paint': {
                    'line-color': '#000', // Borde negro o un rojo más oscuro
                    'line-width': 2.5
                },
                'filter': ['==', ['get', 'id'], ''] // Filtro vacío para que no brille nada al empezar
            });

            map.addLayer({
                'id': 'municipios-fill',
                'type': 'fill',
                'source': 'municipios_source',
                'source-layer': 'v_main_map',
                'paint': {
                    'fill-color': '#fff5f5',
                    'fill-opacity': 0.7,
                    'fill-outline-color': '#a70000'
                },
                // CAMBIO 1: En lugar de 'municipio', usamos el valor que venga del visorEstado (URL)
                'filter': ['==', ['get', 'ambito'], visorEstado.ambito] 
            }, firstLabelId);

            map.once('idle', () => {
                // 1. Ejecutamos la lógica visual inicial (Jenks)
                actualizarConJenks();

                //~ // CAPTURA MEJORADA: 
                //~ // En lugar de capturar solo lo visible, pedimos todas las features de la fuente.
                //~ // Al no pasar un 'filter' o un 'bounds', intentamos extraer el cache completo.
                //~ const sourceFeatures = map.querySourceFeatures('municipios_source', {
                    //~ sourceLayer: 'v_main_map'
                //~ });

                //~ // IMPORTANTE: Si ves que siguen faltando islas, es porque el mapa no ha descargado
                //~ // los tiles de las islas lejanas. La solución definitiva es un Map para limpiar IDs:
                //~ window.visorEstado.repositorioDashboard = Array.from(
                    //~ new Map(sourceFeatures.map(f => [f.properties.id, f.properties])).values()
                //~ );

                //~ console.log("Total registros capturados para el Dashboard:", window.visorEstado.repositorioDashboard.length);

                // Inicializamos la tabla por primera vez
                if (typeof window.VisorVV.renderizarSuperTabla === 'function') {
                    window.VisorVV.renderizarSuperTabla();
                }
            });

            const actualizarCoropletico = () => {
                const indicador = $('#selector-indicador').val();
                const features = map.querySourceFeatures('municipios_source', { sourceLayer: 'v_main_map' });
                visorEstado.indicador = indicador;
                actualizarURL('replace'); 
            };

            $('#selector-indicador').on('change', actualizarCoropletico);
            $('#selector-indicador').on('change', actualizarConJenks);
            
            map.on('sourcedata', (e) => { if (e.isSourceLoaded) actualizarCoropletico(); });

            // CAMBIO 3: Ejecutamos buscarYActualizar inmediatamente para rellenar los datos de la URL
            if (typeof buscarYActualizar === 'function') {
                buscarYActualizar();
            }
        }); // Final de map on load

            

        // --- 4. SELECTOR DE ÁMBITO (SIDEBAR) ---
        $(context).find('input[name="ambito-mapa"]').on('change', function() {
            const ambito = $(this).val();
            visorEstado.ambito = ambito;
            if (visorEstado.ambito === 'canarias') {
                visorEstado.id = null; // Reset de ID si volvemos a nivel regional
                
            }
            actualizarURL();
            
            if (map.getLayer('municipios-fill')) {
                map.setFilter('municipios-fill', ['==', ['get', 'ambito'], ambito]);
                map.setFilter('etiquetas-nombres', ['==', ['get', 'ambito'], ambito]);
                // Forzamos actualización del color al cambiar de capa
                setTimeout(() => { $('#selector-indicador').trigger('change'); }, 100);
            }
        });

        // --- 5. EVENTOS DE INTERACCIÓN ---
        map.on('click', 'municipios-fill', (e) => {
          const ambitoActivo = $('input[name="ambito-mapa"]:checked').val();
          const feature = e.features.find(f => f.properties.ambito === ambitoActivo);


          
          if (feature) {
            visorEstado.ambito = ambitoActivo;
            //~ visorEstado.id = feature.properties.id;
            visorEstado.etiqueta = feature.properties.etiqueta;
            actualizarURL();
            window.actualizarDashboard(feature.properties);
            // Salto automático a gráficos tras click (usando el ID de tu pestaña)
            $('#tab-graficos').trigger('click'); 
          }
        });

        const tooltip = document.getElementById('map-tooltip');

        map.on('mousemove', 'municipios-fill', (e) => {
            if (e.features.length > 0) {
                const f = e.features[0];
                map.getCanvas().style.cursor = 'pointer';

                // 1. Resaltado del borde
                map.setFilter('municipio-highlight', ['==', ['get', 'id'], f.properties.id]);

                // 2. Obtener el nombre de la propiedad dinámicamente
                const idIndicador = visorEstado.indicador; // Ej: 'poblacion', 'densidad', etc.
                const valorRaw = f.properties[idIndicador];
                
                // 2. Intentar convertir a número (por si llega como string "123.45")
                const valorNum = (valorRaw !== undefined && valorRaw !== null) ? parseFloat(valorRaw) : NaN;

                let valorFormateado;

                // 3. Comprobar si realmente es un número válido tras la conversión
                if (!isNaN(valorNum)) {
                    const esPorcentaje = idIndicador.toLowerCase().includes('porcentaje') || idIndicador.toLowerCase().includes('ratio');
                    
                    // Si es porcentaje o tiene decimales (el resto de dividir por 1 no es 0)
                    if (esPorcentaje || valorNum % 1 !== 0) {
                        valorFormateado = new Intl.NumberFormat('es-ES', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }).format(valorNum) + (esPorcentaje ? ' %' : '');
                    } else {
                        // Es un número entero
                        valorFormateado = new Intl.NumberFormat('es-ES', {
                            maximumFractionDigits: 0
                        }).format(valorNum);
                    }
                } else {
                    // Si después de intentar convertir sigue sin ser un número (o está vacío)
                    valorFormateado = valorRaw || 'Sin datos'; 
                }

                // 3. Mostrar Tooltip
                tooltip.style.display = 'block';
                tooltip.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid #eee; padding-bottom: 2px;">
                        ${f.properties.etiqueta}
                    </div>
                    <div style="color: #a70000; font-weight: bold; font-size: 14px;">
                        ${valorFormateado}
                    </div>
                    <div style="font-size: 10px; color: #666; text-transform: uppercase; margin-top: 4px;">
                        ${idIndicador.replace(/_/g, ' ')}
                    </div>
                `;
                
                tooltip.style.left = (e.originalEvent.pageX + 15) + 'px';
                tooltip.style.top = (e.originalEvent.pageY + 15) + 'px';
            }
        });

        map.on('mouseenter', 'municipios-fill', () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', 'municipios-fill', () => {
            map.getCanvas().style.cursor = '';
            
            // Quitar resaltado y ocultar tooltip
            map.setFilter('municipio-highlight', ['==', ['get', 'id'], '']);
            tooltip.style.display = 'none';
        });

        window.actualizarOrden = (criterio) => {
          // Guardamos el nuevo criterio de orden
          window.currentSortCriterio = criterio;
          
          // Si tenemos los props guardados, volvemos a renderizar
          if (window.currentPropsCache) {
              const htmlActualizado = VisorComponents.renderSeccionLocalidades(window.currentPropsCache);
              $('#ficha-localidades').html(htmlActualizado);
          }
        };

        // Función para aplicar los parámetros de la url
        // ================================================================================
        const aplicarEstado = (estado) => {
          console.log('Aplicando:' + estado)
          if (!estado) return;

          if (tabBar) {
            const tabIndex = isNaN(estado.tab) ? 
                ['mapa', 'graficos', 'datos'].indexOf(estado.tab) : 
                parseInt(estado.tab);
            
            if (tabIndex >= 0) {
                tabBar.activateTab(tabIndex);
                $('.tab-panel').removeClass('tab-panel--active');
                $('.tab-panel').eq(tabIndex).addClass('tab-panel--active');
                if (tabIndex === 0 && map) setTimeout(() => map.resize(), 100);
            }
        }
          

        // 2. Sincronizar Selectores de la Sidebar
        $(`input[name="ambito-mapa"][value="${estado.ambito}"]`).prop('checked', true).trigger('change');
        if (estado.indicador) {
            $('#selector-indicador').val(estado.indicador).trigger('change');
        }


        if (map.getLayer('municipios-fill')) {
            map.setFilter('municipios-fill', ['==', ['get', 'ambito'], estado.ambito]);
        }

        const buscarYActualizar = () => {
            // 1. Si el mapa no ha cargado la fuente de datos, no podemos buscar nada.
            if (!map.getSource('municipios_source')) return;

            // 2. Creamos el "filtro de búsqueda". 
            // Queremos que coincida el ÁMBITO (isla/municipio) 
            // y el NOMBRE (la etiqueta que viene en la URL).
            let filtro;
            if (estado.ambito === 'canarias') {
                // Si es Canarias, buscamos el registro que representa al archipiélago
                filtro = ['==', ['get', 'ambito'], 'canarias'];
            } else {
                // Si es isla o municipio, buscamos por su nombre (etiqueta)
                filtro = ['all', 
                    ['==', ['get', 'ambito'], estado.ambito],
                    ['==', ['get', 'etiqueta'], estado.etiqueta]
                ];
            }

            // 3. Le pedimos al mapa que busque los datos con ese filtro
            const features = map.querySourceFeatures('municipios_source', {
                sourceLayer: 'v_main_map',
                filter: filtro
            });

            // 4. ¿Encontramos algo?
            if (features.length > 0) {
                console.log("Datos encontrados para:", estado.etiqueta || 'Canarias');
                
                // RELLENAMOS LOS GRÁFICOS Y TABLAS
                window.actualizarDashboard(features[0].properties);
                
                // AJUSTAMOS EL MAPA para que muestre el nivel correcto (Islas o Municipios)
                if (map.getLayer('municipios-fill')) {
                    map.setFilter('municipios-fill', ['==', ['get', 'ambito'], estado.ambito]);
                }
            } else {
                // 5. Si no hay datos (porque el mapa aún se está dibujando), 
                // le decimos que vuelva a intentarlo en cuanto esté "ocioso" (idle).
                console.log("Esperando a que el mapa cargue los datos de...", estado.etiqueta);
                map.once('idle', buscarYActualizar); 
            }
        };


        if (map.isStyleLoaded()) {
            buscarYActualizar();
        } else {
            map.on('load', buscarYActualizar);
        }

          
        };

        // Vistas guardadas
        window.VistasManager = {
            key: 'visor_vistas_guardadas',

            guardarActual: () => {
                // 1. Obtenemos el nombre: Etiqueta (título actual) + Nombre de la Tab
                const etiqueta = $('#ficha-titulo').text() || 'Canarias';
                const nombresTabs = ['Mapa', 'Gráficos', 'Datos'];
                const nombreTab = nombresTabs[visorEstado.tab] || '';
                const tituloCompleto = `${etiqueta} (${nombreTab})`;

                // 2. Preparamos el objeto de la vista
                const nuevaVista = {
                    id: Date.now(), // ID único para borrar
                    titulo: tituloCompleto,
                    params: window.location.search, // Guardamos los parámetros de la URL (?ambito=...)
                    fecha: new Date().toLocaleDateString()
                };

                // 3. Guardar en LocalStorage
                let vistas = VistasManager.obtenerTodas();
                // Evitar duplicados idénticos
                if (!vistas.some(v => v.params === nuevaVista.params)) {
                    vistas.push(nuevaVista);
                    localStorage.setItem(VistasManager.key, JSON.stringify(vistas));
                    VistasManager.render();
                }
            },

            obtenerTodas: () => {
                return JSON.parse(localStorage.getItem(VistasManager.key) || '[]');
            },

            eliminar: (id) => {
                let vistas = VistasManager.obtenerTodas().filter(v => v.id !== id);
                localStorage.setItem(VistasManager.key, JSON.stringify(vistas));
                VistasManager.render();
            },

            render: () => {
                const vistas = VistasManager.obtenerTodas();
                const $contenedor = $('#lista-vistas-guardadas');
                const $seccion = $('#seccion-vistas-guardadas');

                if (vistas.length === 0) {
                    $contenedor.html('');
                    $seccion.hide(); // Ocultamos la sección si no hay nada
                    return;
                }

                const html = vistas.map(v => `
                    <div class="vista-item" style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #eee;">
                        <a href="${window.location.pathname}${v.params}" 
                           style="text-decoration:none; color:#333; font-size:13px; flex-grow:1; margin-right:10px;">
                            <strong>${v.titulo}</strong><br>
                            <small style="color:#888;">${v.fecha}</small>
                        </a>
                        <button onclick="VistasManager.eliminar(${v.id})" 
                                class="material-icons" 
                                style="color:#d32f2f; background:none; border:none; cursor:pointer; font-size:18px;">
                            delete
                        </button>
                    </div>
                `).join('');

                $contenedor.html(html);
                $seccion.show(); // Mostramos la sección ahora que hay datos
            }
        };

        
        // Cargar vistas guardadas al iniciar
        window.VistasManager.render();

        inicializarDesdeURL();


      });
    }
  };
})(jQuery, Drupal, drupalSettings, once);
