/**
 * Gestión de gráficos para el Visor
 */

// Objeto global para almacenar las instancias y evitar el error "Canvas is already in use"
var visorChartsInstances = {
    chartMix: null,
    chartSuelo: null,
    chartSueloVV: null,
    gaugeRit: null,
    gaugePvv: null
};

const ChartColors = {
    principal: '#a70000',
    secundario: '#ff5252',
    palette: ['#a70000', '#ff5252', '#ff867f', '#ffbaba', '#333333'],
    gris: '#eeeeee'
};

/**
 * Función para destruir un gráfico si ya existe en el canvas
 */
function destruirGrafico(id) {
    if (visorChartsInstances[id]) {
        visorChartsInstances[id].destroy();
        visorChartsInstances[id] = null;
    }
}

function inicializarDonuts(props) {
    // 1. Limpiar instancias previas para evitar el error ID '1' must be destroyed
    destruirGrafico('chartMix');
    destruirGrafico('chartSuelo');
    destruirGrafico('chartSueloVV');

    // 2. Mix de Alojamiento
    const ctxMix = document.getElementById('chartMix');
    if (ctxMix) {
        visorChartsInstances.chartMix = new Chart(ctxMix, {
            type: 'doughnut',
            data: {
                labels: ['Plazas VV', 'Plazas Regladas'],
                datasets: [{
                    data: [props.plazas_v, props.plazas_r],
                    backgroundColor: [ChartColors.principal, ChartColors.gris]
                }]
            },
            options: { cutout: '70%', plugins: { legend: { position: 'bottom' } } }
        });
    }

    // 3. Ubicación de la Oferta (Urbano/Rústico)
    const ctxSuelo = document.getElementById('chartSuelo');
    if (ctxSuelo) {
        visorChartsInstances.chartSuelo = new Chart(ctxSuelo, {
            type: 'pie',
            data: {
                labels: ['Residencial', 'Turístico'],
                datasets: [{
                    data: [props.pasr, props.past],
                    backgroundColor: [ChartColors.principal, ChartColors.gris]
                }]
            },
            options: { cutout: '70%', plugins: { legend: { position: 'bottom' } } }
        });
    }

    // 4. Distribución Suelo VV
    const ctxSueloVV = document.getElementById('chartSueloVV');
    if (ctxSueloVV) {
        visorChartsInstances.chartSueloVV = new Chart(ctxSueloVV, {
            type: 'doughnut',
            data: {
                labels: ['Áreas residenciales', 'Áreas turísticas'],
                datasets: [{
                    data: [props.vv_residenciales, props.vv_turisticas],
                    backgroundColor: [ChartColors.principal, ChartColors.gris]
                }]
            },
            options: { cutout: '70%', plugins: { legend: { position: 'bottom' } } }
        });
    }
}

/**
 * Inicialización de Gauges con Gauge.js
 */

const GAUGES_PRESION_HUMANA = [
    {
        id: 1,
        shortId: '1',
        titulo: 'Intensidad turística',
        campoActual: 'rit',
        campoMax: 'rit_max',
        unidad: ' turistas/100 hab.'
    },
    {
        id: 2,
        shortId: '2',
        titulo: 'Turistas/km²)',
        campoActual: 'rit_km2',
        campoMax: 'rit_km2_max',
        unidad: ' turistas/km²',
        transform: 'sqrt'
    },
    {
        id: 3,
        shortId: '3',
        titulo: 'Residentes/km²',
        campoActual: 'res_km2',
        campoMax: 'res_km2_max',
        unidad: ' hab/km²',
        transform: 'sqrt'
    },
    {
        id: 4,
        shortId: '4',
        titulo: 'Presión Humana (km²)',
        campoActual: 'ph_km2',
        campoMax: 'ph_km2_max',
        unidad: ' personas/km²',
        transform: 'sqrt'
    }
];


