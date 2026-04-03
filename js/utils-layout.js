// js/dashboard/utils-layout.js
(function ($, Drupal) {
  "use strict";

  window.visorProject = window.visorProject || {};

  window.visorProject.utilsLayout = {
    
    /**
     * Crea un envoltorio basado en configuración con soporte para narrativa.
     * @param {Object} opciones { id, titulo, intro, notas, ancho, clases }
     * @returns {Object} { elemento, body }
     */
    crearContenedor: function(opciones) {
        const tpl = document.getElementById('tpl-layout-contenedor');
        if (!tpl) return null;

        const fragment = tpl.content.cloneNode(true);
        const wrapper = fragment.querySelector('.dashboard-componente');
        const body = fragment.querySelector('.componente-body');
        
        // 1. Identidad
        if (opciones.id) wrapper.id = `cnt-${opciones.id}`;
        
        // 2. Título
        const tituloEl = fragment.querySelector('.componente-titulo');
        if (opciones.titulo && tituloEl) {
            tituloEl.textContent = opciones.titulo;
        } else if (tituloEl) {
            tituloEl.remove();
        }

        // 3. Texto de Introducción (Debajo del título)
        const introEl = fragment.querySelector('.componente-intro');
        if (opciones.intro && introEl) {
            introEl.textContent = opciones.intro;
        } else if (introEl) {
            introEl.remove();
        }

        // 4. Texto de Notas/Advertencias (Al final del componente)
        const notasEl = fragment.querySelector('.componente-notas');
        if (opciones.notas && notasEl) {
            notasEl.textContent = opciones.notas;
        } else if (notasEl) {
            notasEl.remove();
        }

        // 5. Clases de Layout (is-6, col-12, etc.)
        if (opciones.ancho) wrapper.classList.add(`col-${opciones.ancho}`);
        
        // 6. Clases de Estilo personalizadas (Array)
        if (opciones.clases && Array.isArray(opciones.clases)) {
            opciones.clases.forEach(cls => wrapper.classList.add(cls));
        }

        return {
            elemento: wrapper,
            body: body
        };
    },

    /**
     * Crea una fila para agrupar componentes (Layout Grid)
     * @param {Array} clasesExtra Clases adicionales para la fila
     * @returns {HTMLElement} La fila creada
     */
    crearFila: function(clasesExtra = []) {
        const tpl = document.getElementById('tpl-layout-fila');
        if (!tpl) {
            const div = document.createElement('div');
            div.className = 'dashboard-fila';
            return div;
        }
        
        const fragment = tpl.content.cloneNode(true);
        const fila = fragment.querySelector('.dashboard-fila');
        
        if (clasesExtra.length) {
            clasesExtra.forEach(cls => fila.classList.add(cls));
        }
        return fila;
    }
  };

})(window.jQuery, window.Drupal);
