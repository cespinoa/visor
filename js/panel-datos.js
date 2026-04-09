// js/dashboard/panel-datos.js
(function ($, Drupal) {
  "use strict";
  window.visorProject = window.visorProject || {};
  window.visorProject.orquestadorDatos = {

    /**
     * Función principal que se dispara desde difundirDatos
     */
    actualizarFicha: async function(props) {
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
          tituloBloque: "Déficit de viviendas",
          intro: "Resumen de los indicadores clave de vivienda.",
          destino: '#ficha-contenido',
          elementos: [
            { tipo: 'longtext', id: 'hogares-nucleos', ancho: '12' },
            { tipo: 'tabla', id: 'ficha-hogares-por-nucleos', ancho: '6' },
            { tipo: 'tabla', id: 'ficha-hogares-por-nucleos-deficit', ancho: '6' },
            { tipo: 'grafico', id: 'personas-por-hogar', ancho: '12' },
            { tipo: 'longtext', id: 'disponibilidad-vivienda', ancho: '12' },
            { tipo: 'tabla', id: 'parque-viviendas', ancho: '6' },
            { tipo: 'tabla', id: 'viviendas-terminadas-canarias', ancho: '6', ambito: 'canarias' },
            { tipo: 'tabla', id: 'viviendas-habituales-mas-terminadas', ancho: '6', ambito: 'canarias' },
            { tipo: 'tabla', id: 'viviendas-necesarias', ancho: '6' },
            { tipo: 'tabla', id: 'deficit-de-viviendas', ancho: '6', ambito: ['isla', 'municipio'] },
            { tipo: 'tabla', id: 'deficit-de-viviendas-canarias', ancho: '6', ambito: 'canarias' },
            { tipo: 'salto' },
            { tipo: 'tabla', id: 'presion-vv-sobre-vivienda', ancho: '6'}
          ]
        },

      
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
          if (window.visorProject.utilsInformes) {
              await window.visorProject.utilsInformes._prefetchLongtexts(esquema, props);
          }
          window.visorProject.rowCompositor.componer(esquema, props);
      }
    }
 
  };

})(window.jQuery, window.Drupal);
