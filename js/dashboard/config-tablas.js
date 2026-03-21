// js/dashboard/config-tablas.js

window.CONFIG_TABLAS = {
    
    'resumen-ambito': {
        titulo: "Principales indicadores",
        contexto: "PARENTS",
        modo: "ficha",
        unidades: true,
        filas: [
            ["Población censada", "poblacion"],
            ["Población turística vacacional", "pte_v"],
            ["Demandantes de vivienda", "consumidores_vivienda"],
            ["Tamaño medio de los hogares", ["personas_por_hogar", "decimal_1"]],
            ["Déficit de viviendas", "deficit_oferta_viviendas"],
            ["Ratio de déficit de viviendas", "r_deficit_oferta_viviendas"]
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
            ["Uso habitual", ["viviendas_habituales", "entero"], ["viviendas_habituales_viviendas_total"]],
            ["Total viviendas", ["viviendas_total", "entero"], ["100,00%", "literal"], "destacada" ]
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
    'intensidad-turistica': {
        titulo: "Ratio de Intensidad Turística",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Tipo", "Por 100 hab.", "Por km²"],
        filas: [
            ["Alojamiento reglado", ["rit_r"], ["rit_r_km2"]],
            ["Alojamiento vacacional", ["rit_v"], ["rit_v_km2"]],
            ["Intensidad total", ["rit"], ["rit_km2"], "destacada" ]
        ]
    },
    'presion-humana': {
        titulo: "Presión humana",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Concepto", "Personas/km²", "Porcentaje"],
        filas: [
            ["Turistas (PTE/km2))", ["rit_km2", "decimal_1"], ["rit_km2_presion_humana_km2"]],
            ["Residentes", ["residentes_km2", "decimal_1"], ["residentes_km2_presion_humana_km2"]],
            ["Total", ["presion_humana_km2", "decimal_1"], ["100,00%", "literal"], "destacada" ]
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
        cabecera: ["Concepto", "Ratio"],
        filas: [
            ["Sobre la vivienda habital", ["vacacional_por_viviendas_habituales"]],
            ["Sobre el total de viviendas", ["vacacional_por_viviendas_total"]],
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
    'plazas-turistizas-zona-residencial': {
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
    'demandantes-de-vivienda': {
        titulo: "Demandantes de vivienda",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Tipo", "Personas", "Porcentaje"],
        filas: [
            ["Oferta reglada", ["plazas_at_residenciales", "entero"], ["plazas_at_residenciales_oferta_en_residencial"]],
            ["Oferta vacacional", ["plazas_vv_residenciales", "entero"], ["plazas_vv_residenciales_oferta_en_residencial"]],
            ["Total", ["plazas_suelo_residencial", "entero"], ["100,00%", "literal"], "destacada" ]
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
    'tabla-evolucion-plazas': {
        titulo: 'Evolución de plazas',
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
    
};

