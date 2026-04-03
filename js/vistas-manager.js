// vistas-manager.js
window.VistasManager = {

    STORAGE_KEY: 'visor_vistas',
    MAX_VISTAS: 10,

    // ─── Persistencia ────────────────────────────────────────────────────────

    _cargar: function() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
        } catch(e) {
            return [];
        }
    },

    _guardar: function(vistas) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(vistas));
    },

    // ─── API pública ──────────────────────────────────────────────────────────

    guardarActual: function() {
        const estado = window.visorProject?.estado;
        if (!estado?.etiqueta || !estado?.registroActivo) return;

        const recordId = estado.registroActivo.id || null;
        const vistas   = this._cargar();

        // Evitar duplicado: misma entidad + mismo indicador
        const yaExiste = vistas.find(function(v) {
            return v.recordId === recordId && v.indicador === estado.indicador;
        });
        if (yaExiste) {
            this._feedbackBoton('ya-guardada');
            return;
        }

        const nueva = {
            id:        Date.now(),
            etiqueta:  estado.etiqueta,
            ambito:    estado.ambito,
            indicador: estado.indicador,
            tab:       estado.tab || 0,
            recordId:  recordId
        };

        vistas.unshift(nueva);
        if (vistas.length > this.MAX_VISTAS) {
            vistas.pop();
        }

        this._guardar(vistas);
        this.renderizar();
        this._feedbackBoton('guardada');
    },

    restaurar: function(id) {
        const vistas = this._cargar();
        const vista  = vistas.find(function(v) { return v.id === id; });
        if (!vista) return;

        // Restaurar indicador antes de difundir
        if (window.visorProject?.estado) {
            window.visorProject.estado.indicador = vista.indicador;
        }

        // Buscar registro: primero por id, si falla por etiqueta
        let registro = null;
        if (vista.recordId) {
            registro = window.visorProject.buscarRegistro({ id: vista.recordId });
        }
        if (!registro) {
            registro = window.visorProject.buscarRegistro({ etiqueta: vista.etiqueta });
        }

        if (registro && window.visorProject.difundirDatos) {
            window.visorProject.difundirDatos(registro);
        }

        // Restaurar pestaña después de difundir (difundir puede cambiarla)
        setTimeout(function() {
            if (window.visorProject.tabs?.instance) {
                window.visorProject.tabs.instance.activateTab(vista.tab || 0);
            }
        }, 50);
    },

    eliminar: function(id) {
        const vistas = this._cargar().filter(function(v) { return v.id !== id; });
        this._guardar(vistas);
        this.renderizar();
    },

    // ─── Renderizado ──────────────────────────────────────────────────────────

    renderizar: function() {
        const vistas   = this._cargar();
        const $seccion = jQuery('#seccion-vistas-guardadas');
        const $lista   = jQuery('#lista-vistas-guardadas');

        if (!$lista.length) return;

        if (vistas.length === 0) {
            $seccion.hide();
            return;
        }

        $seccion.show();
        $lista.empty();

        const ambitoLabel = { canarias: 'Canarias', isla: 'Isla', municipio: 'Municipio' };

        vistas.forEach(function(vista) {
            const $item = jQuery('<div class="vista-guardada-item"></div>');

            const $btn = jQuery('<button class="vista-btn-restaurar" type="button"></button>');
            $btn.append(
                jQuery('<span class="vista-ambito-badge"></span>').text(ambitoLabel[vista.ambito] || vista.ambito)
            );
            $btn.append(
                jQuery('<span class="vista-etiqueta"></span>').text(vista.etiqueta)
            );
            $btn.append(
                jQuery('<span class="vista-indicador"></span>').text(vista.indicador.replace(/_/g, ' '))
            );
            $btn.on('click', function() { VistasManager.restaurar(vista.id); });

            const $del = jQuery('<button class="vista-btn-eliminar" type="button" title="Eliminar"></button>');
            $del.append(jQuery('<i class="material-icons">close</i>'));
            $del.on('click', function(e) {
                e.stopPropagation();
                VistasManager.eliminar(vista.id);
            });

            $item.append($btn).append($del);
            $lista.append($item);
        });
    },

    // ─── Feedback visual en el botón "Guardar" ────────────────────────────────

    _feedbackBoton: function(estado) {
        const btn   = document.querySelector('#wrapper-vistas .mdc-button');
        const label = btn?.querySelector('.mdc-button__label');
        const icono = btn?.querySelector('.material-icons');
        if (!btn || !label) return;

        const textos = {
            'guardada':    { label: 'Vista guardada',    icon: 'check',    clase: 'btn-vista--ok'  },
            'ya-guardada': { label: 'Ya está guardada',  icon: 'info',     clase: 'btn-vista--info' }
        };
        const cfg = textos[estado];
        if (!cfg) return;

        const labelOrig = label.textContent;
        const iconOrig  = icono ? icono.textContent : null;

        label.textContent = cfg.label;
        if (icono) icono.textContent = cfg.icon;
        btn.classList.add(cfg.clase);

        setTimeout(function() {
            label.textContent = labelOrig;
            if (icono) icono.textContent = iconOrig;
            btn.classList.remove(cfg.clase);
        }, 2000);
    }

};

(function($, Drupal, once) {
    "use strict";
    if (!Drupal || !Drupal.behaviors) return;
    Drupal.behaviors.vistasManager = {
        attach: function(context) {
            once('vistas-init', '#wrapper-vistas', context).forEach(function() {
                VistasManager.renderizar();
            });
        }
    };
})(window.jQuery, window.Drupal, window.once);
