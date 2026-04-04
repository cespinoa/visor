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
          tituloBloque: "Datos principales",
          intro: "Resumen de los indicadores clave de intensidad y presión turística en el ámbito seleccionado.",
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado'],
          elementos: [
            { tipo: 'longtext', id: 'intro-intensidad-turistica', ancho: '12' },
            { tipo: 'tabla',    id: 'resumen-ambito',             ancho: '12' },
          ],
        },
        {
          tituloBloque: "Actividad turistica por tipo de oferta y de zona",
          intro: "Caracterizacion del modelo turistico.",
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado', 'salto-antes', 'salto-despues'],
          elementos: [
            { tipo: 'grafico', id: 'bar-reglado-no-reglado',   ancho: '3' },
            { tipo: 'tabla',   id: 'plazas-regladas-no-regladas', ancho: '12' },
          ],
        },
        {
          tituloBloque: "Presión humana",
          intro: "Resumen de los indicadores clave de intensidad y presión turística en el ámbito seleccionado.",
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado'],
          elementos: [
            { tipo: 'tabla', id: 'poblacion-turistica-equivalente', ancho: '6' },
            { tipo: 'tabla', id: 'intensidad-turistica',            ancho: '6' },
            { tipo: 'tabla', id: 'carga-poblacional',               ancho: '6' },
            { tipo: 'tabla', id: 'presion-humana',                  ancho: '6' },
          ],
        },
        {
          tituloBloque: "Vivienda",
          intro: "Resumen de los indicadores clave de vivienda.",
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado'],
          elementos: [
            { tipo: 'tabla', id: 'parque-viviendas',        ancho: '6' },
            { tipo: 'tabla', id: 'viviendas-disponibles',   ancho: '6' },
            { tipo: 'tabla', id: 'viviendas-necesarias',    ancho: '6' },
            { tipo: 'tabla', id: 'deficit-de-viviendas',    ancho: '6' },
            { tipo: 'tabla', id: 'presion-vv-sobre-vivienda', ancho: '6' },
          ],
        },
      ];
    },
  };

})(window.jQuery, window.Drupal);
