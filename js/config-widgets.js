window.CONFIG_WIDGETS = {
    'odometro-total-vv': {
        tipo: 'widget',
        servicio: 'odometro', // Nombre de la utilidad en window.visorProject.widgets
        parametros: {
            campo: 'uds_vv_total',
            prefijo: 'Total Plazas: ',
            color: '#f39c12'
        }
    },
    'noticias-slider': {
        tipo: 'widget',
        servicio: 'noticias',
        config: {
            velocidad: 6000,
            efecto: 'fade', // O 'slide'
            clasePersonalizada: 'noticias-territoriales'
        },
        items: [
            {
                id: 'n1',
                tipo: 'directa',
                filtro: { campo: 'etiqueta', valor: 'Canarias' },
                plantilla: "Actualmente en Canarias existe un total de [valor] plazas en viviendas vacacionales.",
                campo: 'plazas_vacacionales',
                formato: 'entero',
                ambito: 'canarias'
            },
            {
                id: 'n2',
                tipo: 'busqueda',
                operacion: 'max',
                campo_referencia: 'plazas_vacacionales',
                // El motor busca la isla con más VV y rellena [etiqueta] y [valor]
                plantilla: "La isla con mayor oferta de Vivienda Vacacional es [etiqueta], con [valor] plazas.",
                formato: 'entero',
                ambito: 'isla'
            },
            //~ {
                //~ id: 'n3',
                //~ tipo: 'aleatorio', 
                //~ plantilla: "¿Sabías que en [etiqueta] hay [valor] plazas hoteleras esperándote?",
                //~ campo: 'plazas_regladas',
                //~ formato: 'entero',
                //~ ambito: 'municipio'
            //~ },
            {
                id: 'n4',
                tipo: 'busqueda',
                operacion: 'max',
                campo_referencia: 'presion_humana_km2',
                plantilla: "La isla que registra mayor presión humana es [etiqueta], con [valor] personas/km².",
                formato: 'decimal',
                ambito: 'isla'
            },
            {
                id: 'n5',
                tipo: 'busqueda',
                operacion: 'max',
                campo_referencia: 'rit_km2',
                plantilla: "[etiqueta] es la isla con mas turistas por km² ([valor]).",
                formato: 'decimal',
                ambito: 'isla'
            }
        ]
    },
    
    
    'card-crecimiento-canarias': {
        tipo: 'widget',
        servicio: 'cardImpacto',
        contexto: 'SELF_HISTORIC',
        item: {
            contexto: 'SELF_HISTORIC',
            propsSelector: { ambito: 'canarias' },
            tipo_analisis: 'variacion_temporal',
            fecha_referencia: '2023-06-30',
            campo_referencia: 'uds_vv_total',
            icono: 'trending_up',
            plantilla: "Las viviendas vacacionales se disparan en Canarias",
            desarrollo: "Desde el [fecha_ref] han aumentado en [var_abs] unidades ([var_pct])",
            clasePersonalizada: 'impacto-total'
        }
    },

    'card-isla-mayor-crecimiento': {
        tipo: 'widget',
        servicio: 'cardImpacto',
        contexto: 'CHILDREN_HISTORIC',
        item: {
            contexto: 'CHILDREN_HISTORIC',
            propsSelector: { ambito: 'canarias' },
            tipo_analisis: 'mayor_variacion_temporal',
            fecha_referencia: '2023-06-30',
            campo_referencia: 'uds_vv_total',
            icono: 'trending_up',
            plantilla: "[etiqueta] es la isla que más viviendas ha incorporado",
            desarrollo: "Desde el [fecha_ref] han aumentado en [var_abs] unidades ([var_pct])",
            clasePersonalizada: 'impacto-total'
        }
    },

    'card-isla-mayor-crecimiento-porcentual': {
        tipo: 'widget',
        servicio: 'cardImpacto',
        contexto: 'CHILDREN_HISTORIC',
        item: {
            contexto: 'CHILDREN_HISTORIC',
            propsSelector: { ambito: 'canarias' },
            tipo_analisis: 'mayor_variacion_temporal_porcentual',
            fecha_referencia: '2023-06-30',
            campo_referencia: 'uds_vv_total',
            icono: 'trending_up',
            plantilla: "[etiqueta], la isla que más ha crecido porcentualmente",
            desarrollo: "Desde el [fecha_ref] se han dado de alta [var_abs] nuevas viviendas ([var_pct])",
            clasePersonalizada: 'impacto-total'
        }
    },

    'card-vv-en-zonas-residenciales': {
        tipo: 'widget',
        servicio: 'cardImpacto',
        item: {
            propsSelector: { ambito: 'canarias' },
            ambito: 'canarias',
            icono: 'trending_up',
            plantilla: "El [uds_vv_residenciales_porc] de las viviendas vacacionales están en zonas residenciales",
            desarrollo: "[uds_vv_residenciales] viviendas vacacionales se localizan fuera de las zonas turísticas",
            clasePersonalizada: 'impacto-total'
        }
    },

    'card-plazas-alojativas-en-zonas-residenciales': {
        tipo: 'widget',
        servicio: 'cardImpacto',
        item: {
            propsSelector: { ambito: 'canarias' },
            ambito: 'canarias',
            icono: 'trending_up',
            plantilla: "El [plazas_suelo_residencial_porc] de la actividad alojativa se realiza fuera de las zonas turísticas",
            desarrollo: "Supone un total de [plazas_suelo_residencial] plazas localizadas en zonas residenciales",
            clasePersonalizada: 'impacto-total'
        }
    },

    'card-plazas-alojativas-no-regladas': {
        tipo: 'widget',
        servicio: 'cardImpacto',
        item: {
            propsSelector: { ambito: 'canarias' },
            ambito: 'canarias',
            icono: 'trending_up',
            plantilla: "Existen [plazas_vacacionales] plazas alojativas no regladas",
            desarrollo: "Representan el [plazas_vacacionales_plazas_total_porc] del las [plazas_total] existentes en Canarias",
            clasePersonalizada: 'impacto-total'
        }
    },

    'card-ptev-pter': {
        tipo: 'widget',
        servicio: 'cardImpacto',
        item: {
            propsSelector: { ambito: 'canarias' },
            ambito: 'canarias',
            icono: 'trending_up',
            plantilla: "El [pte_v_porc] de los turistas se alojan en vacacional",
            desarrollo: "Cada día [pte_v] turistas pernoctan en alojamientos no reglados",
            clasePersonalizada: 'impacto-total'
        }
    },

    'card-rit': {
        tipo: 'widget',
        servicio: 'cardImpacto',
        item: {
            propsSelector: { ambito: 'canarias' },
            ambito: 'canarias',
            icono: 'trending_up',
            plantilla: "El turismo vacacional ocasiona el [rit_v_porc] de la presión",
            desarrollo: "Cada día [pte_v] turistas pernoctan en alojamientos no reglados",
            clasePersonalizada: 'impacto-total'
        }
    },

    'card-presion': {
        tipo: 'widget',
        servicio: 'cardImpacto',
        item: {
            propsSelector: { ambito: 'canarias' },
            ambito: 'canarias',
            icono: 'trending_up',
            plantilla: "En Canarias hay [rit] turistas por cada 100 habitantes",
            desarrollo: "De ellos, [rit_v] se alojan en viviendas vacacionales",
            clasePersonalizada: 'impacto-total'
        }
    },

    'card-presion-km2': {
        tipo: 'widget',
        servicio: 'cardImpacto',
        item: {
            propsSelector: { ambito: 'canarias' },
            ambito: 'canarias',
            icono: 'trending_up',
            plantilla: "De las [presion_humana_km2] personas/km² que soporta Canarias, [rit_km2] son turistas",
            desarrollo: "[rit_r_km2] utilizan alojamiento convencional y [rit_v_km2] vacacional",
            clasePersonalizada: 'impacto-total'
        }
    },

    'card-uso-vivienda': {
        tipo: 'widget',
        servicio: 'cardImpacto',
        item: {
            propsSelector: { ambito: 'canarias' },
            ambito: 'canarias',
            icono: 'trending_up',
            plantilla: "En Canarias hay [viviendas_total] viviendas, pero solo [viviendas_habituales] son residencia habitual",
            desarrollo: "[viviendas_vacias] no se utilizan y [viviendas_esporadicas] se usan de manera esporadica",
            clasePersonalizada: 'impacto-total'
        }
    },

    'card-presion-vivienda': {
        tipo: 'widget',
        servicio: 'cardImpacto',
        item: {
            propsSelector: { ambito: 'canarias' },
            ambito: 'canarias',
            icono: 'trending_up',
            plantilla: "El [vacacional_por_viviendas_habituales] de las viviendas habituales se dedica a alquiler vacacional",
            desarrollo: "La VVVV en zona residencial elimina [uds_vv_residenciales] vivendas del mercado",
            clasePersonalizada: 'impacto-total'
        }
    },

    'card-hogares-nucleos': {
        tipo: 'widget',
        servicio: 'cardImpacto',
        item: {
            propsSelector: { ambito: 'canarias' },
            ambito: 'canarias',
            icono: 'trending_up',
            plantilla: "[[ hogares_2 + hogares_3 ]] familias canarias están obligadas a compartir vivienda",
            desarrollo: "En [hogares_3] viviendas conviven tres o más familias",
            clasePersonalizada: 'impacto-total'
        }
    },

    'card-hogares-nucleos-deficit': {
        tipo: 'widget',
        servicio: 'cardImpacto',
        item: {
            propsSelector: { ambito: 'canarias' },
            ambito: 'canarias',
            icono: 'trending_up',
            plantilla: "Canarias tiene que poner a disposición de las familias un mínimo de [deficit_teorico_viviendas] viviendas ",
            desarrollo: "El déficit teórico de viviendas se sitúa en el [deficit_teorico_viviendas_porc]",
            clasePersonalizada: 'impacto-total'
        }
    },
    
    
}
