// tabs.js
(function ($, Drupal) {
  "use strict";

  // RESCATE: Si por algún motivo $ no es la función jQuery, la reasignamos
  if (typeof $ !== 'function') {
      $ = window.jQuery;
  }

  window.visorProject = window.visorProject || {};

  window.visorProject.tabs = {
    instance: null,

    activarTabs: function (visorEstado) {
      // Usamos jQuery de forma explícita aquí también por seguridad
      const $ = window.jQuery; 
      
      const tabBarEl = document.querySelector('.mdc-tab-bar');
      if (!tabBarEl || typeof mdc === 'undefined') return;

      this.instance = mdc.tabBar.MDCTabBar.attachTo(tabBarEl);
      
      this.instance.listen('MDCTabBar:activated', (event) => {
        const index = event.detail.index;
        if (index === undefined) return;

        // Gestión de Sidebar
        if (index === 1) {
          $('.sidebar-controls').fadeIn(400);
        } else {
          $('.sidebar-controls').fadeOut(200);
        }

        // Gestión de Paneles
        $('.tab-panel').removeClass('tab-panel--active');
        const paneles = ['#panel-dashboard', '#panel-mapa', '#panel-graficos', '#panel-datos'];
        $(paneles[index]).addClass('tab-panel--active');

        // Resize del mapa
        if (index === 1 && window.visorProject.mapa?.instance) {
          setTimeout(() => { 
            window.visorProject.mapa.instance.resize(); 
            window.visorProject.mapa.actualizarEstiloRatios(visorEstado);
          }, 300);
        }

        visorEstado.tab = index;
        if (window.visorProject.utils?.actualizarURL) {
          window.visorProject.utils.actualizarURL(visorEstado);
        }
      });
    },


    gestionarEstadoTabs: function(tieneRegistro) {
        const idsTabsBloqueables = ['tab-graficos', 'tab-datos'];
        
        idsTabsBloqueables.forEach(id => {
            const tabEl = document.getElementById(id);
            if (!tabEl) return;

            if (tieneRegistro) {
                // HABILITAR
                tabEl.removeAttribute('disabled');
                tabEl.style.opacity = "1";
                tabEl.style.pointerEvents = "auto";
                tabEl.classList.remove('tab-deshabilitada'); // Clase opcional para CSS
            } else {
                // DESHABILITAR
                tabEl.setAttribute('disabled', 'true');
                tabEl.style.opacity = "0.4";
                tabEl.style.pointerEvents = "none";
                tabEl.classList.add('tab-deshabilitada');
            }
        });
    },
    
  };

})(window.jQuery, window.Drupal); // Pasamos window.jQuery explícitamente
