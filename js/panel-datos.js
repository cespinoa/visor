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
          tituloBloque: "La transformación del modelo turístico",
          //~ intro: "",
          destino: '#ficha-contenido',
          elementos: [
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
          tituloBloque: "Situación de la vivienda",
          destino: '#ficha-contenido',
          elementos: [
            { tipo: 'longtext', id: 'hogares-nucleos', ancho: '6' },
            { tipo: 'tabla', id: 'ficha-hogares-por-nucleos', ancho: '6' },
            { tipo: 'longtext', id: 'hogares-nucleos-2', ancho: '6' },
            { tipo: 'tabla', id: 'ficha-hogares-por-nucleos-deficit', ancho: '6' },
            { tipo: 'longtext', id: 'tamanyo-medio-hogares', ancho: '6' },
            { tipo: 'grafico', id: 'personas-por-hogar', ancho: '6' },

            
            { tipo: 'longtext', id: 'tamanyo-medio-hogar', ancho: '12' },
            
            { tipo: 'grafico', id: 'hogar-ccaa-barras',    ancho: '6', ambito: 'canarias' },                                                                                                                            
            { tipo: 'grafico', id: 'hogar-ccaa-pendiente',  ancho: '6', ambito: 'canarias'  },                                                                                                                           
            { tipo: 'tabla',   id: 'hogar-ccaa-tabla',      ancho: '12', ambito: 'canarias' }, 
            
            { tipo: 'longtext', id: 'parque-de-viviendas', ancho: '6' },
            { tipo: 'tabla', id: 'parque-viviendas', ancho: '6' },

            { tipo: 'longtext', id: 'viviendas-construidas', ancho: '6', ambito: 'canarias' },
            { tipo: 'tabla', id: 'viviendas-terminadas-canarias', ancho: '6', ambito: 'canarias' },

            
            { tipo: 'longtext', id: 'disponibilidad-vivienda', ancho: '12' },
            
            
            { tipo: 'tabla', id: 'viviendas-habituales-mas-terminadas', ancho: '6', ambito: 'canarias' },
            { tipo: 'tabla', id: 'viviendas-necesarias', ancho: '6' },
            { tipo: 'tabla', id: 'deficit-de-viviendas', ancho: '6', ambito: ['isla', 'municipio'] },
            { tipo: 'tabla', id: 'deficit-de-viviendas-canarias', ancho: '6', ambito: 'canarias' },
            
            
            { tipo: 'longtext', id: 'construccion-viviendas-vs-crecimiento-poblacion', ancho: '12', ambito: 'canarias' },
            { tipo: 'tabla', id: 'historico-pob-viv', ancho: '12'},
            
            


            
            { tipo: 'longtext', id: 'viviendas-no-habituales', ancho: '12' },
            { tipo: 'tabla', id: 'censos-islas-nohabituales', ancho: 12, ambito: 'canarias' },
            //~ { tipo: 'grafico', id: 'no-hab-censos', ancho: '12' },
            //~ { tipo: 'grafico', id: 'no-hab-censos-grande', ancho: '6' },
            //~ { tipo: 'grafico', id: 'no-hab-censos-turistico', ancho: '6' },
            //~ { tipo: 'grafico', id: 'no-hab-censos-mediano', ancho: '6' },
            //~ { tipo: 'grafico', id: 'no-hab-censos-pequeno', ancho: '6' },

            { tipo: 'grafico', id: 'no-hab-porc', ancho: '12' },
            { tipo: 'grafico', id: 'no-hab-porc-grande', ancho: '6', ambito: 'canarias'  },
            { tipo: 'grafico', id: 'no-hab-porc-turistico', ancho: '6', ambito: 'canarias'  },
            { tipo: 'grafico', id: 'no-hab-porc-mediano', ancho: '6', ambito: 'canarias'  },
            { tipo: 'grafico', id: 'no-hab-porc-pequeno', ancho: '6', ambito: 'canarias'  },
            
          ]
        },

        
      
        { 
          tituloBloque: "Datos principales",
          intro: "Resumen de los indicadores clave de intensidad y presión turística en el ámbito seleccionado.",
          destino: '#ficha-contenido',
          elementos: [
            { tipo: 'tabla', id: 'resumen-ambito', ancho: '9' },
            { tipo: 'imagen', tipo_imagen: 'silueta' , id: idSilueta, ancho: '3'},
            
            
            
            { tipo: 'salto' },
            { tipo: 'tabla', id: 'presion-vv-sobre-vivienda', ancho: '6'}
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

      

      // Precalcular T. reglados / T. vacacionales del ámbito activo para longtexts
      if (window.visorProject.utilsTablas) {
          drupalSettings.visorProject['$turismo_derivado_ultimo'] =
              window.visorProject.utilsTablas.calcularTurismoDerivadoUltimo(props);
          drupalSettings.visorProject['$hogar_derivado_ultimo'] =
              window.visorProject.utilsTablas.calcularHogarDerivadoUltimo(props);
      }

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
