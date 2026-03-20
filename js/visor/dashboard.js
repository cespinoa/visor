(function ($, Drupal, drupalSettings, once) {
  'use strict';

  window.VisorVV = window.VisorVV || {};

  Drupal.behaviors.visorDashboard = {
    attach: function (context) {
      // Inicialización única sobre el contenedor específico
      const elements = once('dashboard-init', '#dashboard-grafico-area', context);

      elements.forEach((container) => {
        const historicos = drupalSettings.historicosFull;
        if (!historicos) return;

        // 1. Procesar datos para los dos componentes
        const datosGrafico = procesarDatosGrafico(historicos);
        const datosTabla = procesarDatosTabla(historicos);

        // 2. Renderizar componentes
        renderizarGraficoArea(container, datosGrafico);
        renderizarTablaEvolucion(container, datosTabla);
      });

      once('dashboard-init', '#toggle-dimension', context).forEach(el => {
        el.addEventListener('click', (e) => {
            const btn = e.target.closest('.mdc-segmented-button__segment');
            if (!btn) return;

            // 1. GESTIÓN VISUAL: Quitar clase a todos y ponerla al actual
            el.querySelectorAll('.mdc-segmented-button__segment').forEach(s => {
                s.classList.remove('mdc-segmented-button__segment--selected');
                s.setAttribute('aria-selected', 'false');
            });
            
            btn.classList.add('mdc-segmented-button__segment--selected');
            btn.setAttribute('aria-selected', 'true');

            // 2. LÓGICA: Actualizar estado y renderizar
            window.tablaEstado.dimension = btn.dataset.value; // 'islas' o 'municipios'
            window.VisorVV.renderizarSuperTabla();
        });
      });

      window.VisorVV.actualizarTitulares();

      // Buscamos el objeto que contiene el dato de toda la comunidad
      const registroCanarias = drupalSettings.superTabla.find(item => item.ambito === 'canarias');

      // Extraemos el valor (asegúrate de que el nombre del campo sea 'vv' o el que uses en el JSON)
      const granTotal = registroCanarias ? parseFloat(registroCanarias.vv_total) : 0;

      console.log("Cifra oficial de Canarias:", granTotal);
      console.log(drupalSettings.superTabla)

      // Lanzamos el Odometer
      if (granTotal > 0) {
          window.VisorVV.crearOdometer('#odometer-total', granTotal);
      }
      


      
    }
  };

  /**
   * Prepara las series para Chart.js (Stacked Area)
   */
  function procesarDatosGrafico(raw) {
    const series = [];
    const occidentalesSum = {};
    // Obtenemos todas las fechas disponibles para alinear puntos
    const todasLasFechas = [...new Set(Object.values(raw).flat().map(p => p.x))].sort();

    Object.keys(ConfigVisor.islas).forEach(id => {
      const config = ConfigVisor.islas[id];
      if (id == 999) return; // Canarias no va apilada (sería el total)

      const key = `isla_${id}`;
      const puntos = raw[key] || [];

      if (config.bloque === 3) {
        // Acumulamos Bloque 3 (Occidentales)
        puntos.forEach(p => {
          occidentalesSum[p.x] = (occidentalesSum[p.x] || 0) + p.y;
        });
      } else {
        // Bloques 1 y 2 (Individuales)
        series.push({
          label: config.nombre,
          borderColor: config.color,
          backgroundColor: config.color + 'B3', // Transparencia Material
          data: puntos.map(p => {
            // Quitamos la parte de la hora " 00:00:00" si existe para dejar solo YYYY-MM-DD
            const fechaLimpia = p.x.split(' ')[0]; 
            return { 
              x: fechaLimpia, 
              y: p.y 
            };
          }),
          fill: true
        });
      }
    });

    // Añadimos la serie agrupada de Occidentales
    if (Object.keys(occidentalesSum).length > 0) {
      series.push({
        label: 'Islas Occidentales',
        borderColor: '#2E7D32',
        backgroundColor: '#2E7D3280',
        data: todasLasFechas.map(f => ({ x: f, y: occidentalesSum[f] || 0 })),
        fill: true
      });
    }

    return series;
  }

  /**
   * Prepara el array ordenado para la tabla Material
   */
  function procesarDatosTabla(raw) {
    return Object.keys(ConfigVisor.islas)
      .map(id => {
        const config = ConfigVisor.islas[id];
        // Determinar clave: canarias_0 o isla_X
        const key = (id == 999) ? 'canarias_0' : `isla_${id}`;
        return {
          id: id,
          nombre: config.nombre,
          bloque: config.bloque,
          color: config.color,
          puntos: raw[key] || []
        };
      })
      .sort((a, b) => {
        // Ordenar por bloque y luego alfabético
        if (a.bloque !== b.bloque) return a.bloque - b.bloque;
        return a.nombre.localeCompare(b.nombre);
      });
  }

  /**
   * Renderiza el gráfico de Chart.js
   */
  /**
   * Renderiza el gráfico de Chart.js con eje de tiempo y etiquetas en hitos reales.
   */
  function renderizarGraficoArea(container, series) {
    const canvas = container.querySelector('#evolucionChart');
    if (!canvas || typeof Chart === 'undefined') return;

    // --- MODIFICACIÓN 1: Limpieza de fechas y Ordenación ---
    // Limpiamos los puntos de cada serie para que no tengan hora
    series.forEach(serie => {
      serie.data = serie.data.map(p => ({
        x: (typeof p.x === 'string') ? p.x.split(' ')[0] : p.x,
        y: p.y
      }));
    });

    // Ordenamos las series para que el apilado sea lógico (Occidentales arriba)
    // El orden en el array define quién va abajo (índice 0) y quién arriba
    const ordenDeseado = ['Gran Canaria', 'Tenerife', 'Fuerteventura', 'Lanzarote', 'Islas Occidentales'];
    series.sort((a, b) => ordenDeseado.indexOf(a.label) - ordenDeseado.indexOf(b.label));

    // --- FIN MODIFICACIÓN 1 ---

    const todasLasFechas = series.reduce((acc, serie) => {
      return acc.concat(serie.data.map(p => p.x));
    }, []).sort();

    if (todasLasFechas.length === 0) {
      console.error('No hay fechas disponibles para el gráfico');
      return;
    }

    const fMinRaw = todasLasFechas[0].split(' ')[0];
    const fMaxRaw = todasLasFechas[todasLasFechas.length - 1].split(' ')[0];

    const fMin = luxon.DateTime.fromISO(fMinRaw).minus({ days: 15 }).toISODate();
    const fMax = luxon.DateTime.fromISO(fMaxRaw).plus({ days: 15 }).toISODate();

    const miGrafico = new Chart(canvas, {
      type: 'line',
      data: { datasets: series },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        elements: {
          line: { tension: 0.3, fill: true }, // Aseguramos el fill aquí también
          point: { radius: 4, hoverRadius: 6 }
        },
        scales: {
          x: { 
            type: 'time',
            time: {
              parser: 'yyyy-MM-dd',
              unit: 'day',
              displayFormats: { day: 'LLL yyyy' }
            },
            min: fMin,
            max: fMax,
            ticks: {
              autoSkip: false,
              maxRotation: 0,
              font: { size: 10, weight: '500' },
              callback: function(value) {
                const fechaTick = luxon.DateTime.fromMillis(value).toISODate();
                // Comparación exacta ahora que todo está limpio
                if (todasLasFechas.includes(fechaTick)) {
                  return luxon.DateTime.fromMillis(value).toFormat('LLL yyyy').toLowerCase();
                }
                return null;
              }
            },
            grid: {
              color: (context) => {
                if (!context.tick) return 'transparent';
                const f = luxon.DateTime.fromMillis(context.tick.value).toISODate();
                return todasLasFechas.includes(f) ? 'rgba(0,0,0,0.1)' : 'transparent';
              }
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              callback: (value) => value.toLocaleString()
            },
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          }
        },
        plugins: {
          legend: { 
            position: 'bottom', 
            labels: { usePointStyle: true, padding: 20 } 
          },
          tooltip: { 
            mode: 'index', 
            intersect: false,
            padding: 12,
            cornerRadius: 8,
            itemSort: (a, b) => b.raw - a.raw, // El más grande arriba en el tooltip
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                if (context.parsed.y !== null) {
                  label += context.parsed.y.toLocaleString();
                }
                return label;
              }
            }
          }
        }
      }
    });

    // 2. El "Vigilante" (Observer) para que no desaparezca al cambiar de pestaña
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Si el panel vuelve a ser visible, le damos un toque al gráfico
                setTimeout(() => {
                    miGrafico.resize();
                    miGrafico.update('none');
                }, 50); // 50ms es suficiente para que el CSS ya esté aplicado
            }
        });
    }, { threshold: 0.1 });

    // 3. Empezamos a vigilar el canvas
    observer.observe(canvas);

    
  }

  /**
   * Renderiza la tabla de datos
   */
  function renderizarTablaEvolucion(container, datos) {
    const tablaDiv = container.querySelector('#tabla-evolucion-container');
    if (!tablaDiv) {
      console.error('No se encontró el contenedor #tabla-evolucion-container');
      return;
    }

    let html = `
      <div class="mdc-data-table" style="width: 100%; border: none;">
        <table class="mdc-data-table__table" style="width: 100%;">
          <thead>
            <tr class="mdc-data-table__header-row">
              <th class="mdc-data-table__header-cell">Territorio</th>
              <th class="mdc-data-table__header-cell mdc-data-table__header-cell--numeric">Jun 2023</th>
              <th class="mdc-data-table__header-cell mdc-data-table__header-cell--numeric">Dic 2025</th>
              <th class="mdc-data-table__header-cell mdc-data-table__header-cell--numeric">Variación</th>
            </tr>
          </thead>
          <tbody class="mdc-data-table__content">`;

    datos.forEach(item => {
      // 1. Limpiamos las fechas de los puntos para asegurar la comparación
      const puntosLimpios = item.puntos.map(p => ({
        fecha: p.x.split(' ')[0],
        valor: p.y
      }));

      // 2. Buscamos los hitos específicos (ajusta la fecha si en tu DB es otra)
      const v2023 = puntosLimpios.find(p => p.fecha === '2023-06-30')?.valor || 0;
      const v2025 = puntosLimpios.find(p => p.fecha === '2025-12-31')?.valor || 0;
      
      // 3. Cálculo de variación
      const variacion = v2023 > 0 ? (((v2025 - v2023) / v2023) * 100).toFixed(1) : '0.0';
      // ... dentro del loop datos.forEach de renderizarTablaEvolucion
      const numVariacion = parseFloat(variacion);
      const claseVariacion = numVariacion > 0 ? 'variacion-up' : 'variacion-down';
      const icono = numVariacion > 0 ? '▲' : '▼';
      const esCanarias = (item.id == 999);

      html += `
        <tr class="mdc-data-table__row ${esCanarias ? 'row-total' : ''}">
          <td class="mdc-data-table__cell">
            <span class="isla-indicador" style="--isla-color: ${item.color}"></span>
            <span class="isla-nombre">${item.nombre}</span>
          </td>
          <td class="mdc-data-table__cell mdc-data-table__cell--numeric">${v2023.toLocaleString()}</td>
          <td class="mdc-data-table__cell mdc-data-table__cell--numeric">${v2025.toLocaleString()}</td>
          <td class="mdc-data-table__cell mdc-data-table__cell--numeric">
            <span class="variacion-chip ${claseVariacion}">
              ${icono} ${Math.abs(numVariacion)}%
            </span>
          </td>
        </tr>`;
    });

    html += `</tbody></table></div>`;
    tablaDiv.innerHTML = html;
  }


  // Súper tabla //

  let tablaEstado = {
    dimension: 'islas', // o 'municipios'
    orderBy: 'rit',
  };

  let repositorioSiluetas = {};
    fetch('/sites/default/files/assets/siluetas.json')
        .then(r => r.json())
        .then(data => { repositorioSiluetas = data; });

  window.VisorVV.renderizarSuperTabla = function() {
      const container = document.getElementById('super-tabla-body');
      const masterData = drupalSettings.superTabla;
      const tEstado = tablaEstado;

      if (!container || !masterData) {
          console.warn("Tabla o datos no disponibles aún.");
          return;
      }

      // 1. Filtrar por la dimensión elegida (isla o municipio)
      const dimensionBuscada = tEstado.dimension === 'islas' ? 'isla' : 'municipio';
      console.log(masterData);
      // Filtramos y eliminamos posibles duplicados de id por seguridad antes de procesar
      let rawData = masterData.filter(reg => 
          String(reg.ambito).toLowerCase() === dimensionBuscada
      );
      
      // Asegurar registros únicos por ID para evitar duplicados en el ranking
      let data = Array.from(new Map(rawData.map(item => [item.id, item])).values());

      // 2. Ordenar por la métrica (siempre DESC para mostrar el Top)
      data.sort((a, b) => {
          const valA = parseFloat(a[tEstado.orderBy]) || 0;
          const valB = parseFloat(b[tEstado.orderBy]) || 0;
          return valB - valA; 
      });

      // 3. El Top: 7 para islas (Canarias), 10 para municipios
      const limite = tEstado.dimension === 'islas' ? 7 : 10;
      const topData = data.slice(0, limite);

      // 4. Renderizado con formato local
      container.innerHTML = topData.map((item, index) => {
          const nombre = item.etiqueta;
          const rit = parseFloat(item.rit) || 0;
          const densidad = parseFloat(item.ph_km2) || 0;

          const path = repositorioSiluetas[item.id] || "";

          return `
              <tr class="mdc-data-table__row">
                  <td class="mdc-data-table__cell">
                      <span class="ranking-num" style="color: #666; font-size: 0.8em; margin-right: 8px;">${index + 1}</span>
                      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" 
                           style="position: relative; right: 5px; top: 5px; height: 30px; width: 40px; opacity: 0.15; pointer-events: none;">
                          <path d="${path}" fill="currentColor" />
                      </svg>
                      <span class="nombre-territorio" style="font-weight: 500;">${nombre}</span>
                  </td>
                  <td class="mdc-data-table__cell mdc-data-table__cell--numeric">
                      ${rit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                  </td>
                  <td class="mdc-data-table__cell mdc-data-table__cell--numeric">
                      ${Math.round(densidad).toLocaleString('es-ES')}
                  </td>
              </tr>
          `;
      }).join('');

      // Sincronizar visualmente la cabecera (flechas de ordenación)
      actualizarIconosCabecera(tEstado.orderBy);
  };

  // Función auxiliar para mover la flecha de la columna activa
  function actualizarIconosCabecera(columnaActiva) {
      document.querySelectorAll('.mdc-data-table__header-cell[data-column]').forEach(th => {
          const icon = th.querySelector('.material-icons');
          if (!icon) return;
          
          if (th.dataset.column === columnaActiva) {
              th.classList.add('mdc-data-table__header-row--selected');
              icon.style.opacity = "1";
          } else {
              th.classList.remove('mdc-data-table__header-row--selected');
              icon.style.opacity = "0.2";
          }
      });
  }

  // Event Listeners para cabeceras (Ordenación)
  document.querySelectorAll('.mdc-data-table__header-cell[data-column]').forEach(header => {
    header.addEventListener('click', () => {
      const col = header.dataset.column;
      if (tablaEstado.orderBy === col) {
        tablaEstado.orderDir = tablaEstado.orderDir === 'desc' ? 'asc' : 'desc';
      } else {
        tablaEstado.orderBy = col;
        tablaEstado.orderDir = 'desc';
      }
      window.VisorVV.renderizarSuperTabla();
    });
  });

  // A. Control de Dimensión (Islas / Municipios)
  const segmentedButton = document.querySelector('#toggle-dimension');
  if (segmentedButton) {
      segmentedButton.addEventListener('click', (e) => {
          const btn = e.target.closest('.mdc-segmented-button__segment');
          if (!btn) return;
          
          // Actualizar estado y renderizar
          tablaEstado.dimension = btn.dataset.value;
          window.VisorVV.renderizarSuperTabla();
      });
  }

  // B. Control de Métrica (Clic en Cabeceras)
  document.querySelectorAll('.mdc-data-table__header-cell[data-column]').forEach(header => {
      header.addEventListener('click', () => {
          const col = header.dataset.column;
          if (col === 'nombre') return; // El nombre no es una métrica de ranking

          tablaEstado.orderBy = col;

          // Feedback visual: Mover la clase --sorted y la flecha
          document.querySelectorAll('.mdc-data-table__header-cell').forEach(h => {
              h.classList.remove('mdc-data-table__header-cell--sorted');
              const icon = h.querySelector('.material-icons');
              if (icon) icon.style.display = 'none';
          });

          header.classList.add('mdc-data-table__header-cell--sorted');
          const currentIcon = header.querySelector('.material-icons');
          if (currentIcon) {
              currentIcon.style.display = 'inline-block';
              currentIcon.innerText = 'arrow_downward';
          }

          window.VisorVV.renderizarSuperTabla();
      });
  });

  window.VisorVV.actualizarTitulares = async function() {
      const config = await fetch('/sites/default/files/assets/titulares_config.json').then(r => r.json());
      const data = drupalSettings.superTabla;

      // 1. GENERAR CARDS
      const cardsHtml = config.cards.map(conf => {
          // Buscamos el registro que tiene el máximo en la métrica configurada
          const topRecord = [...data].sort((a, b) => b[conf.metrica] - a[conf.metrica])[0];
          
          const valorFormateado = conf.formato === 'percent' 
              ? topRecord[conf.metrica].toLocaleString() + '%' 
              : Math.round(topRecord[conf.metrica]).toLocaleString();

          return `
              <div class="card-titular-headline">
                  <div class="card-bg-silhouette">${repositorioSiluetas[topRecord.id] || ''}</div>
                  <div class="card-content">
                      <span class="card-tag"><i class="material-icons">${conf.icono}</i> ${conf.titulo}</span>
                      <h2 class="card-valor">${valorFormateado}</h2>
                      <p class="card-lugar">${topRecord.etiqueta}</p>
                      <small class="card-desc">${conf.descripcion}</small>
                  </div>
              </div>
          `;
      }).join('');

      // 2. GENERAR TICKER (Teletipo)
      const mediaRit = (data.reduce((acc, v) => acc + v.rit, 0) / data.length).toFixed(1);
      const minRit = [...data].sort((a, b) => a.rit - b.rit)[0];
      
      const tickerText = config.ticker.datos_curiosos.map(msg => {
          return msg.replace('{media_rit}', mediaRit)
                    .replace('{min_rit_nombre}', minRit.etiqueta)
                    .replace('{min_rit_valor}', minRit.rit);
      }).join(' • ');

      document.getElementById('titulares-cards-container').innerHTML = cardsHtml;
      document.getElementById('ticker-content').innerHTML = `<span>${config.ticker.prefijo} ${tickerText}</span>`;
  };

  window.VisorVV.crearOdometer = function(selector, valor) {
      const container = document.querySelector(selector);
      if (!container) return;

      // Formateamos el número con puntos de miles: "54.321"
      const strValor = Math.round(valor).toLocaleString('es-ES');
      
      container.innerHTML = strValor.split('').map(char => {
          // Si es un punto, creamos un contenedor estático
          if (char === '.' || char === ',') {
              return `<div class="odometer-separator">${char}</div>`;
          }
          // Si es un número, creamos el tambor giratorio
          return `
              <div class="odometer-digit">
                  <div class="digit-strip">
                      ${[0,1,2,3,4,5,6,7,8,9,0].map(n => `<span>${n}</span>`).join('')}
                  </div>
              </div>
          `;
      }).join('');

      // Iniciamos la animación
      setTimeout(() => {
          const strips = container.querySelectorAll('.digit-strip');
          let stripIndex = 0;
          
          strValor.split('').forEach((char) => {
              // Solo animamos si es un número (saltamos los puntos)
              if (!isNaN(parseInt(char))) {
                  const yMove = parseInt(char) * 1.2; // 1.2em es el line-height
                  strips[stripIndex].style.transform = `translateY(-${yMove}em)`;
                  stripIndex++;
              }
          });
      }, 200);
  };

})(jQuery, Drupal, drupalSettings, once);
