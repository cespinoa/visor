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
        if (['linea-ext', 'linea-multi-ext', 'linea-turismo', 'barras-ccaa-ext', 'pendiente-ccaa-ext', 'pendiente-pob-viv', 'pendiente-censos', 'area-presion-humana'].includes(config.tipo)) {
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

        if (config.fuente || config.fecha) {
            const p = document.createElement('p');
            p.className = 'grafico-fuente-dato';
            const parts = [];
            if (config.fuente) parts.push('Fuente: ' + config.fuente);
            if (config.fecha) parts.push('Datos: ' + config.fecha);
            p.textContent = parts.join(' · ');
            contenedor.appendChild(p);
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

        if (config.fuente || config.fecha) {
            const p = document.createElement('p');
            p.className = 'grafico-fuente-dato';
            const parts = [];
            if (config.fuente) parts.push('Fuente: ' + config.fuente);
            if (config.fecha) parts.push('Datos: ' + config.fecha);
            p.textContent = parts.join(' · ');
            wrapper.appendChild(p);
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

        const skipDatasets = chart.config?.options?.plugins?.visorDatalabels?.skipDatasets || [];
        chart.data.datasets.forEach((dataset, datasetIndex) => {
            if (skipDatasets.includes(datasetIndex)) return;
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
                const fontSize = chart.config?.options?.plugins?.visorDatalabels?.fontSize
                    || (horizontal ? 20 : 30);
                ctx.font = '600 ' + fontSize + 'px Arial, sans-serif';

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

        // Placeholder de tabla (omitido si sinTabla)
        if (!config.sinTabla && !(config.config && config.config.sinTabla)) {
            const tablaDiv = document.createElement('div');
            tablaDiv.id        = config.canvasId + '-tabla';
            tablaDiv.className = 'linea-ext-tabla';
            contenedor.appendChild(tablaDiv);
        }

        if (config.fuente || config.fecha) {
            const p = document.createElement('p');
            p.className = 'grafico-fuente-dato';
            const parts = [];
            if (config.fuente) parts.push('Fuente: ' + config.fuente);
            if (config.fecha) parts.push('Datos: ' + config.fecha);
            p.textContent = parts.join(' · ');
            contenedor.appendChild(p);
        }

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

        // ── Proyección (punto estimado en el año del snapshot) ───────────────
        const conProyeccion = !!config.config.proyeccion;
        let proyYear  = null;
        let proyMy    = null;
        let proyRef   = null;
        let labelsExt = years;

        if (conProyeccion) {
            proyYear = String(registro.fecha_calculo).substring(0, 4);
            proyMy   = parseFloat(registro.tamanio_hogar_actual);
            if (isNaN(proyMy)) proyMy = null;

            const snapshot = drupalSettings.visorProject.datosDashboard || [];
            if (ambito === 'isla') {
                const can = snapshot.find(s => s.ambito === 'canarias');
                proyRef = can ? parseFloat(can.tamanio_hogar_actual) : null;
                if (isNaN(proyRef)) proyRef = null;
            } else if (ambito === 'municipio') {
                const tipoMun = registro.tipo_municipio;
                const peers = snapshot.filter(s => s.ambito === 'municipio' && s.tipo_municipio === tipoMun);
                const vals  = peers.map(s => parseFloat(s.tamanio_hogar_actual)).filter(v => !isNaN(v));
                proyRef = vals.length
                    ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
                    : null;
            }

            labelsExt = [...years, proyYear];
        }

        // ── Gráfico Chart.js ─────────────────────────────────────────────────
        const nulls = labelsExt.map(() => null);

        // Serie principal — sólida hasta el último censo, null en año proyectado
        const mainSolid = conProyeccion ? [...myData, null] : myData;
        const datasets = [
            {
                label:           registro.etiqueta,
                data:            mainSolid,
                borderColor:     '#a70000',
                backgroundColor: 'rgba(167,0,0,0.07)',
                borderWidth:     2,
                pointRadius:     conProyeccion ? [...myData.map(() => 3), 0] : 3,
                tension:         0.3,
            }
        ];

        // Tramo discontinuo de la serie principal: null hasta 2021, luego dos puntos
        if (conProyeccion && proyMy !== null) {
            const dashData = nulls.slice();
            dashData[dashData.length - 2] = myData[myData.length - 1]; // último censo
            dashData[dashData.length - 1] = proyMy;
            datasets.push({
                label:           '_' + registro.etiqueta,
                data:            dashData,
                borderColor:     '#a70000',
                backgroundColor: 'transparent',
                borderWidth:     2,
                borderDash:      [5, 4],
                pointRadius:     dashData.map((v, i) => i === dashData.length - 1 ? 4 : 0),
                tension:         0.3,
            });
        }

        if (refData) {
            const refSolid = conProyeccion ? [...refData, null] : refData;
            datasets.push({
                label:           refLabel,
                data:            refSolid,
                borderColor:     '#aaaaaa',
                backgroundColor: 'transparent',
                borderWidth:     1.5,
                borderDash:      [5, 4],
                pointRadius:     conProyeccion ? [...refData.map(() => 2), 0] : 2,
                tension:         0.3,
            });

            if (conProyeccion && proyRef !== null) {
                const refDash = nulls.slice();
                refDash[refDash.length - 2] = refData[refData.length - 1];
                refDash[refDash.length - 1] = proyRef;
                datasets.push({
                    label:           '_' + refLabel,
                    data:            refDash,
                    borderColor:     '#aaaaaa',
                    backgroundColor: 'transparent',
                    borderWidth:     1.5,
                    borderDash:      [5, 4],
                    pointRadius:     refDash.map((v, i) => i === refDash.length - 1 ? 3 : 0),
                    tension:         0.3,
                });
            }
        }

        new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: labelsExt, datasets },
            options: {
                responsive:          true,
                maintainAspectRatio: true,
                aspectRatio:         3,
                scales: {
                    y: { beginAtZero: false }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            filter: item => !item.text.startsWith('_'),
                        },
                    },
                    tooltip: {
                        mode:      'index',
                        intersect: false,
                        callbacks: {
                            label: ctx => {
                                if (ctx.dataset.label.startsWith('_')) return null;
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

        const tableYears  = conProyeccion ? [...years, proyYear + '*'] : years;
        const myDataExt   = conProyeccion ? [...myData, proyMy]        : myData;
        const refDataExt  = (refData && conProyeccion) ? [...refData, proyRef] : refData;

        let html = '<table class="linea-ext-tabla__table">';
        html += '<thead><tr><th></th>'
            + tableYears.map(y => `<th>${y}</th>`).join('')
            + '</tr></thead><tbody>';

        html += `<tr><th>${registro.etiqueta}</th>`
            + myDataExt.map(v => `<td>${fmt(v)}</td>`).join('')
            + '</tr>';

        if (refDataExt) {
            html += `<tr><th>${refLabel}</th>`
                + refDataExt.map(v => `<td>${fmt(v)}</td>`).join('')
                + '</tr>';
        }

        html += '</tbody></table>';
        if (conProyeccion) {
            html += '<p class="grafico-fuente-dato" style="margin-top:4px">* Estimación: población / viviendas disponibles</p>';
        }
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

        // Construye los datos de cada serie (indexados o valores reales según ejeY)
        const seriesData = seriesConf.map(sc => {
            const ds       = settings[sc.dataset] || settings['$' + sc.dataset] || [];
            const filtro   = filtrarEntidad(ds);
            const ordenado = filtro.slice().sort((a, b) =>
                String(a[sc.yearField]).localeCompare(String(b[sc.yearField])));

            const years = ordenado.map(r => String(r[sc.yearField]));

            let valores;
            if (sc.ejeY === 'derecha') {
                // Valores reales, sin normalizar
                valores = ordenado.map(r => {
                    const v = parseFloat(r[sc.campo]);
                    return isNaN(v) ? null : Math.round(v * 10) / 10;
                });
            } else {
                const baseRec   = ordenado.find(r => String(r[sc.yearField]) === baseYear);
                const baseValue = baseRec ? parseFloat(baseRec[sc.campo]) : null;
                valores = ordenado.map(r => {
                    if (!baseValue) return null;
                    const v = parseFloat(r[sc.campo]);
                    return isNaN(v) ? null : Math.round((v / baseValue) * 1000) / 10;
                });
            }

            return { ...sc, years, valores };
        });

        // Eje X: unión ordenada de todos los años
        const allYears = [...new Set(seriesData.flatMap(s => s.years))].sort();
        if (!allYears.length) return;

        const lookupVal = (s, year) => {
            const idx = s.years.indexOf(year);
            return idx >= 0 ? s.valores[idx] : null;
        };

        const hayEjeDerecha = seriesData.some(s => s.ejeY === 'derecha');

        const chartDatasets = seriesData.map((s, i) => {
            const ds = {
                label:           s.etiqueta,
                data:            allYears.map(y => lookupVal(s, y)),
                borderColor:     s.color || (i === 0 ? '#a70000' : '#aaaaaa'),
                backgroundColor: i === 0 ? 'rgba(167,0,0,0.07)' : 'transparent',
                borderWidth:     i === 0 ? 2 : 1.5,
                pointRadius:     i === 0 ? 3 : 2,
                tension:         0.3,
                yAxisID:         s.ejeY === 'derecha' ? 'yDer' : 'y',
            };
            if (s.borderDash) ds.borderDash = s.borderDash;
            return ds;
        });

        const scalesConfig = {
            y: {
                beginAtZero: false,
                title: { display: true, text: `Índice (${baseYear}=100)` },
            },
        };
        if (hayEjeDerecha) {
            const seriesDer = seriesData.filter(s => s.ejeY === 'derecha');
            const tituloDer = config.config.tituloDer || seriesDer.map(s => s.etiqueta).join(' / ');
            scalesConfig.yDer = {
                position:    'right',
                beginAtZero: false,
                grid:        { drawOnChartArea: false },
                title:       { display: true, text: tituloDer },
            };
        }

        new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: allYears, datasets: chartDatasets },
            options: {
                responsive:          true,
                maintainAspectRatio: true,
                aspectRatio:         3,
                scales: scalesConfig,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        mode:      'index',
                        intersect: false,
                        callbacks: {
                            label: ctx => {
                                const v = ctx.parsed.y;
                                if (v === null) return null;
                                return ` ${ctx.dataset.label}: ${v.toFixed(1)}`;
                            }
                        }
                    }
                }
            }
        });

        // ── Tabla de datos para PDF ──────────────────────────────────────────
        const tablaEl = document.getElementById(config.canvasId + '-tabla');
        if (!tablaEl) return;

        const fmt = (v) => {
            if (v === null || v === undefined || isNaN(v)) return '—';
            return v.toFixed(1);
        };

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
     * Gráfico de línea: turismo reglado vs vacacional, base 100 en 2012.
     * Los valores de TR y TV se calculan internamente con la misma fórmula
     * que crearTablaHistoricoTurismo (no son datasets directos).
     */
    dibujarLineaTurismo: function(config, registro) {
        const canvas = document.getElementById(config.canvasId);
        if (!canvas || !registro) return;

        const vp      = drupalSettings.visorProject || {};
        const baseYear = '2012';
        const ambito  = registro.ambito;
        const islaId  = String(registro.isla_id || '');

        const filtrar = ds => {
            const arr = Array.isArray(ds) ? ds : [];
            if (ambito === 'canarias') return arr.filter(r => r.ambito === 'canarias');
            return arr.filter(r => r.ambito === 'isla' && String(r.isla_id) === islaId);
        };
        const toMap = (ds, yearField, campo) => {
            const m = {};
            filtrar(ds).forEach(r => { m[String(r[yearField])] = parseFloat(r[campo]); });
            return m;
        };
        const toMapIslas = (ds, yearField, campo) => {
            const m = {};
            (Array.isArray(ds) ? ds : []).filter(r => r.ambito === 'isla').forEach(r => {
                const y = String(r[yearField]);
                if (!m[y]) m[y] = {};
                m[y][String(r.isla_id)] = parseFloat(r[campo]);
            });
            return m;
        };

        const llegadas  = toMap(vp['$historicoLlegadas']        || [], 'year',      'turistas');
        const plazas    = toMap(vp['$historicoPlazasRegladas']  || [], 'ejercicio', 'plazas');
        const ocupacion = toMap(vp['$historicoTasaOcupacion']   || [], 'ejercicio', 'tasa');
        const estancia  = toMap(vp['$historico_estancia_media'] || [], 'ejercicio', 'estancia');

        const todosAños = [...new Set([
            ...Object.keys(llegadas), ...Object.keys(plazas),
            ...Object.keys(ocupacion), ...Object.keys(estancia),
        ])].sort();

        // Calcular T. reglados (isla a isla para canarias, directo para isla)
        const tReglados = {};
        if (ambito === 'canarias') {
            const islaIdsConLlegadas = new Set(
                (vp['$historicoLlegadas'] || []).filter(r => r.ambito === 'isla').map(r => String(r.isla_id))
            );
            const plazasI    = toMapIslas(vp['$historicoPlazasRegladas']  || [], 'ejercicio', 'plazas');
            const ocupacionI = toMapIslas(vp['$historicoTasaOcupacion']   || [], 'ejercicio', 'tasa');
            const estanciaI  = toMapIslas(vp['$historico_estancia_media'] || [], 'ejercicio', 'estancia');
            todosAños.forEach(y => {
                let suma = 0;
                for (const iid of islaIdsConLlegadas) {
                    const pl = (plazasI[y]    || {})[iid];
                    const oc = (ocupacionI[y] || {})[iid];
                    const es = (estanciaI[y]  || {})[iid];
                    if (pl != null && oc != null && es != null && es > 0) suma += (oc / 100) * pl * 365 / es;
                }
                if (islaIdsConLlegadas.size > 0) tReglados[y] = suma;
            });
        } else {
            todosAños.forEach(y => {
                const oc = ocupacion[y], pl = plazas[y], es = estancia[y];
                if (oc != null && pl != null && es != null && es > 0) tReglados[y] = (oc / 100) * pl * 365 / es;
            });
        }

        const modoAbsoluto = (config.config || {}).modo === 'absoluto';
        const startYear   = modoAbsoluto ? '2010' : baseYear;

        // Filtrar años y calcular T. vacacional
        const años = todosAños.filter(y => y >= startYear);

        // Regresión lineal (mínimos cuadrados) sobre puntos {x, y} no nulos
        const regresionLineal = (puntos) => {
            if (puntos.length < 2) return null;
            const n  = puntos.length;
            const sx = puntos.reduce((s, p) => s + p.x, 0);
            const sy = puntos.reduce((s, p) => s + p.y, 0);
            const sx2 = puntos.reduce((s, p) => s + p.x * p.x, 0);
            const sxy = puntos.reduce((s, p) => s + p.x * p.y, 0);
            const denom = n * sx2 - sx * sx;
            if (denom === 0) return null;
            const slope     = (n * sxy - sx * sy) / denom;
            const intercept = (sy - slope * sx) / n;
            return { slope, intercept };
        };

        const COVID   = new Set(['2020', '2021', '2022']);
        const PIVOTE  = '2017';

        // Calcula los valores de tendencia para un subconjunto de índices,
        // dejando null fuera de ese subconjunto. iDesde e iHasta son inclusivos.
        const calcTendencia = (serie, iDesde, iHasta) => {
            const puntos = años
                .map((y, i) => ({ x: i, y: serie[i] }))
                .filter(p => p.x >= iDesde && p.x <= iHasta && !COVID.has(años[p.x]) && p.y != null);
            const lr = regresionLineal(puntos);
            if (!lr) return null;
            return años.map((_, i) => {
                if (i < iDesde || i > iHasta) return null;
                return Math.round((lr.slope * i + lr.intercept) * 10) / 10;
            });
        };

        let serieReg, serieVac,
            tendReg1, tendReg2, tendVac1, tendVac2,
            yTitle, fmtTooltip, fmtTabla;

        if (modoAbsoluto) {
            // Valores absolutos en millones (1 decimal)
            const toM = v => v != null ? Math.round(v / 100000) / 10 : null;
            serieReg = años.map(y => toM(tReglados[y] ?? null));
            serieVac = años.map(y => {
                const tur  = llegadas[y]  ?? null;
                const treg = tReglados[y] ?? null;
                return toM((tur != null && treg != null) ? tur - treg : null);
            });

            // Índices de los tramos: hasta pivote (inclusivo) y desde pivote (inclusivo)
            const iPivote = años.indexOf(PIVOTE);
            const iUltimo = años.length - 1;
            const iInicio = 0;

            tendReg1 = iPivote >= 0 ? calcTendencia(serieReg, iInicio, iPivote) : null;
            tendReg2 = iPivote >= 0 ? calcTendencia(serieReg, iPivote, iUltimo) : null;
            tendVac1 = iPivote >= 0 ? calcTendencia(serieVac, iInicio, iPivote) : null;
            tendVac2 = iPivote >= 0 ? calcTendencia(serieVac, iPivote, iUltimo) : null;

            yTitle     = 'Millones de turistas';
            fmtTooltip = (v) => v !== null ? v.toFixed(1) + ' M' : '—';
            fmtTabla   = (v) => (v == null || isNaN(v)) ? '—' : v.toFixed(1) + ' M';
        } else {
            // Índice base 100 en 2012
            const baseReg = tReglados[baseYear] ?? null;
            const baseTur = llegadas[baseYear]  ?? null;
            const baseVac = (baseTur != null && baseReg != null) ? baseTur - baseReg : null;
            const norm    = (v, base) => (v != null && base) ? Math.round((v / base) * 1000) / 10 : null;
            serieReg = años.map(y => norm(tReglados[y] ?? null, baseReg));
            serieVac = años.map(y => {
                const tur  = llegadas[y]  ?? null;
                const treg = tReglados[y] ?? null;
                return norm((tur != null && treg != null) ? tur - treg : null, baseVac);
            });
            tendReg1 = null; tendReg2 = null;
            tendVac1 = null; tendVac2 = null;
            yTitle     = 'Índice (2012 = 100)';
            fmtTooltip = (v) => v !== null ? v.toFixed(1) : '—';
            fmtTabla   = (v) => (v == null || isNaN(v)) ? '—' : v.toFixed(1);
        }

        const tendenciaDs = (label, data, color) => ({
            label,
            data,
            borderColor:     color,
            backgroundColor: 'transparent',
            borderWidth:     1.5,
            pointRadius:     0,
            tension:         0,
            borderDash:      [2, 4],
        });

        const datasetsChart = [
            {
                label:           'T. reglados',
                data:            serieReg,
                borderColor:     '#555555',
                backgroundColor: 'transparent',
                borderWidth:     2,
                pointRadius:     3,
                tension:         0.3,
                borderDash:      [5, 3],
            },
            {
                label:           'T. vacacionales',
                data:            serieVac,
                borderColor:     '#a70000',
                backgroundColor: 'rgba(167,0,0,0.07)',
                borderWidth:     2,
                pointRadius:     3,
                tension:         0.3,
            },
        ];
        if (tendReg1) datasetsChart.push(tendenciaDs('Tendencia reglados (hasta 2017)',    tendReg1, '#aaaaaa'));
        if (tendReg2) datasetsChart.push(tendenciaDs('Tendencia reglados (desde 2017)',    tendReg2, '#aaaaaa'));
        if (tendVac1) datasetsChart.push(tendenciaDs('Tendencia vacacionales (hasta 2017)', tendVac1, 'rgba(167,0,0,0.45)'));
        if (tendVac2) datasetsChart.push(tendenciaDs('Tendencia vacacionales (desde 2017)', tendVac2, 'rgba(167,0,0,0.45)'));


        new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: años,
                datasets: datasetsChart,
            },
            options: {
                responsive:          true,
                maintainAspectRatio: true,
                aspectRatio:         3,
                scales: {
                    y: {
                        beginAtZero: modoAbsoluto,
                        title: { display: true, text: yTitle, font: { size: 11 } },
                    },
                },
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        mode:      'index',
                        intersect: false,
                        callbacks: {
                            label: ctx => {
                                // Ocultar las líneas de tendencia del tooltip
                                if (ctx.dataset.label.startsWith('Tendencia')) return null;
                                return ` ${ctx.dataset.label}: ${fmtTooltip(ctx.parsed.y)}`;
                            },
                        },
                    },
                },
            },
        });

        const tablaEl = document.getElementById(config.canvasId + '-tabla');
        if (!tablaEl) return;

        let html = '<table class="linea-ext-tabla__table">'
            + '<thead><tr><th></th>' + años.map(y => `<th>${y}</th>`).join('') + '</tr></thead><tbody>'
            + '<tr><th>T. reglados</th>'     + serieReg.map(v => `<td>${fmtTabla(v)}</td>`).join('') + '</tr>'
            + '<tr><th>T. vacacionales</th>' + serieVac.map(v => `<td>${fmtTabla(v)}</td>`).join('') + '</tr>'
            + '</tbody></table>';
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
        const baseYear  = cfg.baseYear ? String(cfg.baseYear) : null;
        const usarTend  = cfg.tendencia === true;

        const allYears = [...new Set(ds.map(r => String(r[yearField])))].sort();

        const chartDatasets = seriesCfg.map((sc, i) => {
            const rows = ds
                .filter(r => r[etiqField] === sc.nombre)
                .sort((a, b) => String(a[yearField]).localeCompare(String(b[yearField])));
            const rawData = allYears.map(y => {
                const r = rows.find(x => String(x[yearField]) === y);
                return r ? parseFloat(r[campo]) : null;
            });
            let data = rawData;
            if (baseYear) {
                const baseIdx = allYears.indexOf(baseYear);
                const baseVal = baseIdx >= 0 ? rawData[baseIdx] : null;
                data = baseVal ? rawData.map(v => v !== null ? parseFloat((v / baseVal * 100).toFixed(2)) : null) : rawData;
            }
            if (usarTend) {
                // Regresión anclada: la recta pasa por (x₀, 100) y solo ajusta la pendiente.
                // Si hay baseYear, x₀ es su índice; si no, x₀ = 0.
                const x0    = baseYear ? allYears.indexOf(baseYear) : 0;
                const y0    = baseYear ? 100 : (data.find(v => v !== null) ?? 0);
                const puntos = data.map((v, idx) => ({ x: idx, y: v })).filter(p => p.y !== null);
                const num   = puntos.reduce((s, p) => s + (p.x - x0) * (p.y - y0), 0);
                const den   = puntos.reduce((s, p) => s + (p.x - x0) ** 2, 0);
                if (den !== 0) {
                    const slope = num / den;
                    data = data.map((v, idx) => v !== null ? parseFloat((y0 + slope * (idx - x0)).toFixed(2)) : null);
                }
            }
            const color = sc.color || (i === 0 ? '#555555' : '#a70000');
            return {
                label:           sc.nombre,
                data,
                _raw:            rawData,
                borderColor:     color,
                backgroundColor: 'transparent',
                borderWidth:     2,
                pointRadius:     usarTend ? 0 : 4,
                tension:         0,
            };
        });

        const yTitle = baseYear ? `Índice (${baseYear} = 100)` : null;
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
                        title: yTitle ? { display: true, text: yTitle } : undefined,
                    },
                },
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        mode:      'index',
                        intersect: false,
                        callbacks: {
                            label: ctx => {
                                const v = ctx.parsed.y;
                                if (v === null) return null;
                                return baseYear
                                    ? ` ${ctx.dataset.label}: ${v.toFixed(1)}`
                                    : ` ${ctx.dataset.label}: ${v.toFixed(2)}`;
                            },
                        },
                    },
                },
            }
        });

        // Tabla compañera
        const tablaEl = document.getElementById(config.canvasId + '-tabla');
        if (!tablaEl) return;

        const fmtTabla = (v, idx) => {
            if (v === null || isNaN(v)) return '—';
            return baseYear ? parseFloat(v).toFixed(1) : parseFloat(v).toFixed(2);
        };
        let html = '<table class="linea-ext-tabla__table"><thead><tr><th></th>'
            + allYears.map(y => `<th>${y}</th>`).join('')
            + '</tr></thead><tbody>';

        chartDatasets.forEach(s => {
            const swatch = `<span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${s.borderColor};margin-right:6px;vertical-align:middle;flex-shrink:0"></span>`;
            html += `<tr><th style="white-space:nowrap">${swatch}${s.label}</th>`
                + s.data.map((v, i) => `<td>${fmtTabla(v, i)}</td>`).join('')
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
        if (cfg.sinTabla || config.sinTabla) return;
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
        if (!canvas) return;

        const cfg    = config.config || {};

        // Modo tipo fijo: muestra el agregado de un tipo de municipio vs Canarias
        if (cfg.tipoMunicipio) {
            return this._dibujarPendienteCensosTipo(config, cfg.tipoMunicipio);
        }

        if (!registro) return;

        const modo   = cfg.modo || 'indice'; // 'indice' | 'porcentaje'
        const campo  = cfg.campo || 'no_hab';
        const census = drupalSettings.visorProject['$censo_viviendas_no_habituales'] || [];
        const snap   = drupalSettings.visorProject.datosDashboard || [];
        const años   = ['2001', '2011', '2021'];
        const fmt    = n => n != null ? Math.round(n).toLocaleString('es-ES') : '—';
        const fmtDec = v => v != null ? v.toFixed(1) : '—';

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

        const sufijo     = modo === 'porcentaje' ? '_porc' : '_idx';
        const valoresSerie = años.map(y => registroActivo[`${campo}_${y}${sufijo}`] ?? null);
        const valoresRaw   = años.map(y => registroActivo[`${campo}_${y}`]          ?? null);

        // ── Serie de referencia ──────────────────────────────────────────────
        let refSerie    = null;
        let refRaw      = null;
        let etiquetaRef = '';

        if (registro.ambito === 'isla') {
            const canarias = census.find(d => d.ambito === 'canarias');
            if (canarias) {
                refSerie    = años.map(y => canarias[`${campo}_${y}${sufijo}`] ?? null);
                refRaw      = años.map(y => canarias[`${campo}_${y}`]          ?? null);
                etiquetaRef = 'Canarias';
            }
        } else if (registro.ambito === 'municipio' && registro.tipo_municipio) {
            const idsMismoTipo = new Set(
                snap.filter(d => d.ambito === 'municipio' && d.tipo_municipio === registro.tipo_municipio)
                    .map(d => d.municipio_id)
            );
            const grupoCenso = census.filter(d => d.ambito === 'municipio' && idsMismoTipo.has(d.municipio_id));

            if (grupoCenso.length) {
                refRaw = años.map(y => grupoCenso.reduce((s, d) => s + (d[`${campo}_${y}`] || 0), 0));
                if (modo === 'porcentaje') {
                    refSerie = años.map((y, i) => {
                        const sumT = grupoCenso.reduce((s, d) => s + (d[`total_${y}`] || 0), 0);
                        return sumT > 0 ? Math.round(refRaw[i] / sumT * 1000) / 10 : null;
                    });
                } else {
                    const sumaBase = grupoCenso.reduce((s, d) => s + (d[`${campo}_2001`] || 0), 0);
                    refSerie    = refRaw.map(v => sumaBase > 0 ? Math.round((v / sumaBase) * 1000) / 10 : null);
                    refSerie[0] = 100.0;
                }
                etiquetaRef = 'Media municipios ' + registro.tipo_municipio.toLowerCase();
            }
        }

        // ── Chart.js ─────────────────────────────────────────────────────────
        const datasets = [
            {
                label:           registro.etiqueta || 'Valor',
                data:            valoresSerie,
                borderColor:     '#a70000',
                backgroundColor: 'rgba(167,0,0,0.07)',
                borderWidth:     2,
                pointRadius:     4,
                tension:         0.3,
                fill:            true,
            },
        ];

        if (refSerie) {
            datasets.push({
                label:           etiquetaRef,
                data:            refSerie,
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
                        title: { display: true, text: cfg.yTitle || (modo === 'porcentaje' ? '% sobre total' : 'Índice (2001 = 100)') },
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

        // ── Tabla al pie ─────────────────────────────────────────────────────
        const tablaEl = document.getElementById(config.canvasId + '-tabla');
        if (!tablaEl) return;

        const colLabel = modo === 'porcentaje' ? '%' : 'índice';
        const series = [
            { etiqueta: registro.etiqueta || 'Valor', raw: valoresRaw, display: valoresSerie },
        ];
        if (refSerie) series.push({ etiqueta: etiquetaRef, raw: refRaw, display: refSerie });

        let html = '<table class="linea-ext-tabla__table">'
            + '<thead><tr><th></th>'
            + años.map(y => `<th colspan="2">${y}</th>`).join('')
            + '</tr>'
            + '<tr><th></th>'
            + años.map(() => `<th>n</th><th>${colLabel}</th>`).join('')
            + '</tr></thead><tbody>';

        series.forEach(s => {
            html += `<tr><th>${s.etiqueta}</th>`
                + años.map((_, i) => `<td>${fmt(s.raw[i])}</td><td>${fmtDec(s.display[i])}</td>`).join('')
                + '</tr>';
        });

        html += '</tbody></table>';
        tablaEl.innerHTML = html;
    },

    /**
     * Renderiza un gráfico de pendiente para un tipo de municipio fijo.
     * Muestra el agregado (suma) del tipo indicado vs Canarias.
     * No depende del registro activo.
     */
    _dibujarPendienteCensosTipo: function(config, tipoMunicipio) {
        const canvas = document.getElementById(config.canvasId);
        if (!canvas) return;

        const cfg    = config.config || {};
        const modo   = cfg.modo || 'indice'; // 'indice' | 'porcentaje'
        const campo  = cfg.campo || 'no_hab';
        const census = drupalSettings.visorProject['$censo_viviendas_no_habituales'] || [];
        const snap   = drupalSettings.visorProject.datosDashboard || [];
        const años   = ['2001', '2011', '2021'];
        const fmt    = n => n != null ? Math.round(n).toLocaleString('es-ES') : '—';
        const fmtDec = v => v != null ? v.toFixed(1) : '—';

        // ── Agregado del tipo ────────────────────────────────────────────────
        const idsTipo = new Set(
            snap.filter(d => d.ambito === 'municipio' && d.tipo_municipio === tipoMunicipio)
                .map(d => d.municipio_id)
        );
        const grupoCenso = census.filter(d => d.ambito === 'municipio' && idsTipo.has(d.municipio_id));

        if (!grupoCenso.length) return;

        const tipoRaw = años.map(y => grupoCenso.reduce((s, d) => s + (d[`${campo}_${y}`] || 0), 0));
        let tipoSerie;
        if (modo === 'porcentaje') {
            tipoSerie = años.map((y, i) => {
                const sumT = grupoCenso.reduce((s, d) => s + (d[`total_${y}`] || 0), 0);
                return sumT > 0 ? Math.round(tipoRaw[i] / sumT * 1000) / 10 : null;
            });
        } else {
            const sumaBase = grupoCenso.reduce((s, d) => s + (d[`${campo}_2001`] || 0), 0);
            tipoSerie    = tipoRaw.map((v, i) => i === 0 ? 100.0 : (sumaBase > 0 ? Math.round((v / sumaBase) * 1000) / 10 : null));
        }

        // ── Canarias como referencia ─────────────────────────────────────────
        const canarias = census.find(d => d.ambito === 'canarias');
        let canRaw    = null;
        let canSerie  = null;
        if (canarias) {
            canRaw   = años.map(y => canarias[`${campo}_${y}`] ?? null);
            const sufijo = modo === 'porcentaje' ? '_porc' : '_idx';
            canSerie = años.map(y => canarias[`${campo}_${y}${sufijo}`] ?? null);
        }

        // ── Chart.js ─────────────────────────────────────────────────────────
        const etiquetaTipo = tipoMunicipio.charAt(0) + tipoMunicipio.slice(1).toLowerCase();
        const datasets = [
            {
                label:           'Municipios ' + etiquetaTipo,
                data:            tipoSerie,
                borderColor:     '#a70000',
                backgroundColor: 'rgba(167,0,0,0.07)',
                borderWidth:     2.5,
                pointRadius:     4,
                tension:         0.3,
                fill:            true,
            },
        ];

        if (canSerie) {
            datasets.push({
                label:           'Canarias',
                data:            canSerie,
                borderColor:     '#999',
                backgroundColor: 'transparent',
                borderWidth:     1.5,
                pointRadius:     3,
                borderDash:      [5, 4],
                tension:         0.3,
                fill:            false,
            });
        }

        const fontSize  = 10; // ~20% menor que el defecto de Chart.js (12px)
        const yOptions  = modo === 'indice'
            ? { min: 60, max: 160,  title: { display: true, text: cfg.yTitle || 'Índice (2001 = 100)', font: { size: fontSize } }, ticks: { font: { size: fontSize } } }
            : { min: 18, max:  60,  title: { display: true, text: cfg.yTitle || '% sobre total',       font: { size: fontSize } }, ticks: { font: { size: fontSize } } };

        new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: años, datasets },
            options: {
                responsive:          true,
                maintainAspectRatio: true,
                aspectRatio:         2.5,
                scales: {
                    y: yOptions,
                    x: { ticks: { font: { size: fontSize } } },
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels:   { font: { size: fontSize } },
                    },
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

        // ── Tabla al pie ─────────────────────────────────────────────────────
        const tablaEl = document.getElementById(config.canvasId + '-tabla');
        if (!tablaEl) return;

        const colLabel = modo === 'porcentaje' ? '%' : 'índice';
        const series = [
            { etiqueta: 'Municipios ' + etiquetaTipo, raw: tipoRaw, display: tipoSerie },
        ];
        if (canSerie) series.push({ etiqueta: 'Canarias', raw: canRaw, display: canSerie });

        let html = '<table class="linea-ext-tabla__table" style="font-size:0.66rem">'
            + '<thead><tr><th></th>'
            + años.map(y => `<th colspan="2">${y}</th>`).join('')
            + '</tr>'
            + '<tr><th></th>'
            + años.map(() => `<th>n</th><th>${colLabel}</th>`).join('')
            + '</tr></thead><tbody>';

        series.forEach(s => {
            html += `<tr><th>${s.etiqueta}</th>`
                + años.map((_, i) => `<td>${fmt(s.raw[i])}</td><td>${fmtDec(s.display[i])}</td>`).join('')
                + '</tr>';
        });

        html += '</tbody></table>';
        tablaEl.innerHTML = html;
    },

    dibujarAreaPresionHumana: function(config, registro) {
        const canvas = document.getElementById(config.canvasId);
        if (!canvas || !registro) return;

        const vp     = drupalSettings.visorProject || {};
        const ambito = registro.ambito;
        const islaId = String(registro.isla_id || '');
        const muniId = String(registro.municipio_id || '');

        const filtrar = (ds) => {
            const arr = Array.isArray(ds) ? ds : [];
            if (ambito === 'canarias') return arr.filter(r => r.ambito === 'canarias');
            if (ambito === 'isla')     return arr.filter(r => r.ambito === 'isla' && String(r.isla_id) === islaId);
            return arr.filter(r => r.ambito === 'municipio' && String(r.municipio_id) === muniId);
        };

        const toMap = arr => Object.fromEntries(filtrar(arr).map(r => [String(r.year), r.valor]));
        const pobMap  = toMap(vp['$detalle_poblacion']        || []);
        const pteRMap = toMap(vp['$historico_pte_reglada']    || []);
        const pteVMap = toMap(vp['$historico_pte_vacacional'] || []);

        const years = [...new Set([
            ...Object.keys(pobMap),
            ...Object.keys(pteRMap),
            ...Object.keys(pteVMap),
        ])].filter(y => y >= '2019' && y <= '2025').sort();

        if (!years.length) return;

        const get = (map, y) => { const v = parseFloat(map[y]); return isNaN(v) ? null : v; };

        const pobData  = years.map(y => get(pobMap, y));
        const pteRData = years.map(y => get(pteRMap, y));
        const pteVData = years.map(y => get(pteVMap, y));

        const fmt = v => v != null ? Math.round(v).toLocaleString('es-ES') : '—';

        new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: years,
                datasets: [
                    {
                        label:           'Población',
                        data:            pobData,
                        backgroundColor: 'rgba(100,100,100,0.55)',
                        borderColor:     '#666666',
                        borderWidth:     1,
                        stack:           'presion',
                    },
                    {
                        label:           'PTE reglada',
                        data:            pteRData,
                        backgroundColor: 'rgba(237,109,109,0.75)',
                        borderColor:     '#c53030',
                        borderWidth:     1,
                        stack:           'presion',
                    },
                    {
                        label:           'PTE vacacional',
                        data:            pteVData,
                        backgroundColor: 'rgba(167,0,0,0.8)',
                        borderColor:     '#a70000',
                        borderWidth:     1,
                        stack:           'presion',
                    },
                ],
            },
            options: {
                responsive:          true,
                maintainAspectRatio: true,
                aspectRatio:         2.5,
                scales: {
                    x: { stacked: true },
                    y: {
                        stacked:      true,
                        beginAtZero:  true,
                        ticks: {
                            callback: v => Math.round(v).toLocaleString('es-ES'),
                        },
                    },
                },
                plugins: {
                    // Excluir datasets 1 y 2 del renderizador genérico de etiquetas
                    visorDatalabels: { fontSize: 10, skipDatasets: [1, 2] },
                    legend: { position: 'bottom' },
                    tooltip: {
                        mode:      'index',
                        intersect: false,
                        callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`,
                            footer: items => {
                                const total = items.reduce((s, i) => s + (i.parsed.y || 0), 0);
                                return `Total: ${fmt(total)}`;
                            },
                        },
                    },
                },
            },
            plugins: [{
                id: 'presionHumanaLabels',
                afterDraw: function(ch) {
                    const c        = ch.ctx;
                    const pobMeta  = ch.getDatasetMeta(0);
                    const pteRMeta = ch.getDatasetMeta(1);
                    const pteVMeta = ch.getDatasetMeta(2);
                    if (!pobMeta.data.length) return;

                    // Y de referencia para PTE reglada: borde superior de la 1ª barra de población
                    const refY = pobMeta.data[0].y;

                    c.save();
                    c.textAlign    = 'center';
                    c.textBaseline = 'bottom';
                    c.font         = 'bold 10px Arial, sans-serif';
                    c.fillStyle    = '#333333';

                    // PTE reglada: todas al mismo nivel, tocando el borde superior de población
                    pteRMeta.data.forEach((bar, i) => {
                        const val = ch.data.datasets[1].data[i];
                        if (val == null) return;
                        c.fillText(fmt(val), bar.x, refY);
                    });

                    // PTE vacacional: 15px por encima del tope de la barra completa
                    pteVMeta.data.forEach((bar, i) => {
                        const val = ch.data.datasets[2].data[i];
                        if (val == null) return;
                        c.fillText(fmt(val), bar.x, bar.y - 8);
                    });

                    c.restore();
                },
            }],
        });

        // ── Tabla de datos ───────────────────────────────────────────────────
        const tablaEl = document.getElementById(config.canvasId + '-tabla');
        if (!tablaEl) return;

        let html = '<table class="linea-ext-tabla__table">';
        html += '<thead><tr><th></th>' + years.map(y => `<th>${y}</th>`).join('') + '</tr></thead><tbody>';
        [
            { label: 'Población',       data: pobData },
            { label: 'PTE reglada',     data: pteRData },
            { label: 'PTE vacacional',  data: pteVData },
        ].forEach(s => {
            html += `<tr><th>${s.label}</th>` + s.data.map(v => `<td>${fmt(v)}</td>`).join('') + '</tr>';
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
                        case 'linea-turismo':
                            self.dibujarLineaTurismo(config, Array.isArray(datos) ? datos[datos.length - 1] : datos);
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
                        case 'area-presion-humana':
                            self.dibujarAreaPresionHumana(config, Array.isArray(datos) ? datos[datos.length - 1] : datos);
                            break;
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        observer.observe(elemento);
    }
};

