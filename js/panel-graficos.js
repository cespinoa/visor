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

        if (props.ambito === 'canarias') {
            this._renderizarVistaCanarias($contenedor);
            return;
        }

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
            },
            {
                tituloBloque: "Síntesis de indicadores",
                destino: '#panel-graficos-contenido',
                elementos: [
                    { tipo: 'grafico', id: 'radar-sintesis', ancho: '12' },
                ]
            }
        ];



        if (window.visorProject.rowCompositor) {
          window.visorProject.rowCompositor.componer(esquema, props);
        }
    },

    _renderizarVistaCanarias: function($contenedor) {
        const datos = drupalSettings.visorProject.datosDashboard || [];
        const islas = datos.filter(d => d.ambito === 'isla');

        const GRUPOS = [
            { titulo: 'Islas orientales',  nombres: ['Lanzarote', 'Fuerteventura'],            ancho: '6' },
            { titulo: 'Islas centrales',   nombres: ['Gran Canaria', 'Tenerife'],               ancho: '6' },
            { titulo: 'Islas occidentales',nombres: ['El Hierro', 'La Gomera', 'La Palma'],    ancho: '4' }
        ];

        const radarBase = window.CONFIG_GRAFICOS?.['radar-sintesis'];
        if (!radarBase) return;

        GRUPOS.forEach(grupo => {
            const islasGrupo = grupo.nombres
                .map(nombre => islas.find(d => d.etiqueta === nombre))
                .filter(Boolean);
            if (!islasGrupo.length) return;

            $contenedor.append(`<h5 class="bloque-titulo mt-4 mb-3">${grupo.titulo}</h5>`);
            const $row = jQuery('<div class="row g-3 mb-4"></div>');

            islasGrupo.forEach(isla => {
                const $col = jQuery(`<div class="col-md-${grupo.ancho}"></div>`);
                const slug = (isla.isla_id || isla.etiqueta).toString()
                    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                const configIsla = Object.assign({}, radarBase, {
                    canvasId: `radar-isla-${slug}`
                });

                const contenedor = window.visorProject.utilsGraficos.crearContenedorRadar(
                    configIsla, isla, { vertical: true, titulo: isla.etiqueta }
                );
                if (contenedor) {
                    $col.append(contenedor);
                    window.visorProject.utilsGraficos.activarObservador(contenedor, configIsla, isla);
                }
                $row.append($col);
            });

            $contenedor.append($row);
        });
    }
  };
})(window.jQuery, window.Drupal);