const GAUGES_PRESION_VIVIENDA = [
    {
        id: 1,
        shortId: '1',
        titulo: 'Presión VV sobre V. residencial',
        campoActual: 'pvv_vh',
        campoMax: 'pvv_vh_max',
        unidad: '%'
    },
    {
        id: 2,
        shortId: '2',
        titulo: 'Vivienda vacía',
        campoActual: 'vv_vt',
        campoMax: 'vv_vt_max',
        unidad: '%'
    },
    {
        id: 3,
        shortId: '3',
        titulo: 'Segunda residencia',
        campoActual: 've_vt',
        campoMax: 've_vt_max',
        unidad: '%'
    },
    {
        id: 4,
        shortId: '4',
        titulo: 'Viendas / demandantes',
        campoActual: 'tasa_demanda_vivienda',
        campoMax: 'tasa_demanda_vivienda_max',
        unidad: ''
    }
];


const GAUGES_DISTORSION_MODELO = [
    {
        id: 1,
        shortId: '1',
        titulo: 'Presión VV sobre V. residencial',
        campoActual: 'pvv_vh',
        campoMax: 'pvv_vh_max',
        unidad: '%'
    },
    {
        id: 2,
        shortId: '2',
        titulo: 'VV en suelo residencial',
        campoActual: 'dtr',
        campoMax: 'dtr_max',
        unidad: '%'
    },
    {
        id: 3,
        shortId: '3',
        titulo: 'Plazas vacacionales en suelo residencial',
        campoActual: 'plazas_v_porc',
        campoMax: 'plazas_v_porc_max',
        unidad: '%'
    },
    {
        id: 4,
        shortId: '4',
        titulo: 'Turismo en suelo residencial',
        campoActual: 'patsr',
        campoMax: 'patsr_max',
        unidad: '%'
    }
];


var instanciasGauges = {}; // Para guardar las instancias si fuera necesario

/**
 * Inicializa un set de gauges basado en una configuración dinámica
 * @param {Object} props - Los datos del registro (población, rit, etc.)
 * @param {Array} config - El array de configuración (GAUGE_CONFIG u otro)
 */
//~ function inicializarGauges(props, config, containerId) {
    //~ // 1. Validamos que la configuración sea un array
    //~ if (!config || !Array.isArray(config)) return;

    //~ // Localizamos el contenedor padre
    //~ const wrapper = document.getElementById(containerId);
    //~ console.log('Container Id' + containerId)
    //~ console.log('Wrapper' + wrapper)
    //~ if (!wrapper) return;

    //~ // 2. RECORREMOS el array para inicializar cada gauge individualmente
    //~ config.forEach(conf => {
        //~ const valorActual = parseFloat(props[conf.campoActual]) || 0;
        //~ const maxGauge = parseFloat(props[conf.campoMax]) || 100;
        //~ const step = maxGauge / 12;
        
        //~ // 1. Inicializar el gráfico (Canvas)
        //~ const opts = {
            //~ angle: 0.15,
            //~ lineWidth: 0.44,
            //~ radiusScale: 1,
            //~ pointer: { length: 0.6, strokeWidth: 0.035, color: '#000000' },
            //~ limitMax: false,
            //~ limitMin: false,
            //~ staticZones: [
                //~ {strokeStyle: "#fff5f5", min: 0, max: step},
                //~ {strokeStyle: "#fee5e5", min: step, max: step * 2},
                //~ {strokeStyle: "#fccfcf", min: step * 2, max: step * 3},
                //~ {strokeStyle: "#f9b3b3", min: step * 3, max: step * 4},
                //~ {strokeStyle: "#f69595", min: step * 4, max: step * 5},
                //~ {strokeStyle: "#f27575", min: step * 5, max: step * 6}, 
                //~ {strokeStyle: "#ee5252", min: step * 6, max: step * 7},
                //~ {strokeStyle: "#e82a2a", min: step * 7, max: step * 8},
                //~ {strokeStyle: "#d61a1a", min: step * 8, max: step * 9},
                //~ {strokeStyle: "#c41010", min: step * 9, max: step * 10},
                //~ {strokeStyle: "#b50505", min: step * 10, max: step * 11},
                //~ {strokeStyle: "#a70000", min: step * 11, max: maxGauge} 
            //~ ],
            //~ strokeColor: '#E0E0E0',
            //~ generateGradient: true,
            //~ highDpiSupport: true,
        //~ };
        
        //~ // Buscamos los elementos SOLO dentro del wrapper
        //~ const target = wrapper.querySelector(`#${containerId}-gauge${conf.shortId}`);
        //~ const targetText = wrapper.querySelector(`#${containerId}-val-${conf.shortId}`);
        //~ console.log('Target -> ' + target)
        
        //~ if (target) {
            //~ const gauge = new Gauge(target).setOptions(opts);
            //~ gauge.maxValue = maxGauge; 
            //~ gauge.setMinValue(0);
            //~ gauge.animationSpeed = 32;
            //~ gauge.set(valorActual);
        //~ }

        //~ // 2. Escribir los textos inferiores
        
        //~ if (targetText) {
            //~ const esExcesivo = valorActual > maxGauge;
            //~ const colorClass = esExcesivo ? 'text-danger' : 'text-success';
            
            //~ targetText.innerHTML = `
                //~ <div class="${colorClass}">
                    //~ ${F.den(valorActual)}${conf.unidad || ''}
                //~ </div>
                //~ <div class="gauge-value-benchmark">
                    //~ Máx. Benchmark: ${F.den(maxGauge)}${conf.unidad || ''}
                //~ </div>
            //~ `;
        //~ }
    //~ }); // <--- Fin del forEach
