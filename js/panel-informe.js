// panel-informe.js
// Orquestador del informe "Canarias — Completo".
// Define únicamente la configuración editorial y el esquema de contenidos;
// toda la maquinaria de generación vive en utils-informes.js.
(function ($, Drupal) {
  "use strict";

  window.visorProject = window.visorProject || {};

  window.visorProject.orquestadorInforme = {

    /**
     * Genera el informe y lo persiste en Drupal.
     * Devuelve una Promise con { nid, titulo }.
     */
    generar: async function () {
      const snapshot = drupalSettings.visorProject.datosDashboard || [];
      const datos    = snapshot.find(d => d.ambito === 'canarias');
      if (!datos) {
        console.error('[informe] No se encontró registro de Canarias');
        return null;
      }

      const destino = '#' + window.visorProject.utilsInformes.RENDER_ID;
      return window.visorProject.utilsInformes.generar(
        this._getConfig(),
        this._getEsquema(destino),
        datos
      );
    },

    // ─────────────────────────────────────────────────────────────────────
    // CONFIGURACIÓN EDITORIAL
    // ─────────────────────────────────────────────────────────────────────

    _getConfig: function () {
      return {
        titulo:   'Informe Canarias',
        etiqueta: 'Canarias',
        ambito:   'canarias',
        tipo:     'Completo',
        portada: {
          icono: `<svg xmlns="http://www.w3.org/2000/svg" height="100" viewBox="0 -960 960 960" width="100"><path fill="#ffffff" d="M680-600h80v-80h-80v80Zm0 160h80v-80h-80v80Zm0 160h80v-80h-80v80Zm0 160v-80h160v-560H480v56l-80-58v-78h520v720H680Zm-640 0v-400l280-200 280 200v400H360v-200h-80v200H40Zm80-80h80v-200h240v200h80v-280L320-622 120-480v280Zm560-360ZM440-200v-200H200v200-200h240v200Z"/></svg>`,
          titulo:    'Vivienda Vacacional,<br/>Turismo y Población',
          subtitulo: 'Vivienda Vacacional y Turismo en Canarias',
        },
        cabecera: {
          titulo: 'Visor VTPC — Vivienda Vacacional y Turismo en Canarias',
        },
      };
    },

    // ─────────────────────────────────────────────────────────────────────
    // ESQUEMA DE CONTENIDOS
    // ─────────────────────────────────────────────────────────────────────

    _getEsquema: function (destino) {
      return [
        {
          tituloBloque: "Introducción",
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado'],
          elementos: [
            { tipo: 'longtext', id: 'intro-general', ancho: '12' },
          ],
        },

        { 
          tituloBloque: "La transformacion del modelo turístico",
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado', 'salto-antes'],
          elementos: [ 
            //{ tipo: 'longtext', id: 'impacto-modelo-turistico', ancho: '12' },
            { tipo: 'longtext', id: 'afluencia-plazas-ocupacion', ancho: '12', ambito: ['canarias', 'isla']  },
            { tipo: 'grafico', id: 'llegadas-vs-plazas',    ancho: '12', ambito: ['canarias', 'isla'] },
            { tipo: 'tabla',   id: 'historico-llegadas-plazas-ocupacion', ancho: '12', ambito: ['canarias', 'isla'] },
            { tipo: 'longtext', id: 'turistas-reglados-vs-vacacionales', ancho: '12', ambito: ['canarias', 'isla'] },
            { tipo: 'grafico', id: 'reglado-vs-vacacional-abs', ancho: '12', ambito: ['canarias', 'isla'] },
            { tipo: 'grafico', id: 'reglado-vs-vacacional',     ancho: '12', ambito: ['canarias', 'isla'] },
            { tipo: 'tabla',   id: 'turismo-reglado-vs-vacacional', ancho: '12', ambito: ['canarias', 'isla'] },
            { tipo: 'longtext', id: 'distribucion-plazas-vacacionales', ancho: '6' },
            { tipo: 'tabla', id: 'distribucion-plazas-vacacionales', ancho: '6' },
            { tipo: 'longtext', id: 'distribucion-plazas-regladas', ancho: '6' },
            { tipo: 'tabla', id: 'distribucion-plazas-regladas', ancho: '6' },
            { tipo: 'longtext', id: 'plazas-zona-residencial-por-tipo', ancho: '6' },
            { tipo: 'tabla', id: 'plazas-turisticas-zona-residencial', ancho: '6' },
            { tipo: 'longtext', id: 'plazas-zona-turistica-por-tipo', ancho: '6' },
            { tipo: 'tabla', id: 'plazas-turisticas-zona-turistica', ancho: '6'},
            { tipo: 'longtext', id: 'deslocalizacion-actividad-turistica', ancho: '6' },
            { tipo: 'tabla', id: 'oferta-alojativa-por-zona-ambito', ancho: '6' },
            { tipo: 'longtext', id: 'transformacion-del-alojamiento', ancho: '6' },
            { tipo: 'tabla', id: 'oferta-alojativa', ancho: '6'},
            { tipo: 'longtext', id: 'impacto-modelo-turistico', ancho: '12' },
          ]
        },








        
        { 
          tituloBloque: "Evolución de la vivienda vacacional",
          destino,
          clases: ['dashboard-main-evolucion'],
          elementos: [
            { tipo: 'longtext', id: 'evolucion-vv', ancho: '12' },
            { tipo: 'grafico', id: 'evolucion-vivienda-vacacional', ancho: '12', 'ancho-pdf': '80%'},
            { tipo: 'tabla', id: 'tabla-evolucion-unidades', ancho: '12' },
          ]
        },
        {
          tituloBloque: "Principales indicadores",
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado', 'salto-antes'],
          elementos: [
            { tipo: 'longtext', id: 'principales-indicadores', ancho: '12' },
            { tipo: 'tabla',    id: 'resumen-ambito', ancho: '12' },
          ],
        },
        { 
          tituloBloque: "Impacto sobre el modelo turístico",
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado', 'salto-antes'],
          elementos: [ 
            { tipo: 'longtext', id: 'impacto-modelo-turistico', ancho: '12' },
            { tipo: 'tabla', id: 'oferta-alojativa', ancho: '6'},
            { tipo: 'tabla', id: 'distribucion-plazas-vacacionales', ancho: '6' },
            { tipo: 'tabla', id: 'distribucion-plazas-regladas', ancho: '6' },
            { tipo: 'tabla', id: 'plazas-turisticas-zona-residencial', ancho: '6' },
            { tipo: 'tabla', id: 'plazas-turisticas-zona-turistica', ancho: '6'},
            { tipo: 'tabla', id: 'oferta-alojativa-por-zona-ambito', ancho: '6' }
          ]
        },
        { 
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado', 'salto-antes'],
          elementos: [ 
            { tipo: 'grafico', id: 'bar-reglado-no-reglado', ancho: '12' },
            { tipo: 'tabla', id: 'plazas-regladas-no-regladas', ancho: '12'},
          ]
        },
        { 
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado', 'salto-antes'],
          elementos: [ 
            { tipo: 'grafico', id: 'bar-plazas', ancho: '12' },
            { tipo: 'tabla', id: 'plazas-alojativas-por-zonas', ancho: '12' }
          ]
        },
            
        {
          tituloBloque: "Presión humana",
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado', 'salto-antes'],
          elementos: [
            { tipo: 'longtext', id: 'presion-humana', ancho: '12' },
            { tipo: 'tabla', id: 'poblacion-turistica-equivalente', ancho: '6' },
            { tipo: 'tabla', id: 'intensidad-turistica',            ancho: '6' },
            { tipo: 'tabla', id: 'carga-poblacional',               ancho: '6' },
            { tipo: 'tabla', id: 'presion-humana',                  ancho: '6' },
          ],
        },

        {
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado', 'salto-antes'],
          elementos: [
            { tipo: 'grafico', id: 'bar-ptev-pter', ancho: '12' },
            { tipo: 'tabla', id: 'ptev-pter', ancho: '12' }
          ],
        },


        {
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado', 'salto-antes'],
          elementos: [
            { tipo: 'grafico', id: 'bar-ritr_ritv', ancho: '12' },
            { tipo: 'tabla', id: 'ritv-ritr', ancho: '12'}
          ],
        },

        {
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado', 'salto-antes'],
          elementos: [
            { tipo: 'grafico', id: 'bar-presion-humana', ancho: '12' },
            { tipo: 'tabla', id: 'presion-territorio', ancho: '12' }
          ],
        },
        {
          tituloBloque: "Afección a la vivienda",
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado', 'salto-antes'],
          elementos: [
            { tipo: 'longtext', id: 'hogares-nucleos', ancho: '12' },
            { tipo: 'tabla', id: 'ficha-hogares-por-nucleos', ancho: '6' },
            { tipo: 'tabla', id: 'ficha-hogares-por-nucleos-deficit', ancho: '6' },
            //{ tipo: 'longtext', id: 'disponibilidad-vivienda', ancho: '12' },
            { tipo: 'tabla', id: 'parque-viviendas', ancho: '6' },
            { tipo: 'tabla', id: 'viviendas-terminadas-canarias', ancho: '6', ambito: 'canarias' },
            { tipo: 'tabla', id: 'viviendas-habituales-mas-terminadas', ancho: '6', ambito: 'canarias' },
            { tipo: 'tabla', id: 'viviendas-necesarias', ancho: '6' },
            //{ tipo: 'tabla', id: 'deficit-de-viviendas', ancho: '6', ambito: ['isla', 'municipio'] },
            //{ tipo: 'tabla', id: 'deficit-de-viviendas-canarias', ancho: '6', ambito: 'canarias' },
            { tipo: 'salto' },
            { tipo: 'tabla', id: 'presion-vv-sobre-vivienda', ancho: '6'}
          ],
        },
        {
          tituloBloque: "Síntesis de presión por isla",
          intro: "Indicadores normalizados de cada isla respecto al máximo registrado en Canarias.",
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado', 'salto-antes', 'permite-saltos'],
          elementos: [
            { tipo: 'radares-islas', id: 'radar-sintesis', ancho: '12', 'ancho-pdf': '80%' },
          ],
        },
        {
          tituloBloque: "Índice de presión por isla",
          intro: "Indicadores normalizados de cada isla respecto al máximo registrado en Canarias.",
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado', 'salto-antes', 'permite-saltos'],
          elementos: [
            { tipo: 'tabla', id: 'indice-presion', ancho: '12' }
          ],
        },
      ];
    },
  };

})(window.jQuery, window.Drupal);
