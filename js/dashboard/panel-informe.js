// panel-informe.js
(function ($, Drupal) {
  "use strict";

  window.visorProject = window.visorProject || {};

  window.visorProject.orquestadorInforme = {

    /**
     * Genera el HTML del informe Canarias y lo envía al endpoint de guardado.
     * Muestra un modal visible durante el proceso (necesario para que los
     * gráficos rendericen con dimensiones reales via IntersectionObserver).
     * Devuelve una Promise con { nid, titulo }.
     */
    generar: async function () {
      const snapshot = drupalSettings.visorProject.datosDashboard || [];
      const datos = snapshot.find(d => d.ambito === 'canarias');
      if (!datos) {
        console.error('[informe] No se encontró registro de Canarias');
        return null;
      }

      // 1. Modal de progreso: visible, scrollable, cubre toda la pantalla.
      //    Los gráficos necesitan estar en el viewport para que
      //    IntersectionObserver los dibuje con dimensiones correctas.
      const modal = document.createElement('div');
      modal.id = 'informe-modal';
      modal.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:9999',
        'background:#fff', 'overflow-y:auto', 'padding:24px',
      ].join(';');

      const barra = document.createElement('div');
      barra.id = 'informe-modal-barra';
      barra.style.cssText = [
        'position:sticky', 'top:0', 'z-index:1', 'background:#fff',
        'padding:12px 0 16px', 'border-bottom:2px solid #a70000',
        'margin-bottom:24px', 'display:flex', 'align-items:center', 'gap:12px',
      ].join(';');
      barra.innerHTML = `
        <span class="material-icons" style="color:#a70000;animation:spin 1s linear infinite">autorenew</span>
        <span id="informe-modal-estado" style="font-weight:bold;color:#333">Generando informe…</span>`;

      const contenido = document.createElement('div');
      contenido.id = 'informe-render-temp';

      modal.appendChild(barra);
      modal.appendChild(contenido);
      document.body.appendChild(modal);

      // Animación del icono giratorio
      if (!document.getElementById('informe-spin-style')) {
        const st = document.createElement('style');
        st.id = 'informe-spin-style';
        st.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(st);
      }

      // 2. Componer el esquema en el contenedor visible.
      const esquema = this._getEsquema('informe-render-temp');
      window.visorProject.rowCompositor.componer(esquema, datos);

      // 3. Hacer scroll programático de arriba a abajo para activar
      //    IntersectionObserver en todos los gráficos del modal.
      await this._scrollActivador(modal);

      // 4. Pausa adicional para que los últimos gráficos terminen de dibujar.
      await new Promise(r => setTimeout(r, 400));

      // 5. Convertir todos los <canvas> a <img> con sus datos embebidos.
      contenido.querySelectorAll('canvas').forEach(canvas => {
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.style.cssText = `width:${canvas.offsetWidth}px;height:${canvas.offsetHeight}px;display:block;`;
        canvas.parentNode.replaceChild(img, canvas);
      });

      // 6. Recoger los <link rel="stylesheet"> del documento.
      //    Usamos pathname raíz-relativa para que WeasyPrint los resuelva
      //    contra el base_url de producción, no el dominio de ddev.
      const cssLinks = Array.from(
        document.querySelectorAll('link[rel="stylesheet"]')
      ).map(l => {
        try {
          return `<link rel="stylesheet" href="${new URL(l.href).pathname}">`;
        } catch (e) {
          return `<link rel="stylesheet" href="${l.href}">`;
        }
      }).join('\n');

      // 7. Construir el documento HTML completo.
      const fecha = datos.fecha_calculo || new Date().toISOString().slice(0, 10);

      const portada = `
<div class="informe-portada">
  <div class="informe-portada__titulo">Visor VTPC</div>
  <div class="informe-portada__linea"></div>
  <div class="informe-portada__subtitulo">Vivienda Vacacional y Turismo en Canarias</div>
  <div class="informe-portada__fecha">Datos del snapshot: ${fecha}</div>
</div>`;

      const cabeceraRunning = `
<div class="informe-running-header">
  <span class="informe-running-header__titulo">Visor VTPC — Vivienda Vacacional y Turismo en Canarias</span>
  <span class="informe-running-header__fecha">${fecha}</span>
</div>`;

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe Canarias — ${fecha}</title>
${cssLinks}
<link rel="stylesheet" href="/modules/custom/visor/css/dashboard/informe-print.css">
</head>
<body class="informe-pdf">
${cabeceraRunning}
${portada}
${contenido.innerHTML}
</body>
</html>`;

      // 8. Enviar al endpoint.
      document.getElementById('informe-modal-estado').textContent = 'Guardando…';

      const token = await fetch('/session/token').then(r => r.text());
      const response = await fetch('/api/visor/informe/guardar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': token,
        },
        body: JSON.stringify({
          html: html,
          etiqueta: 'Canarias',
          ambito: 'canarias',
          tipo: 'Completo',
          fecha_snapshot: fecha,
        }),
      });

      const resultado = await response.json();

      // 9. Transformar el modal en pantalla de éxito.
      modal.innerHTML = `
        <div style="
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          min-height:100vh;gap:16px;text-align:center;padding:40px;
        ">
          <span class="material-icons" style="font-size:64px;color:#2e7d32">check_circle</span>
          <h2 style="color:#2e7d32;margin:0">Informe generado</h2>
          <p style="color:#555;margin:0">${resultado.titulo}</p>
          <div style="display:flex;gap:12px;margin-top:8px">
            <a href="/node/${resultado.nid}" target="_blank"
               style="padding:10px 20px;background:#a70000;color:#fff;border-radius:6px;text-decoration:none">
              Ver informe
            </a>
            <button onclick="document.getElementById('informe-modal').remove()"
               style="padding:10px 20px;background:#eee;color:#333;border:none;border-radius:6px;cursor:pointer">
              Cerrar
            </button>
          </div>
        </div>`;

      return resultado;
    },

    /**
     * Hace scroll programático por el contenedor para que
     * IntersectionObserver active todos los gráficos.
     */
    _scrollActivador: async function (contenedor) {
      const paso = Math.floor(window.innerHeight * 0.7);
      const total = contenedor.scrollHeight;
      for (let y = 0; y <= total + paso; y += paso) {
        contenedor.scrollTop = y;
        await new Promise(r => setTimeout(r, 350));
      }
    },

    /**
     * Mismo esquema que panel-dashboard.js con los destinos
     * apuntando al contenedor del modal.
     */
    _getEsquema: function (tempId) {
      const destino = '#' + tempId;
      return [
        {
          destino,
          clases: ['dashboard-main-header'],
          elementos: [
            { tipo: 'widget', id: 'noticias-slider', ancho: '12' },
            { tipo: 'widget', id: 'odometro-total-vv', ancho: '12' },
          ],
        },
        {
          tituloBloque: 'Evolución de la vivienda vacacional',
          notas: 'Datos del Registro General Turístico de Canarias.',
          destino,
          clases: ['dashboard-main-evolucion'],
          elementos: [
            { tipo: 'widget', id: 'card-crecimiento-canarias', ancho: '4' },
            { tipo: 'widget', id: 'card-isla-mayor-crecimiento', ancho: '4' },
            { tipo: 'widget', id: 'card-isla-mayor-crecimiento-porcentual', ancho: '4' },
            { tipo: 'grafico', id: 'evolucion-vivienda-vacacional', ancho: '6' },
            { tipo: 'tabla', id: 'tabla-evolucion-plazas', ancho: '6' },
          ],
        },
        {
          tituloBloque: 'Desplazamiento de la actividad turística a zonas residenciales',
          destino,
          clases: ['dashboard-main-dtr', 'dashboard-main'],
          elementos: [
            {
              tipo: 'pack', ancho: '6',
              tituloPack: 'Viviendas vacacionales por zona',
              clasePack: 'pack-atencion',
              elementos: [
                { tipo: 'widget',  id: 'card-vv-en-zonas-residenciales', ancho: '12' },
                { tipo: 'grafico', id: 'bar-vv-por-zona',                ancho: '12' },
                { tipo: 'tabla',   id: 'viviendas-vacacionales-por-zonas', ancho: '12' },
              ],
            },
            {
              tipo: 'pack', ancho: '6',
              tituloPack: 'Plazas alojativas por zona',
              clasePack: 'pack-atencion',
              elementos: [
                { tipo: 'widget',  id: 'card-plazas-alojativas-en-zonas-residenciales', ancho: '12' },
                { tipo: 'grafico', id: 'bar-plazas',                                   ancho: '12' },
                { tipo: 'tabla',   id: 'plazas-alojativas-por-zonas',                  ancho: '12' },
              ],
            },
          ],
        },
        {
          tituloBloque: 'Desplazamiento de la actividad turística hacia el alojamiento no reglado',
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado', 'dashboard-main'],
          elementos: [
            {
              tipo: 'pack', ancho: '6',
              tituloPack: 'Plazas por tipo de alojamiento',
              clasePack: 'pack-atencion',
              elementos: [
                { tipo: 'widget',  id: 'card-plazas-alojativas-no-regladas', ancho: '12' },
                { tipo: 'grafico', id: 'bar-reglado-no-reglado',             ancho: '12' },
                { tipo: 'tabla',   id: 'plazas-regladas-no-regladas',        ancho: '12' },
              ],
            },
            {
              tipo: 'pack', ancho: '6',
              tituloPack: 'Población turística equivalente por tipo de alojamiento',
              clasePack: 'pack-atencion',
              elementos: [
                { tipo: 'widget',  id: 'card-ptev-pter', ancho: '12' },
                { tipo: 'grafico', id: 'bar-ptev-pter',  ancho: '12' },
                { tipo: 'tabla',   id: 'ptev-pter',      ancho: '12' },
              ],
            },
          ],
        },
        {
          tituloBloque: 'Presión sobre los residentes y el territorio',
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado', 'dashboard-main'],
          elementos: [
            {
              tipo: 'pack', ancho: '6',
              tituloPack: 'Presión sobre los residentes',
              clasePack: 'pack-atencion',
              elementos: [
                { tipo: 'widget',  id: 'card-presion',    ancho: '12' },
                { tipo: 'grafico', id: 'bar-ritr_ritv',   ancho: '12' },
                { tipo: 'tabla',   id: 'ritv-ritr',       ancho: '12' },
              ],
            },
            {
              tipo: 'pack', ancho: '6',
              tituloPack: 'Presión sobre el territorio',
              clasePack: 'pack-atencion',
              elementos: [
                { tipo: 'widget',  id: 'card-presion-km2',    ancho: '12' },
                { tipo: 'grafico', id: 'bar-presion-humana',  ancho: '12' },
                { tipo: 'tabla',   id: 'presion-territorio',  ancho: '12' },
              ],
            },
          ],
        },
        {
          tituloBloque: 'Disponibilidad de viviendas',
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado', 'dashboard-main'],
          elementos: [
            {
              tipo: 'pack', ancho: '6',
              tituloPack: 'Uso de la vivienda',
              clasePack: 'pack-atencion',
              elementos: [
                { tipo: 'widget',  id: 'card-uso-vivienda', ancho: '12' },
                { tipo: 'grafico', id: 'bar-uso-vivienda',  ancho: '12' },
                { tipo: 'tabla',   id: 'uso-vivienda',      ancho: '12' },
              ],
            },
            {
              tipo: 'pack', ancho: '6',
              tituloPack: 'Presión de la vivienda vacacional en zona residencial sobre la habitual',
              clasePack: 'pack-atencion',
              elementos: [
                { tipo: 'widget',  id: 'card-presion-vivienda',          ancho: '12' },
                { tipo: 'grafico', id: 'bar-presion-vivienda-habitual',  ancho: '12' },
                { tipo: 'tabla',   id: 'presion-sobre-la-vivienda',      ancho: '12' },
              ],
            },
          ],
        },
        {
          tituloBloque: 'Déficit de vivienda',
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado', 'dashboard-main'],
          elementos: [
            { tipo: 'grafico', id: 'bar-cobertura-de-vivienda', ancho: '6' },
            { tipo: 'tabla',   id: 'necesidad-de-vivienda',     ancho: '6' },
          ],
        },
      ];
    },
  };

})(window.jQuery, window.Drupal);