//~ }

function inicializarGauges(props, config, containerId) {
    // 1. Validamos que la configuración sea un array
    if (!config || !Array.isArray(config)) return;

    // Localizamos el contenedor padre
    const wrapper = document.getElementById(containerId);
    if (!wrapper) return;

    // 2. RECORREMOS el array para inicializar cada gauge individualmente
    config.forEach(conf => {
        // --- VALORES ORIGINALES (Para los textos) ---
        const valorActual = parseFloat(props[conf.campoActual]) || 0;
        const maxGauge = parseFloat(props[conf.campoMax]) || 100;
        
        // --- VALORES VISUALES (Para el dibujo) ---
        // Por defecto son iguales a los reales
        let valVisual = valorActual;
        let maxVisual = maxGauge;

        // Si la configuración pide raíz cuadrada, transformamos los valores del dibujo
        if (conf.transform === 'sqrt' && props.ambito === 'municipio') {
            valVisual = Math.sqrt(valorActual);
            maxVisual = Math.sqrt(maxGauge);
        }

        // El 'step' se calcula sobre el valor visual para que la escala de colores sea coherente
        const step = maxVisual / 12;
        
        // 1. Inicializar el gráfico (Canvas) con valores VISUALES
        const opts = {
            angle: 0.15,
            lineWidth: 0.44,
            radiusScale: 1,
            pointer: { length: 0.6, strokeWidth: 0.035, color: '#000000' },
            limitMax: true, // Importante: así la aguja no se sale del arco en outliers como Pto de la Cruz
            limitMin: false,
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
                {strokeStyle: "#a70000", min: step * 11, max: maxVisual} 
            ],
            strokeColor: '#E0E0E0',
            generateGradient: true,
            highDpiSupport: true,
        };
        
        const target = wrapper.querySelector(`#${containerId}-gauge${conf.shortId}`);
        const targetText = wrapper.querySelector(`#${containerId}-val-${conf.shortId}`);
        
        if (target) {
            const gauge = new Gauge(target).setOptions(opts);
            // Usamos el máximo visual para definir el tope del dibujo
            gauge.maxValue = maxVisual; 
            gauge.setMinValue(0);
            gauge.animationSpeed = 32;
            
            // Seteamos el valor visual para posicionar la aguja
            gauge.set(valVisual);
        }

        // 2. Escribir los textos inferiores (USANDO VALORES REALES)
        if (targetText) {
            const esExcesivo = valorActual > maxGauge;
            const colorClass = esExcesivo ? 'text-danger' : 'text-success';
            
            targetText.innerHTML = `
                <div class="${colorClass}" style="font-weight:bold;">
                    ${F.den(valorActual)}${conf.unidad || ''}
                </div>
                <div class="gauge-value-benchmark" style="font-size:0.85em; opacity:0.8;">
                    Máx. Benchmark: ${F.den(maxGauge)}${conf.unidad || ''}
                </div>
            `;
        }
    });
}
/**
 * Genera el Radar de 8 ejes comparativo
 */
