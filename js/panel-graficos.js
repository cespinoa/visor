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

        const esquema = props.ambito === 'canarias'
            ? this._esquemaCanarias()
            : this._esquemaDetalle();

        if (window.visorProject.rowCompositor) {
            window.visorProject.rowCompositor.componer(esquema, props);
        }
    },

    _esquemaCanarias: function() {
        return [
            {
                tituloBloque: 'Población y vivienda',
                destino: '#panel-graficos-contenido',
                notas: 'Hogares necesarios = Δ población / 2,6 (personas por hogar media). ' +
                       'Saldo acumulado = viviendas terminadas acumuladas − hogares necesarios acumulados. ' +
                       'Saldo positivo: producción supera la demanda demográfica. Saldo negativo: déficit estructural.',
                elementos: [
                    { tipo: 'grafico', id: 'poblacion-vivienda-pendiente', ancho: '12' },
                    //~ { tipo: 'tabla',   id: 'historico-pob-viv',            ancho: '12' },
                ],
            },
            {
                tituloBloque: 'Síntesis de indicadores por isla',
                destino: '#panel-graficos-contenido',
                elementos: [
                    { tipo: 'radares-islas', id: 'radar-sintesis', ancho: '12' },
                ],
            },
        ];
    },

    _esquemaDetalle: function() {
        return [
            {
                tituloBloque: "Indicadores de Intensidad Turística",
                destino: '#panel-graficos-contenido',
                elementos: [
                    { tipo: 'grafico', id: 'gauge-rit',     ancho: '3' },
                    { tipo: 'grafico', id: 'gauge-rit-r',   ancho: '3' },
                    { tipo: 'grafico', id: 'gauge-rit-v',   ancho: '3' },
                    { tipo: 'grafico', id: 'donut-rit',     ancho: '3' },
                ]
            },
            {
                tituloBloque: "Indicadores de Intensidad Turística por km²",
                destino: '#panel-graficos-contenido',
                elementos: [
                    { tipo: 'grafico', id: 'gauge-rit-km2',   ancho: '3' },
                    { tipo: 'grafico', id: 'gauge-rit-r-km2', ancho: '3' },
                    { tipo: 'grafico', id: 'gauge-rit-v-km2', ancho: '3' },
                    { tipo: 'grafico', id: 'donut-rit-km2',   ancho: '3' },
                ]
            },
            {
                tituloBloque: "Presión Humana",
                destino: '#panel-graficos-contenido',
                elementos: [
                    { tipo: 'grafico', id: 'gauge-presion-humana',       ancho: '3' },
                    { tipo: 'grafico', id: 'gauge-densidad-de-poblacion', ancho: '3' },
                    { tipo: 'grafico', id: 'gauge-rit-km2',              ancho: '3' },
                    { tipo: 'grafico', id: 'donut-presion-humana',       ancho: '3' },
                ]
            },
            {
                tituloBloque: "Indicadores de vivienda",
                destino: '#panel-graficos-contenido',
                elementos: [
                    { tipo: 'grafico', id: 'gauge-viviendas-vacias',      ancho: '3' },
                    { tipo: 'grafico', id: 'gauge-viviendas-esporadicas', ancho: '3' },
                    { tipo: 'grafico', id: 'gauge-viviendas-vacacional',  ancho: '3' },
                    { tipo: 'grafico', id: 'gauge-uds-vv-habitantes',     ancho: '3' },
                ]
            },
            {
                tituloBloque: "Alteración de la actividad turística",
                destino: '#panel-graficos-contenido',
                elementos: [
                    { tipo: 'grafico', id: 'gauge-plazas-suelo-residencial',    ancho: '3' },
                    { tipo: 'grafico', id: 'gauge-peso-oferta-vacacional',       ancho: '3' },
                    { tipo: 'grafico', id: 'donut-vv-por-zona',                 ancho: '3' },
                    { tipo: 'grafico', id: 'donut-regladas-por-zona',           ancho: '3' },
                ]
            },
            {
                tituloBloque: "Síntesis de indicadores",
                destino: '#panel-graficos-contenido',
                elementos: [
                    { tipo: 'grafico', id: 'radar-sintesis', ancho: '12' },
                ]
            },
        ];
    },

  };
})(window.jQuery, window.Drupal);
