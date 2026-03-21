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

        const esquema = [{
            tituloBloque: "Indicadores de Intensidad Turística",
            destino: '#panel-graficos-contenido',
            elementos: [
              { tipo: 'grafico', id: 'gauge-rit', ancho: '4' },
              { tipo: 'grafico', id: 'gauge-rit-r', ancho: '4' },
              { tipo: 'grafico', id: 'gauge-rit-v', ancho: '4' },
            ]
        }];

        

        if (window.visorProject.rowCompositor) {
          window.visorProject.rowCompositor.componer(esquema, props);
        }

        
    }
  };
})(window.jQuery, window.Drupal);
