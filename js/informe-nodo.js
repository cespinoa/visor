// informe-nodo.js — Botón "Generar PDF" en la vista del nodo informe.
(function ($, Drupal) {
  'use strict';

  Drupal.behaviors.visorInformeNodo = {
    attach: function (context) {
      const btn = context.querySelector('#btn-generar-pdf');
      if (!btn || btn.dataset.attached) return;
      btn.dataset.attached = '1';

      btn.addEventListener('click', async function () {
        const nid = btn.dataset.nid;
        const label = document.getElementById('btn-generar-pdf-label');
        const feedback = document.getElementById('btn-generar-pdf-feedback');

        btn.disabled = true;
        label.textContent = 'Generando…';
        feedback.style.display = 'none';

        try {
          const token = await fetch('/session/token').then(r => r.text());

          const res = await fetch(`/api/visor/informe/${nid}/generar-pdf`, {
            method: 'POST',
            headers: { 'X-CSRF-Token': token },
          });

          const data = await res.json();

          if (res.ok) {
            label.textContent = 'PDF generado';
            feedback.style.color = '#2e7d32';
            feedback.textContent = 'El PDF se ha adjuntado al nodo. Recarga la página para verlo.';
            feedback.style.display = 'inline';
            btn.style.backgroundColor = '#2e7d32';
            setTimeout(() => window.location.reload(), 2000);
          } else {
            throw new Error(data.error || 'Error desconocido');
          }
        } catch (e) {
          label.textContent = 'Generar PDF';
          feedback.style.color = '#c62828';
          feedback.textContent = 'Error: ' + e.message;
          feedback.style.display = 'inline';
          btn.disabled = false;
        }
      });
    },
  };

})(window.jQuery, window.Drupal);
