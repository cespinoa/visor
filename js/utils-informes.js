// utils-informes.js
// Maquinaria reutilizable para la generación de informes PDF.
// Los orquestadores (panel-informe-*.js) solo definen la configuración
// editorial (_getConfig) y el esquema de contenidos (_getEsquema), y
// delegan el proceso completo a utilsInformes.generar().
//
// Las estructuras HTML viven en informe-templates.html.twig.
(function ($, Drupal) {
  "use strict";

  window.visorProject = window.visorProject || {};

  // ID del contenedor temporal donde se renderiza el informe antes de
  // serializar. Los orquestadores deben usar este mismo valor en los
  // campos `destino` de su esquema.
  const RENDER_ID = 'informe-render-temp';

  // Prefijos de URL de las hojas de estilo que se incluyen en el documento
  // enviado a WeasyPrint. El resto (Gin, toolbar, etc.) se descarta.
  const CSS_PERMITIDOS = [
    '/modules/custom/visor/css/',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
  ];

  window.visorProject.utilsInformes = {

    /** ID público del contenedor temporal, para que los orquestadores
     *  puedan construir el campo `destino` de su esquema. */
    RENDER_ID,

    // ─────────────────────────────────────────────────────────────────────
    // API PÚBLICA
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Orquesta la generación completa de un informe PDF.
     *
     * @param {Object} config   Resultado de _getConfig() del orquestador.
     * @param {Array}  esquema  Resultado de _getEsquema() del orquestador.
     * @param {Object} datos    Registro del snapshot activo.
     * @returns {Promise<{nid, titulo}>}
     */
    /**
     * @param {Array} seccionesAdicionales  Opcional. Array de { datos, getEsquema(destino) }.
     *   Cada sección se renderiza en su propio sub-div dentro del contenedor principal,
     *   lo que permite añadir páginas con datos distintos (p.ej. una por isla).
     */
    generar: async function (config, esquema, datos, seccionesAdicionales = []) {
      // 1. Modal de progreso visible en pantalla completa.
      const { modal, contenido } = this._crearModal();

      // 2. Parchear activarObservador para encolar los dibujos en lugar de
      //    depender de IntersectionObserver. Garantiza que todos los gráficos
      //    se dibujen aunque no sean visibles durante la composición.
      const pendientes = [];
      const activarOriginal = window.visorProject.utilsGraficos.activarObservador;
      window.visorProject.utilsGraficos.activarObservador = function (elemento, config, datos) {
        pendientes.push({ config, datos });
      };

      // 3. Pre-cargar longtexts y componer el esquema principal.
      await this._prefetchLongtexts(esquema, datos);
      window.visorProject.rowCompositor.componer(esquema, datos);

      // 3b. Secciones adicionales en sub-divs propios.
      for (const [i, seccion] of seccionesAdicionales.entries()) {
        const secId  = `informe-sec-${i}`;
        const secDiv = document.createElement('div');
        secDiv.id = secId;
        contenido.appendChild(secDiv);

        const secEsquema = seccion.getEsquema('#' + secId);
        await this._prefetchLongtexts(secEsquema, seccion.datos);
        window.visorProject.rowCompositor.componer(secEsquema, seccion.datos);
      }

      // 4. Restaurar activarObservador y dibujar todos los gráficos encolados.
      //    En este punto todo el DOM está montado, los canvas están disponibles.
      window.visorProject.utilsGraficos.activarObservador = activarOriginal;
      const utils = window.visorProject.utilsGraficos;
      pendientes.forEach(({ config, datos }) => {
        const datosRaiz = Array.isArray(datos) ? datos[datos.length - 1] : datos;
        switch (config.tipo) {
          case 'gauge':  utils.dibujarGauge(config, datosRaiz);  break;
          case 'donut':  utils.dibujarDonut(config, datosRaiz);  break;
          case 'radar':      utils.dibujarRadar(config, datosRaiz);       break;
          case 'linea-ext':  utils.dibujarLineaExt(config, datosRaiz);   break;
          case 'line':
          case 'area':
          case 'bar':    utils.dibujarSeries(config, datos);     break;
        }
      });

      // 5. Pausa para que Chart.js termine de renderizar todos los canvas.
      await new Promise(r => setTimeout(r, 500));

      // 5b. Dibujar etiquetas de valor sobre las barras en todos los gráficos
      //     del contenedor. Se hace aquí, de forma explícita, para garantizar
      //     que el canvas ya está completamente pintado antes de capturarlo.
      if (window.Chart) {
        const utilsG = window.visorProject.utilsGraficos;
        contenido.querySelectorAll('canvas').forEach(canvas => {
          const chart = Chart.getChart(canvas);
          if (chart) utilsG._dibujarEtiquetasChart(chart);
        });
      }

      // 6. Convertir <canvas> a <img> con datos embebidos (base64 PNG).
      this._canvasAImg(contenido);

      // 7. Construir índice (asigna IDs al DOM en vivo antes de serializar).
      const indice = this._construirIndice(contenido);

      // 8. Recoger hojas de estilo del visor.
      const cssLinks = this._recogerCssLinks();

      // 9. Ensamblar el documento HTML completo.
      const fecha = datos.fecha_calculo || new Date().toISOString().slice(0, 10);
      const html  = this._construirHtml(config, { fecha, cssLinks, indice, contenidoHtml: contenido.innerHTML });

      // 10. Guardar en Drupal.
      this._actualizarEstadoModal(modal, 'Guardando…');
      const token     = await fetch('/session/token').then(r => r.text());
      const resultado = await this._guardar(html, config, fecha, token);

      // 11. Pantalla de éxito.
      this._mostrarExito(modal, resultado);

      return resultado;
    },

    // ─────────────────────────────────────────────────────────────────────
    // HELPERS DE TEMPLATE
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Clona el contenido de un <template> y devuelve el DocumentFragment.
     * Usar cuando el resultado se insertará en el DOM del navegador.
     */
    _clonarTpl: function (id) {
      const tpl = document.getElementById(id);
      if (!tpl) { console.warn('[informe] Template no encontrado:', id); return null; }
      return tpl.content.cloneNode(true);
    },

    /**
     * Clona un <template>, sustituye los placeholders %%nombre%% por los
     * valores de `vars` y devuelve el HTML resultante como string.
     * Usar cuando el resultado se incluirá en el documento enviado a WeasyPrint.
     */
    _renderTpl: function (id, vars = {}) {
      const tpl = document.getElementById(id);
      if (!tpl) { console.warn('[informe] Template no encontrado:', id); return ''; }
      const wrap = document.createElement('div');
      wrap.appendChild(tpl.content.cloneNode(true));
      return Object.entries(vars).reduce(
        (html, [k, v]) => html.replaceAll(`%%${k}%%`, v ?? ''),
        wrap.innerHTML
      );
    },

    // ─────────────────────────────────────────────────────────────────────
    // MODAL
    // ─────────────────────────────────────────────────────────────────────

    _crearModal: function () {
      const fragment = this._clonarTpl('tpl-informe-modal');
      const modal    = fragment.querySelector('#informe-modal');
      document.body.appendChild(modal);

      if (!document.getElementById('informe-spin-style')) {
        const st = document.createElement('style');
        st.id    = 'informe-spin-style';
        st.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(st);
      }

      return {
        modal,
        contenido: document.getElementById(RENDER_ID),
      };
    },

    _actualizarEstadoModal: function (modal, texto) {
      const el = modal.querySelector('#informe-modal-estado');
      if (el) el.textContent = texto;
    },

    _mostrarExito: function (modal, resultado) {
      const fragment = this._clonarTpl('tpl-informe-exito');
      const wrapper  = fragment.querySelector('div');

      wrapper.querySelector('.informe-exito__titulo').textContent = resultado.titulo;
      wrapper.querySelector('.informe-exito__enlace').href = `/node/${resultado.nid}`;
      wrapper.querySelector('.informe-exito__cerrar').addEventListener('click', () => {
        document.getElementById('informe-modal').remove();
      });

      modal.innerHTML = '';
      modal.appendChild(wrapper);
    },

    // ─────────────────────────────────────────────────────────────────────
    // RENDERIZADO
    // ─────────────────────────────────────────────────────────────────────

    _scrollActivador: async function (contenedor) {
      const paso = Math.floor(window.innerHeight * 0.7);
      for (let y = 0; ; y += paso) {
        contenedor.scrollTop = y;
        await new Promise(r => setTimeout(r, 350));
        if (contenedor.scrollTop + window.innerHeight >= contenedor.scrollHeight) break;
      }
    },

    _canvasAImg: function (contenidoEl) {
      contenidoEl.querySelectorAll('canvas').forEach(canvas => {
        const img = document.createElement('img');
        img.src   = canvas.toDataURL('image/png');
        // width:100% para que el contenedor (con max-width / ancho-pdf) controle
        // el tamaño final. height:auto preserva el aspect ratio del canvas original.
        img.style.cssText = 'width:100%;height:auto;display:block;';
        canvas.parentNode.replaceChild(img, canvas);
      });
    },

    // ─────────────────────────────────────────────────────────────────────
    // ENSAMBLADO DEL DOCUMENTO HTML
    // ─────────────────────────────────────────────────────────────────────

    _recogerCssLinks: function () {
      return Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .filter(l => CSS_PERMITIDOS.some(p => l.href.includes(p)))
        .map(l => {
          try {
            const url  = new URL(l.href);
            const href = url.origin === window.location.origin ? url.pathname : url.href;
            return `<link rel="stylesheet" href="${href}">`;
          } catch (e) {
            return `<link rel="stylesheet" href="${l.href}">`;
          }
        }).join('\n');
    },

    _construirIndice: function (contenidoEl) {
      const entradas = [];
      let contador   = 0;

      contenidoEl.querySelectorAll('.componente-titulo, .titulo-indice').forEach(el => {
        const id = 'idx-' + (contador++);
        el.id    = id;
        entradas.push({ id, texto: el.textContent.trim() });
      });

      if (!entradas.length) return '';

      const fragment = this._clonarTpl('tpl-informe-indice');
      const nav      = fragment.querySelector('nav');
      const ol       = nav.querySelector('ol');

      entradas.forEach(e => {
        ol.insertAdjacentHTML('beforeend',
          this._renderTpl('tpl-informe-indice-entrada', { href: '#' + e.id, texto: e.texto })
        );
      });

      const wrap = document.createElement('div');
      wrap.appendChild(nav);
      return wrap.innerHTML;
    },

    _construirPortada: function (config, fecha) {
      return this._renderTpl('tpl-informe-portada', {
        icono:     config.portada.icono,
        titulo:    config.portada.titulo,
        subtitulo: config.portada.subtitulo,
        fecha:     'Datos del snapshot: ' + fecha,
      });
    },

    _construirCabeceraRunning: function (config, fecha) {
      return this._renderTpl('tpl-informe-cabecera-running', {
        titulo: config.cabecera.titulo,
        fecha,
      });
    },

    _construirHtml: function (config, { fecha, cssLinks, indice, contenidoHtml }) {
      const portada         = this._construirPortada(config, fecha);
      const cabeceraRunning = this._construirCabeceraRunning(config, fecha);

      return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${config.titulo} — ${fecha}</title>
${cssLinks}
<link rel="stylesheet" href="/modules/custom/visor/css/informe-print.css">
</head>
<body class="informe-pdf">
${cabeceraRunning}
<div class="informe-paginas">
${portada}
${indice}
${contenidoHtml}
</div>
</body>
</html>`;
    },

    // ─────────────────────────────────────────────────────────────────────
    // API DRUPAL
    // ─────────────────────────────────────────────────────────────────────

    _guardar: async function (html, config, fecha, token) {
      const response = await fetch('/api/visor/informe/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: JSON.stringify({
          html,
          etiqueta:       config.etiqueta,
          ambito:         config.ambito,
          tipo:           config.tipo,
          fecha_snapshot: fecha,
        }),
      });
      return response.json();
    },

    // ─────────────────────────────────────────────────────────────────────
    // LONGTEXT
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Recorre el esquema buscando elementos tipo 'longtext', los resuelve en
     * paralelo y almacena el HTML en item._html para que row-compositor
     * pueda usarlo de forma síncrona.
     */
    _prefetchLongtexts: async function (esquema, props) {
      const items = [];
      const recoger = elementos => elementos.forEach(item => {
        if (item.tipo === 'longtext') items.push(item);
        else if (item.tipo === 'pack' && item.elementos) recoger(item.elementos);
      });
      esquema.forEach(bloque => { if (bloque.elementos) recoger(bloque.elementos); });

      if (!items.length) return;

      const token = await fetch('/session/token').then(r => r.text());

      // Recoger datasets extra ($-prefijados) de drupalSettings para hacerlos
      // disponibles en las sustituciones {{ dataset.clave }} de los longtexts.
      const vp = drupalSettings.visorProject || {};
      const extra = Object.fromEntries(
        Object.entries(vp)
          .filter(([k]) => k.startsWith('$'))
          .map(([k, v]) => [k.slice(1), v])
      );

      await Promise.all(items.map(async item => {
        try {
          const resp = await fetch(`/api/visor/texto/${item.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
            body: JSON.stringify({ datos: props, extra }),
          });
          if (resp.ok) item._html = (await resp.json()).html || '';
        } catch (e) {
          console.warn('[informe] No se pudo cargar bloque de texto:', item.id, e);
        }
      }));
    },
  };

})(window.jQuery, window.Drupal);
