// utils-widgets.js
(function ($, Drupal) {
  "use strict";

    window.visorProject = window.visorProject || {};

    window.visorProject.utilsWidgets = {

      crearWidget: function (config, dataset) {
          const servicio = config.servicio;
          switch (servicio) {
              case 'odometro': return this.crearOdometro(config, dataset);
              case 'noticias': return this.crearNoticias(config); 
              case 'cardImpacto': return this.crearCardImpacto(config);
          }
      },

      prepararDatosImpacto: function(itemConfig) {

          const snapshot = drupalSettings.visorProject.datosDashboard || [];
          const ambito = itemConfig.ambito || 'canarias';
          const datos  = snapshot.filter(d => d.ambito === ambito)[0];
        
          if (!itemConfig) return null;

          // 1. Extraemos variables con valores de seguridad
          const contexto = itemConfig.contexto || 'DASHBOARD';
          const propsSelector = itemConfig.propsSelector || { ambito: itemConfig.ambito };
          const tipo_analisis = itemConfig.tipo_analisis || 'estatico';
          // Prioridad de campos: mapeo > campo > campo_referencia > plazas
          const campoPrincipal = itemConfig.campo || itemConfig.campo_referencia || 'plazas_vacacionales';

          // 2. Intentamos obtener datos del selector
          let poolDatos = [];
          try {
              poolDatos = window.visorProject.dataSelector.seleccionar(datos, itemConfig);
          } catch (e) {
              console.warn("Error en dataSelector, usando fallback global");
          }

          // FALLBACK: Si el selector no da nada (como en las noticias), usamos drupalSettings
          if (!poolDatos || poolDatos.length === 0) {
              const globales = drupalSettings.visorProject.datosDashboard || [];
              // Si no hay ámbito definido, no podemos filtrar, devolvemos null
              if (!itemConfig.ambito) return null;
              poolDatos = globales.filter(r => r.ambito === itemConfig.ambito);
          }

          if (poolDatos.length === 0) return null;

          let registroFinal = null;
          let vars = { abs: 0, pct: 0 };

          // 3. Lógica de selección de registro
          if (tipo_analisis === 'variacion_temporal') {
              const fechaRef = itemConfig.fecha_referencia;
              // Buscamos el registro más reciente y el de la fecha de referencia
              const regActual = poolDatos.reduce((a, b) => new Date(a.fecha_calculo) > new Date(b.fecha_calculo) ? a : b);
              const regPasado = poolDatos.find(d => d.fecha_calculo === fechaRef);

              if (regActual && regPasado) {
                  registroFinal = regActual;
                  vars.abs = parseFloat(regActual[campoPrincipal]) - parseFloat(regPasado[campoPrincipal]);
                  vars.pct = (vars.abs / parseFloat(regPasado[campoPrincipal])) * 100;
              }
          } else if (tipo_analisis === 'mayor_variacion_temporal' || tipo_analisis === 'mayor_variacion_temporal_porcentual') {
            const fechaRef = itemConfig.fecha_referencia;
            const esPorcentual = (tipo_analisis === 'mayor_variacion_temporal_porcentual');
            
            // 1. Agrupamos por entidad única
            const idsEntidades = [...new Set(poolDatos.map(d => d.isla_id || d.municipio_id || d.nombre))];
            let maxValorEncontrado = -Infinity;

            idsEntidades.forEach(id => {
                const serie = poolDatos.filter(d => (d.isla_id || d.municipio_id || d.nombre) === id);
                
                // Obtenemos actual y pasado
                const regActual = serie.reduce((a, b) => new Date(a.fecha_calculo) > new Date(b.fecha_calculo) ? a : b, {});
                const regPasado = serie.find(d => d.fecha_calculo === fechaRef);

                if (regActual && regPasado) {
                    const vActual = parseFloat(regActual[campoPrincipal]) || 0;
                    const vPasado = parseFloat(regPasado[campoPrincipal]) || 0;
                    
                    const diffAbs = vActual - vPasado;
                    const diffPct = vPasado !== 0 ? (diffAbs / vPasado) * 100 : 0;

                    // 2. Decidimos qué métrica manda en esta configuración
                    const metricaActual = esPorcentual ? diffPct : diffAbs;

                    if (metricaActual > maxValorEncontrado) {
                        maxValorEncontrado = metricaActual;
                        registroFinal = regActual;
                        vars.abs = diffAbs;
                        vars.pct = diffPct;
                    }
                }
            });
          
          } else {
              const datosActuales = drupalSettings.visorProject.datosDashboard || [];
              const poolDatosNoticias = datosActuales.filter(r => r.ambito === ambito);
              
              // Lógica Estática (Slider de noticias)
              if (itemConfig.tipo === 'busqueda') {
                  registroFinal = poolDatosNoticias.reduce((p, c) => (parseFloat(p[campoPrincipal]) > parseFloat(c[campoPrincipal]) ? p : c));
              } else if (itemConfig.tipo === 'directa' && itemConfig.filtro) {
                  registroFinal = poolDatosNoticias.find(r => r[itemConfig.filtro.campo] === itemConfig.filtro.valor);
              } else {
                  registroFinal = poolDatosNoticias[0];
              }
          }

          if (!registroFinal) return null;


          // 4. Formateo y Sustitución de [valor], [etiqueta], etc.
          return this.formatearTextosImpacto(itemConfig, registroFinal, vars);
      },

      formatearTextosImpacto: function(itemConfig, registro, vars) {
          let t = itemConfig.plantilla || "";
          let d = itemConfig.desarrollo || "";

          // El campo que se usará para el placeholder [valor]
          const campoParaValor = itemConfig.campo || itemConfig.campo_referencia || 'plazas_vacacionales';

          // ── PASO 0: expresiones aritméticas [[expr]] o [[expr|formato]] ──────
          // Dentro de [[ ]], los campos se escriben SIN corchetes adicionales.
          // Esto evita la ambigüedad de cierre que causaría [[campo1] + [campo2]]:
          // el ] de cierre del campo interior y el ] del [[ son el mismo carácter.
          //
          // Sintaxis:
          //   [[hogares_2 + hogares_3]]
          //   [[viviendas_vacias / viviendas_total * 100 | porcentaje_1]]
          //   [[pte_v - pte_r | decimal_2]]
          //
          // El formato va tras '|'. Por defecto: 'entero'.
          // Los [campo] simples fuera de [[ ]] siguen funcionando con normalidad.
          const resolverExpresion = (expr) => {
              const partes  = expr.trim().split('|');
              const exprStr = partes[0].trim();
              const formato = (partes[1] || 'entero').trim();

              // Sustituir identificadores que existan en el registro por su valor numérico.
              // Los literales numéricos (100, 3.14…) quedan intactos.
              const exprNum = exprStr.replace(/\b([a-zA-Z_]\w*)\b/g, (_, token) => {
                  if (token in registro) {
                      const val = parseFloat(registro[token]);
                      return isNaN(val) ? 0 : val;
                  }
                  // Token desconocido: devolver 0 y avisar
                  console.warn('visor-widgets: campo no encontrado en registro:', token);
                  return 0;
              });

              // Validar: solo dígitos, espacios, punto decimal y operadores básicos
              if (!/^[\d\s.\+\-\*\/\(\)]+$/.test(exprNum)) {
                  console.warn('visor-widgets: expresión no válida tras sustitución:', exprNum);
                  return '?';
              }

              try {
                  // eslint-disable-next-line no-new-func
                  const resultado = Function('"use strict"; return (' + exprNum + ')')();
                  return window.visorProject.utils.formatearDato(resultado, formato);
              } catch (e) {
                  console.warn('visor-widgets: error al evaluar expresión:', exprNum, e);
                  return '?';
              }
          };

          t = t.replace(/\[\[([\s\S]*?)\]\]/g, (_, expr) => resolverExpresion(expr));
          d = d.replace(/\[\[([\s\S]*?)\]\]/g, (_, expr) => resolverExpresion(expr));
          // ─────────────────────────────────────────────────────────────────────

          const mapaSustitucion = {
              'etiqueta': registro.etiqueta || registro.nombre || "Canarias",
              'valor': window.visorProject.utils.formatearDato(registro[campoParaValor], itemConfig.formato || 'entero'),
              'var_abs': window.visorProject.utils.formatearDato(vars.abs, 'entero'),
              'var_pct': window.visorProject.utils.formatearDato(vars.pct, 'porcentaje'),
              'fecha_ref': itemConfig.fecha_referencia ? luxon.DateTime.fromISO(itemConfig.fecha_referencia).toFormat('dd/MM/yyyy') : "",
              //~ 'uds_vv_residenciales_porc': window.visorProject.utils.formatearDato(registro['uds_vv_residenciales_porc'], itemConfig.formato || 'porcentaje_2'),
              //~ 'uds_vv_residenciales': window.visorProject.utils.formatearDato(registro['uds_vv_residenciales'], itemConfig.formato || 'entero'),
              //~ 'plazas_suelo_residencial': window.visorProject.utils.formatearDato(registro['plazas_suelo_residencial'], itemConfig.formato || 'entero'),
              //~ 'plazas_suelo_residencial_porc': window.visorProject.utils.formatearDato(registro['plazas_suelo_residencial_porc'], itemConfig.formato || 'porcentaje_2'),
              //~ 'plazas_vacacionales': window.visorProject.utils.formatearDato(registro['plazas_vacacionales'], itemConfig.formato || 'entero'),
              //~ 'plazas_vacacionales_plazas_total_porc': window.visorProject.utils.formatearDato(registro['plazas_vacacionales_plazas_total_porc'], itemConfig.formato || 'porcentaje_2'),
              //~ 'plazas_total': window.visorProject.utils.formatearDato(registro['plazas_total'], itemConfig.formato || 'entero'),
              //~ 'pte_v': window.visorProject.utils.formatearDato(registro['pte_v'], itemConfig.formato || 'entero'),
              //~ 'pte_v_porc': window.visorProject.utils.formatearDato(registro['pte_v_porc'], itemConfig.formato || 'porcentaje_2'),
              //~ 'rit': window.visorProject.utils.formatearDato(registro['rit'], itemConfig.formato || 'entero'),
              //~ 'rit_v': window.visorProject.utils.formatearDato(registro['rit_v'], itemConfig.formato || 'entero'),
              //~ 'presion_humana_km2': window.visorProject.utils.formatearDato(registro['presion_humana_km2'], itemConfig.formato || 'entero'),
              //~ 'rit_km2': window.visorProject.utils.formatearDato(registro['rit_km2'], itemConfig.formato || 'entero'),
              //~ 'rit_r_km2': window.visorProject.utils.formatearDato(registro['rit_r_km2'], itemConfig.formato || 'entero'),
              //~ 'rit_v_km2': window.visorProject.utils.formatearDato(registro['rit_v_km2'], itemConfig.formato || 'entero'),
              //~ 'viviendas_total': window.visorProject.utils.formatearDato(registro['viviendas_total'], itemConfig.formato || 'entero'),
              //~ 'viviendas_habituales': window.visorProject.utils.formatearDato(registro['viviendas_habituales'], itemConfig.formato || 'entero'),
              //~ 'viviendas_vacias': window.visorProject.utils.formatearDato(registro['viviendas_vacias'], itemConfig.formato || 'entero'),
              //~ 'viviendas_esporadicas': window.visorProject.utils.formatearDato(registro['viviendas_esporadicas'], itemConfig.formato || 'entero'),
              //~ 'vacacional_por_viviendas_habituales': window.visorProject.utils.formatearDato(registro['vacacional_por_viviendas_habituales'], itemConfig.formato || 'porcentaje_2'),
          }; 
          //~ console.log(itemConfig);
          //~ console.log(registro);

          

          // ── PASO 1: claves especiales del mapa (etiqueta, valor, var_*…) ────
          Object.keys(mapaSustitucion).forEach(key => {
              const regex = new RegExp(`\\[${key}\\]`, 'g');
              t = t.replace(regex, mapaSustitucion[key]);
              d = d.replace(regex, mapaSustitucion[key]);
          });

          // ── PASO 2: fallback genérico para [cualquier_campo] no resuelto ────
          // Permite usar cualquier campo del registro sin necesidad de añadirlo
          // al mapaSustitucion. El formato se lee del diccionario de datos;
          // si no existe, se usa itemConfig.formato o 'entero' como último recurso.
          const diccionario = (drupalSettings.visorProject && drupalSettings.visorProject.diccionario) || {};
          const reemplazarGenerico = (str) => str.replace(/\[(\w+)\]/g, (match, campo) => {
              if (!(campo in registro)) return match; // dejar intacto si no existe
              const formato = (diccionario[campo] && diccionario[campo].formato)
                  || itemConfig.formato
                  || 'entero';
              return window.visorProject.utils.formatearDato(registro[campo], formato);
          });
          t = reemplazarGenerico(t);
          d = reemplazarGenerico(d);
          // ─────────────────────────────────────────────────────────────────────

          return {
              titulo: t,
              desarrollo: d,
              icono: itemConfig.icono || 'analytics',
              clase: itemConfig.clasePersonalizada || ''
          };
      },

    crearNoticias: function(config) {
        if (!config.items) return document.createElement('div');
        const resultados = config.items.map(it => this.prepararDatosImpacto(it)).filter(r => r !== null);
        const frases = resultados.map(r => r.titulo);
        return frases.length > 0 ? this.renderizarSlider(frases, config.config) : document.createElement('div');
    },

    crearCardImpacto: function(config) {
        const data = this.prepararDatosImpacto(config.item);
        //~ console.log(data)
        if (!data) return document.createElement('div');

        const contenedor = document.createElement('div');
        contenedor.className = `card-impacto-total ${data.clase}`;
        contenedor.innerHTML = `
            <div class="card-impacto-body">
                <span class="material-icons impacto-icono-principal">${data.icono}</span>
                <div class="impacto-texto-wrapper">
                    <h3 class="impacto-titulo">${data.titulo}</h3>
                    <p class="impacto-desarrollo">${data.desarrollo}</p>
                </div>
                <span class="material-icons impacto-bg-decor">${data.icono}</span>
            </div>`;
        return contenedor;
    },

    renderizarSlider: function(frases, settings) {
        const contenedor = document.createElement('div');
        contenedor.className = 'noticias-slider-wrapper';
        const lista = document.createElement('div');
        lista.className = 'noticias-lista';
        const contenidoHTML = frases.map(frase => `<div class="noticia-item"><span class="noticia-texto">${frase}</span></div>`).join('');
        lista.innerHTML = contenidoHTML + contenidoHTML;
        contenedor.appendChild(lista);
        const duracion = frases.length * 10;
        lista.style.animation = `ticker-scroll ${duracion}s linear infinite`;
        return contenedor;
    },

     crearOdometro: function(config, dataset) {
          const campo = config.parametros.campo;
          const valor = Math.round(dataset[campo] || 0);
          const strValor = valor.toLocaleString('es-ES');
          const fechaIso = dataset['fecha_calculo'];
          const fechaFormateada = luxon.DateTime.fromISO(fechaIso).toFormat('dd-MM-yyyy');

          const tpl = document.getElementById('tpl-odometro-contenedor');
          if (!tpl) {
              console.error("No se encontró el template tpl-odometro-contenedor");
              return document.createElement('div'); // Devolvemos un div vacío para evitar errores en cadena
          }

          const fragmento = tpl.content.cloneNode(true);
          // Buscamos el contenedor. Si el template solo tiene un div, podemos usar fragmento.firstElementChild
          const contenedor = fragmento.querySelector('.odometer-container') || fragmento.firstElementChild;

          if (!contenedor) {
              console.error("El template existe pero no tiene un contenedor con clase .odometer-container");
              return fragmento;
          }

          // Limpiamos por si el template tenía basura
          contenedor.innerHTML = '';

          const titulo = document.createElement('p');
          titulo.className = 'titulo-odometro mdc-typography--headline5';
          titulo.innerHTML = 'Viviendas Vacacionales en<br> Canarias al ' + fechaFormateada;
          contenedor.appendChild(titulo);

          strValor.split('').forEach((char) => {
              if (char === '.' || char === ',') {
                  const sep = document.createElement('div');
                  sep.className = 'odometer-separator';
                  sep.textContent = char;
                  contenedor.appendChild(sep);
              } else if (!isNaN(parseInt(char))) {
                  const digit = document.createElement('div');
                  digit.className = 'odometer-digit';
                  
                  const strip = document.createElement('div');
                  strip.className = 'digit-strip';
                  
                  // Creamos la tira del 0 al 9
                  for (let i = 0; i <= 9; i++) {
                      const span = document.createElement('span');
                      span.textContent = i;
                      strip.appendChild(span);
                  }

                  // 1. Posición inicial (Cero)
                  strip.style.transform = `translateY(0)`;
                  
                  // 2. Animamos hacia la posición final tras un pequeño delay
                  const targetDigit = parseInt(char);
                  const offset = targetDigit * 1.2; // 1.2em es la altura en tu CSS
                  
                  setTimeout(() => {
                      strip.style.transform = `translateY(-${offset}em)`;
                  }, 100); 

                  digit.appendChild(strip);
                  contenedor.appendChild(digit);
              }
          });

          return fragmento;
      }
  };

})(window.jQuery, window.Drupal);
