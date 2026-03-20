window.CONFIG_GRAFICOS = {
    'gauge-rit': {
        tipo: 'gauge',
        titulo: 'Intensidad Turística',
        subtitulo: 'Plazas / 100 habitantes',
        config: {
            campo_valor: 'rit',
            campo_max: 'rit_max', // Valor de referencia máximo
            campo_media: 'rit_avg',
            tipo_escala: 'calor',  // Aplicará tus 12 pasos de rojo
            //~ unidad: ' turistas/km²',
            //~ precision: 2
        }
    },
    'presion-humana': {
        tipo: 'gauge',
        titulo: 'Presión humana',
        subtitulo: '% sobre el total de viviendas',
        config: {
            campo_valor: 'presion_humana_km2',
            campo_max: 'presion_humana_km2_max',
            campo_media: 'presion_humana_km2_avg',
            tipo_escala: 'calor',
            unidad: '%',
            precision: 2
        }
    },
    'gauge-rit-r': {
        tipo: 'gauge',
        titulo: 'RIT KM2',
        subtitulo: '% sobre el total de viviendas',
        config: {
            campo_valor: 'rit_km2',
            campo_max: 'rit_km2_max',
            campo_media: 'rit_km2_avg',
            tipo_escala: 'calor',
            unidad: '%',
            precision: 0
        }
    },
    'gauge-rit-v': {
        tipo: 'gauge',
        titulo: 'Presión humana',
        subtitulo: 'Densidad de poblacion incluyendo turistas',
        config: {
            campo_valor: 'presion_humana_km2',
            campo_max: 'presion_humana_km2',
            campo_media: 'rit_km2_avg',
            tipo_escala: 'calor',
        }
    },
    'donut-plazas': {
        tipo: 'donut',
        titulo: 'Distribución de Plazas',
        subtitulo: 'VV vs Otros tipos de alojamiento',
        config: {
            campos: ['plazas_vacacionales', 'plazas_regladas'],
            labels: ['Viv. Vacacional', 'Resto'],
            paleta: 'paleta-donuts', 
        },
        campo_central: 'plazas_vacacionales',
        etiqueta_central: 'Plazas vacacionales'
    },
    'bar-viviendas': {
        tipo: 'bar',
        titulo: 'Uso de las viviendas',
        subtitulo: 'Viviendas según uso',
        contexto: 'CHILDREN',
        stacked: true,   
        base100: true,
        config: {
            campos: ['viviendas_vacias', 'viviendas_esporadicas', 'viviendas_habituales'],
            paleta: 'paleta-donuts', 
        },
    },
    

    // PANEL - DASHBOARD
    'evolucion-vivienda-vacacional': {
        tipo: 'line',
        titulo: 'Evolución de la vivienda vacacional',
        contexto: 'CHILDREN_HISTORIC', // <--- El Selector buscará en datosSeries
        periodo: 'YEARLY_MAX',     // <--- Refinará para tener un punto por año (diciembre)
        stacked: true,
        agrupacion: {
            campo: 'tipo_municipio',
            series_a_agrupar: ['GRANDE', 'MEDIANO', 'PEQUEÑO', 'TURÍSTICO'], // Solo estos se funden
            etiqueta_grupo: ['Grandes municipios', 'Municipios medianos','Municipios pequeños', 'Municipios turísticos'],
            color: '#6c757d'
        },
        config: {
            campos: ['uds_vv_total'],
            paleta: 'islas',
            fill: true
        }
    },
    'evolucion-vivienda-vacacional-junio-2023': {
        tipo: 'line',
        titulo: 'Evolución de la vivienda vacacional',
        contexto: 'CHILDREN_HISTORIC', // <--- El Selector buscará en datosSeries
        periodo: '2023-06-30',
        stacked: true,
        agrupacion: {
            campo: 'tipo_municipio',
            series_a_agrupar: ['GRANDE', 'MEDIANO', 'PEQUEÑO', 'TURÍSTICO'], // Solo estos se funden
            etiqueta_grupo: ['Grandes municipios', 'Municipios medianos','Municipios pequeños', 'Municipios turísticos'],
            color: '#6c757d'
        },
        config: {
            campos: ['uds_vv_total'],
            paleta: 'islas',
            fill: true
        }
    },
    'bar-plazas': {
        tipo: 'bar',
        titulo: 'Plazas alojativas por zona',
        //~ subtitulo: 'VV vs Otros tipos de alojamiento',
        contexto: 'CHILDREN',
        stacked: true,   
        base100: true,
        config: {
            campos: ['plazas_suelo_residencial', 'plazas_suelo_turistico'],
            paleta: 'paleta-donuts', 
        },
        agrupacion: {
            campo: 'tipo_isla',
            series_a_agrupar: ['Occidental'], 
            etiqueta_grupo: ['Islas occidentales'],
            color: '#6c757d'
        },
    },
    'bar-vv-por-zona': {
        tipo: 'bar',
        titulo: 'Viviendas vacacionales por zona',
        //~ subtitulo: 'VV vs Otros tipos de alojamiento',
        contexto: 'CHILDREN',
        stacked: true,   
        base100: true,
        config: {
            campos: ['uds_vv_residenciales', 'uds_vv_turisticas'],
            paleta: 'paleta-donuts', 
        },
        agrupacion: {
            campo: 'tipo_isla',
            series_a_agrupar: ['Occidental'], 
            etiqueta_grupo: ['Islas occidentales'],
            color: '#6c757d'
        },
    },
    'bar-reglado-no-reglado': {
        tipo: 'bar',
        titulo: 'Plazas por tipo de alojamiento',
        contexto: 'CHILDREN',
        stacked: true,   
        base100: true,
        config: {
            campos: ['plazas_vacacionales', 'plazas_regladas'],
            paleta: 'paleta-donuts', 
        },
        agrupacion: {
            campo: 'tipo_isla',
            series_a_agrupar: ['Occidental'], 
            etiqueta_grupo: ['Islas occidentales'],
            color: '#6c757d'
        },
    },
    'bar-ptev-pter': {
        tipo: 'bar',
        titulo: 'Población turística equivalente por tipo de alojamiento',
        contexto: 'CHILDREN',
        stacked: true,   
        base100: true,
        config: {
            campos: ['pte_v', 'pte_r'],
            paleta: 'paleta-donuts', 
        },
        agrupacion: {
            campo: 'tipo_isla',
            series_a_agrupar: ['Occidental'], 
            etiqueta_grupo: ['Islas occidentales'],
            color: '#6c757d'
        },
    },
    'bar-ritr_ritv': {
        tipo: 'bar',
        titulo: 'Intensidad turística por tipo de alojamiento',
        contexto: 'CHILDREN',
        stacked: true,   
        base100: true,
        config: {
            campos: ['rit_v', 'rit_r'],
            paleta: 'paleta-donuts', 
        },
        agrupacion: {
            campo: 'tipo_isla',
            series_a_agrupar: ['Occidental'], 
            etiqueta_grupo: ['Islas occidentales'],
            color: '#6c757d'
        },
    },
    'bar-presion-humana': {
        tipo: 'bar',
        titulo: 'Intensidad turística por tipo de alojamiento',
        contexto: 'CHILDREN',
        stacked: true,   
        base100: true,
        config: {
            campos: ['rit_v_km2', 'rit_r_km2','residentes_km2'],
            paleta: 'triada', 
        },
        agrupacion: {
            campo: 'tipo_isla',
            series_a_agrupar: ['Occidental'], 
            etiqueta_grupo: ['Islas occidentales'],
            color: '#6c757d'
        },
    },
    'bar-uso-vivienda': {
        tipo: 'bar',
        titulo: 'Uso de la vivienda',
        contexto: 'CHILDREN',
        stacked: true,   
        base100: true,
        config: {
            campos: ['viviendas_vacias', 'viviendas_esporadicas','viviendas_habituales'],
            paleta: 'triada', 
        },
        agrupacion: {
            campo: 'tipo_isla',
            series_a_agrupar: ['Occidental'], 
            etiqueta_grupo: ['Islas occidentales'],
            color: '#6c757d'
        },
    },
    'bar-presion-vivienda-habitual': {
        tipo: 'bar',
        titulo: 'Presion sobre la vivienda habitual',
        contexto: 'CHILDREN',
        stacked: true,   
        base100: true,
        config: {
            campos: ['uds_vv_residenciales', 'viviendas_disponibles'],
            paleta: 'paleta-donuts', 
        },
        agrupacion: {
            campo: 'tipo_isla',
            series_a_agrupar: ['Occidental'], 
            etiqueta_grupo: ['Islas occidentales'],
            color: '#6c757d'
        },
    },

    'bar-necesidad-de-vivienda': {
        tipo: 'bar',
        titulo: 'Necesidad de vivienda',
        contexto: 'CHILDREN',
        stacked: false,
        base100: false,
        config: {
            campos: ['viviendas_necesarias', 'viviendas_disponibles'],
            paleta: 'paleta-donuts',
            fill: true,
            tipo: 'bar',
        },
        agrupacion: {
            campo: 'tipo_isla',
            series_a_agrupar: ['Occidental'], 
            etiqueta_grupo: ['Islas occidentales'],
            color: '#6c757d'
        },
    },

    'bar-cobertura-de-vivienda': {
        tipo: 'bar',
        titulo: 'Cobertura de viviendas',
        contexto: 'CHILDREN',
        stacked: false,
        base100: false,
        config: {
            campos: ['deficit_oferta_viviendas'],
            paleta: 'paleta-donuts',
            fill: true,
            tipo: 'bar',
        },
        //~ agrupacion: {
            //~ campo: 'tipo_isla',
            //~ series_a_agrupar: ['Occidental'], 
            //~ etiqueta_grupo: ['Islas occidentales'],
            //~ color: '#6c757d'
        //~ },
    },
    
};
