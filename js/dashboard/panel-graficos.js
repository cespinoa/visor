// panel-graficos.js
(function ($, Drupal) {
  "use strict";

  window.visorProject = window.visorProject || {};

  window.visorProject.orquestadorGraficos = {
    actualizarPanel: function(props) {
        if (!props) return;
        if (window.visorProject.utils?.actualizarBreadcrumb) {
            window.visorProject.utils.actualizarBreadcrumb(props);
        }
        const $contenedor = jQuery('#panel-graficos-contenido').empty();
        if (!$contenedor.length) return;
              
        

        jQuery('#grafico-titulo').html(props.etiqueta);

        const esquema = [
            {
                tituloBloque: "Indicadores de Intensidad Turística",
                destino: '#panel-graficos-contenido',
                elementos: [
                    { tipo: 'grafico', id: 'gauge-rit', ancho: '3' },
                    { tipo: 'grafico', id: 'gauge-rit-r', ancho: '3' },
                    { tipo: 'grafico', id: 'gauge-rit-v', ancho: '3' },
                    { tipo: 'grafico', id: 'donut-rit', ancho: '3' }
                ]
            },
            {
                tituloBloque: "Indicadores de Intensidad Turística por km²",
                destino: '#panel-graficos-contenido',
                elementos: [
                    { tipo: 'grafico', id: 'gauge-rit-km2', ancho: '3' },
                    { tipo: 'grafico', id: 'gauge-rit-r-km2', ancho: '3' },
                    { tipo: 'grafico', id: 'gauge-rit-v-km2', ancho: '3' },
                    { tipo: 'grafico', id: 'donut-rit-km2', ancho: '3' }
                ]
            },
            {
                tituloBloque: "Presión Humana",
                destino: '#panel-graficos-contenido',
                elementos: [
                    { tipo: 'grafico', id: 'gauge-presion-humana', ancho: '3' },
                    { tipo: 'grafico', id: 'gauge-densidad-de-poblacion', ancho: '3' },
                    { tipo: 'grafico', id: 'gauge-rit-km2', ancho: '3' },
                    { tipo: 'grafico', id: 'donut-presion-humana', ancho: '3' }
                ]
            },
            {
                tituloBloque: "Indicadores de vivienda",
                destino: '#panel-graficos-contenido',
                elementos: [
                    { tipo: 'grafico', id: 'gauge-viviendas-vacias', ancho: '3' },
                    { tipo: 'grafico', id: 'gauge-viviendas-esporadicas', ancho: '3' },
                    { tipo: 'grafico', id: 'gauge-viviendas-vacacional', ancho: '3' },
                    { tipo: 'grafico', id: 'gauge-uds-vv-habitantes', ancho: '3' },
                ]
            },
            {
                tituloBloque: "Alteración de la actividad turística",
                destino: '#panel-graficos-contenido',
                elementos: [
                    { tipo: 'grafico', id: 'gauge-plazas-suelo-residencial', ancho: '3' },
                    { tipo: 'grafico', id: 'gauge-peso-oferta-vacacional', ancho: '3' },
                    { tipo: 'grafico', id: 'donut-vv-por-zona', ancho: '3' },
                    { tipo: 'grafico', id: 'donut-regladas-por-zona', ancho: '3' },
                ]
            }
        ];



        if (window.visorProject.rowCompositor) {
          window.visorProject.rowCompositor.componer(esquema, props);
        }

        
    }
  };
})(window.jQuery, window.Drupal);
