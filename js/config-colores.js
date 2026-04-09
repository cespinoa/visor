// js/dashboard/config-colores.js

window.visorProject = window.visorProject || {};

window.visorProject.paletas = {
    'alertas': ['#a70000', '#ee5252', '#f9b3b3'],
    'islas': {
        // GRUPO CENTRAL (Tonos Cálidos/Enérgicos)
        'Gran Canaria': '#2E7D32',    // Green 800
        'Tenerife': '#1565C0',        // Blue 800 (Los dos pilares en colores primarios fuertes)
        
        // GRUPO ORIENTAL (Tonos Tierra/Cálidos)
        'Lanzarote': '#EF6C00',       // Orange 800
        'Fuerteventura': '#FFB300',   // Amber 600 (Buen contraste con Lanzarote)
        'La Graciosa': '#FFD54F',     // Amber 300
        
        // GRUPO OCCIDENTAL (Tonos Fríos/Naturales)
        'La Palma': '#0097A7',        // Cyan 700
        'La Gomera': '#4DB6AC',       // Teal 300
        'El Hierro': '#81C784',       // Light Green 300
        
        // AGRUPACIONES (Tonos Neutros y Estructurales)
        // Usamos Blue Greys para dar sensación de "dato agregado"
        'Islas centrales': '#455A64',   // Blue Grey 700
        'Islas orientales': '#78909C',  // Blue Grey 400
        'Islas occidentales': '#B0BEC5' // Blue Grey 200
    },
    'paleta-donuts': ['#a70000', '#E0E0E0', '#888888'],
    'triada':        ['#a70000', '#720303', '#E0E0E0'],
    'progreso-calor':['#fee5e5', '#f9b3b3', '#ee5252', '#a70000'],
    'grises':        ['#E0E0E0', '#BDBDBD', '#9E9E9E'],
    'alertas':       ['#a70000', '#ee5252', '#f9b3b3'],

    // Colores de etiqueta para modo impresión PDF (índice paralelo a su paleta).
    // Si no existe variante '-etiquetas', el plugin calcula el contraste automáticamente.
    'paleta-donuts-etiquetas': ['#ffffff', '#333333', '#333333'],
    'triada-etiquetas':        ['#ffffff', '#ffffff', '#333333'],
    'progreso-calor-etiquetas':['#333333', '#333333', '#333333', '#ffffff'],
    'grises-etiquetas':        ['#333333', '#333333', '#333333'],
    'alertas-etiquetas':       ['#ffffff', '#333333', '#333333'],
};