// Variable global para controlar el estado
let isRenderingRadar = false;

window.inicializarRadar = function(props) {
    if (isRenderingRadar) return;
    isRenderingRadar = true;

    const container = document.querySelector('#wrapper-radar');
    if (!container) {
        console.error("No se encontró #wrapper-radar");
        isRenderingRadar = false;
        return;
    }

    // Reiniciamos el canvas
    container.innerHTML = '<canvas id="chartRadar"></canvas>';
    const canvas = document.getElementById('chartRadar');
    const ctx = canvas.getContext('2d');

    // --- TEST DE EMERGENCIA ---
    // Pintamos un recuadro verde directamente en el canvas para ver si responde
    ctx.fillStyle = "green";
    ctx.fillRect(10, 10, 50, 50);
    console.log("Test de dibujo enviado al contexto");
    // ---------------------------

    // Importante: Forzamos dimensiones si Chart.js se queda "colgado"
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    try {
        const ejes = [
            { label: 'RIT Reglada', key: 'rit_r' },
            { label: 'Territ. Reglada', key: 'rit_r_km2' },
            { label: 'RIT Vacacional', key: 'rit_v' },
            { label: 'Territ. Vacacional', key: 'rit_v_km2' },
            { label: 'Dens. Residentes', key: 'res_km2' },
            { label: 'Presión s/ VH', key: 'pvv_vh' },
            { label: 'Desplazamiento', key: 'dtr' },
            { label: 'Plazas Suelo Res.', key: 'patsr' }
        ];

        // Validamos que los datos no sean NaN
        const dataMuni = ejes.map(e => {
            const val = parseFloat(props[e.key]) || 0;
            const max = parseFloat(props[`${e.key}_max`]) || 1;
            return val / max;
        });

        const dataBench = ejes.map(e => {
            const avg = parseFloat(props[`${e.key}_avg`]) || 0;
            const max = parseFloat(props[`${e.key}_max`]) || 1;
            return avg / max;
        });

        console.log("Datos normalizados listos:", dataMuni);
        console.log(`Ámbito: ${props.ambito}`)
        if (props.ambito === 'municipio') {
          etiqueta_titulo = `Municipios de tipo: ${props.tipo_municipio}`;
        } else if (props.ambito === 'isla') {
          etiqueta_titulo = `Canarias`;
        }

        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ejes.map(e => e.label),
                datasets: [
                    {
                        label: etiqueta_titulo,
                        data: dataBench,
                        backgroundColor: 'rgba(200, 200, 200, 0.2)',
                        borderColor: 'rgba(150, 150, 150, 0.4)',
                        borderDash: [5, 5],
                        pointRadius: 0
                    },
                    {
                        label: props.etiqueta,
                        data: dataMuni,
                        backgroundColor: 'rgba(167, 0, 0, 0.3)',
                        borderColor: '#a70000',
                        pointBackgroundColor: '#a70000',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        min: 0,
                        max: 1,
                        ticks: { display: false }
                    }
                }
            }
        });
        console.log("Chart.js ejecutado con éxito");

    } catch (e) {
        console.error("Fallo en Chart.js:", e);
    } finally {
        isRenderingRadar = false;
    }
};
