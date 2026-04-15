// js/dashboard/config-tablas.js

window.CONFIG_TABLAS = {

    'historico-pob-viv': {
        tipo:      'historico-pob-viv',
        titulo:    'Crecimiento de la población y la vivienda',
        colapsible: true,
    },

    'censos-islas-nohabituales': {
        tipo:      'censos-islas',
        titulo:    'Viviendas no habituales por isla — censos 2001, 2011 y 2021',
        colapsible: true,
    },


    'hogar-ccaa-tabla': {
        tipo:          'ccaa-ext',
        titulo:        'Tamaño medio del hogar por CCAA',
        colapsible:    true,
        dataset:       '$historico_personas_hogar_ccaa',
        campo:         'miembros',
        yearField:     'ejercicio',
        etiquetaField: 'ccaa_nombre',
        destacadas:    ['Total Nacional', 'Canarias'],
        formato:       'decimal_2',
    },

    'historico-llegadas-plazas-ocupacion': {
        tipo:       'historico-turismo',
        titulo:     'Evolución: llegadas, plazas regladas, ocupación y estancia media',
        colapsible: true,
        baseYear:   '2010',
    },

    'turismo-reglado-vs-vacacional': {
        tipo:        'historico-turismo-derivado',
        titulo:      'Turismo reglado y vacacional',
        colapsible:  true,
        baseYear:    '2010',
        baseYearVac: '2012',
    },

    'viviendas-terminadas-canarias': {
        titulo:         "Viviendas terminadas",
        fuente:         '$viviendas_terminadas',
        modo:           'ficha',
        cabecera:       ["Año", "Viviendas"],
        formato:        'entero',
        fila_total:     'total',
        etiqueta_total: 'Total período',
    },

    'viviendas-habituales-mas-terminadas': {
        titulo: "Vivienda disponible",                                                                                                                                                       
        contexto: "SELF",
        modo: "ficha",                                                                                                                                                                       
        cabecera: ["Indicador", "Viviendas"],                 
        filas: [                                                                                                                                                                             
            ["Viviendas habituales existentes",  ["viviendas_habituales"]],
            ["Viviendas terminadas 2021-2024",   ["$viviendas_terminadas.total"]],                                                                                                           
            ["Suma",  ["[[ viviendas_habituales + $viviendas_terminadas.total ]]", "entero"], "destacada"],                                                                                  
        ]                                                                                                                                                                                    
    }, 
    

    'resumen-ambito': {
        titulo: "Principales indicadores",
        contexto: "PARENTS",
        modo: "ficha",
        unidades: true,
        filas: [
            ["Peso de la oferta vacacional", "plazas_vacacionales_plazas_total_porc"],
            ["Oferta vacacional en zona residencial", "plazas_vv_residenciales_porc"],
            ["Oferta turística en zona residencial", "plazas_suelo_residencial_porc"],
            ["Ratio de Intensidad Turística", "rit"],
            ["Ratio de Intensidad Turística por Km²", "rit_km2"],
            ["Presión humana", "presion_humana_km2"],
            ["Viviendas vacías", "viviendas_vacias_viviendas_total"],
            ["Viviendas de uso esporádico", "viviendas_esporadicas_viviendas_total"],
            ["Viviendas de uso habitual", "viviendas_habituales_viviendas_total"],
            ["Vivienda vacacional en zona residencial", "vacacional_por_viviendas_habituales"],
            ["Vivienda disponible (sobre la vivienda habitual)","viviendas_disponibles_viviendas_habituales"],
            ["Déficit de viviendas (sobre la vivienda habitual)", "deficit_oferta_viviendas"]
        ]
    },
    'parque-viviendas': {
        titulo: "Parque de viviendas",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Uso", "Unidades", "Porcentaje"],
        filas: [
            ["Viviendas vacías", ["viviendas_vacias"], ["viviendas_vacias_viviendas_total"]],
            ["Uso esporádico", ["viviendas_esporadicas"], ["viviendas_esporadicas_viviendas_total"]],
            ["Uso habitual", ["viviendas_habituales"], ["viviendas_habituales_viviendas_total"]],
            ["Total viviendas", ["viviendas_total"], ["100,00%", "literal"], "destacada" ]
        ]
    },
    'viviendas-disponibles': {
        titulo: "Viviendas disponibles",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Uso", "Unidades", "Porcentaje"],
        filas: [
            ["Vacacional en zona residencial", ["uds_vv_residenciales"], ["vacacional_por_viviendas_habituales"]],
            ["Viviendas disponibles", ["viviendas_disponibles"],  ["viviendas_disponibles_viviendas_habituales"]],
            ["Uso habitual", ["viviendas_habituales"], ["100,00%", "literal"], "destacada"],
        ]
    },
    'viviendas-necesarias': {
        titulo: "Viviendas necesarias",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Concepto", "Valor"],
        filas: [
            ["Población", ["poblacion"]],
            ["Personas por hogar", ["personas_por_hogar"]],
            ["Viviendas necesarias", ["viviendas_necesarias"], "destacada"],
        ]
    },
    'deficit-de-viviendas': {
        titulo: "Déficit teórico de viviendas",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Concepto", "Valor", "Porcentaje"],
        filas: [
            ["Viviendas disponibles", ["viviendas_disponibles"]],
            ["Viviendas necesarias", ["viviendas_necesarias"] ],
            ["Déficit de viviendas", ["deficit_viviendas"], ['deficit_oferta_viviendas'], "destacada"]
        ]
    },

    'deficit-de-viviendas-canarias': {
        titulo: "Déficit teórico de viviendas (con nuevas)",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Concepto", "Valor", "Porcentaje"],
        filas: [
            ["Viviendas disponibles + terminadas", ["[[ viviendas_disponibles + $viviendas_terminadas.total | entero ]]"]],
            ["Viviendas necesarias",               ["viviendas_necesarias"]],
            ["Déficit de viviendas",
                ["[[ viviendas_disponibles + $viviendas_terminadas.total - viviendas_necesarias | entero ]]"],
                ["[[ (viviendas_necesarias - viviendas_disponibles - $viviendas_terminadas.total) / (viviendas_disponibles + $viviendas_terminadas.total) * 100 | decimal_2 ]]"],
                "destacada"
            ]
        ]
    },
    'carga-poblacional': {
        titulo: "Carga poblacional",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Concepto", "Personas", "Porcentaje"],
        filas: [
            ["Pob. Turística Equiv. Reglada", ["pte_r", "entero"], ["pte_r_total_poblacion_porc"]],
            ["Pob. Turística Equiv. Vacacional", ["pte_v", "entero"], ["pte_v_total_poblacion_porc"]],
            ["Población censada", ["poblacion", "entero"], ["poblacion_total_poblacion_porc"]],
            ["Carga real", ["poblacion_total", "entero"], ["100,00%", "literal"], "destacada" ]
        ]
    },
    'oferta-alojativa': {
        titulo: "Oferta alojativa por tipo (Plazas)",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Tipo de oferta", "Plazas", "Porcentaje"],
        filas: [
            ["Oferta reglada", ["plazas_regladas", "entero"], ["plazas_regladas_plazas_total_porc"]],
            ["Oferta vacacional", ["plazas_vacacionales", "entero"], ["plazas_vacacionales_plazas_total_porc"]],
            ["Plazas totales", ["plazas_total", "entero"], ["100,00%", "literal"], "destacada" ]
        ]
    },
    'oferta-alojativa-por-zona-ambito': {
        titulo: "Oferta alojativa por zona",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Tipo de zona", "Plazas", "Porcentaje"],
        filas: [
            ["Zona turística", ["plazas_suelo_turistico", "entero"], ["plazas_suelo_turistico_porc"]],
            ["Zona residencial", ["plazas_suelo_residencial", "entero"], ["plazas_suelo_residencial_porc"]],
            ["Plazas totales", ["plazas_total", "entero"], ["100,00%", "literal"], "destacada" ]
        ]
    },
    'intensidad-turistica': {
        titulo: "Ratios de Intensidad Turística",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Tipo de alojamiento", "Por 100 hab.", "Por km²"],
        filas: [
            ["Reglado", ["rit_r"], ["rit_r_km2"]],
            ["Vacacional", ["rit_v"], ["rit_v_km2"]],
            ["Intensidad total", ["rit"], ["rit_km2"], "destacada" ]
        ]
    },
    'presion-humana': {
        titulo: "Presión humana",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Concepto", "Personas/km²", "Porcentaje"],
        filas: [
            ["Turistas (PTE/km2))", ["rit_km2"], ["rit_km2_presion_humana_km2"]],
            ["Residentes", ["residentes_km2"], ["residentes_km2_presion_humana_km2"]],
            ["Total", ["presion_humana_km2"], ["100,00%", "literal"], "destacada" ]
        ]
    },
    'distribucion-vv': {
        titulo: "Localizacion de la Vivienda Vacacional",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Tipo de zona", "Unidades", "Porcentaje"],
        filas: [
            ["Źona turística", ["uds_vv_turisticas", "entero"], ["uds_vv_turisticas_porc"]],
            ["Zona residencial", ["uds_vv_residenciales", "entero"], ["uds_vv_residenciales_porc"]],
            ["Total", ["uds_vv_total", "entero"], ["100,00%", "literal"], "destacada" ]
        ]
    },
    'presion-vv-sobre-vivienda': {
        titulo: "Presión de la Vivienda Vacacional",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Concepto", "Porcentaje"],
        filas: [
            ["En zona residencial sobre la vivienda habital", ["vacacional_por_viviendas_habituales"]],
            ["En todas las zonas sobre el total de viviendas", ["vacacional_por_viviendas_total"]],
            ["Viviendas vacacionals por cada 100 habitantes", ["uds_vv_habitantes"]],
            ["Viviendas vacacionals en zonas residenciales por cada 100 habitantes", ["uds_vv_residenciales_habitantes"]],
        ]
    },
    'distribucion-plazas-regladas': {
        titulo: "Distribución de las plazas regladas",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Tipo de zona", "Plazas", "Porcentaje"],
        filas: [
            ["Źona turística", ["plazas_at_turisticas", "entero"], ["plazas_at_turisticas_porc"]],
            ["Zona residencial", ["plazas_at_residenciales", "entero"], ["plazas_at_residenciales_porc"]],
            ["Total", ["plazas_regladas", "entero"], ["100,00%", "literal"], "destacada" ]
        ]
    },
    'distribucion-plazas-vacacionales': {
        titulo: "Distribución de las plazas vacacionales",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Tipo de zona", "Plazas", "Porcentaje"],
        filas: [
            ["Źona turística", ["plazas_vv_turisticas", "entero"], ["plazas_vv_turisticas_porc"]],
            ["Zona residencial", ["plazas_vv_residenciales", "entero"], ["plazas_vv_residenciales_porc"]],
            ["Total", ["plazas_vacacionales", "entero"], ["100,00%", "literal"], "destacada" ]
        ]
    },
    'plazas-turisticas-zona-residencial': {
        titulo: "Plazas turísticas en zona residencial",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Tipo de oferta", "Plazas", "Porcentaje"],
        filas: [
            ["Oferta reglada", ["plazas_at_residenciales", "entero"], ["plazas_at_residenciales_oferta_en_residencial"]],
            ["Oferta vacacional", ["plazas_vv_residenciales", "entero"], ["plazas_vv_residenciales_oferta_en_residencial"]],
            ["Total", ["plazas_suelo_residencial", "entero"], ["100,00%", "literal"], "destacada" ]
        ]
    },
    'plazas-turisticas-zona-turistica': {
        titulo: "Plazas turísticas en zona turística",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Tipo de oferta", "Plazas", "Porcentaje"],
        filas: [
            ["Oferta reglada", ["plazas_at_turisticas", "entero"], ["plazas_at_turisticas_oferta_en_turistico"]],
            ["Oferta vacacional", ["plazas_vv_turisticas", "entero"], ["plazas_vv_turisticas_oferta_en_turistico"]],
            ["Total", ["plazas_suelo_turistico", "entero"], ["100,00%", "literal"], "destacada" ]
        ]
    },
    'poblacion-turistica-equivalente': {
        titulo: "Población turística equivalente",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Tipo de alojamiento", "Personas", "Porcentaje"],
        filas: [
            ["Reglado", ["pte_r", "entero"], ["pte_r_porc"]],
            ["Vacacional", ["pte_v", "entero"], ["pte_v_porc"]],
            ["Total", ["pte_total", "entero"], ["100,00%", "literal"], "destacada" ]
        ]
    },


    'ficha-hogares-por-nucleos': {
        titulo: "Hogares por núcleos",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Tipo de hogar", "Unidades", "Porcentaje"],
        filas: [
            ["Sin núcleo", ["hogares_0"], ["hogares_0_porc"]],
            ["Un núcleo", ["hogares_1"], ["hogares_1_porc"]],
            ["Dos núcleos", ["hogares_2"], ["hogares_2_porc"]],
            ["Tres o más núcleos", ["hogares_3"], ["hogares_3_porc"]],
            ["Total", ["hogares_total", "entero"], ["100,00%", "literal"], "destacada" ]
        ]
    },

    'ficha-hogares-por-nucleos-deficit': {
        titulo: "Déficit generado por tipo de hogar",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Tipo de hogar", "Familias", "Porcentaje"],
        filas: [
            ["Sin núcleo x 0", ["0", "literal"], ["0,00%", "literal"]],
            ["Un núcleo x 0", ["0", "literal"], ["0,00%", "literal"]],
            ["Dos núcleos x 1", ["hogares_2"], ["[[hogares_2/((hogares_3 * 2) + hogares_2)*100]]", "porcentaje_2"]  ],
            ["Tres o más núcleos x3", ["[[hogares_3*2]]"], ["[[hogares_3*2/((hogares_3 * 2) + hogares_2)*100]]", "porcentaje_2"]  ],
            ["Total", ["[[(hogares_3 * 2) + hogares_2]]"], ["100,00%", "literal"], "destacada"]

        ]
    },

    
    
    'lista-de-hijos': {
        titulo: "Distribución territorial",
        contexto: "CHILDREN",
        modo: "lista",
        total_padre: true,
        ordenable: true,
        columna_ordenacion: 1,
        descargable: true,
        es_ranking: true,
        maxInicial: 10,
        columnas: [
          ["etiqueta", "literal"], 
          ["uds_vv_total"],
          ["plazas_vacacionales"]
        ],
        etiquetas: ["Isla", "V.V.", "Plazas"]
    },
    'lista-de-localidades': {
        titulo: "Distribución por localidades",
        contexto: "CHILDREN",
        modo: "lista",
        total_padre: true,
        ordenable: true,
        columna_ordenacion: 1,
        descargable: true,
        es_ranking: true,
        maxInicial: 10,
        columnas: [
          ["etiqueta", "literal"], 
          ["uds_vv_total", "entero"],
          ["plazas_vacacionales", "entero"]
        ],
        etiquetas: ["Localidad", "V.V.", "Plazas"]
    },
    
    // ==============================================
    // PANEL - DASHBOARD
    // ==============================================
    'tabla-evolucion-unidades': {
        titulo: 'Evolución de unidades de vivienda vacacional',
        contexto: 'CHILDREN_HISTORIC',
        total_padre: true,
        descargable: true,
        periodo: 'YEARLY_MAX',
        modo: 'lista',
        comparativa: 'completa', // 'porcentual' | 'completa'
        columnas: [
          ["etiqueta", "literal"],
          ["uds_vv_total", "entero"]
        ]
    },

    'tabla-evolucion-plazas-junio-2023': {
        titulo: 'Evolución de plazas',
        contexto: 'CHILDREN_HISTORIC',
        periodo: '2023-06-30',
        total_padre: true,
        descargable: true,
        modo: 'lista',
        comparativa: 'completa', // 'porcentual' | 'completa'
        columnas: [
          ["etiqueta", "literal"],
          ["uds_vv_total", "entero"]
        ]
    },
    'viviendas-vacacionales-por-zonas': {
        titulo: "Viviendas vacacionales por zona (Datos)",
        contexto: "CHILDREN",
        modo: "lista",
        total_padre: true,
        descargable: true,
        es_ranking: true,
        maxInicial: 10,
        columnas: [
          ["etiqueta"], 
          ['uds_vv_residenciales'],
          ["uds_vv_turisticas"],
          ["uds_vv_total"],
          ['uds_vv_residenciales_porc'],
          ["uds_vv_turisticas_porc"]
        ],
        etiquetas: ["Isla", "Residenciales", "Turísticas", "Total", "% Res", "% Tur"],
    },
    'plazas-alojativas-por-zonas': {
        titulo: "Plazas alojativas por zona (Datos)",
        contexto: "CHILDREN",
        modo: "lista",
        total_padre: true,
        descargable: true,
        es_ranking: true,
        maxInicial: 10,
        columnas: [
          ["etiqueta"], 
          ['plazas_suelo_residencial'],
          ['plazas_suelo_turistico'],
          ['plazas_total'],
          ['plazas_suelo_residencial_porc'],
          ['plazas_suelo_turistico_porc'],
        ],
        etiquetas: ["Isla", "Residencial", "Turística", "Total", "% Res", "% Tur"],
    },
    'plazas-regladas-no-regladas': {
        titulo: "Plazas por tipo de alojamiento",
        contexto: "CHILDREN",
        modo: "lista",
        total_padre: true,
        descargable: true,
        es_ranking: true,
        maxInicial: 10,
        columnas: [
          ["etiqueta"], 
          ['plazas_vacacionales'],
          ['plazas_regladas'],
          ['plazas_total'],
          ['plazas_vacacionales_plazas_total_porc'],
          ['plazas_regladas_plazas_total_porc'],
        ],
        etiquetas: ["Isla", "Vacacionales", "Regladas", "Total", "% Vac", "% Reg"],
    },
    'ptev-pter': {
        titulo: "Población turística equivalente por tipo de alojamiento",
        contexto: "CHILDREN",
        modo: "lista",
        total_padre: true,
        descargable: true,
        es_ranking: true,
        maxInicial: 10,
        columnas: [
          ["etiqueta"], 
          ['pte_v'],
          ['pte_r'],
          ['pte_total'],
          ['pte_v_porc'],
          ['pte_r_porc'],
        ],
        etiquetas: ["Isla", "Vacacional", "Reglada", "Total", "% Vac", "% Reg"],
    },
    'ritv-ritr': {
        titulo: "Presión sobre los residentes",
        contexto: "CHILDREN",
        modo: "lista",
        total_padre: true,
        descargable: true,
        es_ranking: true,
        maxInicial: 10,
        columnas: [
          ["etiqueta"], 
          ['rit_v'],
          ['rit_r'],
          ['rit'],
          ['rit_v_porc'],
          ['rit_r_porc'],
        ],
        etiquetas: ["Isla", "Vacacional", "Reglada", "Total", "%Vac", "%Reg"],
    },
    'presion-territorio': {
        titulo: "Presión sobre el territorio",
        subtitulo: "En personas por km",
        contexto: "CHILDREN",
        modo: "lista",
        total_padre: true,
        descargable: true,
        es_ranking: true,
        maxInicial: 10,
        columnas: [
          ["etiqueta"], 
          ['rit_v_km2'],
          ['rit_r_km2'],
          ['rit_km2'],
          ['residentes_km2'],
          ['presion_humana_km2'],
        ],
        etiquetas: ["Isla", "Vacacional", "Reglada", "Tot turistas", "Residentes", "Total"],
    },

    'uso-vivienda': {
        titulo: "Uso de la vivienda",
        contexto: "CHILDREN",
        modo: "lista",
        total_padre: true,
        descargable: true,
        es_ranking: true,
        maxInicial: 10,
        columnas: [
          ["etiqueta"], 
          ['viviendas_vacias'],
          ['viviendas_vacias_viviendas_total'],
          ['viviendas_esporadicas'],
          ['viviendas_esporadicas_viviendas_total'],
          ['viviendas_habituales'],
          ['viviendas_habituales_viviendas_total'],
          ['viviendas_total'],
        ],
        etiquetas: ["Isla", "Vacias", "%", "Esporadico", "%", "Habitual", "%", "Total"],
    },

    'presion-sobre-la-vivienda': {
        titulo: "Presion sobre la vivienda",
        contexto: "CHILDREN",
        modo: "lista",
        total_padre: true,
        descargable: true,
        es_ranking: true,
        maxInicial: 10,
        columnas: [
          ["etiqueta"], 
          ['viviendas_habituales'],
          ['uds_vv_residenciales'],
          ['vacacional_por_viviendas_habituales'],
          ['viviendas_disponibles'],
          ['viviendas_disponibles_viviendas_habituales'],
        ],
        etiquetas: ["Isla", "Habituales", "Vacacionales", "% Vac", "Disponibles", "% Disp"],
    },

    'necesidad-de-vivienda': {
        titulo: "Necesidad de vivienda",
        contexto: "CHILDREN",
        modo: "lista",
        total_padre: true,
        descargable: true,
        es_ranking: true,
        maxInicial: 10,
        columnas: [
          ["etiqueta"], 
          ['poblacion'],
          ['personas_por_hogar'],
          ['viviendas_necesarias'],
          ['viviendas_disponibles'],
          ['deficit_viviendas'],
          ['deficit_oferta_viviendas'],
        ],
        etiquetas: ["Isla", "Población", "P.hogar", "Necesarias", "Disponibles", "Déficit", "%"],
    },

    'deficit-de-vivienda': {
        titulo: "Déficit de vivienda",
        contexto: "CHILDREN",
        modo: "lista",
        total_padre: true,
        descargable: true,
        es_ranking: true,
        maxInicial: 10,
        columnas: [
          ["etiqueta"],
          ['viviendas_disponibles'],
          ['deficit_viviendas'],
          ['deficit_oferta_viviendas'],
          
        ],
        etiquetas: ["Isla", "Disponibles", "Déficit", "Déficit de oferta"],
    },

    'hogares-nucleos': {
        titulo: "Núcleos familiares por hogar",
        contexto: "CHILDREN",
        modo: "lista",
        total_padre: true,
        descargable: true,
        es_ranking: true,
        maxInicial: 10,
        columnas: [
          ["etiqueta"],
          ['hogares_0'],
          ['hogares_1'],
          ['hogares_2'],
          ['hogares_3'],
          ['hogares_total'],
        ],
        etiquetas: ["Isla", "Sin núcleo", "1 Núcleo", "2 núcleos", "3 o más", "Total"],
    },

    'hogares-nucleos-deficit': {
        titulo: "Núcleos familiares por hogar",
        contexto: "CHILDREN",
        modo: "lista",
        total_padre: true,
        descargable: true,
        es_ranking: true,
        maxInicial: 10,
        columnas: [
          ["etiqueta"],
          ['deficit_teorico_viviendas'],
          ['deficit_teorico_viviendas_porc'],
        ],
        etiquetas: ["Isla", "Déficit teórico de viviendas", "Porcentaje"],
    },

    'indice-presion': {
        tipo: 'indice-presion',
        titulo: 'Índice de presión',
    },

};

