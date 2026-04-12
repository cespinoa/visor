// main.js
window.visorProject = window.visorProject || {};

// Inicialización del estado único
/**
 * Precalcula datasets derivados que deben estar disponibles antes de cualquier render.
 * Se llama desde visor-init-logic (paso A0) y queda accesible globalmente por si
 * necesita reejecutarse (p.ej. si el dataset de población se recarga).
 */
window.visorProject.prepararDatosDerivados = function() {
    const vp  = drupalSettings.visorProject || {};
    const pob = vp['$historico_poblacion']            || {};
    const viv = vp['$historico_viviendas_terminadas'] || {};

    const años = Object.keys(pob).sort();

    const deltaPob      = {};
    const deltaPobAcum  = {};
    const hogaresNec    = {};
    const hogaresAcum   = {};
    const vivAcum       = {};
    const saldoAcum     = {};

    let prevPob    = null;
    let cumDelta   = 0;
    let cumHogares = 0;
    let cumViv     = 0;

    años.forEach(y => {
        const actual = parseFloat(pob[y]);

        if (prevPob !== null) {
            const delta   = actual - prevPob;
            const hogares = Math.round(delta / 2.6);
            const vivVal  = y in viv ? (parseFloat(viv[y]) || 0) : 0;

            cumDelta   += delta;
            cumHogares += hogares;
            cumViv     += vivVal;

            deltaPob[y]     = Math.round(delta);
            deltaPobAcum[y] = Math.round(cumDelta);
            hogaresNec[y]   = hogares;
            hogaresAcum[y]  = Math.round(cumHogares);
            vivAcum[y]      = Math.round(cumViv);
            saldoAcum[y]    = Math.round(cumViv - cumHogares);
        }
        // El primer año solo sirve de base para el delta siguiente; no se almacena
        prevPob = actual;
    });

    vp['$historico_delta_poblacion']           = deltaPob;
    vp['$historico_delta_poblacion_acum']      = deltaPobAcum;
    vp['$historico_hogares_necesarios']        = hogaresNec;
    vp['$historico_hogares_necesarios_acum']   = hogaresAcum;
    vp['$historico_viviendas_terminadas_acum'] = vivAcum;
    vp['$historico_saldo_acum']                = saldoAcum;

    // Snapshot del último año disponible — accesible en longtexts como
    // {{ pob_viv_ultimo.saldo_acum }}, {{ pob_viv_ultimo.anyo }}, etc.
    const ultimoAño = Object.keys(saldoAcum).sort().pop();
    if (ultimoAño) {
        vp['$pob_viv_ultimo'] = {
            anyo:           ultimoAño,
            poblacion:      Math.round(parseFloat(pob[ultimoAño]) || 0),
            delta_pob:      deltaPob[ultimoAño]     || 0,
            delta_pob_acum: deltaPobAcum[ultimoAño] || 0,
            hogares_nec:    hogaresNec[ultimoAño]   || 0,
            hogares_acum:   hogaresAcum[ultimoAño]  || 0,
            viv_terminadas: Math.round(parseFloat(viv[ultimoAño]) || 0),
            viv_acum:       vivAcum[ultimoAño]      || 0,
            saldo_acum:     saldoAcum[ultimoAño]    || 0,
        };
    }
};

window.visorProject.estado = {
    ambito: 'canarias',
    indicador: 'rit',
    tab: 0,
    registroActivo: 'Canarias',
    nombre: 'Canarias' 
};



