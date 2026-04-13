// js/dashboard/utils-graficos.js

window.visorProject = window.visorProject || {};

window.visorProject.utilsGraficos = {

    // Auxiliar para obtener metadatos rápidamente
    _getMeta: function(idCampo) {
        const dicc = drupalSettings.visorProject.diccionario || {};
        return dicc[idCampo] || { formato: 'entero', unidades: '' };
    },

    crearContenedorGrafico: function(config, datosRaw, opciones = {}) {
        if (config.tipo === 'radar') {
            return this.crearContenedorRadar(config, datosRaw, opciones);
        }
        if (['linea-ext', 'linea-multi-ext', 'barras-ccaa-ext', 'pendiente-ccaa-ext', 'pendiente-pob-viv', 'pendiente-censos'].includes(config.tipo)) {
            return this.crearContenedorLineaExt(config, opciones);
        }

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

        if (opciones['ancho-pdf']) {
            contenedor.style.maxWidth    = opciones['ancho-pdf'];
            contenedor.style.marginLeft  = 'auto';
            contenedor.style.marginRight = 'auto';
        }

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

    crearContenedorRadar: function(config, datosRaw, opciones = {}) {
        const datosRaiz = Array.isArray(datosRaw) ? datosRaw[datosRaw.length - 1] : datosRaw;
        const campos = config.config.campos;
        const etiquetas = config.config.etiquetas;
        const etiquetasPunto = config.config.etiquetas_punto;

        // Pre-calculamos los valores normalizados para la tabla
        const filas = campos.map((campo, i) => {
            const valorBruto = parseFloat(datosRaiz[campo]) || 0;
            const avgBruto   = parseFloat(datosRaiz[campo + '_avg']) || 0;
            const maximo     = parseFloat(datosRaiz[campo + '_max']) || 1;
            const meta = this._getMeta(campo);
            return {
                punto: etiquetasPunto[i],
                etiqueta: etiquetas[i],
                valorFormateado: window.visorProject.utils.formatearDato(valorBruto, meta.formato),
                avgFormateado:   window.visorProject.utils.formatearDato(avgBruto,   meta.formato),
                maxFormateado:   window.visorProject.utils.formatearDato(maximo,      meta.formato),
                valorNorm: maximo > 0 ? (valorBruto / maximo) * 100 : 0,
                avgNorm:   maximo > 0 ? (avgBruto   / maximo) * 100 : 0,
            };
        });

        // Contenedor principal (mismo aspecto que .contenedor-grafico)
        const wrapper = document.createElement('div');
        wrapper.className = 'contenedor-grafico contenedor-radar';

        // header-tools para fullscreen
        const headerTools = document.createElement('div');
        headerTools.className = 'header-tools';
        wrapper.appendChild(headerTools);

        // Título
        const titulo = document.createElement('div');
        titulo.className = 'grafico-titulo';
        titulo.textContent = opciones.titulo || config.titulo;
        wrapper.appendChild(titulo);

        // Posición de la tabla: 'derecha' (por defecto) | 'izquierda' | 'abajo' | 'arriba' | null (sin tabla).
        // Prioridad: posicion-tabla explícito > ancho-pdf presente (→ 'abajo') > vertical legacy > 'derecha'.
        const posicionTabla = opciones['posicion-tabla'] !== undefined
            ? opciones['posicion-tabla']
            : (opciones['ancho-pdf'] ? 'abajo' : (opciones.vertical ? 'abajo' : 'derecha'));

        const CLASE_POSICION = {
            derecha:   '',
            izquierda: ' radar-tabla-izquierda',
            abajo:     ' radar-vertical',
            arriba:    ' radar-tabla-arriba',
        };

        const body = document.createElement('div');
        body.className = 'radar-body' + (CLASE_POSICION[posicionTabla] ?? '');

        // Columna del gráfico
        const chartCol = document.createElement('div');
        chartCol.className = 'radar-chart-col';
        const canvas = document.createElement('canvas');
        canvas.id = config.canvasId;
        chartCol.appendChild(canvas);
        body.appendChild(chartCol);

        // Columna de la tabla (omitida si posicionTabla es null)
        if (posicionTabla !== null) {
            const tableCol = document.createElement('div');
            tableCol.className = 'radar-table-col';

            const table = document.createElement('table');
            table.className = 'radar-tabla';
            table.innerHTML = '<thead><tr><th>Clave</th><th>Indicador</th><th>Valor</th><th>%val</th><th>Media</th><th>%avg</th><th>Máx</th></tr></thead>';
            const tbody = document.createElement('tbody');

            filas.forEach(fila => {
                const tr = document.createElement('tr');
                const td1 = document.createElement('td');
                td1.innerHTML = `<strong>${fila.punto}</strong>`;
                const td2 = document.createElement('td');
                td2.textContent = fila.etiqueta;
                const td3 = document.createElement('td');
                td3.textContent = fila.valorFormateado;
                const td4 = document.createElement('td');
                td4.textContent = fila.valorNorm.toFixed(1) + '%';
                const td5 = document.createElement('td');
                td5.textContent = fila.avgFormateado;
                const td6 = document.createElement('td');
                td6.textContent = fila.avgNorm.toFixed(1) + '%';
                td6.style.color = fila.avgNorm > 100 ? '#a70000' : 'inherit';
                const td7 = document.createElement('td');
                td7.textContent = fila.maxFormateado;
                tr.append(td1, td2, td3, td4, td5, td6, td7);
                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            tableCol.appendChild(table);
            body.appendChild(tableCol);
        }

        wrapper.appendChild(body);

        if (opciones['ancho-pdf']) {
            wrapper.style.maxWidth    = opciones['ancho-pdf'];
            wrapper.style.marginLeft  = 'auto';
            wrapper.style.marginRight = 'auto';
        }

        return wrapper;
    },

    dibujarRadar: function(config, datosRaiz) {
        const canvas = document.getElementById(config.canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const campos = config.config.campos;
        const etiquetasPunto = config.config.etiquetas_punto;

        const valoresNorm = campos.map(campo => {
            const v = parseFloat(datosRaiz[campo]) || 0;
            const max = parseFloat(datosRaiz[campo + '_max']) || 1;
            const vEfectivo = v > max ? max : v;
            return max > 0 ? (vEfectivo / max) * 100 : 0;
        });

        const avgNorm = campos.map(campo => {
            const avg = parseFloat(datosRaiz[campo + '_avg']) || 0;
            const max = parseFloat(datosRaiz[campo + '_max']) || 1;
            return max > 0 ? (avg / max) * 100 : 0;
        });

        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: etiquetasPunto,
                datasets: [
                    {
                        label: datosRaiz.etiqueta || 'Valor',
                        data: valoresNorm,
                        backgroundColor: 'rgba(167, 0, 0, 0.15)',
                        borderColor: '#a70000',
                        borderWidth: 2,
                        pointBackgroundColor: '#a70000',
                        pointRadius: 3,
                    },
                    {
                        label: datosRaiz.ambito === 'municipio'
                            ? 'Media de municipios tipo ' + datosRaiz.tipo_municipio
                            : 'Media Canarias',
                        data: avgNorm,
                        backgroundColor: 'rgba(150, 150, 150, 0.12)',
                        borderColor: '#aaaaaa',
                        borderWidth: 1,
                        borderDash: [4, 4],
                        pointBackgroundColor: '#aaaaaa',
                        pointRadius: 2,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    r: {
                        min: 0,
                        max: 100,
                        ticks: { display: false, stepSize: 25 },
                        grid: { color: 'rgba(0,0,0,0.08)' },
                        pointLabels: { font: { size: 11, weight: 'bold' } }
                    }
                },
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: (context) => ` ${context.dataset.label}: ${context.raw.toFixed(1)}%`
                        }
                    }
                }
            }
        });
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
                    pointRadius: 0,
                    _formato:   this._getMeta(campos[0])?.formato   || 'decimal_2',
                    _unidades:  this._getMeta(campos[0])?.unidades  || '',
                    _base100:   esBase100,
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
                    borderWidth: 1,
                    _formato:  meta.formato  || 'decimal_2',
                    _unidades: meta.unidades || '',
                    _base100:  esBase100,
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
                    visorDatalabels: { paletaId },
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

    // ── Helpers de color para etiquetas PDF ─────────────────────────────────

    /**
     * Devuelve '#ffffff' o '#333333' según el contraste WCAG relativo a bgColor.
     * Umbral óptimo: L = 0.179 (igual ratio con blanco y negro).
     */
    _contrasteColor: function(hex) {
        if (!hex || hex[0] !== '#' || hex.length < 7) return '#333333';
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        const lin = c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        return L > 0.179 ? '#333333' : '#ffffff';
    },

    /**
     * Color de etiqueta para una barra concreta.
     * Prioridad: paleta + '-etiquetas'[index] → contraste automático.
     */
    _colorEtiqueta: function(bgColor, paletaId, index) {
        if (paletaId) {
            const etqs = window.visorProject.paletas[paletaId + '-etiquetas'];
            if (etqs && etqs.length > 0) return etqs[index % etqs.length];
        }
        return this._contrasteColor(bgColor);
    },

    /**
     * Dibuja etiquetas de valor sobre las barras de un gráfico Chart.js.
     * Se llama explícitamente desde utils-informes.js tras el renderizado PDF,
     * no como plugin, para garantizar que el canvas ya está completamente pintado.
     */
    _dibujarEtiquetasChart: function(chart) {
        const ctx        = chart.ctx;
        const paletaId   = chart.config?.options?.plugins?.visorDatalabels?.paletaId;
        const horizontal = chart.config?.options?.indexAxis === 'y';
        const UMBRAL     = 22;

        chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            if (meta.hidden || meta.type !== 'bar') return;

            meta.data.forEach((bar, barIndex) => {
                const value = dataset.data[barIndex];
                if (value === null || value === undefined || value === 0) return;

                const bgEsArray = Array.isArray(dataset.backgroundColor);
                const bgColor   = bgEsArray
                    ? dataset.backgroundColor[barIndex % dataset.backgroundColor.length]
                    : dataset.backgroundColor;
                const etqIndex  = bgEsArray ? barIndex : datasetIndex;
                const textColor = this._colorEtiqueta(bgColor, paletaId, etqIndex);

                const unidades = dataset._unidades || '';
                const formato  = (dataset._base100 || unidades.includes('%'))
                    ? 'porcentaje_2'
                    : (dataset._formato || 'decimal_2');
                const valorNum = typeof value === 'object' ? (horizontal ? value.x : value.y) : value;
                const texto    = window.visorProject.utils.formatearDato(valorNum, formato)
                    + (unidades && !unidades.includes('%') && !dataset._base100 ? '\u00a0' + unidades : '');

                ctx.save();
                ctx.font = '600 ' + (horizontal ? '20' : '30') + 'px Arial, sans-serif';

                if (horizontal) {
                    // Barras horizontales: etiqueta dentro/fuera del extremo derecho
                    const barWidth = Math.abs(bar.x - bar.base);
                    ctx.textBaseline = 'middle';
                    if (barWidth >= UMBRAL * 2) {
                        ctx.textAlign = 'right';
                        ctx.fillStyle = textColor;
                        ctx.fillText(texto, bar.x - 6, bar.y);
                    } else {
                        ctx.textAlign = 'left';
                        ctx.fillStyle = '#333333';
                        ctx.fillText(texto, bar.x + 4, bar.y);
                    }
                } else {
                    // Barras verticales (comportamiento original)
                    const barHeight = Math.abs(bar.base - bar.y);
                    ctx.textAlign = 'center';
                    if (barHeight >= UMBRAL) {
                        ctx.fillStyle    = textColor;
                        ctx.textBaseline = 'middle';
                        ctx.fillText(texto, bar.x, bar.y + barHeight / 2);
                    } else if (barHeight > 0) {
                        ctx.fillStyle    = '#333333';
                        ctx.textBaseline = 'bottom';
                        ctx.fillText(texto, bar.x, bar.y - 2);
                    }
                }

                ctx.restore();
            });
        });
    },

    // ── linea-ext: gráfico de línea sobre dataset externo ────────────────────

    /**
     * Contenedor para 'linea-ext': canvas + tabla de datos para PDF.
     */
    crearContenedorLineaExt: function(config, opciones = {}) {
        const tpl = document.getElementById('tpl-grafico-contenedor');
        if (!tpl) return null;

        const fragment  = tpl.content.cloneNode(true);
        const contenedor = fragment.querySelector('.contenedor-grafico');

        contenedor.querySelector('.grafico-titulo').textContent    = config.titulo;
        contenedor.querySelector('.grafico-subtitulo').textContent = config.subtitulo || '';

        const canvas   = document.createElement('canvas');
        canvas.id      = config.canvasId;
        canvas.className = 'gauge-canvas';

        const bodyClasses = {
            'barras-ccaa-ext': 'body-barras-ccaa',
        };
        const body = contenedor.querySelector('.grafico-body');
        body.classList.add(bodyClasses[config.tipo] || 'body-linea-ext');
        body.appendChild(canvas);

        // Placeholder de tabla (se rellena en dibujarLineaExt)
        const tablaDiv = document.createElement('div');
        tablaDiv.id        = config.canvasId + '-tabla';
        tablaDiv.className = 'linea-ext-tabla';
        contenedor.appendChild(tablaDiv);

        if (opciones['ancho-pdf']) {
            contenedor.style.maxWidth    = opciones['ancho-pdf'];
            contenedor.style.marginLeft  = 'auto';
            contenedor.style.marginRight = 'auto';
        }

        return contenedor;
    },

    /**
     * Dibuja el gráfico de línea y rellena la tabla de datos.
     * @param {Object} config    Instancia de CONFIG_GRAFICOS con canvasId ya asignado.
     * @param {Object} registro  Registro activo del snapshot.
     */
    dibujarLineaExt: function(config, registro) {
        const canvas = document.getElementById(config.canvasId);
        if (!canvas || !registro) return;

        const dsKey = config.config.dataset.replace(/^\$/, '');
        const ds    = (drupalSettings.visorProject || {})['$' + dsKey] || [];
        if (!ds.length) return;

        const campo  = config.config.campo;
        const ambito = registro.ambito;

        // ── Serie del item activo ────────────────────────────────────────────
        const misSeries = ds.filter(r => {
            if (r.ambito !== ambito) return false;
            if (ambito === 'isla')      return String(r.isla_id)      === String(registro.isla_id);
            if (ambito === 'municipio') return String(r.municipio_id) === String(registro.municipio_id);
            return true; // canarias
        }).sort((a, b) => String(a.year).localeCompare(String(b.year)));

        if (!misSeries.length) return;

        const years  = misSeries.map(r => String(r.year));
        const myData = misSeries.map(r => {
            const v = parseFloat(r[campo]);
            return isNaN(v) ? null : v;
        });

        // ── Serie de referencia ──────────────────────────────────────────────
        let refData  = null;
        let refLabel = null;

        if (ambito === 'isla') {
            const canDs = ds.filter(r => r.ambito === 'canarias')
                .sort((a, b) => String(a.year).localeCompare(String(b.year)));
            refData  = years.map(y => {
                const r = canDs.find(x => String(x.year) === y);
                return r ? (parseFloat(r[campo]) || null) : null;
            });
            refLabel = 'Canarias';

        } else if (ambito === 'municipio') {
            const tipoMun = registro.tipo_municipio;
            const snapshot = drupalSettings.visorProject.datosDashboard || [];
            const peerIds  = new Set(
                snapshot
                    .filter(s => s.ambito === 'municipio' && s.tipo_municipio === tipoMun)
                    .map(s => String(s.municipio_id))
            );
            refData  = years.map(y => {
                const vals = ds
                    .filter(r => r.ambito === 'municipio' &&
                                 peerIds.has(String(r.municipio_id)) &&
                                 String(r.year) === y)
                    .map(r => parseFloat(r[campo]))
                    .filter(v => !isNaN(v));
                return vals.length
                    ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
                    : null;
            });
            refLabel = 'Media municipios ' + tipoMun;
        }

        // ── Gráfico Chart.js ─────────────────────────────────────────────────
        const datasets = [
            {
                label:           registro.etiqueta,
                data:            myData,
                borderColor:     '#a70000',
                backgroundColor: 'rgba(167,0,0,0.07)',
                borderWidth:     2,
                pointRadius:     3,
                tension:         0.3,
            }
        ];

        if (refData) {
            datasets.push({
                label:           refLabel,
                data:            refData,
                borderColor:     '#aaaaaa',
                backgroundColor: 'transparent',
                borderWidth:     1.5,
                borderDash:      [5, 4],
                pointRadius:     2,
                tension:         0.3,
            });
        }

        new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: years, datasets },
            options: {
                responsive:          true,
                maintainAspectRatio: true,
                aspectRatio:         3,
                scales: {
                    y: { beginAtZero: false }
                },
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        mode:      'index',
                        intersect: false,
                        callbacks: {
                            label: ctx => {
                                const v = ctx.parsed.y;
                                return ` ${ctx.dataset.label}: ${v !== null ? v.toFixed(2) : '—'}`;
                            }
                        }
                    }
                }
            }
        });

        // ── Tabla de datos (visible siempre; imprescindible en PDF) ──────────
        const tablaEl = document.getElementById(config.canvasId + '-tabla');
        if (!tablaEl) return;

        const fmt = v => (v === null || v === undefined || isNaN(v))
            ? '—'
            : parseFloat(v).toFixed(2);

        let html = '<table class="linea-ext-tabla__table">';
        html += '<thead><tr><th></th>'
            + years.map(y => `<th>${y}</th>`).join('')
            + '</tr></thead><tbody>';

        html += `<tr><th>${registro.etiqueta}</th>`
            + myData.map(v => `<td>${fmt(v)}</td>`).join('')
            + '</tr>';

        if (refData) {
            html += `<tr><th>${refLabel}</th>`
                + refData.map(v => `<td>${fmt(v)}</td>`).join('')
                + '</tr>';
        }

        html += '</tbody></table>';
        tablaEl.innerHTML = html;
    },

    /**
     * Gráfico de línea con dos (o más) series de datasets externos, normalizadas
     * a base 100 en el año indicado por config.config.baseYear.
     * @param {Object} config    Instancia de CONFIG_GRAFICOS con canvasId ya asignado.
     * @param {Object} registro  Registro activo del snapshot.
     */
    dibujarLineaMultiExt: function(config, registro) {
        const canvas = document.getElementById(config.canvasId);
        if (!canvas || !registro) return;

        const settings    = drupalSettings.visorProject || {};
        const baseYear    = String(config.config.baseYear || '2010');
        const seriesConf  = config.config.series || [];
        const ambito      = registro.ambito;
        const islaId      = String(registro.isla_id || '');

        // Filtra registros de un dataset por entidad activa.
        const filtrarEntidad = (ds) => {
            if (ambito === 'canarias') return ds.filter(r => r.ambito === 'canarias');
            return ds.filter(r => r.ambito === 'isla' && String(r.isla_id) === islaId);
        };

        // Construye los datos indexados de cada serie
        const seriesData = seriesConf.map(sc => {
            const ds       = settings[sc.dataset] || settings['$' + sc.dataset] || [];
            const filtro   = filtrarEntidad(ds);
            const ordenado = filtro.slice().sort((a, b) =>
                String(a[sc.yearField]).localeCompare(String(b[sc.yearField])));

            const baseRec   = ordenado.find(r => String(r[sc.yearField]) === baseYear);
            const baseValue = baseRec ? parseFloat(baseRec[sc.campo]) : null;

            const years   = ordenado.map(r => String(r[sc.yearField]));
            const indexed = ordenado.map(r => {
                if (!baseValue) return null;
                const v = parseFloat(r[sc.campo]);
                return isNaN(v) ? null : Math.round((v / baseValue) * 1000) / 10; // 1 decimal
            });

            return { ...sc, years, indexed };
        });

        // Eje X: unión ordenada de todos los años
        const allYears = [...new Set(seriesData.flatMap(s => s.years))].sort();
        if (!allYears.length) return;

        const lookupVal = (s, year) => {
            const idx = s.years.indexOf(year);
            return idx >= 0 ? s.indexed[idx] : null;
        };

        const chartDatasets = seriesData.map((s, i) => {
            const ds = {
                label:           s.etiqueta,
                data:            allYears.map(y => lookupVal(s, y)),
                borderColor:     s.color || (i === 0 ? '#a70000' : '#aaaaaa'),
                backgroundColor: i === 0 ? 'rgba(167,0,0,0.07)' : 'transparent',
                borderWidth:     i === 0 ? 2 : 1.5,
                pointRadius:     i === 0 ? 3 : 2,
                tension:         0.3,
            };
            if (s.borderDash) ds.borderDash = s.borderDash;
            return ds;
        });

        new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: allYears, datasets: chartDatasets },
            options: {
                responsive:          true,
                maintainAspectRatio: true,
                aspectRatio:         3,
                scales: {
                    y: {
                        beginAtZero: false,
                        title: { display: true, text: `Índice (${baseYear}=100)` },
                    }
                },
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        mode:      'index',
                        intersect: false,
                        callbacks: {
                            label: ctx => {
                                const v = ctx.parsed.y;
                                return ` ${ctx.dataset.label}: ${v !== null ? v.toFixed(1) : '—'}`;
                            }
                        }
                    }
                }
            }
        });

        // ── Tabla de datos para PDF ──────────────────────────────────────────
        const tablaEl = document.getElementById(config.canvasId + '-tabla');
        if (!tablaEl) return;

        const fmt = v => (v === null || v === undefined || isNaN(v)) ? '—' : v.toFixed(1);

        let html = '<table class="linea-ext-tabla__table">';
        html += '<thead><tr><th></th>'
            + allYears.map(y => `<th>${y}</th>`).join('')
            + '</tr></thead><tbody>';

        seriesData.forEach(s => {
            html += `<tr><th>${s.etiqueta}</th>`
                + allYears.map(y => `<td>${fmt(lookupVal(s, y))}</td>`).join('')
                + '</tr>';
        });

        html += '</tbody></table>';
        tablaEl.innerHTML = html;
    },

    /**
     * Barras horizontales ordenadas de mayor a menor para el último año disponible.
     * Destaca las entradas indicadas en config.config.destacadas con rojo más oscuro.
     */
    dibujarBarrasCCAA: function(config, registro) {
        const canvas = document.getElementById(config.canvasId);
        if (!canvas) return;

        const settings    = drupalSettings.visorProject || {};
        const cfg         = config.config;
        const dsKey       = cfg.dataset.replace(/^\$/, '');
        const ds          = settings['$' + dsKey] || settings[dsKey] || [];
        if (!ds.length) return;

        const campo        = cfg.campo        || 'miembros';
        const yearField    = cfg.yearField    || 'ejercicio';
        const etiqField    = cfg.etiquetaField || 'ccaa_nombre';
        const destacadas   = cfg.destacadas   || [];

        // Año más reciente
        const maxYear = ds.reduce((m, r) => String(r[yearField]) > m ? String(r[yearField]) : m, '');

        // Filtrar y ordenar de mayor a menor
        const filas = ds
            .filter(r => String(r[yearField]) === maxYear)
            .map(r => ({ etiqueta: r[etiqField], valor: parseFloat(r[campo]) || 0 }))
            .sort((a, b) => b.valor - a.valor);

        const labels = filas.map(r => r.etiqueta);
        const values = filas.map(r => r.valor);
        const colors = filas.map(r => destacadas.includes(r.etiqueta) ? '#6d0000' : '#a70000');
        const borders = filas.map(r => destacadas.includes(r.etiqueta) ? '#2d0000' : 'transparent');
        const bWidths = filas.map(r => destacadas.includes(r.etiqueta) ? 2 : 0);

        // Rango X ajustado al mínimo-máximo para que las diferencias sean visibles
        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const margen = (maxVal - minVal) * 0.15 || 0.1;

        new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data:            values,
                    backgroundColor: colors,
                    borderColor:     borders,
                    borderWidth:     bWidths,
                }],
            },
            options: {
                indexAxis:           'y',
                responsive:          true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ' ' + ctx.parsed.x.toFixed(2),
                        }
                    },
                    visorDatalabels: { paletaId: null },
                },
                scales: {
                    x: {
                        min: Math.max(0, minVal - margen),
                        max: maxVal + margen,
                        ticks: { font: { size: 11 } },
                    },
                    y: { ticks: { font: { size: 11 } } },
                },
            },
        });
    },

    /**
     * Línea de evolución temporal para series nombradas de un dataset CCAA.
     * config.config.series = [{ nombre, color }, ...]
     */
    dibujarPendienteCCAA: function(config, registro) {
        const canvas = document.getElementById(config.canvasId);
        if (!canvas) return;

        const settings = drupalSettings.visorProject || {};
        const cfg      = config.config;
        const dsKey    = cfg.dataset.replace(/^\$/, '');
        const ds       = settings['$' + dsKey] || settings[dsKey] || [];
        if (!ds.length) return;

        const campo     = cfg.campo        || 'miembros';
        const yearField = cfg.yearField    || 'ejercicio';
        const etiqField = cfg.etiquetaField || 'ccaa_nombre';
        const seriesCfg = cfg.series       || [];

        const allYears = [...new Set(ds.map(r => String(r[yearField])))].sort();

        const chartDatasets = seriesCfg.map((sc, i) => {
            const rows = ds
                .filter(r => r[etiqField] === sc.nombre)
                .sort((a, b) => String(a[yearField]).localeCompare(String(b[yearField])));
            const data = allYears.map(y => {
                const r = rows.find(x => String(x[yearField]) === y);
                return r ? parseFloat(r[campo]) : null;
            });
            const color = sc.color || (i === 0 ? '#555555' : '#a70000');
            return {
                label:           sc.nombre,
                data,
                borderColor:     color,
                backgroundColor: 'transparent',
                borderWidth:     i === 0 ? 1.5 : 2.5,
                pointRadius:     4,
                tension:         0.2,
            };
        });

        new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: allYears, datasets: chartDatasets },
            options: {
                responsive:          true,
                maintainAspectRatio: true,
                aspectRatio:         3,
                scales: { y: { beginAtZero: false } },
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        mode:      'index',
                        intersect: false,
                        callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y !== null ? ctx.parsed.y.toFixed(2) : '—'}`,
                        }
                    }
                }
            }
        });

        // Tabla compañera
        const tablaEl = document.getElementById(config.canvasId + '-tabla');
        if (!tablaEl) return;

        const fmt = v => (v !== null && !isNaN(v)) ? parseFloat(v).toFixed(2) : '—';
        let html = '<table class="linea-ext-tabla__table"><thead><tr><th></th>'
            + allYears.map(y => `<th>${y}</th>`).join('')
            + '</tr></thead><tbody>';

        chartDatasets.forEach(s => {
            html += `<tr><th>${s.label}</th>`
                + s.data.map(v => `<td>${fmt(v)}</td>`).join('')
                + '</tr>';
        });

        html += '</tbody></table>';
        tablaEl.innerHTML = html;
    },

    /**
     * Gráfico de pendiente: población vs. viviendas terminadas acumuladas,
     * ambas series indexadas a base 100 en config.config.baseYear.
     * Los datasets son objetos simples { año: valor } (no arrays de registros).
     */
    dibujarPendientePobViv: function(config, registro) {
        const canvas = document.getElementById(config.canvasId);
        if (!canvas) return;

        const settings  = drupalSettings.visorProject || {};
        const cfg       = config.config;
        const baseYear  = cfg.baseYear != null ? String(cfg.baseYear) : null;
        const seriesConf = cfg.series || [];

        // Eje X: unión de claves de todos los datasets, ordenada
        const allYearsSet = new Set();
        seriesConf.forEach(sc => {
            const dsKey = sc.dataset.replace(/^\$/, '');
            const ds    = settings['$' + dsKey] || settings[dsKey] || {};
            Object.keys(ds).forEach(y => allYearsSet.add(y));
        });
        const allYears = [...allYearsSet].sort();
        if (!allYears.length) return;

        const usarBase100 = !!baseYear;

        const seriesData = seriesConf.map(sc => {
            const dsKey = sc.dataset.replace(/^\$/, '');
            const ds    = settings['$' + dsKey] || settings[dsKey] || {};

            // Valores brutos en orden de allYears
            let rawValues = allYears.map(y => {
                const v = parseFloat(ds[y]);
                return isNaN(v) ? null : v;
            });

            // Acumulación opcional (suma corrida desde el primer año)
            if (sc.acumular) {
                let cumsum = 0;
                rawValues = rawValues.map(v => {
                    if (v !== null) cumsum += v;
                    return cumsum > 0 ? cumsum : null;
                });
            }

            let valores;
            if (usarBase100) {
                // Índice base 100
                const baseIdx   = allYears.indexOf(baseYear);
                const baseValue = baseIdx >= 0 ? rawValues[baseIdx] : null;
                valores = rawValues.map(v => {
                    if (v === null || !baseValue) return null;
                    return Math.round((v / baseValue) * 1000) / 10; // 1 decimal
                });
            } else {
                valores = rawValues;
            }

            return { ...sc, valores };
        });

        const fmtTooltip = usarBase100
            ? (v => v !== null ? v.toFixed(1) : '—')
            : (v => v !== null ? Math.round(v).toLocaleString('es-ES') : '—');

        const chartDatasets = seriesData.map((s, i) => {
            const ds = {
                label:           s.etiqueta,
                data:            s.valores,
                borderColor:     s.color || (i === 0 ? '#a70000' : '#aaaaaa'),
                backgroundColor: i === 0 ? 'rgba(167,0,0,0.07)' : 'transparent',
                borderWidth:     i === 0 ? 2 : 1.5,
                pointRadius:     i === 0 ? 3 : 2,
                tension:         0.3,
                fill:            i === 0,
            };
            if (s.borderDash) ds.borderDash = s.borderDash;
            return ds;
        });

        const yAxisTitle = usarBase100
            ? `Índice (${baseYear}=100)`
            : (cfg.yTitle || '');

        new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: allYears, datasets: chartDatasets },
            options: {
                responsive:          true,
                maintainAspectRatio: true,
                aspectRatio:         3,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: !!yAxisTitle, text: yAxisTitle },
                        ticks: {
                            callback: usarBase100
                                ? undefined
                                : v => v.toLocaleString('es-ES'),
                        }
                    }
                },
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        mode:      'index',
                        intersect: false,
                        callbacks: {
                            label: ctx => {
                                const v = ctx.parsed.y;
                                return ` ${ctx.dataset.label}: ${fmtTooltip(v)}`;
                            }
                        }
                    }
                }
            }
        });

        // ── Tabla de datos para PDF ──────────────────────────────────────────
        if (cfg.sinTabla) return;
        const tablaEl = document.getElementById(config.canvasId + '-tabla');
        if (!tablaEl) return;

        const fmtTabla = usarBase100
            ? (v => (v === null || isNaN(v)) ? '—' : v.toFixed(1))
            : (v => (v === null || isNaN(v)) ? '—' : Math.round(v).toLocaleString('es-ES'));

        let html = '<table class="linea-ext-tabla__table"><thead><tr><th></th>'
            + allYears.map(y => `<th>${y}</th>`).join('')
            + '</tr></thead><tbody>';

        seriesData.forEach(s => {
            html += `<tr><th>${s.etiqueta}</th>`
                + s.valores.map(v => `<td>${fmtTabla(v)}</td>`).join('')
                + '</tr>';
        });

        html += '</tbody></table>';
        tablaEl.innerHTML = html;
    },

    /**
     * Gráfico de pendiente para viviendas no habituales (censos 2001/2011/2021).
     * Compara el índice base 100 del ámbito activo con su grupo de referencia:
     *   - municipio → suma agregada de municipios del mismo tipo_municipio
     *   - isla       → registro de Canarias
     *   - canarias   → serie única (sin referencia)
     * La tabla al pie muestra valores absolutos e índice en cada año.
     */
    dibujarPendienteCensos: function(config, registro) {
        const canvas = document.getElementById(config.canvasId);
        if (!canvas || !registro) return;

        const cfg    = config.config || {};
        const campo  = cfg.campo || 'no_hab';
        const census = drupalSettings.visorProject['$censo_viviendas_no_habituales'] || [];
        const snap   = drupalSettings.visorProject.datosDashboard || [];
        const años   = ['2001', '2011', '2021'];
        const fmt    = n => n != null ? Math.round(n).toLocaleString('es-ES') : '—';

        // ── Serie activa ─────────────────────────────────────────────────────
        let registroActivo;
        if (registro.ambito === 'canarias') {
            registroActivo = census.find(d => d.ambito === 'canarias');
        } else if (registro.ambito === 'isla') {
            registroActivo = census.find(d => d.ambito === 'isla' && d.isla_id === registro.isla_id);
        } else {
            registroActivo = census.find(d => d.ambito === 'municipio' && d.municipio_id === registro.municipio_id);
        }
        if (!registroActivo) return;

        const valoresIdx = años.map(y => registroActivo[`${campo}_${y}_idx`] ?? null);
        const valoresRaw = años.map(y => registroActivo[`${campo}_${y}`]     ?? null);

        // ── Serie de referencia ──────────────────────────────────────────────
        let refIdx      = null;
        let refRaw      = null;
        let etiquetaRef = '';

        if (registro.ambito === 'isla') {
            const canarias = census.find(d => d.ambito === 'canarias');
            if (canarias) {
                refIdx      = años.map(y => canarias[`${campo}_${y}_idx`] ?? null);
                refRaw      = años.map(y => canarias[`${campo}_${y}`]     ?? null);
                etiquetaRef = 'Canarias';
            }
        } else if (registro.ambito === 'municipio' && registro.tipo_municipio) {
            // Suma agregada de los municipios del mismo tipo → índice del grupo
            const idsMismoTipo = new Set(
                snap.filter(d => d.ambito === 'municipio' && d.tipo_municipio === registro.tipo_municipio)
                    .map(d => d.municipio_id)
            );
            const grupoCenso = census.filter(d => d.ambito === 'municipio' && idsMismoTipo.has(d.municipio_id));

            if (grupoCenso.length) {
                const sumaBase = grupoCenso.reduce((s, d) => s + (d[`${campo}_2001`] || 0), 0);
                refRaw      = años.map(y => grupoCenso.reduce((s, d) => s + (d[`${campo}_${y}`] || 0), 0));
                refIdx      = refRaw.map(v => sumaBase > 0 ? Math.round((v / sumaBase) * 1000) / 10 : null);
                refIdx[0]   = 100.0; // 2001 siempre es 100 en el índice del grupo
                etiquetaRef = 'Media municipios ' + registro.tipo_municipio.toLowerCase();
            }
        }

        // ── Chart.js ─────────────────────────────────────────────────────────
        const datasets = [
            {
                label:           registro.etiqueta || 'Valor',
                data:            valoresIdx,
                borderColor:     '#a70000',
                backgroundColor: 'rgba(167,0,0,0.07)',
                borderWidth:     2,
                pointRadius:     4,
                tension:         0.3,
                fill:            true,
            },
        ];

        if (refIdx) {
            datasets.push({
                label:           etiquetaRef,
                data:            refIdx,
                borderColor:     '#999',
                backgroundColor: 'transparent',
                borderWidth:     1.5,
                pointRadius:     3,
                borderDash:      [5, 4],
                tension:         0.3,
                fill:            false,
            });
        }

        new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: años, datasets },
            options: {
                responsive:          true,
                maintainAspectRatio: true,
                aspectRatio:         2.5,
                scales: {
                    y: {
                        beginAtZero: false,
                        title: { display: true, text: cfg.yTitle || 'Índice (2001 = 100)' },
                    },
                },
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        mode:      'index',
                        intersect: false,
                        callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)}`,
                        },
                    },
                },
            },
        });

        // ── Tabla al pie: valores absolutos e índice por año ─────────────────
        const tablaEl = document.getElementById(config.canvasId + '-tabla');
        if (!tablaEl) return;

        const fmtIdx = v => v != null ? v.toFixed(1) : '—';

        const series = [
            { etiqueta: registro.etiqueta || 'Valor', raw: valoresRaw, idx: valoresIdx },
        ];
        if (refIdx) series.push({ etiqueta: etiquetaRef, raw: refRaw, idx: refIdx });

        let html = '<table class="linea-ext-tabla__table">'
            + '<thead><tr><th></th>'
            + años.map(y => `<th colspan="2">${y}</th>`).join('')
            + '</tr>'
            + '<tr><th></th>'
            + años.map(() => '<th>n</th><th>índice</th>').join('')
            + '</tr></thead><tbody>';

        series.forEach(s => {
            html += `<tr><th>${s.etiqueta}</th>`
                + años.map((_, i) => `<td>${fmt(s.raw[i])}</td><td>${fmtIdx(s.idx[i])}</td>`).join('')
                + '</tr>';
        });

        html += '</tbody></table>';
        tablaEl.innerHTML = html;
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
                        case 'radar':
                            self.dibujarRadar(config, Array.isArray(datos) ? datos[datos.length - 1] : datos);
                            break;
                        case 'linea-ext':
                            self.dibujarLineaExt(config, Array.isArray(datos) ? datos[datos.length - 1] : datos);
                            break;
                        case 'linea-multi-ext':
                            self.dibujarLineaMultiExt(config, Array.isArray(datos) ? datos[datos.length - 1] : datos);
                            break;
                        case 'barras-ccaa-ext':
                            self.dibujarBarrasCCAA(config, Array.isArray(datos) ? datos[datos.length - 1] : datos);
                            break;
                        case 'pendiente-ccaa-ext':
                            self.dibujarPendienteCCAA(config, Array.isArray(datos) ? datos[datos.length - 1] : datos);
                            break;
                        case 'pendiente-pob-viv':
                            self.dibujarPendientePobViv(config, Array.isArray(datos) ? datos[datos.length - 1] : datos);
                            break;
                        case 'pendiente-censos':
                            self.dibujarPendienteCensos(config, Array.isArray(datos) ? datos[datos.length - 1] : datos);
                            break;
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        observer.observe(elemento);
    }
};

