// js/dashboard/config-tablas.js

window.CONFIG_TABLAS = {

    'historico-pob-viv': {
        tipo:       'historico-pob-viv',
        titulo:     'Crecimiento de la población y la vivienda',
        colapsible: true,
        fuente: 'ISTAC (Viviendas iniciadas y terminadas en Canarias) + ISTAC + INE (Padrón Municipal)',
        fecha: '2025',
    },

    'censos-islas-nohabituales': {
        tipo:       'censos-islas',
        titulo:     'Viviendas no habituales por isla — censos 2001, 2011 y 2021',
        colapsible: true,
        fuente: 'INE (Censos de Población y Viviendas 2001, 2011 y 2021)',
        fecha: '2021',
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
        fuente: 'INE (Encuesta Continua de Hogares)',
        fecha: '2026-T1',
    },

    'hogares-tipo-tabla': {
        tipo:          'ccaa-ext',
        titulo:        'Hogares por tipo de composición familiar — ECH (miles)',
        colapsible:    true,
        dataset:       '$ech_hogares_tipo_agrupada',
        campo:         'hogares_miles',
        yearField:     'anyo',
        etiquetaField: 'categoria',
        formato:       'decimal_1',
        fuente: 'INE (Encuesta de Condiciones de Vida 2013–2020 / ECEPOV 2021)',
        fecha: '2021',
    },

    'variacion-presion-humana': {
        tipo:   'variacion-presion-humana',
        titulo: 'Variación de la presión humana respecto a 2019',
        fuente: 'Padrón Municipal · ISTAC (E16028B) · Registro General Turístico',
    },

    'historico-presion-humana': {
        tipo:   'historico-presion-humana',
        titulo: 'Presión humana: población y PTE (2019–2025)',
        fuente: 'Padrón Municipal · ISTAC (E16028B) · Registro General Turístico',
    },

    'historico-llegadas-plazas-ocupacion': {
        tipo:       'historico-turismo',
        titulo:     'Evolución: llegadas, plazas regladas, ocupación y estancia media',
        colapsible: true,
        baseYear:   '2010',
        fuente: 'ISTAC (FRONTUR + Encuesta de Ocupación en Alojamientos Turísticos)',
        fecha: '2025',
    },

    'turismo-reglado-vs-vacacional': {
        tipo:        'historico-turismo-derivado',
        titulo:      'Turismo reglado y vacacional',
        colapsible:  true,
        baseYear:    '2010',
        baseYearVac: '2012',
        fuente: 'ISTAC (FRONTUR + Estadística de Vivienda Vacacional — derivado)',
        fecha: '2026-M02',
    },

    'viviendas-terminadas-canarias': {
        titulo:         "Viviendas terminadas",
        datos:          '$viviendas_terminadas',
        modo:           'ficha',
        cabecera:       ["Año", "Viviendas"],
        formato:        'entero',
        fila_total:     'total',
        etiqueta_total: 'Total período',
        fuente: 'ISTAC (Viviendas iniciadas y terminadas en Canarias)',
        fecha: '2025-M12',
    },

    'diferencia-ecepov-consumo': {
        tipo:   'diferencia-ecepov',
        titulo: 'Diferencias entre el censo de viviendas y la ECEPOV',
        fuente: 'INE (Censo de Población y Viviendas 2021)',
        fecha:  '2021',
    },

    'viviendas-habituales-mas-terminadas': {
        titulo:   "Vivienda disponible",
        contexto: "SELF",
        modo:     "ficha",
        cabecera: ["Indicador", "Viviendas"],
        filas: [
            ["Viviendas habituales existentes",  ["viviendas_habituales"]],
            ["Viviendas terminadas 2021-2024",   ["$viviendas_terminadas.total"]],
            ["Suma",  ["[[ viviendas_habituales + $viviendas_terminadas.total ]]", "entero"], "destacada"],
        ],
        fuente: 'INE (Censo 2021) + ISTAC (Viviendas iniciadas y terminadas en Canarias)',
        fecha: '2025-M12',
    },

    'resumen-ambito': {
        titulo:   "Principales indicadores",
        contexto: "PARENTS",
        modo:     "ficha",
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
            ["Vivienda disponible (sobre la vivienda habitual)", "viviendas_disponibles_viviendas_habituales"],
            ["Déficit de viviendas (sobre la vivienda habitual)", "deficit_oferta_viviendas"]
        ],
        fuente: 'Gobierno de Canarias (Registro de VV y AT) + ISTAC + INE',
        fecha: '2026-M02',
    },

    'parque-viviendas': {
        titulo:   "Parque de viviendas",
        contexto: "SELF",
        modo:     "ficha",
        cabecera: ["Uso", "Unidades", "Porcentaje"],
        filas: [
            ["Viviendas vacías", ["viviendas_vacias"], ["viviendas_vacias_viviendas_total"]],
            ["Uso esporádico", ["viviendas_esporadicas"], ["viviendas_esporadicas_viviendas_total"]],
            ["Uso habitual", ["viviendas_habituales"], ["viviendas_habituales_viviendas_total"]],
            ["Total viviendas", ["viviendas_total"], ["100,00%", "literal"], "destacada"]
        ],
        fuente: 'INE (Censo de Población y Viviendas 2021)',
        fecha: '2021',
    },

    'viviendas-disponibles': {
        titulo:   "Viviendas disponibles",
        contexto: "SELF",
        modo:     "ficha",
        cabecera: ["Uso", "Unidades", "Porcentaje"],
        filas: [
            ["Vacacional en zona residencial", ["uds_vv_residenciales"], ["vacacional_por_viviendas_habituales"]],
            ["Viviendas disponibles", ["viviendas_disponibles"], ["viviendas_disponibles_viviendas_habituales"]],
            ["Uso habitual", ["viviendas_habituales"], ["100,00%", "literal"], "destacada"],
        ],
        fuente: 'INE (Censo 2021) + Gobierno de Canarias (Registro de VV)',
        fecha: '2026-03-31',
    },

    'viviendas-necesarias': {
        titulo:   "Viviendas necesarias",
        contexto: "SELF",
        modo:     "ficha",
        cabecera: ["Concepto", "Valor"],
        filas: [
            ["Población", ["poblacion"]],
            ["Personas por hogar", ["personas_por_hogar"]],
            ["Viviendas necesarias", ["viviendas_necesarias"], "destacada"],
        ],
        fuente: 'ISTAC + INE (Padrón Municipal 2025) + ISTAC (Censos 2021)',
        fecha: '2025',
    },

    'evolucion-deficit-de-viviendas': {
        titulo:   "Evolución del déficit de viviendas",
        contexto: "SELF",
        modo:     "ficha",
        cabecera: ["Concepto", "Valor"],
        filas: [
            ["Viviendas disponibles", ["viviendas_disponibles"]],
            ["Viviendas necesarias", ["viviendas_necesarias"]],
            ["Evolución del déficit", ["[[ viviendas_necesarias - viviendas_disponibles ]]"], "destacada"]
        ],
        fuente: 'INE (Censo 2021) + Gobierno de Canarias (Registro de VV) + ISTAC + INE (Padrón 2025)',
        fecha: '2025',
    },

    'evolucion-deficit-de-viviendas-canarias': {
        titulo:   "Evolución del déficit de viviendas", // Añade las nuevas en Canarias
        contexto: "SELF",
        modo:     "ficha",
        cabecera: ["Concepto", "Valor"],
        filas: [
            ["Viviendas disponibles + terminadas", ["[[ viviendas_disponibles + $viviendas_terminadas.total | entero ]]"]],
            ["Viviendas necesarias",               ["viviendas_necesarias"]],
            ["Evolución del déficit",
                ["[[ - viviendas_disponibles - $viviendas_terminadas.total + viviendas_necesarias | entero ]]"],
                "destacada"
            ]
        ],
        fuente: 'INE (Censo 2021) + Gobierno de Canarias (Registro de VV) + ISTAC + INE (Padrón) + ISTAC (Viviendas terminadas)',
        fecha: '2025-M12',
    },

    'deficit-consolidado': {
        titulo: "Déficit de viviendas consolidado",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Concepto", "Viviendas"],
        filas: [
          ["Déficit ECEPOV 2021", ["[[(hogares_3 *2) + hogares_2]]"]],
          ["Déficit actualizado", ["[[viviendas_necesarias - viviendas_disponibles]]"]],
          ["Déficit consolidado", ["[[(hogares_3 *2) + hogares_2 + viviendas_necesarias - viviendas_disponibles]]"]]
        ],
        fuente: 'INE (Censo 2021) + Gobierno de Canarias (Registro de VV) + ISTAC + INE (Padrón) + ISTAC (Viviendas terminadas)',
        fecha: '2025-M12',
    },

    'deficit-consolidado-canarias': {
        titulo: "Déficit de viviendas consolidado",
        contexto: "SELF",
        modo: "ficha",
        cabecera: ["Concepto", "Viviendas"],
        filas: [
          ["Déficit ECEPOV 2021", ["[[(hogares_3 *2) + hogares_2]]"]],
          ["Déficit actualizado", ["[[viviendas_necesarias - viviendas_disponibles - $viviendas_terminadas.total]]"]],
          ["Déficit consolidado", ["[[(hogares_3 *2) + hogares_2 + viviendas_necesarias - viviendas_disponibles - $viviendas_terminadas.total]]"]]
        ],
        fuente: 'INE (Censo 2021) + Gobierno de Canarias (Registro de VV) + ISTAC + INE (Padrón) + ISTAC (Viviendas terminadas)',
        fecha: '2025-M12',
    },

    'carga-poblacional': {
        titulo:   "Carga poblacional",
        contexto: "SELF",
        modo:     "ficha",
        cabecera: ["Concepto", "Personas", "Porcentaje"],
        filas: [
            ["Pob. Turística Equiv. Reglada", ["pte_r", "entero"], ["pte_r_total_poblacion_porc"]],
            ["Pob. Turística Equiv. Vacacional", ["pte_v", "entero"], ["pte_v_total_poblacion_porc"]],
            ["Población censada", ["poblacion", "entero"], ["poblacion_total_poblacion_porc"]],
            ["Carga real", ["poblacion_total", "entero"], ["100,00%", "literal"], "destacada"]
        ],
        fuente: 'ISTAC (Población Turística Equivalente + Estadística de VV + Padrón Municipal)',
        fecha: '2026-M02',
    },

    'presion-humana': {
        titulo:   "Presión humana",
        contexto: "SELF",
        modo:     "ficha",
        cabecera: ["Concepto", 'Personas', "P/km²", "Porc"],
        filas: [
            ["Turistas",['pte_total'], ["rit_km2"], ["rit_km2_presion_humana_km2"]],
            ["Residentes", ['poblacion'], ["residentes_km2"], ["residentes_km2_presion_humana_km2"]],
            ["Total", ['poblacion_total'], ["presion_humana_km2"], ["100,00%", "literal"], "destacada"]
        ],
        fuente: 'ISTAC (Población Turística Equivalente + Estadística de VV + Padrón Municipal)',
        fecha: '2026-M02',
    },

    //~ 'presion-humana': {
        //~ titulo:   "Presión humana",
        //~ contexto: "SELF",
        //~ modo:     "ficha",
        //~ cabecera: ["Concepto", "Personas/km²", "Porcentaje"],
        //~ filas: [
            //~ ["Turistas (PTE/km2))", ["rit_km2"], ["rit_km2_presion_humana_km2"]],
            //~ ["Residentes", ["residentes_km2"], ["residentes_km2_presion_humana_km2"]],
            //~ ["Total", ["presion_humana_km2"], ["100,00%", "literal"], "destacada"]
        //~ ],
        //~ fuente: 'ISTAC (Población Turística Equivalente + Estadística de VV + Padrón Municipal)',
        //~ fecha: '2026-M02',
    //~ },

    'oferta-alojativa': {
        titulo:   "Oferta alojativa por tipo (Plazas)",
        contexto: "SELF",
        modo:     "ficha",
        cabecera: ["Tipo de oferta", "Plazas", "Porcentaje"],
        filas: [
            ["Oferta reglada", ["plazas_regladas", "entero"], ["plazas_regladas_plazas_total_porc"]],
            ["Oferta vacacional", ["plazas_vacacionales", "entero"], ["plazas_vacacionales_plazas_total_porc"]],
            ["Plazas totales", ["plazas_total", "entero"], ["100,00%", "literal"], "destacada"]
        ],
        fuente: 'Gobierno de Canarias (Registro de VV y AT)',
        fecha: '2026-03-31',
    },

    'oferta-alojativa-por-zona-ambito': {
        titulo:   "Oferta alojativa por zona",
        contexto: "SELF",
        modo:     "ficha",
        cabecera: ["Tipo de zona", "Plazas", "Porcentaje"],
        filas: [
            ["Zona turística", ["plazas_suelo_turistico", "entero"], ["plazas_suelo_turistico_porc"]],
            ["Zona residencial", ["plazas_suelo_residencial", "entero"], ["plazas_suelo_residencial_porc"]],
            ["Plazas totales", ["plazas_total", "entero"], ["100,00%", "literal"], "destacada"]
        ],
        fuente: 'Gobierno de Canarias (Registro de VV y AT)',
        fecha: '2026-03-31',
    },

    'intensidad-turistica': {
        titulo:   "Ratios de Intensidad Turística",
        contexto: "SELF",
        modo:     "ficha",
        cabecera: ["Tipo de alojamiento", "Por 100 hab.", "Por km²", 'Porc'],
        filas: [
            ["Reglado", ["rit_r"], ["rit_r_km2"], ['rit_r_porc']],
            ["Vacacional", ["rit_v"], ["rit_v_km2"], ['rit_v_porc']],
            ["Intensidad total", ["rit"], ["rit_km2"],["100,00%", "literal"], "destacada"]
        ],
        fuente: 'ISTAC (Población Turística Equivalente + Estadística de VV + Padrón Municipal)',
        fecha: '2026-M02',
    },

    'distribucion-vv': {
        titulo:   "Localizacion de la Vivienda Vacacional",
        contexto: "SELF",
        modo:     "ficha",
        cabecera: ["Tipo de zona", "Unidades", "Porcentaje"],
        filas: [
            ["Źona turística", ["uds_vv_turisticas", "entero"], ["uds_vv_turisticas_porc"]],
            ["Zona residencial", ["uds_vv_residenciales", "entero"], ["uds_vv_residenciales_porc"]],
            ["Total", ["uds_vv_total", "entero"], ["100,00%", "literal"], "destacada"]
        ],
        fuente: 'Gobierno de Canarias (Registro de VV)',
        fecha: '2026-03-31',
    },

    'presion-vv-sobre-vivienda': {
        titulo:   "Presión de la Vivienda Vacacional",
        contexto: "SELF",
        modo:     "ficha",
        cabecera: ["Concepto", "Porcentaje"],
        filas: [
            ["En zona residencial sobre la vivienda habital", ["vacacional_por_viviendas_habituales"]],
            ["En todas las zonas sobre el total de viviendas", ["vacacional_por_viviendas_total"]],
            ["Viviendas vacacionals por cada 100 habitantes", ["uds_vv_habitantes"]],
            ["Viviendas vacacionals en zonas residenciales por cada 100 habitantes", ["uds_vv_residenciales_habitantes"]],
        ],
        fuente: 'Gobierno de Canarias (Registro de VV) + INE (Censo de Población y Viviendas 2021)',
        fecha: '2026-03-31',
    },

    'distribucion-plazas-regladas': {
        titulo:   "Plazas regladas por zona",
        contexto: "SELF",
        modo:     "ficha",
        cabecera: ["Tipo de zona", "Plazas", "Porcentaje"],
        filas: [
            ["Źona turística", ["plazas_at_turisticas", "entero"], ["plazas_at_turisticas_porc"]],
            ["Zona residencial", ["plazas_at_residenciales", "entero"], ["plazas_at_residenciales_porc"]],
            ["Total", ["plazas_regladas", "entero"], ["100,00%", "literal"], "destacada"]
        ],
        fuente: 'Gobierno de Canarias (Registro de AT)',
        fecha: '2026-03-31',
    },

    'distribucion-plazas-vacacionales': {
        titulo:   "Plazas vacacionales por zona",
        contexto: "SELF",
        modo:     "ficha",
        cabecera: ["Tipo de zona", "Plazas", "Porcentaje"],
        filas: [
            ["Źona turística", ["plazas_vv_turisticas", "entero"], ["plazas_vv_turisticas_porc"]],
            ["Zona residencial", ["plazas_vv_residenciales", "entero"], ["plazas_vv_residenciales_porc"]],
            ["Total", ["plazas_vacacionales", "entero"], ["100,00%", "literal"], "destacada"]
        ],
        fuente: 'Gobierno de Canarias (Registro de VV)',
        fecha: '2026-03-31',
    },

    'plazas-turisticas-zona-residencial': {
        titulo:   "Plazas en zona residencial por tipo",
        contexto: "SELF",
        modo:     "ficha",
        cabecera: ["Tipo de oferta", "Plazas", "Porcentaje"],
        filas: [
            ["Oferta reglada", ["plazas_at_residenciales", "entero"], ["plazas_at_residenciales_oferta_en_residencial"]],
            ["Oferta vacacional", ["plazas_vv_residenciales", "entero"], ["plazas_vv_residenciales_oferta_en_residencial"]],
            ["Total", ["plazas_suelo_residencial", "entero"], ["100,00%", "literal"], "destacada"]
        ],
        fuente: 'Gobierno de Canarias (Registro de VV y AT)',
        fecha: '2026-03-31',
    },

    'plazas-turisticas-zona-turistica': {
        titulo:   "Plazas en zona turistica por tipo",
        contexto: "SELF",
        modo:     "ficha",
        cabecera: ["Tipo de oferta", "Plazas", "Porcentaje"],
        filas: [
            ["Oferta reglada", ["plazas_at_turisticas", "entero"], ["plazas_at_turisticas_oferta_en_turistico"]],
            ["Oferta vacacional", ["plazas_vv_turisticas", "entero"], ["plazas_vv_turisticas_oferta_en_turistico"]],
            ["Total", ["plazas_suelo_turistico", "entero"], ["100,00%", "literal"], "destacada"]
        ],
        fuente: 'Gobierno de Canarias (Registro de VV y AT)',
        fecha: '2026-03-31',
    },

    'poblacion-turistica-equivalente': {
        titulo:   "Población turística equivalente",
        contexto: "SELF",
        modo:     "ficha",
        cabecera: ["Tipo de alojamiento", "Personas", "Porcentaje"],
        filas: [
            ["Reglado", ["pte_r", "entero"], ["pte_r_porc"]],
            ["Vacacional", ["pte_v", "entero"], ["pte_v_porc"]],
            ["Total", ["pte_total", "entero"], ["100,00%", "literal"], "destacada"]
        ],
        fuente: 'ISTAC (Población Turística Equivalente + Estadística de VV)',
        fecha: '2026-M02',
    },

    'ficha-hogares-por-nucleos': {
        titulo:   "Hogares por núcleos",
        contexto: "SELF",
        modo:     "ficha",
        cabecera: ["Tipo de hogar", "Unidades", "Porcentaje"],
        filas: [
            ["Sin núcleo", ["hogares_0"], ["hogares_0_porc"]],
            ["Un núcleo", ["hogares_1"], ["hogares_1_porc"]],
            ["Dos núcleos", ["hogares_2"], ["hogares_2_porc"]],
            ["Tres o más núcleos", ["hogares_3"], ["hogares_3_porc"]],
            ["Total", ["hogares_total", "entero"], ["100,00%", "literal"], "destacada"]
        ],
        fuente: 'INE (Censo de Población y Viviendas 2021)',
        fecha: '2021',
    },

    'ficha-hogares-por-nucleos-deficit': {
        titulo:   "Déficit generado por tipo de hogar",
        contexto: "SELF",
        modo:     "ficha",
        cabecera: ["Tipo de hogar", "Déficit", "Porcentaje"],
        filas: [
            ["Sin núcleo x 0", ["0", "literal"], ["0,00%", "literal"]],
            ["Un núcleo x 0", ["0", "literal"], ["0,00%", "literal"]],
            ["Dos núcleos x 1", ["hogares_2"], ["[[hogares_2/((hogares_3 * 2) + hogares_2)*100]]", "porcentaje_2"]],
            ["Tres o más núcleos x 2", ["[[hogares_3*2]]"], ["[[hogares_3*2/((hogares_3 * 2) + hogares_2)*100]]", "porcentaje_2"]],
            ["Total", ["[[(hogares_3 * 2) + hogares_2]]"], ["100,00%", "literal"], "destacada"]
        ],
        fuente: 'INE (Censo de Población y Viviendas 2021)',
        fecha: '2021',
    },

    'lista-de-hijos': {
        titulo:             "Distribución territorial",
        contexto:           "CHILDREN",
        modo:               "lista",
        total_padre:        true,
        ordenable:          true,
        columna_ordenacion: 1,
        descargable:        true,
        es_ranking:         true,
        maxInicial:         10,
        columnas: [
            ["etiqueta", "literal"],
            ["uds_vv_total"],
            ["plazas_vacacionales"]
        ],
        etiquetas: ["Isla", "V.V.", "Plazas"],
        fuente: 'Gobierno de Canarias (Registro de VV)',
        fecha: '2026-03-31',
    },

    'lista-de-localidades': {
        titulo:             "Distribución por localidades",
        contexto:           "CHILDREN",
        modo:               "lista",
        total_padre:        true,
        ordenable:          true,
        columna_ordenacion: 1,
        descargable:        true,
        es_ranking:         true,
        maxInicial:         10,
        columnas: [
            ["etiqueta", "literal"],
            ["uds_vv_total", "entero"],
            ["plazas_vacacionales", "entero"]
        ],
        etiquetas: ["Localidad", "V.V.", "Plazas"],
        fuente: 'Gobierno de Canarias (Registro de VV)',
        fecha: '2026-03-31',
    },

    // ==============================================
    // PANEL - DASHBOARD
    // ==============================================
    'tabla-evolucion-unidades': {
        titulo:      'Evolución de unidades de vivienda vacacional',
        contexto:    'CHILDREN_HISTORIC',
        total_padre: true,
        descargable: true,
        periodo:     'YEARLY_MAX',
        modo:        'lista',
        comparativa: 'completa',
        columnas: [
            ["etiqueta", "literal"],
            ["uds_vv_total", "entero"]
        ],
        fuente: 'Gobierno de Canarias (Registro de VV)',
        fecha: '2026-03-31',
    },

    'tabla-evolucion-plazas-junio-2023': {
        titulo:      'Evolución de plazas',
        contexto:    'CHILDREN_HISTORIC',
        periodo:     '2023-06-30',
        total_padre: true,
        descargable: true,
        modo:        'lista',
        comparativa: 'completa',
        columnas: [
            ["etiqueta", "literal"],
            ["uds_vv_total", "entero"]
        ],
        fuente: 'Gobierno de Canarias (Registro de VV)',
        fecha: '2023-06-30',
    },

    'viviendas-vacacionales-por-zonas': {
        titulo:      "Viviendas vacacionales por zona (Datos)",
        contexto:    "CHILDREN",
        modo:        "lista",
        total_padre: true,
        descargable: true,
        es_ranking:  true,
        maxInicial:  10,
        columnas: [
            ["etiqueta"],
            ['uds_vv_residenciales'],
            ["uds_vv_turisticas"],
            ["uds_vv_total"],
            ['uds_vv_residenciales_porc'],
            ["uds_vv_turisticas_porc"]
        ],
        etiquetas: ["Isla", "Residenciales", "Turísticas", "Total", "% Res", "% Tur"],
        fuente: 'Gobierno de Canarias (Registro de VV)',
        fecha: '2026-03-31',
    },

    'plazas-alojativas-por-zonas': {
        titulo:      "Plazas alojativas por zona (Datos)",
        contexto:    "CHILDREN",
        modo:        "lista",
        total_padre: true,
        descargable: true,
        es_ranking:  true,
        maxInicial:  10,
        columnas: [
            ["etiqueta"],
            ['plazas_suelo_residencial'],
            ['plazas_suelo_turistico'],
            ['plazas_total'],
            ['plazas_suelo_residencial_porc'],
            ['plazas_suelo_turistico_porc'],
        ],
        etiquetas: ["Isla", "Residencial", "Turística", "Total", "% Res", "% Tur"],
        fuente: 'Gobierno de Canarias (Registro de VV y AT)',
        fecha: '2026-03-31',
    },

    'plazas-regladas-no-regladas': {
        titulo:      "Plazas por tipo de alojamiento",
        contexto:    "CHILDREN",
        modo:        "lista",
        total_padre: true,
        descargable: true,
        es_ranking:  true,
        maxInicial:  10,
        columnas: [
            ["etiqueta"],
            ['plazas_vacacionales'],
            ['plazas_regladas'],
            ['plazas_total'],
            ['plazas_vacacionales_plazas_total_porc'],
            ['plazas_regladas_plazas_total_porc'],
        ],
        etiquetas: ["Isla", "Vacacionales", "Regladas", "Total", "% Vac", "% Reg"],
        fuente: 'Gobierno de Canarias (Registro de VV y AT)',
        fecha: '2026-03-31',
    },

    'ptev-pter': {
        titulo:      "Población turística equivalente por tipo de alojamiento",
        contexto:    "CHILDREN",
        modo:        "lista",
        total_padre: true,
        descargable: true,
        es_ranking:  true,
        maxInicial:  10,
        columnas: [
            ["etiqueta"],
            ['pte_v'],
            ['pte_r'],
            ['pte_total'],
            ['pte_v_porc'],
            ['pte_r_porc'],
        ],
        etiquetas: ["Isla", "Vacacional", "Reglada", "Total", "% Vac", "% Reg"],
        fuente: 'ISTAC (Población Turística Equivalente + Estadística de VV)',
        fecha: '2026-M02',
    },

    'ritv-ritr': {
        titulo:      "Presión sobre los residentes",
        contexto:    "CHILDREN",
        modo:        "lista",
        total_padre: true,
        descargable: true,
        es_ranking:  true,
        maxInicial:  10,
        columnas: [
            ["etiqueta"],
            ['rit_v'],
            ['rit_r'],
            ['rit'],
            ['rit_v_porc'],
            ['rit_r_porc'],
        ],
        etiquetas: ["Isla", "Vacacional", "Reglada", "Total", "%Vac", "%Reg"],
        fuente: 'ISTAC (Población Turística Equivalente + Estadística de VV + Padrón Municipal)',
        fecha: '2026-M02',
    },

    'presion-territorio': {
        titulo:    "Presión sobre el territorio",
        subtitulo: "En personas por km",
        contexto:  "CHILDREN",
        modo:      "lista",
        total_padre: true,
        descargable: true,
        es_ranking:  true,
        maxInicial:  10,
        columnas: [
            ["etiqueta"],
            ['rit_v_km2'],
            ['rit_r_km2'],
            ['rit_km2'],
            ['residentes_km2'],
            ['presion_humana_km2'],
        ],
        etiquetas: ["Isla", "Vacacional", "Reglada", "Tot turistas", "Residentes", "Total"],
        fuente: 'ISTAC (Población Turística Equivalente + Estadística de VV + Padrón Municipal)',
        fecha: '2026-M02',
    },

    'uso-vivienda': {
        titulo:      "Uso de la vivienda",
        contexto:    "CHILDREN",
        modo:        "lista",
        total_padre: true,
        descargable: true,
        es_ranking:  true,
        maxInicial:  10,
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
        fuente: 'INE (Censo de Población y Viviendas 2021)',
        fecha: '2021',
    },

    'presion-sobre-la-vivienda': {
        titulo:      "Presion sobre la vivienda",
        contexto:    "CHILDREN",
        modo:        "lista",
        total_padre: true,
        descargable: true,
        es_ranking:  true,
        maxInicial:  10,
        columnas: [
            ["etiqueta"],
            ['viviendas_habituales'],
            ['uds_vv_residenciales'],
            ['vacacional_por_viviendas_habituales'],
            ['viviendas_disponibles'],
            ['viviendas_disponibles_viviendas_habituales'],
        ],
        etiquetas: ["Isla", "Habituales", "Vacacionales", "% Vac", "Disponibles", "% Disp"],
        fuente: 'INE (Censo 2021) + Gobierno de Canarias (Registro de VV)',
        fecha: '2026-03-31',
    },

    'necesidad-de-vivienda': {
        titulo:      "Necesidad de vivienda",
        contexto:    "CHILDREN",
        modo:        "lista",
        total_padre: true,
        descargable: true,
        es_ranking:  true,
        maxInicial:  10,
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
        fuente: 'ISTAC + INE (Padrón Municipal 2025) + INE (Censo 2021) + Gobierno de Canarias (Registro de VV)',
        fecha: '2025',
    },

    'deficit-de-vivienda': {
        titulo:      "Déficit de vivienda",
        contexto:    "CHILDREN",
        modo:        "lista",
        total_padre: true,
        descargable: true,
        es_ranking:  true,
        maxInicial:  10,
        columnas: [
            ["etiqueta"],
            ['viviendas_disponibles'],
            ['deficit_viviendas'],
            ['deficit_oferta_viviendas'],
        ],
        etiquetas: ["Isla", "Disponibles", "Déficit", "Déficit de oferta"],
        fuente: 'INE (Censo 2021) + Gobierno de Canarias (Registro de VV) + ISTAC + INE (Padrón)',
        fecha: '2025',
    },

    'hogares-nucleos': {
        titulo:      "Núcleos familiares por hogar",
        contexto:    "CHILDREN",
        modo:        "lista",
        total_padre: true,
        descargable: true,
        es_ranking:  true,
        maxInicial:  10,
        columnas: [
            ["etiqueta"],
            ['hogares_0'],
            ['hogares_1'],
            ['hogares_2'],
            ['hogares_3'],
            ['hogares_total'],
        ],
        etiquetas: ["Isla", "Sin núcleo", "1 Núcleo", "2 núcleos", "3 o más", "Total"],
        fuente: 'INE (Censo de Población y Viviendas 2021)',
        fecha: '2021',
    },

    'hogares-nucleos-deficit': {
        titulo:      "Núcleos familiares por hogar",
        contexto:    "CHILDREN",
        modo:        "lista",
        total_padre: true,
        descargable: true,
        es_ranking:  true,
        maxInicial:  10,
        columnas: [
            ["etiqueta"],
            ['deficit_teorico_viviendas'],
            ['deficit_teorico_viviendas_porc'],
        ],
        etiquetas: ["Isla", "Déficit teórico de viviendas", "Porcentaje"],
        fuente: 'INE (Censo de Población y Viviendas 2021)',
        fecha: '2021',
    },

    'indice-presion': {
        tipo:   'indice-presion',
        titulo: 'Índice de presión',
    },

};
