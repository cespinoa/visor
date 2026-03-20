// js/dashboard/utils-imagenes.js
window.visorProject = window.visorProject || {};

window.visorProject.utilsImagenes = {
    /**
     * Motor principal de resolución de imágenes
     * @param {string} tipo - El sufijo detectado (svg, path, drupal)
     * @param {any} valor - El ID o Path recibido
     */
    procesarImagen: function(item, props) {

        const tipo = item.tipo_imagen;
        
        switch (tipo) {
            case 'silueta':
                // valor aquí es el ID (ej: 38001 o 'isla_1')
                return this.renderizarSVG(item.id);
            case 'path':
                return this.renderizarPathDirecto(valor);
            case 'drupal':
                return this.renderizarMediaDrupal(valor);
            default:
                console.warn("Tipo de imagen no reconocido:", tipo);
                return '';
        }
    },

    renderizarSVG: function(id, item) {
        const repositorio = drupalSettings.visorProject.siluetas || {};
        let claveBusqueda = id;
        const pathData = repositorio[claveBusqueda];

        if (!pathData) {
            return `<div class="placeholder-svg"><span class="material-icons">map</span></div>`;
        }

        // El SVG con el ViewBox que acabamos de arreglar
        const $contenedor = jQuery( `
            <div class="contenedor-silueta-svg">
                <svg viewBox="0 -100 100 100" preserveAspectRatio="xMidYMid meet">
                    <path d="${pathData}" class="silueta-path" />
                </svg>
            </div>
        `);
        return $contenedor[0];
    },

    renderizarPathDirecto: function(url) {
        return `<img src="${url}" class="img-fluida-panel" alt="Imagen" />`;
    },

    renderizarMediaDrupal: function(fid) {
        // Aquí iría la lógica para obtener la URL del media de Drupal si fuera necesario
        // o renderizar un <img> que apunte a una ruta de thumbnail por FID
        return `<div class="media-drupal-placeholder">ID: ${fid}</div>`;
    }
};
