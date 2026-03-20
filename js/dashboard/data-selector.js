(function ($, Drupal) {
  "use strict";

  window.visorProject = window.visorProject || {};

  window.visorProject.dataSelector = {
    /**
     * @param {string} contexto - El tipo de filtro (ej: 'SELF_HISTORIC')
     * @param {Object} props - El registro activo (id, ambito, tipo_isla, tipo_municipio...)
     */
    seleccionar: function (props, config) {

      const contexto = config.contexto || 'SELF';
      const periodo = config.periodo || 'ALL';
      const total_padre = config.total_padre || false;
      
      const historico = drupalSettings.visorProject.datosSeries || [];
      const snapshot = drupalSettings.visorProject.datosDashboard || [];
      let resultado = [];
        
      //~ console.group(`%c Selector: ${contexto} `, 'background: #005a87; color: #fff');

      switch (contexto) {
          case 'SELF':
            // Devolvemos el registro activo como un array de un solo elemento
            resultado = [props];
            break;

         case 'CHILDREN': {
              const localidades = drupalSettings.visorProject.datosLocalidades || [];
              let hijos = [];
              let registroPadre = [];

              if (props.ambito === 'canarias') {
                  hijos = snapshot.filter(d => d.ambito === 'isla');
                  registroPadre = snapshot.filter(d => d.ambito === 'canarias');
              } 
              else if (props.ambito === 'isla') {
                  hijos = snapshot.filter(d => d.ambito === 'municipio' && d.isla_id === props.isla_id);
                  registroPadre = snapshot.filter(d => d.ambito === 'isla' && d.isla_id === props.isla_id);
              } 
              else if (props.ambito === 'municipio') {
                  hijos = localidades.filter(d => d.municipio_id === props.municipio_id);
                  registroPadre = snapshot.filter(d => d.ambito === 'municipio' && d.municipio_id === props.municipio_id);
              }
              
              // Si el config pide total_padre, lo pegamos al final
              resultado = (total_padre) ? [...hijos, ...registroPadre] : hijos;
             
              break; 
         }

         case 'CHILDREN_HISTORIC': {
            let registroPadre = [];
            let hijos = [];
            
            // 1. Si el padre es CANARIAS -> Histórico de todas las ISLAS
            if (props.ambito === 'canarias') {
                hijos = historico.filter(d => d.ambito === 'isla');
                registroPadre = historico.filter(d => d.ambito === 'canarias');
            } 
            // 2. Si el padre es ISLA -> Histórico de todos sus MUNICIPIOS
            else if (props.ambito === 'isla') {
                hijos = historico.filter(d => d.ambito === 'municipio' && d.isla_id === props.isla_id);
                registroPadre = historico.filter(d => d.ambito === 'isla' && d.isla_id === props.isla_id);
            } 
            // 3. Si el padre es MUNICIPIO -> Histórico de todas sus LOCALIDADES
            else if (props.ambito === 'municipio') {
                console.log('No disponemos del histórico de localidades, es demasiado pesado')
            }

            resultado = (total_padre) ? [...hijos, ...registroPadre] : hijos;
            
            break; 
        }
          
        case 'SELF_HISTORIC':
          // Filtro estricto por jerarquía según ámbito
          resultado = historico.filter(d => {
            if (d.ambito !== props.ambito) return false;

            if (props.ambito === 'canarias') return true;
            if (props.ambito === 'isla') return d.isla_id === props.isla_id;
            if (props.ambito === 'municipio') return d.municipio_id === props.municipio_id;
            
            return false;
          });
          break;

        case 'PEERS_GEO':
          // Hermanos geográficos en el snapshot actual
          resultado = snapshot.filter(d => {
            if (d.ambito !== props.ambito) return false;

            if (props.ambito === 'isla') return true; // Todas las islas son hermanas
            if (props.ambito === 'municipio') return d.isla_id === props.isla_id;
            
            return false;
          });
          break;

        case 'PEERS_GROUP':
          // Benchmark: Municipios del mismo tipo (ej: "Turístico Grande") en todo el archipiélago
          if (props.ambito !== 'municipio') {
            console.warn("PEERS_GROUP solo es válido para ámbito municipio");
            return [];
          }
          resultado = snapshot.filter(d => 
            d.ambito === 'municipio' && 
            d.tipo_municipio === props.tipo_municipio
          );
          break;

        case 'PEERS_BLOCK':
          // Comparativa: Islas del mismo modelo (ej: "Orientales")
          if (props.ambito !== 'isla') {
            console.warn("PEERS_BLOCK solo es válido para ámbito isla");
            return [];
          }
          resultado = snapshot.filter(d => 
            d.ambito === 'isla' && 
            d.tipo_isla === props.tipo_isla
          );
          break;

        case 'PARENT_RELATION':
          resultado = snapshot.filter(d => {
            // 1. Siempre Canarias
            if (d.ambito === 'canarias') return true;

            // 2. Si el sujeto es municipio: queremos su isla_id y su propio municipio_id
            if (props.ambito === 'municipio') {
              if (d.ambito === 'isla' && d.isla_id === props.isla_id) return true;
              if (d.ambito === 'municipio' && d.municipio_id === props.municipio_id) return true;
            }

            // 3. Si el sujeto es isla: queremos su propia isla_id
            if (props.ambito === 'isla') {
              if (d.ambito === 'isla' && d.isla_id === props.isla_id) return true;
            }

            return false;
          });
          break;

        case 'PEERS_GEO_GLOBAL':
          // Todos los registros del mismo ámbito en todo el dataset (ej: los 88 municipios)
          resultado = snapshot.filter(d => d.ambito === props.ambito);
          break;

        case 'PEERS_GEO_HISTORIC':
          // Evolución de todos los municipios de mi isla (o todas las islas)
          resultado = historico.filter(d => {
            if (d.ambito !== props.ambito) return false;
            if (props.ambito === 'isla') return true; 
            if (props.ambito === 'municipio') return d.isla_id === props.isla_id;
            return false;
          });
          break;

        case 'PEERS_GROUP_HISTORIC':
          // Evolución de todos los municipios de mi mismo tipo (ej: todos los "Turísticos Grandes")
          if (props.ambito !== 'municipio') return [];
          resultado = historico.filter(d => 
            d.ambito === 'municipio' && 
            d.tipo_municipio === props.tipo_municipio
          );
          break;

        case 'PEERS_BLOCK_HISTORIC':
          // Evolución de todas las islas de mi mismo bloque (ej: todas las "Occidentales")
          if (props.ambito !== 'isla') return [];
          resultado = historico.filter(d => 
            d.ambito === 'isla' && 
            d.tipo_isla === props.tipo_isla
          );
          break;

        case 'CHILDREN_HISTORIC': {
            const seriesLocalidades = drupalSettings.visorProject.datosSeriesLocalidades || [];
            
            // 1. Si el padre es CANARIAS -> Histórico de todas las ISLAS
            if (props.ambito === 'canarias') {
                resultado = historico.filter(d => d.ambito === 'isla');
            } 
            // 2. Si el padre es ISLA -> Histórico de todos sus MUNICIPIOS
            else if (props.ambito === 'isla') {
                resultado = historico.filter(d => d.ambito === 'municipio' && d.isla_id === props.isla_id);
            } 
            // 3. Si el padre es MUNICIPIO -> Histórico de todas sus LOCALIDADES
            else if (props.ambito === 'municipio') {
                // Tiramos del dataset específico de histórico de localidades
                resultado = seriesLocalidades.filter(d => d.municipio_id === props.municipio_id);
            }
            
            break; 
        }

        case 'PARENT_RELATION_HISTORIC': {
            // El "Benchmark Territorial": Yo + Mi Padre + Canarias
            resultado = historico.filter(d => {
                // 1. Siempre incluimos la serie de Canarias
                if (d.ambito === 'canarias') return true;

                // 2. Si el activo es municipio: incluimos su serie y la de su isla
                if (props.ambito === 'municipio') {
                    if (d.ambito === 'isla' && d.isla_id === props.isla_id) return true;
                    if (d.ambito === 'municipio' && d.municipio_id === props.municipio_id) return true;
                }

                // 3. Si el activo es isla: incluimos su propia serie
                if (props.ambito === 'isla' && d.ambito === 'isla' && d.isla_id === props.isla_id) {
                    return true;
                }

                return false;
            });
            break;
        }

        default:
          resultado = [props];
      }


      // IMPORTANTE: Aseguramos orden cronológico para el histórico
      if (contexto.includes('HISTORIC')) {
          resultado.sort((a, b) => parseInt(a.fecha_calculo) - parseInt(b.fecha_calculo));
      }
      
      if (contexto.includes('HISTORIC') || periodo !== 'ALL') {
          resultado.sort((a, b) => new Date(a.fecha_calculo) - new Date(b.fecha_calculo));
      }

      resultado = this._refinarTemporal(resultado, periodo);

      // 2. AGRUPACIÓN QUIRÚRGICA
      if (config.agrupacion) {
          resultado = this._aplicarAgrupacion(resultado, config.agrupacion, config.config.campos);
      }

      // 3. ORDENACIÓN ESTÁNDAR
      resultado = this._ordenarRegistros(resultado, props.ambito);

      //~ if(config.titulo === 'Evolución de plazas') {
        //~ console.log(resultado)
      //~ }
            
      return resultado;
      
    },

    /**
     * Filtro de segundo nivel para series temporales
     */
    _refinarTemporal: function(datos, modo) {
        if (!datos || datos.length === 0 || modo === 'ALL') return datos;

        // 1. Agrupamos por entidad (municipio, isla...)
        const agrupados = datos.reduce((acc, reg) => {
          const grupoId = reg.municipio_id || reg.isla_id || reg.etiqueta;
          if (!acc[grupoId]) acc[grupoId] = [];
          acc[grupoId].push(reg);
          return acc;
        }, {});

        let resultadoRefinado = [];

        Object.values(agrupados).forEach(serie => {
          // Siempre ordenados por fecha para que LAST_TWO y LATEST tengan sentido
          serie.sort((a, b) => new Date(a.fecha_calculo) - new Date(b.fecha_calculo));

          // 2. Lógica de selección según el modo
          switch (modo) {
            case 'LATEST':
              resultadoRefinado.push(serie[serie.length - 1]);
              break;

            case 'LAST_TWO':
              resultadoRefinado.push(...serie.slice(-2));
              break;

            case 'YEARLY_MAX':
              // En lugar de comparar el valor numérico (que puede fallar si diciembre es menor)
              // Tomamos el último registro cronológico de cada año (Cierre de ejercicio)
              const ultimosPorAnyo = {};

              serie.forEach(reg => {
                const anyo = reg.fecha_calculo.split('-')[0];
                const fechaActual = new Date(reg.fecha_calculo);

                // Si no hay registro para ese año, o este es más reciente que el guardado
                if (!ultimosPorAnyo[anyo] || fechaActual > new Date(ultimosPorAnyo[anyo].fecha_calculo)) {
                  ultimosPorAnyo[anyo] = reg;
                }
              });
              resultadoRefinado.push(...Object.values(ultimosPorAnyo));
              break;

            default:
              // --- CASO: FECHA TESTIGO (ISO: YYYY-MM-DD) ---
              if (/\d{4}-\d{2}-\d{2}/.test(modo)) {
                const registroTestigo = serie.find(d => d.fecha_calculo === modo);
                const registroUltimo = serie[serie.length - 1];

                if (registroTestigo) resultadoRefinado.push(registroTestigo);
                
                if (registroUltimo && registroUltimo.fecha_calculo !== modo) {
                  resultadoRefinado.push(registroUltimo);
                }
              } else {
                // Si no es fecha ni keyword conocida, devolvemos todo
                resultadoRefinado.push(...serie);
              }
          }
        });

        return resultadoRefinado;
    },

    _aplicarAgrupacion: function(datos, agruparCfg, camposSumables) {
        // Usamos exactamente tus nombres: campo, series_a_agrupar, etiqueta_grupo
        if (!agruparCfg || !agruparCfg.series_a_agrupar) return datos;

        const { campo, series_a_agrupar, etiqueta_grupo, color } = agruparCfg;

        // 1. Separar registros: Los que se mantienen y los que se funden
        const fueraDelGrupo = datos.filter(d => !series_a_agrupar.includes(d[campo]));
        const paraAgrupar = datos.filter(d => series_a_agrupar.includes(d[campo]));

        // Si no hay nada que coincida con la selección quirúrgica, devolvemos todo
        if (paraAgrupar.length === 0) return datos;

        // 2. Fusión cronológica (Fecha a Fecha)
        const fechasUnicas = [...new Set(paraAgrupar.map(d => d.fecha_calculo))];
        
        const registrosAgrupados = fechasUnicas.map(fecha => {
            const registrosFecha = paraAgrupar.filter(d => d.fecha_calculo === fecha);
            
            // Creamos el registro sintético del grupo
            let nuevoRegistro = {
                ...registrosFecha[0], 
                etiqueta: etiqueta_grupo,
                // CLAVE: Unificamos el ID. Usamos un string para que no choque con IDs reales.
                isla_id: 'id_grupo_' + campo, 
                municipio_id: 'id_grupo_' + campo,
                localidad_id: 'id_grupo_' + campo,
                [campo]: 'VALOR_AGRUPADO', 
                es_grupo: true,
                color_manual: color
            };

            camposSumables.forEach(c => {
                nuevoRegistro[c] = registrosFecha.reduce((acc, curr) => 
                    acc + (parseFloat(curr[c]) || 0), 0);
            });

            return nuevoRegistro;
        });

        return [...fueraDelGrupo, ...registrosAgrupados];
    },

    _ordenarRegistros: function(datos, ambito) {
        // 1. Pesos geográficos
        const pesosIslas = { 'central': 1, 'oriental': 2, 'occidental': 3 };

        return datos.sort((a, b) => {
            // --- REGLA DE ORO: El Padre siempre arriba ---
            // Si estamos viendo una isla, el registro que representa el TOTAL de la isla
            // debe ir antes que cualquier municipio.
            const esPadreA = a.ambito === ambito ? 1 : 0;
            const esPadreB = b.ambito === ambito ? 1 : 0;
            if (esPadreA !== esPadreB) return esPadreA - esPadreB;

            // 2. Orden por bloque geográfico (tipo_isla)
            if (ambito === 'canarias' || ambito === 'isla') {
                const tipoA = (a.tipo_isla || '').toLowerCase();
                const tipoB = (b.tipo_isla || '').toLowerCase();

                const pesoA = pesosIslas[tipoA] || 99;
                const pesoB = pesosIslas[tipoB] || 99;

                if (pesoA !== pesoB) return pesoA - pesoB;
            }
            
            // 3. Orden alfabético y Grupos
            // Usamos 'aaaa' para el padre (fuerza arriba) y 'zzzz' para grupos (fuerza abajo)
            let nomA = a.etiqueta || a.nombre || '';
            let nomB = b.etiqueta || b.nombre || '';

            if (a.es_grupo) nomA = 'zzzz' + nomA;
            if (b.es_grupo) nomB = 'zzzz' + nomB;
            
            return nomA.localeCompare(nomB);
        });
    }
    
  };

})(window.jQuery, window.Drupal);
