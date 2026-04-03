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

      
      let idSilueta = 'canarias';
      console.log(props)
      if (props.ambito == 'isla') {
        idSilueta = 'isla_' + props.isla_id
      } else if (props.ambito == 'municipio') {
        idSilueta = 'muni_' + props.municipio_id
      }

      let listaNivelInferior = 'lista-de-hijos';
      if (props.ambito === 'municipio') {
        listaNivelInferior = 'lista-de-localidades';
      }
      
      // Definimos el "Guion Editorial" del Dashboard
      const esquema = [
        { 
          tituloBloque: "Datos principales",
          intro: "Resumen de los indicadores clave de intensidad y presión turística en el ámbito seleccionado.",
          destino: '#ficha-contenido',
          elementos: [
            { tipo: 'tabla', id: 'resumen-ambito', ancho: '9' },
            { tipo: 'imagen', tipo_imagen: 'silueta' , id: idSilueta, ancho: '3'}
          ]
        },
        { 
          tituloBloque: "Actividad turistica por tipo de oferta y de zona",
          intro: "Caracterizacion del modelo turistico.",
          destino: '#ficha-contenido',
          elementos: [ 
            { tipo: 'tabla', id: 'oferta-alojativa', ancho: '6'},
            { tipo: 'tabla', id: 'distribucion-plazas-vacacionales', ancho: '6' },
            { tipo: 'tabla', id: 'distribucion-plazas-regladas', ancho: '6' },
            { tipo: 'tabla', id: 'plazas-turisticas-zona-residencial', ancho: '6' },
            { tipo: 'tabla', id: 'plazas-turisticas-zona-turistica', ancho: '6'},
            { tipo: 'tabla', id: 'oferta-alojativa-por-zona-ambito', ancho: '6' }
          ]
        },
        { 
          tituloBloque: "Presión humana",
          intro: "Resumen de los indicadores clave de intensidad y presión turística en el ámbito seleccionado.",
          destino: '#ficha-contenido',
          elementos: [
            { tipo: 'tabla', id: 'poblacion-turistica-equivalente', ancho: '6' },
            { tipo: 'tabla', id: 'intensidad-turistica', ancho: '6' },
            { tipo: 'tabla', id: 'carga-poblacional', ancho: '6' },
            { tipo: 'tabla', id: 'presion-humana', ancho: '6' },
            
          ]
        },
        { 
          tituloBloque: "Vivienda",
          intro: "Resumen de los indicadores clave de vivienda.",
          destino: '#ficha-contenido',
          elementos: [
            { tipo: 'tabla', id: 'parque-viviendas', ancho: '6' },
            { tipo: 'tabla', id: 'viviendas-disponibles', ancho: '6' },
            { tipo: 'tabla', id: 'viviendas-necesarias', ancho: '6' },
            { tipo: 'tabla', id: 'deficit-de-viviendas', ancho: '6' },
            { tipo: 'tabla', id: 'presion-vv-sobre-vivienda', ancho: '6'}
          ]
        },
        { 
          tituloBloque: "Datos principales",
          intro: "Resumen de los indicadores clave de intensidad y presión turística en el ámbito seleccionado.",
          destino: '#ficha-contenido',
          elementos: [
            { tipo: 'tabla', id: listaNivelInferior, ancho: '12' },
            { tipo: 'imagen', tipo_imagen: 'silueta' , id: idSilueta, ancho: '3'}
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
