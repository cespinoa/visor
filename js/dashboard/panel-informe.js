// panel-informe.js
(function ($, Drupal) {
  "use strict";

  window.visorProject = window.visorProject || {};

  window.visorProject.orquestadorInforme = {

    /**
     * Genera el HTML del informe Canarias, lo renderiza en un contenedor
     * temporal, convierte los canvas a imágenes y lo envía al endpoint
     * de guardado. Devuelve una Promise con { nid, titulo }.
     */
    generar: async function () {
      const snapshot = drupalSettings.visorProject.datosDashboard || [];
      const datos = snapshot.find(d => d.ambito === 'canarias');
      if (!datos) {
        console.error('[informe] No se encontró registro de Canarias');
        return null;
      }

      // 1. Contenedor temporal: fuera de pantalla pero montado en el DOM
      //    (necesario para que Chart.js pueda medir el canvas).
      const tempDiv = document.createElement('div');
      tempDiv.id = 'informe-render-temp';
      tempDiv.style.cssText = [
        'position:fixed',
        'left:-9999px',
        'top:0',
        'width:1200px',
        'background:#fff',
        'z-index:-9999',
        'overflow:hidden',
      ].join(';');
      document.body.appendChild(tempDiv);

      // 2. Parchear activarObservador para dibujar sin esperar visibilidad.
      const utilsG = window.visorProject.utilsGraficos;
      const activarOriginal = utilsG.activarObservador.bind(utilsG);

      utilsG.activarObservador = function (elemento, config, datosGrafico) {
        const d = Array.isArray(datosGrafico)
          ? datosGrafico[datosGrafico.length - 1]
          : datosGrafico;
        switch (config.tipo) {
          case 'gauge':  this.dibujarGauge(config, d);  break;
          case 'donut':  this.dibujarDonut(config, d);  break;
          case 'line':
          case 'area':
          case 'bar':    this.dibujarSeries(config, datosGrafico); break;
          case 'radar':  this.dibujarRadar(config, d);  break;
        }
      };

      // 3. Componer el esquema en el contenedor temporal.
      const esquema = this._getEsquema(tempDiv.id);
      window.visorProject.rowCompositor.componer(esquema, datos);

      // 4. Restaurar activarObservador.
      utilsG.activarObservador = activarOriginal;

      // 5. Pausa mínima para que Chart.js termine de dibujar.
      await new Promise(r => setTimeout(r, 200));

      // 6. Convertir todos los <canvas> a <img> con sus datos embebidos.
      tempDiv.querySelectorAll('canvas').forEach(canvas => {
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.style.cssText = `width:${canvas.offsetWidth}px;height:${canvas.offsetHeight}px;`;
        canvas.parentNode.replaceChild(img, canvas);
      });

      // 7. Recoger los <link rel="stylesheet"> del documento actual.
      //    Usamos pathname (raíz-relativa) para que WeasyPrint los resuelva
      //    contra el base_url de producción, no contra el dominio de ddev.
      const cssLinks = Array.from(
        document.querySelectorAll('link[rel="stylesheet"]')
      ).map(l => {
        try {
          return `<link rel="stylesheet" href="${new URL(l.href).pathname}">`;
        } catch (e) {
          return `<link rel="stylesheet" href="${l.href}">`;
        }
      }).join('\n');

      // 8. Construir el documento HTML completo.
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
${tempDiv.innerHTML}
</body>
</html>`;

      // 9. Limpiar el contenedor temporal.
      document.body.removeChild(tempDiv);

      // 10. Obtener token CSRF y enviar al endpoint.
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

      return await response.json();
    },

    /**
     * Mismo esquema que panel-dashboard.js con los destinos
     * apuntando al contenedor temporal.
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
