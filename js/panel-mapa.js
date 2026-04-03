// panel-mapa.js
(function ($, Drupal) {
  "use strict";

  window.visorProject.mapa = {
    instance: null,
    popup: null,
    hoveredId: null,

    config: {
      center: [-15.7, 28.6],
      zoom: 7.6,
      style: () => ({
        "version": 8,
        "sources": {},
        "layers": [{
          "id": "background",
          "type": "background",
          "paint": { "background-color": "#f8f9fa" }
        }]
      })
    },

    cargarMapa: function (idContenedor, visorEstado) {
      const el = document.getElementById(idContenedor);
      if (!el) return;

      this.instance = new maplibregl.Map({
        container: el,
        style: this.config.style(),
        center: this.config.center,
        zoom: this.config.zoom
      });

      this.popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'map-tooltip'
      });

      this.instance.on('load', () => {
        this.configurarCapas(visorEstado);
        this.registrarEventos(visorEstado);
      });
    },

    configurarCapas: function (visorEstado) {
      const map = this.instance;

      // Fuente de Geometría + Datos (Vía Martin)
      map.addSource('municipios_source', {
        'type': 'vector',
        'tiles': ['https://vtp.carlosespino.es/martin/mv_full_snapshots_dashboard/{z}/{x}/{y}'],
        'promoteId': 'id' // Crucial para el highlight por ID
      });

      map.addSource('etiquetas_source', {
          'type': 'vector',
          'tiles': ['https://vtp.carlosespino.es/martin/v_mapa_etiquetas/{z}/{x}/{y}']
      });

      console.log('Juanito')

      // Capa de Relleno
      map.addLayer({
        'id': 'municipios-fill',
        'type': 'fill',
        'source': 'municipios_source',
        'source-layer': 'mv_full_snapshots_dashboard',
        'paint': {
          'fill-color': '#fff5f5',
          'fill-opacity': 0.7
        },
        'filter': ['==', ['get', 'ambito'], visorEstado.ambito]
      });

      // Capa de Borde Resaltado
      map.addLayer({
          'id': 'municipio-highlight',
          'type': 'line',
          'source': 'municipios_source',
          'source-layer': 'mv_full_snapshots_dashboard',
          'paint': {
              'line-color': '#000',
              'line-width': 2.5
          },
          'filter': ['==', ['get', 'id'], ''] 
      });

      // Capa de Etiquetas
      map.addLayer({
          'id': 'etiquetas-nombres',
          'type': 'symbol',
          'source': 'etiquetas_source',
          'source-layer': 'v_mapa_etiquetas',
          'filter': ['==', ['get', 'ambito'], visorEstado.ambito],
          'layout': {
              'text-field': ['get', 'etiqueta'],
              'text-font': ['Open Sans Regular'],
              'text-size': 13,
              'text-anchor': 'center'
          },
          'paint': {
              'text-color': '#000',
              'text-halo-color': 'rgba(255, 255, 255, 0.8)',
              'text-halo-width': 2
          }
      });
    },

    actualizarEstiloRatios: function (visorEstado) {
      const estadoActual = visorEstado || window.visorProject.estado;
      const map = this.instance;
      if (!map || !map.getLayer('municipios-fill')) return;

      const features = map.querySourceFeatures('municipios_source', {
          sourceLayer: 'mv_full_snapshots_dashboard',
          filter: ['==', ['get', 'ambito'], estadoActual.ambito]
      });

      let valores = features
          .map(f => parseFloat(f.properties[estadoActual.indicador]))
          .filter(v => !isNaN(v) && v !== null);

      if (valores.length === 0) {
          map.setPaintProperty('municipios-fill', 'fill-color', '#fff5f5');
          return;
      }

      let cortesRaw = window.visorProject.utils.calcularCortesJenks(valores, 5);
      let cortes = [...new Set(cortesRaw)].sort((a, b) => a - b);

      if (!cortes || cortes.length < 2) {
          const max = Math.max(...valores);
          const step = max / 5;
          cortes = [step, step * 2, step * 3, step * 4, max];
      }

      // 1. Definimos la rampa de colores oficial (5 niveles)
      const colores = ['#fcd5d5', '#f8a1a1', '#ed6d6d', '#c53030', '#a70000'];

      // 2. Forzamos que el inicio de la interpolación coincida con el mínimo o 0
      // Pero usamos el primer color de nuestra gama para el valor más bajo
      let expresionColor = [
          'interpolate', 
          ['linear'], 
          ['to-number', ['get', estadoActual.indicador], 0],
          0, colores[0] // Valor 0 -> Rojo desvaído (inicio de la rampa)
      ];

      // 3. Mapeamos los cortes Jenks a los colores
      // Si Jenks da [10, 25, 50, 80, 100], asignamos color[0] a 10, color[1] a 25...
      cortes.forEach((valor, index) => {
          expresionColor.push(valor);
          expresionColor.push(colores[index]);
      });

      // 4. Aplicamos al mapa
      map.setPaintProperty('municipios-fill', 'fill-color', expresionColor);

      // 5. La leyenda debe recibir los mismos colores y cortes
      this.dibujarLeyenda(estadoActual.indicador, cortes, colores);
    },

    registrarEventos: function (visorEstado) {
      const map = this.instance;
      const self = this;

      map.on('idle', () => {
          self.actualizarEstiloRatios(window.visorProject.estado);
      });

      // Cambio de Indicador
      jQuery('body').off('change', '#selector-indicador').on('change', '#selector-indicador', function() {
        window.visorProject.estado.indicador = jQuery(this).val();
        window.visorProject.utils.actualizarURL(window.visorProject.estado);
        self.actualizarEstiloRatios(window.visorProject.estado);
      });

      // Cambio de Ámbito
      jQuery('body').on('change', 'input[name="ambito-mapa"]', function() {
          const nuevoAmbito = jQuery(this).val();
          if (!nuevoAmbito) return;

          window.visorProject.estado.ambito = nuevoAmbito;

          if (nuevoAmbito === 'canarias') {
              // CASO ESPECIAL: Canarias siempre tiene datos
              const registroCanarias = window.visorProject.buscarRegistro({ ambito: 'canarias' });
              if (registroCanarias) {
                  // Difundimos para que se llenen los gráficos y se activen las pestañas
                  window.visorProject.difundirDatos(registroCanarias);
              }
          } else {
              // CASOS ISLA O MUNICIPIO: Limpiamos y bloqueamos hasta que cliquen
              window.visorProject.estado.registroActivo = null;
              window.visorProject.estado.etiqueta = null;

              if (window.visorProject.tabs) {
                  window.visorProject.tabs.gestionarEstadoTabs(false);
                  // Si estaba en Gráficos o Datos, lo devolvemos al Mapa
                  if (window.visorProject.estado.tab > 1) {
                      window.visorProject.tabs.instance.activateTab(1);
                  }
              }
          }

          // Actualizamos filtros del mapa para mostrar la capa correspondiente
          const capas = ['municipios-fill', 'municipio-highlight', 'etiquetas-nombres'];
          capas.forEach(id => {
              if (map.getLayer(id)) {
                  map.setFilter(id, ['==', ['get', 'ambito'], nuevoAmbito]);
              }
          });

          window.visorProject.utils.actualizarURL(window.visorProject.estado);
      });

      // CLICK: El momento clave
      map.on('click', 'municipios-fill', (e) => {

        if (e.features.length > 0) {
          const idMapa = e.features[0].properties.id;
                  console.log('=============')
                  console.log('Id Mapa ' + idMapa)
                  console.log('=============')

          
          // BUSCAMOS LOS DATOS COMPLETOS EN EL JSON
          const registroCompleto = window.visorProject.buscarRegistro({ id: idMapa });
                  console.log('=============')
                  console.log('Registro completo ' + registroCompleto)
                  console.log('=============')
          if (registroCompleto) {
            // Difundimos para que tablas y URL se actualicen
            window.visorProject.difundirDatos(registroCompleto);
                  console.log('=============')
                  console.log('Llegué aquí')
                  console.log('=============')
            
            // Si queremos que al clicar salte a la pestaña de datos:
            if (window.visorProject.tabs?.instance) {
                  console.log('=============')
                  console.log('Y a aquí también')
                  console.log('=============')
               window.visorProject.tabs.instance.activateTab(3); // Tab de Tablas
            }
          }
        }
      });

      // HOVER y TOOLTIP
      map.on('mousemove', 'municipios-fill', (e) => {
          if (e.features.length > 0) {
              const f = e.features[0];
              const valor = f.properties[window.visorProject.estado.indicador];
              const valorFmt = !isNaN(parseFloat(valor)) ? parseFloat(valor).toLocaleString('es-ES') : 'N/A';

              const html = self.prepararHTMLPopup(f.properties.etiqueta, window.visorProject.estado.indicador, valorFmt);
              self.popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
              
              map.setFilter('municipio-highlight', ['==', ['get', 'id'], f.properties.id]);
              map.getCanvas().style.cursor = 'pointer';
          }
      });

      map.on('mouseleave', 'municipios-fill', () => {
          map.getCanvas().style.cursor = '';
          map.setFilter('municipio-highlight', ['==', ['get', 'id'], '']);
          self.popup.remove();
      });
    },

    prepararHTMLPopup: function(nombre, ind, valor) {
      const template = document.getElementById('tooltip-mapa-template');
      if (!template) return `<b>${nombre}</b>: ${valor}`;
      const contenido = template.content.cloneNode(true);
      contenido.querySelector('.tooltip-nombre').innerText = nombre;
      contenido.querySelector('.tooltip-indicador').innerText = ind.replace(/_/g, ' ');
      contenido.querySelector('.tooltip-valor').innerText = valor;
      const div = document.createElement('div');
      div.appendChild(contenido);
      return div.innerHTML;
    },

    dibujarLeyenda: function (idIndicador, cortes, colores) { // <-- Añadimos colores aquí
      const scaleElem = document.getElementById('legend-scale');
      const titleElem = document.getElementById('legend-title');
      if (!scaleElem || !titleElem) return;

      titleElem.innerText = idIndicador.replace(/_/g, ' ').toUpperCase();
      scaleElem.innerHTML = '';

      // Si por lo que sea no llegan colores, ponemos un fallback seguro
      const listaColores = colores || ['#fcd5d5', '#f8a1a1', '#ed6d6d', '#c53030', '#a70000'];
      
      const fmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
      let inicio = 0;

      cortes.forEach((fin, i) => {
          const item = document.createElement('div');
          item.className = 'legend-item';
          // Usamos listaColores[i] para que coincida con el mapa
          item.innerHTML = `
            <div style="background:${listaColores[i]}; width:12px; height:12px; display:inline-block; margin-right:5px; border:1px solid #ddd"></div>
            <span>${i === 0 ? '< ' + fmt.format(fin) : fmt.format(inicio) + ' - ' + fmt.format(fin)}</span>
          `;
          scaleElem.appendChild(item);
          inicio = fin;
      });
    }
    
  };
})(window.jQuery, window.Drupal);
