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

        const slugNombre = window.visorProject.utils.slugificar(props.etiqueta)

        const claseSilueta = `silueta-bg-${slugNombre}`;
        const titulo = `<span class="${claseSilueta} silueta-circle silueta-variant-outline  silueta-bg-md"></span>${(props.etiqueta)}`;
        
        

        jQuery('#grafico-titulo').html(props.etiqueta);

        const esquema = [{ 
            tituloBloque: "Indicadores de Intensidad",
            destino: '#panel-graficos-contenido',
            graficos: [
              { tipo: 'grafico', id: 'gauge-rit', ancho: '3' },
              { tipo: 'grafico', id: 'presion-humana', ancho: '3' },
              { tipo: 'grafico', id: 'gauge-rit-r', ancho: '3' },
              { tipo: 'grafico', id: 'donut-plazas', ancho: '3' },
              { tipo: 'grafico', id: 'evolucion-vivienda-vacacional', ancho: '12'}
            ]
        }];

        if (window.visorProject.rowCompositor) {
            //~ window.visorProject.rowCompositor.componer(esquema, props);
        }

        //~ esquema.forEach(bloque => {
            //~ const wrapper = window.visorProject.utilsLayout.crearContenedor({
                //~ titulo: bloque.tituloBloque,
                //~ ancho: bloque.ancho
            //~ });
            //~ jQuery(wrapper.body).addClass('row'); 

            //~ bloque.graficos.forEach(item => {
                //~ const config = window.CONFIG_GRAFICOS[item.id];
                //~ if (!config) return;

                //~ config.canvasId = `canvas-${item.id}`;
                
                //~ // 1. Creamos el HTML (contenedor + canvas vacío)
                //~ const graficoDOM = window.visorProject.utilsGraficos.crearContenedorGrafico(config, props);
                
                //~ if (graficoDOM) {
                    //~ const col = document.createElement('div');
                    //~ col.className = `col-md-${item.ancho || '12'} col-sm-12 mb-4`; 
                    //~ col.appendChild(graficoDOM);
                    //~ wrapper.body.appendChild(col);

                    //~ // 2. ACTIVAMOS EL OBSERVADOR para este gráfico específico
                    //~ window.visorProject.utilsGraficos.activarObservador(graficoDOM, config, props);
                //~ }
            //~ });

            //~ jQuery(bloque.destino).append(wrapper.elemento);
        //~ });
    }
  };
})(window.jQuery, window.Drupal);
