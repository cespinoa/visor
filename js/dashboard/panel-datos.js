// js/dashboard/panel-datos.js
(function ($, Drupal) {
  "use strict";
  window.visorProject = window.visorProject || {};
  window.visorProject.orquestadorDatos = {

    /**
     * Función principal que se dispara desde difundirDatos
     */
    actualizarFicha: function(props) {
      if (!props) return;
      if (window.visorProject.utils?.actualizarBreadcrumb) {
          window.visorProject.utils.actualizarBreadcrumb(props);
      }

      const $contenedor = jQuery('#ficha-contenido');
      if (!$contenedor.length) return;

       // 0. Colocación del título
        jQuery('#ficha-titulo').html(props.etiqueta);
        // 1. Limpieza de contenedores
        jQuery('#ficha-resumen').empty();
        //~ jQuery('#ficha-contenido').empty();

      
      let idSilueta = 'canarias'

      let listaNivelInferior = 'lista-de-hijos';
      if (props.ambito === 'municipio') {
        listaNivelInferior = 'lista-de-localidades';
      }
      
      // Definimos el "Guion Editorial" del Dashboard
      const esquema = [
        { 
          tituloBloque: "Actividad turistica por tipo de oferta y de zona",
          intro: "Caracterizacion del modelo turistico.",
          destino: '#ficha-contenido',
          elementos: [ 
            //~ { tipo: 'tabla', id: 'tabla-evolucion-plazas', ancho: '12' },
            { tipo: 'tabla', id: 'resumen-ambito', ancho: '12' },
            { tipo: 'tabla', id: 'distribucion-plazas-vacacionales', ancho: '6' },
            { tipo: 'tabla', id: 'distribucion-plazas-regladas', ancho: '6' },
            { tipo: 'tabla', id: 'plazas-turistizas-zona-residencial', ancho: '6' }
          ]
        },
        { 
          tituloBloque: "Datos principales",
          intro: "Resumen de los indicadores clave de intensidad y presión turística en el ámbito seleccionado.",
          destino: '#ficha-contenido',
          elementos: [
            { tipo: 'tabla', id: 'carga-poblacional', ancho: '6' },
            { tipo: 'tabla', id: 'parque-viviendas', ancho: '6' },
            { tipo: 'tabla', id: 'tabla-evolucion-plazas', ancho: '12' },
            { tipo: 'tabla', id: listaNivelInferior, ancho: '6' },
            { tipo: 'imagen', tipo_imagen: 'silueta' , id: idSilueta, ancho: '3'}
          ]
        },
        { 
          tituloBloque: "Distribución y Capacidad",
          intro: "Desglose de la oferta alojativa y su impacto en el territorio.",
          destino: '#ficha-contenido',
          elementos: [
            { tipo: 'tabla', id: 'parque-viviendas', ancho: '6' },
            { tipo: 'tabla', id: 'carga-poblacional', ancho: '6' }
          ]
        }
      ];

      // Llamamos al compositor para que haga todo el trabajo sucio
      if (window.visorProject.rowCompositor) {
          window.visorProject.rowCompositor.componer(esquema, props);
      }
    }
 
  };

})(window.jQuery, window.Drupal);
