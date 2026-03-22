// js/dashboard/utils-graficos.js

window.visorProject = window.visorProject || {};

window.visorProject.utilsGraficos = {

    // Auxiliar para obtener metadatos rápidamente
    _getMeta: function(idCampo) {
        const dicc = drupalSettings.visorProject.diccionario || {};
        return dicc[idCampo] || { formato: 'entero', unidades: '' };
    },

    crearContenedorGrafico: function(config, datosRaw) {
        const tpl = document.getElementById('tpl-grafico-contenedor');
        if (!tpl) return null;

        // Los gauges usan un registro único; el resto recibe el array completo
        const datosRaiz = (config.tipo === 'gauge' && Array.isArray(datosRaw))
            ? datosRaw[datosRaw.length - 1]
            : datosRaw;

        const fragment = tpl.content.cloneNode(true);
        const contenedor = fragment.querySelector('.contenedor-grafico');

        contenedor.querySelector('.grafico-titulo').textContent = config.titulo;
        contenedor.querySelector('.grafico-subtitulo').textContent = config.subtitulo || '';

        if (config.tipo === 'gauge') {
            const { campo_max, campo_media, campo_valor } = config.config;

            // Función de formateo centralizada
            const formatearRef = (idCampo) => {
                const valorBruto = datosRaiz[idCampo];
                const meta = this._getMeta(idCampo);
                // Si la config del gráfico trae una unidad manual, la respetamos, si no, al diccionario
                const unidad = config.config.unidad || meta.unidades || '';
                
                return {
                    raw: parseFloat(valorBruto) || 0,
                    txt: window.visorProject.utils.formatearDato(valorBruto, meta.formato) + unidad
                };
            };

            const valorActual = formatearRef(campo_valor);
            const maximo = formatearRef(campo_max);
            const media = formatearRef(campo_media);

            const colorMedia = valorActual.raw > media.raw ? 'text-danger' : 'text-success';
            const iconoMedia = valorActual.raw > media.raw ? '&#9888;' : '&#9673;';

            const footerRefs = contenedor.querySelector('.grafico-maximo');
            if (footerRefs) {
                footerRefs.innerHTML = `
                    <small class="text-muted d-flex justify-content-center align-items-center gap-2">
                        <span title="Valor Máximo Registrado">
                            <span class="text-dark">&#9650;</span> Máx: ${maximo.txt}
                        </span>
                        <span class="text-silver">|</span> 
                        <span title="Comparativa con Media de Canarias" class="${colorMedia} fw-bold">
                            <span>${iconoMedia}</span> Media: ${media.txt}
                        </span>
                    </small>
                `;
            }
        }

        const canvas = document.createElement('canvas');
        canvas.id = config.canvasId;
        canvas.className = 'gauge-canvas';
        contenedor.querySelector('.grafico-body').classList.add(`body-${config.tipo}`);
        contenedor.querySelector('.grafico-body').appendChild(canvas);

        return contenedor;
    },

    dibujarGauge: function(config, datosRaiz) {
        const canvas = document.getElementById(config.canvasId);
        if (!canvas) return;

        const idCampo = config.config.campo_valor;
        const meta = this._getMeta(idCampo);
        const valorRaw = parseFloat(datosRaiz[idCampo]) || 0;
        const maximo = parseFloat(datosRaiz[config.config.campo_max]) || 100;
        const step = maximo / 12;

        const opts = {
            angle: 0.15,
            lineWidth: 0.44,
            radiusScale: 1,
            pointer: { length: 0.6, strokeWidth: 0.035, color: '#000000' },
            limitMax: true,
            staticZones: [
                {strokeStyle: "#fff5f5", min: 0, max: step},
                {strokeStyle: "#fee5e5", min: step, max: step * 2},
                {strokeStyle: "#fccfcf", min: step * 2, max: step * 3},
                {strokeStyle: "#f9b3b3", min: step * 3, max: step * 4},
                {strokeStyle: "#f69595", min: step * 4, max: step * 5},
                {strokeStyle: "#f27575", min: step * 5, max: step * 6}, 
                {strokeStyle: "#ee5252", min: step * 6, max: step * 7},
                {strokeStyle: "#e82a2a", min: step * 7, max: step * 8},
                {strokeStyle: "#d61a1a", min: step * 8, max: step * 9},
                {strokeStyle: "#c41010", min: step * 9, max: step * 10},
                {strokeStyle: "#b50505", min: step * 10, max: step * 11},
                {strokeStyle: "#a70000", min: step * 11, max: maximo} 
            ],
            strokeColor: '#E0E0E0',
            generateGradient: true,
            highDpiSupport: true,
        };

        const gauge = new Gauge(canvas).setOptions(opts);
        gauge.maxValue = maximo;
        gauge.setMinValue(0);
        gauge.set(valorRaw);

        const label = canvas.closest('.contenedor-grafico').querySelector('.grafico-valor-principal');
        if (label) {
            const unidad = config.config.unidad || meta.unidades || '';
            const textoValor = window.visorProject.utils.formatearDato(valorRaw, meta.formato);
            label.innerHTML = `<strong>${textoValor}${unidad}</strong>`;
        }
    },

    dibujarDonut: function(config, datosRaiz) {
        const canvas = document.getElementById(config.canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const esPorc = config.porcentaje === true;

        const valoresBrutos = config.config.campos.map(c => parseFloat(datosRaiz[c]) || 0);
        const totalBruto = valoresBrutos.reduce((s, v) => s + v, 0);
        const dataValues = esPorc
            ? valoresBrutos.map(v => totalBruto > 0 ? (v / totalBruto) * 100 : 0)
            : valoresBrutos;

        // LÓGICA DE COLORES: Prioridad 1: Paleta global, Prioridad 2: Colores manuales, Prioridad 3: Grises
        let coloresFinales = config.config.colores;
        if (config.config.paleta && window.visorProject.paletas[config.config.paleta]) {
            coloresFinales = window.visorProject.paletas[config.config.paleta];
        } else if (!coloresFinales) {
            coloresFinales = window.visorProject.paletas['grises'];
        }

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: config.config.labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: coloresFinales,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                if (esPorc) {
                                    return ` ${context.label}: ${context.raw.toFixed(1)}%`;
                                }
                                const idCampo = config.config.campos[context.dataIndex];
                                const meta = this._getMeta(idCampo);
                                const val = window.visorProject.utils.formatearDato(context.raw, meta.formato);
                                return ` ${context.label}: ${val}${meta.unidades || ''}`;
                            }
                        }
                    }
                }
            }
        });

        if (config.campo_central) {
            const contenedorBody = canvas.parentElement;
            const viejo = contenedorBody.querySelector('.grafico-centro-abs');
            if (viejo) viejo.remove();

            const kpiDiv = document.createElement('div');
            kpiDiv.className = 'grafico-centro-abs';

            const idCentral = config.campo_central;
            let valorTexto, unidad;

            if (esPorc) {
                const idxCentral = config.config.campos.indexOf(idCentral);
                const porcCentral = idxCentral >= 0 ? dataValues[idxCentral] : 0;
                valorTexto = porcCentral.toFixed(1) + '%';
                unidad = '';
            } else {
                const metaCentral = this._getMeta(idCentral);
                valorTexto = window.visorProject.utils.formatearDato(datosRaiz[idCentral], metaCentral.formato);
                unidad = metaCentral.unidades || '';
            }

            const etiqueta = config.etiqueta_central || '';

            kpiDiv.innerHTML = `
                <div class="kpi-valor">${valorTexto}<span class="kpi-unidades">${unidad}</span></div>
                <div class="kpi-etiqueta">${etiqueta}</div>
            `;
            
            contenedorBody.appendChild(kpiDiv);
        }
    },

    dibujarSeries: function(config, registros) {
        const canvas = document.getElementById(config.canvasId);
        if (!canvas || !registros || registros.length === 0) return;

        const ctx = canvas.getContext('2d');
        
        // 1. CONFIGURACIÓN DE MODO
        const esHistorico = (config.contexto || '').includes('HISTORIC');
        const esApilado = config.stacked || false;
        const esBase100 = config.base100 || false;
        const tipoGrafico = config.tipo || 'line';
        const campos = config.config.campos || [];


        // 2. IDs Y GRUPOS
        const idsOrdenados = [...new Set(registros.map(reg => 
            reg.es_grupo ? reg.isla_id : (reg.localidad_id || reg.municipio_id || reg.isla_id || reg.etiqueta)
        ))];

        const grupos = registros.reduce((acc, reg) => {
            const id = reg.es_grupo ? reg.isla_id : (reg.localidad_id || reg.municipio_id || reg.isla_id || reg.etiqueta);
            if (!acc[id]) acc[id] = [];
            acc[id].push(reg);
            return acc;
        }, {});

        const paletaId = config.config.paleta || 'grises';
        const colores = window.visorProject.paletas[paletaId] || window.visorProject.paletas['grises'];
        

        let datasets = [];
        let etiquetasX = [];

        // --- MODO A: HISTÓRICO (Evolución de un campo en el tiempo) ---
        if (esHistorico) {
            const fechas = [...new Set(registros.map(r => r.fecha_calculo))].sort();
            etiquetasX = fechas;

            datasets = idsOrdenados.map((idEntidad, idx) => {
                const serie = grupos[idEntidad];
                const regReferencia = serie[0];
                const nombre = regReferencia.etiqueta || regReferencia.nombre;
                const color = colores[nombre] || colores[idx % 10];

                return {
                    type: tipoGrafico,
                    label: nombre,
                    data: fechas.map(f => {
                        const r = serie.find(reg => reg.fecha_calculo === f);
                        let valor = r ? parseFloat(r[campos[0]]) : 0;

                        if (esBase100 && esApilado) {
                            const totalFecha = idsOrdenados.reduce((sum, id) => {
                                const rb = grupos[id].find(reg => reg.fecha_calculo === f);
                                return sum + (rb ? parseFloat(rb[campos[0]]) || 0 : 0);
                            }, 0);
                            valor = totalFecha > 0 ? (valor / totalFecha) * 100 : 0;
                        }
                        return { x: f, y: valor };
                    }),
                    borderColor: color,
                    backgroundColor: (esApilado || config.config.fill) ? color : 'transparent',
                    fill: config.config.fill || false,
                    tension: config.config.tension || 0,
                    pointRadius: 0
                };
            });

        // --- MODO B: COMPARATIVO (Varios campos, foto actual) ---
        } else {
            // El eje X son las Islas/Municipios
            etiquetasX = idsOrdenados.map(id => {
                const reg = grupos[id][0];
                return reg.etiqueta || reg.nombre;
            });

            // Los datasets son los Campos (VV, Hotelera...)
            datasets = campos.map((idCampo, idx) => {
                const meta = this._getMeta(idCampo);

                const color = colores[idx];

                return {
                    type: tipoGrafico,
                    label: meta.etiqueta || idCampo,
                    data: idsOrdenados.map(id => {
                        // Cogemos el dato más reciente de esta isla para este campo
                        const serie = grupos[id].sort((a,b) => new Date(b.fecha_calculo) - new Date(a.fecha_calculo));
                        const reg = serie[0];
                        let valor = parseFloat(reg[idCampo]) || 0;

                        if (esBase100 && esApilado) {
                            // El 100% es la suma de todos los campos definidos para esta isla
                            const totalIsla = campos.reduce((sum, c) => sum + (parseFloat(reg[c]) || 0), 0);
                            valor = totalIsla > 0 ? (valor / totalIsla) * 100 : 0;
                        }
                        return valor;
                    }),
                    backgroundColor: color,
                    borderColor: color,
                    borderWidth: 1
                };
            });
        }

        // 3. RENDERIZADO FINAL
        new Chart(ctx, {
            data: { 
                labels: esHistorico ? undefined : etiquetasX, 
                datasets: datasets 
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: esHistorico ? 'time' : 'category',
                        stacked: esApilado,
                        time: esHistorico ? { 
                            tooltipFormat: 'MMMM yyyy', 
                            displayFormats: { month: 'MMM yyyy' } 
                        } : undefined,
                        ticks: esHistorico ? {
                            source: 'data', // <--- MUESTRA SOLO PUNTOS CON DATOS
                            maxRotation: 45,
                            callback: function(value) {
                                return luxon.DateTime.fromMillis(value).toFormat('MMM yyyy');
                            }
                        } : {}
                    },
                    y: {
                        stacked: esApilado,
                        beginAtZero: true,
                        max: esBase100 ? 100 : undefined,
                        ticks: {
                            callback: (v) => esBase100 ? v.toFixed(0) + '%' : window.visorProject.utils.formatearDato(v, 'entero')
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => {
                                const v = context.parsed.y || 0;
                                const label = context.dataset.label || '';
                                const valFormateado = esBase100 ? v.toFixed(1) + '%' : window.visorProject.utils.formatearDato(v, 'entero');
                                return ` ${label}: ${valFormateado}`;
                            }
                        }
                    },
                    legend: {
                        position: 'bottom', // Leyenda debajo
                        labels: {
                            usePointStyle: true, // Convierte el cuadrado en el estilo del punto
                            pointStyle: 'circle', // Fuerza que sea un círculo
                            padding: 20, // Espaciado entre elementos de leyenda
                            font: { size: 12 }
                        },

                          onHover: (event, legendItem, legend) => {
                              if (esHistorico) {
                                  const chart = legend.chart;
                                  const index = legendItem.datasetIndex;
                                  chart.data.datasets.forEach((dataset, i) => {
                                      if (!dataset._originalBg) {
                                          dataset._originalBg = dataset.backgroundColor;
                                          dataset._originalBorder = dataset.borderColor;
                                      }
                                      if (i !== index) {
                                          dataset.backgroundColor = '#e9ecef'; 
                                          dataset.borderColor = '#dee2e6';
                                      } else {
                                          dataset.backgroundColor = dataset._originalBg;
                                          dataset.borderColor = dataset._originalBorder;
                                      }
                                  });
                                  chart.update('none');
                              }
                          },
                          onLeave: (event, legendItem, legend) => {
                              if (esHistorico) {
                                  const chart = legend.chart;
                                  chart.data.datasets.forEach((dataset) => {
                                      if (dataset._originalBg) {
                                          dataset.backgroundColor = dataset._originalBg;
                                          dataset.borderColor = dataset._originalBorder;
                                      }
                                  });
                                  chart.update('none');
                              }
                          },
                  },
                }
            }
        });
    },

    activarObservador: function(elemento, config, datos) {
        const self = this; 
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Seleccionamos el motor de dibujo según el tipo
                    switch (config.tipo) {
                        case 'gauge':
                            // El gauge usa el registro actual (datos suele ser un objeto único aquí)
                            self.dibujarGauge(config, Array.isArray(datos) ? datos[datos.length - 1] : datos);
                            break;
                        case 'donut':
                            self.dibujarDonut(config, Array.isArray(datos) ? datos[datos.length - 1] : datos);
                            break;
                        case 'line':
                        case 'area':
                        case 'bar' :
                            // La evolución necesita TODO el array de la serie
                            self.dibujarSeries(config, datos);
                            break;
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        observer.observe(elemento);
    }
};