(function ($, Drupal, once, drupalSettings) {
  "use strict";

  /**
   * 1. FUNCIONES AUXILIARES DE BÚSQUEDA
   * Se definen fuera del behavior para que estén disponibles globalmente de inmediato.
   */
  window.visorProject.buscarRegistro = function(criterio) {

    const fuente = drupalSettings.visorProject.datosDashboard;
    if (!fuente || !Array.isArray(fuente)) return null;

    if (criterio.id) {
        return fuente.find(d => String(d.id) === String(criterio.id));
    }
    if (criterio.etiqueta) {
        return fuente.find(d => d.etiqueta === criterio.etiqueta);
    }
    if (criterio.ambito) {
        return fuente.find(d => d.ambito === criterio.ambito);
    }
    //~ return fuente.find(d => d.ambito === 'canarias');
  };

  /**
   * 2. SINCRONIZACIÓN DE UI
   */
  window.visorProject.aplicarEstadoGlobal = function() {
      const estado = window.visorProject.estado;
      
      // 1. Selector de indicador
      $('#selector-indicador').val(estado.indicador);
      
      // 2. Radio de ámbito (asegúrate de que el selector sea el correcto)
      $(`input[name="ambito-mapa"][value="${estado.ambito}"]`).prop('checked', true);
      
      // 3. Forzar actualización de filtros en el mapa si ya está cargado
      if (window.visorProject.mapa && window.visorProject.mapa.instance) {
          const map = window.visorProject.mapa.instance;
          // Si el mapa ya cargó sus capas, aplicamos el filtro de ámbito
          if (map.isStyleLoaded()) {
               const capas = ['municipios-fill', 'municipio-highlight', 'etiquetas-nombres'];
               capas.forEach(id => {
                   if (map.getLayer(id)) {
                       map.setFilter(id, ['==', ['get', 'ambito'], estado.ambito]);
                   }
               });
               window.visorProject.mapa.actualizarEstiloRatios(estado);
          }
      }
  };

  Drupal.behaviors.dashboardOrquestador = {
    attach: function (context, settings) {

      document.addEventListener('fullscreenchange', () => {
          // Recorremos todas las instancias de Chart.js y las redimensionamos
          Object.values(Chart.instances).forEach(chart => {
              setTimeout(() => chart.resize(), 100); // Pequeño delay para que el DOM se asiente
          });
      });
      
      const estadoGlobal = window.visorProject.estado;

      /**
       * 3. DEFINICIÓN DE DIFUNDIR DATOS
       * La definimos al principio del attach para que cuando llegue el 'once' de abajo, 
       * la función ya esté asignada al objeto window.
       */
      window.visorProject.difundirDatos = function(props) {
          if (!props) return;

          // Sincronizamos el estado usando el campo de la MV
          window.visorProject.estado.registroActivo = props;
          window.visorProject.estado.etiqueta = props.etiqueta || ''; // Fuente de verdad
          window.visorProject.estado.nombre = props.etiqueta || '';   // Alias por si acaso
          window.visorProject.estado.ambito = props.ambito || 'municipio';

          if (window.visorProject.tabs) {
              window.visorProject.tabs.gestionarEstadoTabs(true);
          }

          // Ahora la URL recibirá el objeto con el campo 'etiqueta' relleno
          if (window.visorProject.utils) {
              window.visorProject.utils.actualizarURL(window.visorProject.estado);
          }

          // Si difundimos datos (ya sean de Canarias o de un municipio clicado), activamos tabs
          if (window.visorProject.tabs) {
              window.visorProject.tabs.gestionarEstadoTabs(true);
          }

          // Prepramos el dashboard
          if (window.visorProject.orquestadorDashboard) {
              window.visorProject.orquestadorDashboard.actualizarPanel(props);
          }

          // Rellenamos tablas
          if (window.visorProject.orquestadorDatos) {
              window.visorProject.orquestadorDatos.actualizarFicha(props);
          }

          // Rellenamos gráficos
          if (window.visorProject.orquestadorGraficos) {
              window.visorProject.orquestadorGraficos.actualizarPanel(props);
          } else { console.log('No encuentro el panel') }

          // Centramos mapa (si la función existe en panel-mapa.js)
          if (window.visorProject.mapa && window.visorProject.mapa.centrarEnRegistro) {
              window.visorProject.mapa.centrarEnRegistro(props);
          }
      };

      /**
       * 4. LÓGICA DE INICIALIZACIÓN (Init Logic)
       */
      once('visor-init-logic', 'body', context).forEach(() => {
          // A0. Precalcular datasets derivados (hogares necesarios, etc.)
          window.visorProject.prepararDatosDerivados();

          // A. Leemos URL
          if (window.visorProject.utils) {
              window.visorProject.utils.inicializarDesdeURL(estadoGlobal);
          }

          // B. Buscamos el registro inicial
          let registroInicial = null;
          if (estadoGlobal.etiqueta || estadoGlobal.nombre) {
              registroInicial = window.visorProject.buscarRegistro({ slug: estadoGlobal.etiqueta || estadoGlobal.nombre });
          } 
          
          // C. SI NO HAY REGISTRO O ES EL DE CANARIAS (Punto 3)
          if (!registroInicial) {
              registroInicial = window.visorProject.buscarRegistro({ ambito: 'canarias' });
              // ¡IMPORTANTE!: Si forzamos Canarias, sincronizamos el estado
              estadoGlobal.ambito = 'canarias';
              estadoGlobal.etiqueta = 'Canarias'; 
          }

          // D. AHORA Sincronizamos la UI con el estado definitivo
          // Esto hará que el selector de ámbitos se ponga en "Canarias" si no había polígono
          window.visorProject.aplicarEstadoGlobal();

          // E. Disparamos la difusión
          if (registroInicial) {
              window.visorProject.difundirDatos(registroInicial);
          }

          // F. Activamos la escucha del historial del navegador
          if (window.visorProject.utils) {
              window.visorProject.utils.configurarEscuchaHistorial();
          }

          // G. Cargamos las vistas guardadas del usuario
          if (window.VistasManager) {
              window.VistasManager.renderizar();
          }

          // H. Botón "Generar informe" (solo presente para administradores).
          //    El feedback visual lo gestiona el propio orquestadorInforme
          //    mediante un modal de pantalla completa.
          const btnInforme = document.getElementById('btn-generar-informe');
          if (btnInforme && window.visorProject.orquestadorInforme) {
              btnInforme.addEventListener('click', function () {
                  btnInforme.disabled = true;
                  window.visorProject.orquestadorInforme.generar().finally(() => {
                      btnInforme.disabled = false;
                  });
              });
          }
      });

      /**
       * 5. INICIALIZACIÓN DE COMPONENTES VISUALES
       */
      // Mapa
      once('visor-mapa', '#mapa-contenedor', context).forEach(el => {
        if (window.visorProject.mapa) {
          window.visorProject.mapa.cargarMapa('mapa-contenedor', estadoGlobal);
        }
      });
      
      // Tabs
      once('visor-tabs', '.mdc-tab-bar', context).forEach(el => {
          if (window.visorProject.tabs) {
            window.visorProject.tabs.activarTabs(estadoGlobal);
            
            const tabIndex = parseInt(estadoGlobal.tab) || 0;
            if (window.visorProject.tabs.instance) {
              window.visorProject.tabs.instance.activateTab(tabIndex);
            }
          }
      });
      //======================
      // Función para previsualizar las siluetas directamente
      window.visorProject.debugSiluetas = function() {
          const siluetas = drupalSettings.visorProject.imagenes || {};
          // Obtenemos las claves reales que existen en el JSON (p.ej: "isla_1", "muni_38001")
          const clavesExistentes = Object.keys(siluetas).slice(0, 16); 
          const $debugContenedor = $('#contenedor-debug-siluetas');

          if (!$debugContenedor.length) {
              console.warn("No se encontró el contenedor #contenedor-debug-siluetas");
              return;
          }

          $debugContenedor.empty().append('<h2>Previsualización de Siluetas (Debug)</h2><div class="row debug-siluetas-grid"></div>');
          const $grid = $debugContenedor.find('.debug-siluetas-grid');

          clavesExistentes.forEach(idReal => {
              const pathData = siluetas[idReal]; // Usamos la clave tal cual viene del JSON

              const $col = $('<div class="col-md-3 mb-4"></div>');
              const $card = $('<div class="card h-100"></div>');
              const $cardBody = $('<div class="card-body text-center"></div>');
              
              let svgHTML = '';
              if (pathData) {
                  // IMPORTANTE: Forzamos el ancho y alto en el estilo del SVG 
                  // para que no colapse en el layout de las cards.
                  svgHTML = `
                      <div style="width: 100%; height: 120px; background: #f0f0f0; display: flex; align-items: center; justify-content: center;">
                          <svg viewBox="0 -100 100 100" style="width: 100px; height: 120px; display: block;">
                              <path d="${pathData}" fill="#17a2b8" stroke="#007bff" stroke-width="0.5" />
                          </svg>
                      </div>
                      <p class="mt-2 small text-muted">Key: ${idReal}</p>
                  `;
              }

              $cardBody.append(svgHTML);
              $card.append($cardBody);
              $col.append($card);
              $grid.append($col);
          });
      };
      
    }










    
  };

})(window.jQuery, window.Drupal, window.once, window.drupalSettings);
