// panel-dashboard.js
(function ($, Drupal) {
  "use strict";

  window.visorProject = window.visorProject || {};

  window.visorProject.orquestadorDashboard = {
    
    /**
     * Función principal que se dispara desde difundirDatos
     */
    actualizarPanel: function(props) {
      if (!props) return;

      const snapshot = drupalSettings.visorProject.datosDashboard || [];
      const datos  = snapshot.filter(d => d.ambito === 'canarias')[0];

      const $contenedor = jQuery('#panel-dashboard-contenido');
      if (!$contenedor.length) return;
     
      let idSilueta = 'canarias'

      const esquema = [
        { 
          destino: '#panel-dashboard-contenido',
          clases: ['dashboard-main-header'],
          elementos: [
            { tipo: 'widget', id: 'noticias-slider', ancho: '12' },
            { tipo: 'widget', id: 'odometro-total-vv', ancho: '12' },
          ]
        },
        { 
          tituloBloque: "Evolución de la vivienda vacacional",
          notas: "Datos del Registro General Turístico de Canarias.",
          destino: '#panel-dashboard-contenido',
          clases: ['dashboard-main-evolucion'],
          elementos: [
            { tipo: 'widget', id: 'card-crecimiento-canarias', ancho: '4' },
            { tipo: 'widget', id: 'card-isla-mayor-crecimiento', ancho: '4'},
            { tipo: 'widget', id: 'card-isla-mayor-crecimiento-porcentual', ancho: '4'},
            { tipo: 'grafico', id: 'evolucion-vivienda-vacacional', ancho: '6'},
            { tipo: 'tabla', id: 'tabla-evolucion-plazas', ancho: '6' },
          ]
        },
        //~ { 
          //~ tituloBloque: "Comparativa con junio de 2023",
          //~ notas: "Datos del Registro General Turístico de Canarias.",
          //~ destino: '#panel-dashboard-contenido',
          //~ clases: ['dashboard-main-evolucion', 'dashboard-main'],
          //~ elementos: [
            //~ { tipo: 'grafico', id: 'evolucion-vivienda-vacacional-junio-2023', ancho: '6'},
            //~ { tipo: 'tabla', id: 'tabla-evolucion-plazas-junio-2023', ancho: '6' },
          //~ ]
        //~ },
        { 
          tituloBloque: "Desplazamiento de la actividad turística a zonas residenciales",
          destino: '#panel-dashboard-contenido',
          clases: ['dashboard-main-dtr', 'dashboard-main'],
          elementos: [
            { 
                tipo: 'pack', 
                ancho: '6',
                tituloPack: "Viviendas vacacionales por zona",
                clasePack: "pack-atencion",
                elementos: [
                    { tipo: 'widget', id: 'card-vv-en-zonas-residenciales', ancho: '12'},
                    { tipo: 'grafico', id: 'bar-vv-por-zona', ancho: '12' }, // 12 para que ocupe todo el ancho del pack
                    { tipo: 'tabla', id: 'viviendas-vacacionales-por-zonas', ancho: '12'} // Se apila debajo
                ]
            },
            { 
                tipo: 'pack', 
                ancho: '6',
                tituloPack: "Plazas alojativas por zona",
                clasePack: "pack-atencion",
                elementos: [
                    { tipo: 'widget', id: 'card-plazas-alojativas-en-zonas-residenciales', ancho: '12'},
                    { tipo: 'grafico', id: 'bar-plazas', ancho: '12' },
                    { tipo: 'tabla', id: 'plazas-alojativas-por-zonas', ancho: '12' }
                ]
            }
          ]
        },
        { 
          tituloBloque: "Desplazamiento de la actividad turística hacia el alojamiento no reglado",
          destino: '#panel-dashboard-contenido',
          clases: ['dashboard-main-reglado-a-no-reglado', 'dashboard-main'],
          elementos: [
            { 
                tipo: 'pack', 
                ancho: '6',
                tituloPack: "Plazas por tipo de alojamiento",
                clasePack: "pack-atencion",
                elementos: [
                    { tipo: 'widget', id: 'card-plazas-alojativas-no-regladas', ancho: '12'},
                    { tipo: 'grafico', id: 'bar-reglado-no-reglado', ancho: '12' },
                    { tipo: 'tabla', id: 'plazas-regladas-no-regladas', ancho: '12'}
                ]
            },
            { 
                tipo: 'pack', 
                ancho: '6',
                tituloPack: "Población turística equivalente por tipo de alojamiento",
                clasePack: "pack-atencion",
                elementos: [
                    { tipo: 'widget', id: 'card-ptev-pter', ancho: '12'},
                    { tipo: 'grafico', id: 'bar-ptev-pter', ancho: '12' },
                    { tipo: 'tabla', id: 'ptev-pter', ancho: '12' }
                ]
            }
          ]
        },
        { 
          tituloBloque: "Presión sobre los residentes y el territorio",
          destino: '#panel-dashboard-contenido',
          clases: ['dashboard-main-reglado-a-no-reglado', 'dashboard-main'],
          elementos: [
            { 
                tipo: 'pack', 
                ancho: '6',
                tituloPack: "Presión sobre los residentes",
                clasePack: "pack-atencion",
                elementos: [
                    { tipo: 'widget', id: 'card-presion', ancho: '12'},
                    { tipo: 'grafico', id: 'bar-ritr_ritv', ancho: '12' },
                    { tipo: 'tabla', id: 'ritv-ritr', ancho: '12'}
                ]
            },
            { 
                tipo: 'pack', 
                ancho: '6',
                tituloPack: "Presión sobre el territorio",
                clasePack: "pack-atencion",
                elementos: [
                    { tipo: 'widget', id: 'card-presion-km2', ancho: '12'},
                    { tipo: 'grafico', id: 'bar-presion-humana', ancho: '12' },
                    { tipo: 'tabla', id: 'presion-territorio', ancho: '12' }
                ]
            }
          ]
        },
        { 
          tituloBloque: "Disponibilidad de viviendas",
          destino: '#panel-dashboard-contenido',
          clases: ['dashboard-main-reglado-a-no-reglado', 'dashboard-main'],
          elementos: [
            { 
                tipo: 'pack', 
                ancho: '6',
                tituloPack: "Uso de la vivienda",
                clasePack: "pack-atencion",
                elementos: [
                    { tipo: 'widget', id: 'card-uso-vivienda', ancho: '12'},
                    { tipo: 'grafico', id: 'bar-uso-vivienda', ancho: '12' },
                    { tipo: 'tabla', id: 'uso-vivienda', ancho: '12'}
                ]
            },
            { 
                tipo: 'pack', 
                ancho: '6',
                tituloPack: "Presión de la vivienda vacacional en zona residencial sobre la habitual",
                clasePack: "pack-atencion",
                elementos: [
                    { tipo: 'widget', id: 'card-presion-vivienda', ancho: '12'},
                    { tipo: 'grafico', id: 'bar-presion-vivienda-habitual', ancho: '12' },
                    { tipo: 'tabla', id: 'presion-sobre-la-vivienda', ancho: '12' }
                ]
            }
          ]
        }
        ,
        { 
          tituloBloque: "Déficit de vivienda",
          destino: '#panel-dashboard-contenido',
          clases: ['dashboard-main-reglado-a-no-reglado', 'dashboard-main'],
          elementos: [
            //~ { 
                //~ tipo: 'pack', 
                //~ ancho: '12',
                //~ tituloPack: "Necesidad teórica de vivienda",
                //~ clasePack: "pack-atencion",
                //~ elementos: [
                    //~ { tipo: 'widget', id: 'card-uso-vivienda', ancho: '12'},
                    //~ { tipo: 'grafico', id: 'bar-necesidad-de-vivienda', ancho: '12' },
                    { tipo: 'grafico', id: 'bar-cobertura-de-vivienda', ancho: '6' },
                    { tipo: 'tabla', id: 'necesidad-de-vivienda', ancho: '6'}
                //~ ]
            //~ },
            //~ { 
                //~ tipo: 'pack', 
                //~ ancho: '6',
                //~ tituloPack: "Déficit teórico de vivienda",
                //~ clasePack: "pack-atencion",
                //~ elementos: [
                    //~ { tipo: 'widget', id: 'card-presion-vivienda', ancho: '12'},
                    //~ { tipo: 'grafico', id: 'bar-cobertura-de-vivienda', ancho: '12' },
                    //~ { tipo: 'tabla', id: 'deficit-de-vivienda', ancho: '12' }
                //~ ]
            //~ }
          ]
        }
        
      ];

      // Llamamos al compositor para que haga todo el trabajo sucio
      if (window.visorProject.rowCompositor) {
          window.visorProject.rowCompositor.componer(esquema, datos);
      }
    }
  };

})(window.jQuery, window.Drupal);
