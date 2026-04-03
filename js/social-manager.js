// social-manager.js
window.SocialManager = {

    _getURL: function() {
        return window.location.href;
    },

    _getTexto: function() {
        const estado = window.visorProject?.estado;
        const nombre = estado?.etiqueta || 'Canarias';
        return `Indicadores de vivienda vacacional y turismo en ${nombre} — Visor VTPC`;
    },

    share: function(red) {
        const url   = encodeURIComponent(this._getURL());
        const texto = encodeURIComponent(this._getTexto());

        const destinos = {
            whatsapp: `https://wa.me/?text=${texto}%20${url}`,
            telegram: `https://t.me/share/url?url=${url}&text=${texto}`,
            bluesky:  `https://bsky.app/intent/compose?text=${texto}%20${url}`,
            twitter:  `https://twitter.com/intent/tweet?url=${url}&text=${texto}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        };

        if (red === 'copy') {
            this._copiarURL();
            return;
        }

        if (destinos[red]) {
            window.open(destinos[red], '_blank', 'noopener,noreferrer');
        }
    },

    _copiarURL: function() {
        const url = this._getURL();
        const btn = document.querySelector('#seccion-compartir [title="Copiar Link"]');

        const _feedback = function(exito) {
            if (!btn) return;
            const icono = btn.querySelector('.material-icons');
            icono.textContent = exito ? 'check' : 'error';
            btn.classList.add('btn-share--copiado');
            setTimeout(function() {
                icono.textContent = 'content_copy';
                btn.classList.remove('btn-share--copiado');
            }, 2000);
        };

        if (navigator.clipboard) {
            navigator.clipboard.writeText(url)
                .then(function()  { _feedback(true);  })
                .catch(function() { _feedback(false); });
        } else {
            // Fallback para contextos sin Clipboard API (HTTP, Safari antiguo)
            const input = document.createElement('input');
            input.value = url;
            input.style.position = 'absolute';
            input.style.left = '-9999px';
            document.body.appendChild(input);
            input.select();
            try {
                document.execCommand('copy');
                _feedback(true);
            } catch (e) {
                _feedback(false);
            }
            document.body.removeChild(input);
        }
    }

};
