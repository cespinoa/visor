window.CONFIG_GRAFICOS = {

    'radar-sintesis': {
        tipo: 'radar',
        titulo: 'Síntesis de indicadores',
        config: {
            campos: [
                'vacacional_por_viviendas_habituales',
                'plazas_vv_residenciales_porc',
                'plazas_suelo_residencial_porc',
                'plazas_vacacionales_plazas_total_porc',
                'rit_v',
                'uds_vv_habitantes',
                'rit_km2',
                'residentes_km2',
            ],
            etiquetas: [
                'Porc de viviendas en vacacional',
                'Porc de VV en zona residencial',
                'Plazas en zona residencial',
                'Plazas vacacionales',
                'RIT vacacional',
                'VV por 100 hab.',
                'RIT Km²',
                'Residentes Km²',
            ],
            etiquetas_punto: [
                'PVV',
                'PVR',
                'PZR',
                'PV',
                'RITv',
                'VV/100hab',
                'RIT_Km²',
                'Res_Km²',
            ],
        }
    },

    'gauge-rit': {
        tipo: 'gauge',
        titulo: 'Ratio de Intensidad Turística (RIT)',
        config: {
            campo_valor: 'rit',
            campo_max: 'rit_max',
            campo_media: 'rit_avg',
            tipo_escala: 'calor',
        }
    },
    'gauge-rit-r': {
        tipo: 'gauge',
        titulo: 'RIT reglada',
        config: {
            campo_valor: 'rit_r',
            campo_max: 'rit_r_max',
            campo_media: 'rit_r_avg',
            tipo_escala: 'calor',
        }
    },
    'gauge-rit-v': {
        tipo: 'gauge',
        titulo: 'RIT vacacional',
        config: {
            campo_valor: 'rit_v',
            campo_max: 'rit_v_max',
            campo_media: 'rit_v_avg',
            tipo_escala: 'calor',
        }
    },
    'donut-rit': {
        tipo: 'donut',
        titulo: 'Distribución de RIT',
        porcentaje: false,
        config: {
            campos: ['rit_v_porc', 'rit_r_porc'],
            labels: ['Porcentaje Vacacional', 'Porcentaje reglado'],
            paleta: 'paleta-donuts', 
        },
        campo_central: 'rit_v_porc',
        etiqueta_central: 'Porcentaje RIT vacacional'
    },

    
    'gauge-rit-km2': {
        tipo: 'gauge',
        titulo: 'RIT total / km²',
        config: {
            campo_valor: 'rit_km2',
            campo_max: 'rit_km2_max',
            campo_media: 'rit_km2_avg',
            tipo_escala: 'calor',
        }
    },
    'gauge-rit-r-km2': {
        tipo: 'gauge',
        titulo: 'RIT reglada / km²',
        config: {
            campo_valor: 'rit_r_km2',
            campo_max: 'rit_r_km2_max',
            campo_media: 'rit_r_km2_avg',
            tipo_escala: 'calor',
        }
    },
    'gauge-rit-v-km2': {
        tipo: 'gauge',
        titulo: 'RIT vacacional / km²',
        config: {
            campo_valor: 'rit_v_km2',
            campo_max: 'rit_v_km2_max',
            campo_media: 'rit_v_km2_avg',
            tipo_escala: 'calor',
        }
    },
    'donut-rit-km2': {
        tipo: 'donut',
        titulo: 'Distribución de RIT km²',
        porcentaje: true,
        config: {
            campos: ['rit_v_km2', 'rit_r_km2'],
            labels: ['Porcentaje Vacacional', 'Porcentaje reglado'],
            paleta: 'paleta-donuts', 
        },
        campo_central: 'rit_v_km2',
        etiqueta_central: 'Porcentaje RIT vacacional'
    },

    
    'gauge-presion-humana': {
        tipo: 'gauge',
        titulo: 'Presión humana',
        config: {
            campo_valor: 'presion_humana_km2',
            campo_max: 'presion_humana_km2_max',
            campo_media: 'presion_humana_km2_avg',
            tipo_escala: 'calor',
        }
    },
    'gauge-densidad-de-poblacion' : {
        tipo: 'gauge',
        titulo: 'Residentes por km²',
        config: {
            campo_valor: 'residentes_km2',
            campo_max: 'residentes_km2_max',
            campo_media: 'residentes_km2_avg',
            tipo_escala: 'calor',
        }
    },
    'donut-presion-humana': {
        tipo: 'donut',
        titulo: 'Distribución de Presión Humana',
        porcentaje: true,
        config: {
            campos: ['rit_km2', 'residentes_km2'],
            labels: ['Porcentaje Turistas', 'Porcentaje Residentes'],
            paleta: 'paleta-donuts', 
        },
        campo_central: 'rit_km2',
        etiqueta_central: 'Porcentaje RIT total'
    },





    
    'gauge-viviendas-vacias': {
        tipo: 'gauge',
        titulo: 'Porc. de viviendas vacías',
        config: {
            campo_valor: 'viviendas_vacias_viviendas_total',
            campo_max: 'viviendas_vacias_viviendas_total_max',
            campo_media: 'viviendas_vacias_viviendas_total_avg',
            tipo_escala: 'calor',
        }
    },
    'gauge-viviendas-esporadicas': {
        tipo: 'gauge',
        titulo: 'Porc. de viviendas de uso esporádico',
        config: {
            campo_valor: 'viviendas_esporadicas_viviendas_total',
            campo_max: 'viviendas_esporadicas_viviendas_total_max',
            campo_media: 'viviendas_esporadicas_viviendas_total_avg',
            tipo_escala: 'calor',
        }
    },
    'gauge-viviendas-vacacional': {
        tipo: 'gauge',
        titulo: 'Porc. de viviendas en vacacional',
        config: {
            campo_valor: 'vacacional_por_viviendas_habituales',
            campo_max: 'vacacional_por_viviendas_habituales_max',
            campo_media: 'vacacional_por_viviendas_habituales_avg',
            tipo_escala: 'calor',
        }
    },
    'gauge-uds-vv-habitantes': {
        tipo: 'gauge',
        titulo: 'Viviendas vacacionales por 100 habitantes',
        config: {
            campo_valor: 'uds_vv_habitantes',
            campo_max: 'uds_vv_habitantes_max',
            campo_media: 'uds_vv_habitantes_avg',
            tipo_escala: 'calor',
        }
    },




    'gauge-deficit-viviendas': {
        tipo: 'gauge',
        titulo: 'Déficit teórico de viviendas',
        config: {
            campo_valor: 'deficit_oferta_viviendas',
            campo_max: 'deficit_oferta_viviendas_max',
            campo_media: 'deficit_oferta_viviendas_avg',
            tipo_escala: 'calor',
        }
    },
    
    'gauge-plazas-suelo-residencial': {
        tipo: 'gauge',
        titulo: 'Desplazamiento a zonas residenciales',
        config: {
            campo_valor: 'plazas_suelo_residencial_porc',
            campo_max: 'plazas_suelo_residencial_porc_max',
            campo_media: 'plazas_suelo_residencial_porc_avg',
            tipo_escala: 'calor',
        }
    },
    'gauge-peso-oferta-vacacional': {
        tipo: 'gauge',
        titulo: 'Peso de la oferta vacacional',
        config: {
            campo_valor: 'plazas_vacacionales_plazas_total_porc',
            campo_max: 'plazas_vacacionales_plazas_total_porc_max',
            campo_media: 'plazas_vacacionales_plazas_total_porc_avg',
            tipo_escala: 'calor',
        }
    },
    'donut-vv-por-zona': {
        tipo: 'donut',
        titulo: 'VV por tipo de zona',
        config: {
            campos: ['plazas_vv_residenciales_porc', 'plazas_vv_turisticas_porc'],
            labels: ['VV en zonas residenciales', 'VV en zonas turísticas'],
            paleta: 'paleta-donuts',
        },
        campo_central: 'plazas_vv_residenciales_porc',
        etiqueta_central: 'En zonas residenciales'
    },
    'donut-regladas-por-zona': {
        tipo: 'donut',
        titulo: 'Plazas regladas por tipo de zona',
        config: {
            campos: ['plazas_at_residenciales_porc', 'plazas_at_turisticas_porc'],
            labels: ['Plazas regladas en zonas residenciales', 'Plazas regladas en zonas turísticas'],
            paleta: 'paleta-donuts',
        },
        campo_central: 'plazas_at_residenciales_porc',
        etiqueta_central: 'En zonas residenciales'
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
