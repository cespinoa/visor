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
      await this._prefetchLongtexts(esquema, datos);
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

      // 6a. Construir índice de contenidos a partir del DOM ya renderizado.
      //     Asigna IDs a los elementos indexables antes de serializar innerHTML.
      const indice = this._construirIndice(contenido);

      // 6. Recoger solo los <link rel="stylesheet"> del visor.
      //    Excluimos CSS del tema admin (Gin, toolbar, etc.) que rompen
      //    el layout en WeasyPrint. Solo incluimos los del módulo visor
      //    y los CDN externos que necesitamos (Material Icons).
      const CSS_PERMITIDOS = [
        '/modules/custom/visor/css/',
        'fonts.googleapis.com',
        'fonts.gstatic.com',
      ];
      const cssLinks = Array.from(
        document.querySelectorAll('link[rel="stylesheet"]')
      ).filter(l => CSS_PERMITIDOS.some(p => l.href.includes(p)))
      .map(l => {
        try {
          const url = new URL(l.href);
          const href = url.origin === window.location.origin
            ? url.pathname
            : url.href;
          return `<link rel="stylesheet" href="${href}">`;
        } catch (e) {
          return `<link rel="stylesheet" href="${l.href}">`;
        }
      }).join('\n');

      // 7. Construir el documento HTML completo.
      const fecha = datos.fecha_calculo || new Date().toISOString().slice(0, 10);

      const portada = `
<div class="informe-portada">
  <div class="informe-portada__titulo">
    <div class="informe-portada__icono">
      <svg xmlns="http://www.w3.org/2000/svg" height="100" viewBox="0 -960 960 960" width="100"><path fill="#ffffff" d="M680-600h80v-80h-80v80Zm0 160h80v-80h-80v80Zm0 160h80v-80h-80v80Zm0 160v-80h160v-560H480v56l-80-58v-78h520v720H680Zm-640 0v-400l280-200 280 200v400H360v-200h-80v200H40Zm80-80h80v-200h240v200h80v-280L320-622 120-480v280Zm560-360ZM440-200v-200H200v200-200h240v200Z"/></svg>
    </div>
    <div class="informe-portada__titulo-texto">Vivienda Vacacional,<br/>Turismo y Población</div>
  </div>
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
<link rel="stylesheet" href="/modules/custom/visor/css/informe-print.css">
</head>
<body class="informe-pdf">
${cabeceraRunning}
<div class="informe-paginas">
${portada}
${indice}
${contenido.innerHTML}
</div>
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
     * Recorre el esquema buscando elementos tipo 'longtext', los resuelve en
     * paralelo contra /api/visor/texto/{id} y almacena el HTML resultante en
     * item._html para que row-compositor pueda usarlo de forma síncrona.
     */
    _prefetchLongtexts: async function(esquema, props) {
      const items = [];
      const recoger = (elementos) => {
        elementos.forEach(item => {
          if (item.tipo === 'longtext') items.push(item);
          else if (item.tipo === 'pack' && item.elementos) recoger(item.elementos);
        });
      };
      esquema.forEach(bloque => { if (bloque.elementos) recoger(bloque.elementos); });

      if (!items.length) return;

      const token = await fetch('/session/token').then(r => r.text());

      await Promise.all(items.map(async item => {
        try {
          const resp = await fetch(`/api/visor/texto/${item.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
            body: JSON.stringify({ datos: props }),
          });
          if (resp.ok) {
            const result = await resp.json();
            item._html = result.html || '';
          }
        } catch (e) {
          console.warn('[informe] No se pudo cargar bloque de texto:', item.id, e);
        }
      }));
    },

    /**
     * Hace scroll programático por el contenedor para que
     * IntersectionObserver active todos los gráficos.
     */
    _scrollActivador: async function (contenedor) {
      const paso = Math.floor(window.innerHeight * 0.7);
      for (let y = 0; ; y += paso) {
        contenedor.scrollTop = y;
        await new Promise(r => setTimeout(r, 350));
        // Recalcular scrollHeight en cada paso por si el contenido creció
        if (contenedor.scrollTop + window.innerHeight >= contenedor.scrollHeight) break;
      }
    },

    /**
     * Escanea el contenedor renderizado buscando .componente-titulo y
     * .titulo-indice, les asigna IDs únicos y devuelve el HTML del índice.
     * Debe llamarse DESPUÉS de convertir canvas→img (los IDs se aplican sobre
     * el DOM en vivo; contenido.innerHTML los llevará ya puestos).
     */
    _construirIndice: function(contenidoEl) {
      const entradas = [];
      let contador = 0;

      contenidoEl.querySelectorAll('.componente-titulo, .titulo-indice').forEach(el => {
        const id = 'idx-' + (contador++);
        el.id = id;
        entradas.push({ id, texto: el.textContent.trim() });
      });

      if (!entradas.length) return '';

      const items = entradas.map(e =>
        `    <li class="informe-indice__entrada"><a href="#${e.id}">${e.texto}</a></li>`
      ).join('\n');

      return `
<nav class="informe-indice">
  <h2 class="informe-indice__titulo">Índice</h2>
  <ol class="informe-indice__lista">
${items}
  </ol>
</nav>`;
    },

    /**
     * Mismo esquema que panel-dashboard.js con los destinos
     * apuntando al contenedor del modal.
     */
    _getEsquema: function (tempId) {
      const destino = '#' + tempId;
      return [
        //~ {
          //~ tituloBloque: 'Desplazamiento de la actividad turística hacia el alojamiento no reglado',
          //~ destino,
          //~ clases: ['dashboard-main-reglado-a-no-reglado'],
          //~ elementos: [
            //~ {
              //~ tipo: 'pack', ancho: '6',
              //~ tituloPack: 'Plazas por tipo de alojamiento',
              //~ clasePack: 'pack-atencion',
              //~ elementos: [
                //~ { tipo: 'widget',  id: 'card-plazas-alojativas-no-regladas', ancho: '12' },
                //~ { tipo: 'grafico', id: 'bar-reglado-no-reglado',             ancho: '12' },
                //~ { tipo: 'tabla',   id: 'plazas-regladas-no-regladas',        ancho: '12' },
              //~ ],
            //~ },
            //~ {
              //~ tipo: 'pack', ancho: '6',
              //~ tituloPack: 'Población turística equivalente por tipo de alojamiento',
              //~ clasePack: 'pack-atencion',
              //~ elementos: [
                //~ { tipo: 'widget',  id: 'card-ptev-pter', ancho: '12' },
                //~ { tipo: 'grafico', id: 'bar-ptev-pter',  ancho: '12' },
                //~ { tipo: 'tabla',   id: 'ptev-pter',      ancho: '12' },
              //~ ],
            //~ },
          //~ ],
        //~ },
        //~ {
          //~ tituloBloque: 'Presión sobre los residentes y el territorio',
          //~ destino,
          //~ clases: ['dashboard-main-reglado-a-no-reglado'],
          //~ elementos: [
            //~ {
              //~ tipo: 'pack', ancho: '6',
              //~ tituloPack: 'Presión sobre los residentes',
              //~ clasePack: 'pack-atencion',
              //~ elementos: [
                //~ { tipo: 'widget',  id: 'card-presion',    ancho: '12' },
                //~ { tipo: 'grafico', id: 'bar-ritr_ritv',   ancho: '12' },
                //~ { tipo: 'tabla',   id: 'ritv-ritr',       ancho: '12' },
              //~ ],
            //~ },
            //~ {
              //~ tipo: 'pack', ancho: '6',
              //~ tituloPack: 'Presión sobre el territorio',
              //~ clasePack: 'pack-atencion',
              //~ elementos: [
                //~ { tipo: 'widget',  id: 'card-presion-km2',    ancho: '12' },
                //~ { tipo: 'grafico', id: 'bar-presion-humana',  ancho: '12' },
                //~ { tipo: 'tabla',   id: 'presion-territorio',  ancho: '12' },
              //~ ],
            //~ },
          //~ ],
        //~ },
        //~ {
          //~ tituloBloque: 'Disponibilidad de viviendas',
          //~ destino,
          //~ clases: ['dashboard-main-reglado-a-no-reglado'],
          //~ elementos: [
            //~ {
              //~ tipo: 'pack', ancho: '6',
              //~ tituloPack: 'Uso de la vivienda',
              //~ clasePack: 'pack-atencion',
              //~ elementos: [
                //~ { tipo: 'widget',  id: 'card-uso-vivienda', ancho: '12' },
                //~ { tipo: 'grafico', id: 'bar-uso-vivienda',  ancho: '12' },
                //~ { tipo: 'tabla',   id: 'uso-vivienda',      ancho: '12' },
              //~ ],
            //~ },
            //~ {
              //~ tipo: 'pack', ancho: '6',
              //~ tituloPack: 'Presión de la vivienda vacacional en zona residencial sobre la habitual',
              //~ clasePack: 'pack-atencion',
              //~ elementos: [
                //~ { tipo: 'widget',  id: 'card-presion-vivienda',          ancho: '12' },
                //~ { tipo: 'grafico', id: 'bar-presion-vivienda-habitual',  ancho: '12' },
                //~ { tipo: 'tabla',   id: 'presion-sobre-la-vivienda',      ancho: '12' },
              //~ ],
            //~ },
          //~ ],
        //~ },
        //~ {
          //~ tituloBloque: 'Déficit de vivienda',
          //~ destino,
          //~ clases: ['dashboard-main-reglado-a-no-reglado'],
          //~ elementos: [
            //~ { tipo: 'grafico', id: 'bar-cobertura-de-vivienda', ancho: '6' },
            //~ { tipo: 'tabla',   id: 'necesidad-de-vivienda',     ancho: '6' },
          //~ ],
        //~ },
        { 
          tituloBloque: "Datos principales",
          intro: "Resumen de los indicadores clave de intensidad y presión turística en el ámbito seleccionado.",
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado'],
          elementos: [
            { tipo: 'longtext', id: 'intro-intensidad-turistica', ancho: '12' },
            { tipo: 'tabla', id: 'resumen-ambito', ancho: '12' },
          ]
        },
        { 
          tituloBloque: "Actividad turistica por tipo de oferta y de zona",
          intro: "Caracterizacion del modelo turistico.",
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado', 'salto-antes', 'salto-despues'],
          elementos: [
            { tipo: 'grafico', id: 'bar-reglado-no-reglado', ancho: '3' },
            { tipo: 'tabla', id: 'plazas-regladas-no-regladas', ancho: '12' },
            //~ { tipo: 'tabla', id: 'oferta-alojativa', ancho: '6'},
            //~ { tipo: 'tabla', id: 'distribucion-plazas-vacacionales', ancho: '6' },
            //~ { tipo: 'tabla', id: 'distribucion-plazas-regladas', ancho: '6' },
            //~ { tipo: 'tabla', id: 'plazas-turisticas-zona-residencial', ancho: '6' },
            //~ { tipo: 'tabla', id: 'plazas-turisticas-zona-turistica', ancho: '6'},
            //~ { tipo: 'tabla', id: 'oferta-alojativa-por-zona-ambito', ancho: '6' }
          ]
        },
        { 
          tituloBloque: "Presión humana",
          intro: "Resumen de los indicadores clave de intensidad y presión turística en el ámbito seleccionado.",
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado'],
          elementos: [
            { tipo: 'tabla', id: 'poblacion-turistica-equivalente', ancho: '6' },
            { tipo: 'tabla', id: 'intensidad-turistica', ancho: '6' },
            { tipo: 'tabla', id: 'carga-poblacional', ancho: '6' },
            { tipo: 'tabla', id: 'presion-humana', ancho: '6' },
            
          ]
        },
        { 
          tituloBloque: "Vivienda",
          intro: "Resumen de los indicadores clave de vivienda.",
          destino,
          clases: ['dashboard-main-reglado-a-no-reglado'],
          elementos: [
            { tipo: 'tabla', id: 'parque-viviendas', ancho: '6' },
            { tipo: 'tabla', id: 'viviendas-disponibles', ancho: '6' },
            { tipo: 'tabla', id: 'viviendas-necesarias', ancho: '6' },
            { tipo: 'tabla', id: 'deficit-de-viviendas', ancho: '6' },
            { tipo: 'tabla', id: 'presion-vv-sobre-vivienda', ancho: '6'}
          ]
        },
        //~ { 
          //~ tituloBloque: "Datos principales",
          //~ intro: "Resumen de los indicadores clave de intensidad y presión turística en el ámbito seleccionado.",
          //~ destino: '#ficha-contenido',
          //~ elementos: [
            //~ { tipo: 'tabla', id: listaNivelInferior, ancho: '12' },
          //~ ]
        //~ }
      ];
    },
  };

})(window.jQuery, window.Drupal);
