/**
 * Librería de componentes HTML para el Visor
 * Organiza las tablas de datos en funciones modulares
 */
var VisorComponents = {

    renderKPI: (props) => {
        // Definimos qué columnas mostrar según el ámbito
        const esCanarias = props.ambito === 'canarias';
        const esIsla = props.ambito === 'isla';

        return `
            <div">
                <h3 class="mdc-typography--headline6">Resumen Comparativo (KPI)</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Indicador</th>
                            ${(!esIsla && !esCanarias) ? '<th>' + props.etiqueta + '</th>' : ''}
                            
                            ${!esCanarias ? `<th>${props.isla_nombre_ref}</th>` : ''}
                            
                            <th>Canarias</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${F.kpiRow('Viviendas VV', props.vv_total, props.isla_vv_total, props.can_vv_total, 'num', props.ambito)}
                        ${F.kpiRow('Plazas VV', props.plazas_v, props.isla_plazas_v, props.can_plazas_v, 'num', props.ambito)}
                        ${F.kpiRow('Presión VV/Habit.', props.pvv_vh, props.isla_pvv_vh, props.can_pvv_vh, 'pct', props.ambito)}
                        ${F.kpiRow('Pob. Tur. Equiv.', props.pte_v, props.isla_pte_v, props.can_pte_v, 'num', props.ambito)}
                        ${F.kpiRow('Intensidad (RIT)', props.rit, props.isla_rit, props.can_rit, 'pct', props.ambito)}
                        ${F.kpiRow('Presión Humana', props.ph_km2, props.isla_ph_km2, props.can_ph_km2, 'den', props.ambito)}
                    </tbody>
                </table>
            </div>`;
    },

    renderTablaViviendas: (props) => {
        return `
          <div>
              <h3 class="mdc-typography--headline6">Parque de viviendas</h3>
              <table>
                  <thead><tr><th>Uso</th><th>Unidades</th><th>%</th></tr></thead>
                  <tbody>
                      ${F.row('Uso residencial', props.viviendas_habituales, props.vh_vt)}
                      ${F.row('Uso esporádico', props.viviendas_esporadicas, props.ve_vt)}
                      ${F.row('Vacías', props.viviendas_vacias, props.vv_vt)}
                      <tr class="row-total"><td>Total</td><td>${F.num(props.viviendas_total)}</td><td>100,00%</td></tr>
                  </tbody>
              </table>
          </div>`;
    },

    renderTablaCarga: (props) => {
        return `
            <div>
                <h3 class="mdc-typography--headline6">Carga poblacional</h3>
                <table>
                    <thead><tr><th>Concepto</th><th>Personas</th><th>%</th></tr></thead>
                    <tbody>
                        ${F.row('Pob. Turística Equiv. Reglada', props.pte_r, props.pte_r_porc)}
                        ${F.row('Pob. Turística Equiv. Vacacional', props.pte_v, props.pte_v_porc)}
                        ${F.row('Población censada', props.poblacion, props.poblacion_porc)}
                        <tr class="row-total"><td>Carga Real Total</td><td>${F.num(props.poblacion_total)}</td><td>100,00%</td></tr>
                    </tbody>
                </table>
            </div>`;
    },

    renderTablaOferta: (props) => {
        return `
            <div>
                <h3 class="mdc-typography--headline6">Oferta alojativa (Plazas)</h3>
                <table>
                    <thead><tr><th>Tipo de oferta</th><th>Plazas</th><th>%</th></tr></thead>
                    <tbody>
                        ${F.row('Oferta reglada', props.plazas_r, props.plazas_r_porc)}
                        ${F.row('Vivienda vacacional', props.plazas_v, props.plazas_v_porc)}
                        <tr class="row-total"><td>Plazas totales</td><td>${F.num(props.plazas_total)}</td><td>100,00%</td></tr>
                    </tbody>
                </table>
            </div>`;
    },

    renderTablaIntensidad: (props) => {
        return  `
          <div>
              <h3 class="mdc-typography--headline6">Intensidad Turística (Ratios)</h3>
              <table>
                  <thead><tr><th>Tipo</th><th>Por 100 hab.</th><th>Por km²</th></tr></thead>
                  <tbody>
                      ${F.rowRit('Alojamiento reglado', props.rit_r, props.rit_r_km2)}
                      ${F.rowRit('Alojamiento vacacional', props.rit_v, props.rit_v_km2)}
                      <tr class="row-total"><td>Intensidad total</td><td>${F.den(props.rit)}</td><td>${F.den(props.rit_km2)}</td></tr>
                  </tbody>
              </table>
          </div>`;
    },

    renderTablaPresionHumana: (props) => {
        return `
          <div>
              <h3 class="mdc-typography--headline6">Presión Humana Territorial (Densidad)</h3>
              <table>
                  <thead><tr><th>Concepto</th><th>Pers./km²</th><th>%</th></tr></thead>
                  <tbody>
                      ${F.rowDen('Turistas (PTE)', props.rit_km2, props.rit_km2_porc)}
                      ${F.rowDen('Residentes', props.res_km2, props.res_km2_porc)}
                      <tr class="row-total"><td>Total (P.H. Real)</td><td>${F.den(props.ph_km2)}</td><td>100,00%</td></tr>
                  </tbody>
              </table>
          </div>`;
    },

    renderTablaDistribucionVV: (props) => {
        return `
            <div>
                <h3 class="mdc-typography--headline6">Distribución de la Vivienda Vacacional</h3>
                <table>
                    <thead><tr><th>Tipo de suelo</th><th>Unidades</th><th>%</th></tr></thead>
                    <tbody>
                        ${F.row('Suelo turístico', props.vv_turisticas, props.vv_turisticas_porc)}
                        ${F.row('Suelo residencial', props.vv_residenciales, props.dtr)}
                        <tr class="row-total"><td>Total VV</td><td>${F.num(props.vv_total)}</td><td>100,00%</td></tr>
                    </tbody>
                </table>
            </div>`;
    },

    renderTablaPresionVVVivienda: (props) => {
        return `
            <div>
                <h3 class="mdc-typography--headline6">Presión de la VV sobre la vivienda</h3>
                <table>
                    <thead><tr><th>Concepto</th><th style="text-align: right;">%</th></tr></thead>
                    <tbody>
                        <tr><td class="data-label">Sobre la vivienda habitual</td><td style="text-align: right;">${F.pct(props.pvv_vh)}</td></tr>
                        <tr><td class="data-label">Sobre el total de viviendas</td><td style="text-align: right;">${F.pct(props.pvv_vt)}</td></tr>
                    </tbody>
                </table>
            </div>`;
    },

    renderTablaDistribucionReglado: (props) => {
        return `
            <div>
                <h3 class="mdc-typography--headline6">Distribución de las plazas regladas</h3>
                <table>
                    <thead><tr><th>Tipo de suelo</th><th>Plazas</th><th>%</th></tr></thead>
                    <tbody>
                        ${F.row('Suelo turístico', props.plazas_at_turisticas, props.plazas_at_turisticas_porc)}
                        ${F.row('Suelo residencial', props.plazas_at_residenciales, props.plazas_at_residenciales_porc)}
                        <tr class="row-total"><td>Total Reglado</td><td>${F.num(props.plazas_r)}</td><td>100,00%</td></tr>
                    </tbody>
                </table>
            </div>`;
    },

    renderTablaDistribucionPlazasVV: (props) => {
        return `
            <div>
                <h3 class="mdc-typography--headline6">Distribución de las plazas de VV</h3>
                <table>
                    <thead><tr><th>Tipo de suelo</th><th>Plazas</th><th>%</th></tr></thead>
                    <tbody>
                        ${F.row('Suelo turístico', props.plazas_vv_turisticas, props.plazas_vv_turisticas_porc)}
                        ${F.row('Suelo residencial', props.plazas_vv_residenciales, props.plazas_vv_residenciales_porc)}
                        <tr class="row-total"><td>Total Plazas VV</td><td>${F.num(props.plazas_v)}</td><td>100,00%</td></tr>
                    </tbody>
                </table>
            </div>`;
    },

    renderResumenResidencial: (props) => {
        return `
            <div>
                <h3 class="mdc-typography--headline6">Plazas turísticas en suelo residencial</h3>
                <table>
                    <thead><tr><th>Tipo de oferta</th><th>Plazas</th><th>% sobre su total</th></tr></thead>
                    <tbody>
                        ${F.row('Oferta reglada (Hoteles/At)', props.plazas_at_residenciales, props.plazas_reg_res_porc)}
                        ${F.row('Oferta vacacional (VV)', props.plazas_vv_residenciales, props.plazas_vv_res_porc)}
                        <tr class="row-total"><td>Total en Suelo Residencial</td><td>${F.num(props.plazas_total_residencial)}</td><td>${F.pct(props.patsr)}</td></tr>
                    </tbody>
                </table>
            </div>`;
    },

    renderSeccionLocalidades: (props) => {
        // 1. Guardamos props globalmente para que actualizarOrden pueda acceder
        window.currentPropsCache = props; 

        let tituloTablaSecundaria = "Distribución por Núcleos (>50 VV)";
        let tituloColumnaAmbito = "Núcleo";
        
        if (props.ambito === 'isla') {
            tituloTablaSecundaria = "Top 10 Municipios por Viviendas VV";
            tituloColumnaAmbito = "Municipio";
        } else if (props.ambito === 'canarias') {
            tituloTablaSecundaria = "Distribución por Islas";
            tituloColumnaAmbito = "Isla";
        }

        // 2. Procesamos datos (asegurando que sea array)
        let localidades = typeof props.data_localidades === 'string' ?
            JSON.parse(props.data_localidades) : (props.data_localidades || []);

        // 3. Criterio por defecto (si no viene de actualizarOrden)
        let criterio = window.currentSortCriterio || 'vv_total';
        localidades.sort((a, b) => b[criterio] - a[criterio]);

        return `<div id="contenedor-tabla-nucleos">
            <h3 class="mdc-typography--headline6">${tituloTablaSecundaria}</h3>
            <table class="data-table" style="width:100%; border-collapse: collapse;">
              <thead>
                <tr style="background:#f4f4f4; border-bottom: 2px solid #ddd;">
                  <th style="text-align:left; padding: 10px;">${tituloColumnaAmbito}</th>
                  <th onclick="actualizarOrden('vv_total')" style="cursor:pointer; text-align:right; padding: 10px;">VV ${criterio==='vv_total'?'▼':''}</th>
                  <th onclick="actualizarOrden('plazas_v')" style="cursor:pointer; text-align:right; padding: 10px;">Plazas V ${criterio==='plazas_v'?'▼':''}</th>
                  <th onclick="actualizarOrden('plazas_r')" style="cursor:pointer; text-align:right; padding: 10px;">Plazas R ${criterio==='plazas_r'?'▼':''}</th>
                  <th onclick="actualizarOrden('plazas_total')" style="cursor:pointer; text-align:right; padding: 10px;">Total ${criterio==='plazas_total'?'▼':''}</th>
                </tr>
              </thead>
              <tbody>
                ${localidades.map(l => `
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="text-align:left; padding: 10px;"><strong>${l.etiqueta}</strong></td>
                    <td style="text-align:right; padding: 10px;">${F.num(l.vv_total)}</td>
                    <td style="text-align:right; padding: 10px;">${F.num(l.plazas_v)}</td>
                    <td style="text-align:right; padding: 10px;">${F.num(l.plazas_r)}</td>
                    <td style="text-align:right; padding: 10px;">${F.num(l.plazas_total)}</td>
                  </tr>`).join('')}
              </tbody>
          </table>
        </div>`;
    },

    renderSeccionGraficos: (props) => `
        <h2 id="grafico-titulo">${props.etiqueta}</h2>
        <div class="charts-container" style="padding: 20px 0;">
            <div id="wrapper-donuts"></div>
            <div id="wrapper-gauges" style="margin-top: 30px;"></div>
            <div id="wrapper-radar" style="margin-top: 30px;"></div>
        </div>`,

    renderDonutsUI: () => `
        <div class="charts-row" style="display: flex; gap: 15px; flex-wrap: wrap;">
            <div class="mdc-card chart-item" style="flex:1; min-width:140px;">
                <h4 style="text-align:center">Ubicación Oferta</h4>
                <canvas id="chartSuelo"></canvas>
            </div>
            <div class="mdc-card chart-item" style="flex:1; min-width:140px;">
                <h4 style="text-align:center">Mix de Alojamiento</h4>
                <canvas id="chartMix"></canvas>
            </div>
            <div class="mdc-card chart-item" style="flex:1; min-width:140px;">
                <h4 style="text-align:center">Localización VV</h4>
                <canvas id="chartSueloVV"></canvas>
            </div>
        </div>`,



    //~ renderGaugesUI: () => {
        //~ return  `
            //~ <div class="charts-row gauges-row" style="display: flex; gap: 15px; margin-top:20px; flex-wrap: wrap;">
                //~ <div class="mdc-card gauge-item" style="flex:1; min-width:140px; text-align:center;">
                    //~ <h4 class="mdc-typography--subtitle2">RIT (Turistas / Poblacion * 100)</h4>
                    //~ <canvas id="gauge1"></canvas>
                    //~ <div id="val-1" class="gauge-value" style="font-weight:bold; font-size:1.2rem;"></div>
                //~ </div>
                //~ <div class="mdc-card gauge-item" style="flex:1; min-width:140px; text-align:center;">
                    //~ <h4 class="mdc-typography--subtitle2">RIT (Turistas / km<sup>2)</sup></h4>
                    //~ <canvas id="gauge2"></canvas>
                    //~ <div id="val-2" class="gauge-value" style="font-weight:bold; font-size:1.2rem;"></div>
                //~ </div>
                //~ <div class="mdc-card gauge-item" style="flex:1; min-width:140px; text-align:center;">
                    //~ <h4 class="mdc-typography--subtitle2">Residentes por km²</h4>
                    //~ <canvas id="gauge3"></canvas>
                    //~ <div id="val-3" class="gauge-value" style="font-weight:bold; font-size:1.2rem;"></div>
                //~ </div>
                //~ <div class="mdc-card gauge-item" style="flex:1; min-width:140px; text-align:center;">
                    //~ <h4 class="mdc-typography--subtitle2">Presión Humana</h4>
                    //~ <canvas id="gauge4"></canvas>
                    //~ <div id="val-4" class="gauge-value" style="font-weight:bold; font-size:1.2rem;"></div>
                //~ </div>
            //~ </div>`;
        //~ },

renderGaugesUI: (config, containerId, tituloBloque) => {

    const htmlTitulo = tituloBloque 
        ? `<h3 class="mdc-typography--headline6 bloque-gauges-titulo">${tituloBloque}</h3>` 
        : '';
  
    const gaugesHTML = config.map(conf => `
        <div class="mdc-card gauge-item">
            <h4 class="mdc-typography--subtitle2 gauge-title">${conf.titulo}</h4>
            <canvas id="${containerId}-gauge${conf.shortId}"></canvas>
            <div id="${containerId}-val-${conf.shortId}" class="gauge-value-main"></div>
        </div>
    `).join('');

    return `
        <div class="bloque-gauges-wrapper">
            ${htmlTitulo}
            <div id="${containerId}" class="charts-row gauges-row">
                ${gaugesHTML}
            </div>
        </div>`;
},


    renderRadarUI: (props) => `
        <div class="radar-container" style="padding: 15px; background: #fff; border-radius: 8px;">
            <h4 id="radar-title" style="font-size: 0.9rem; color: #333; margin-bottom: 10px; text-align: center; text-transform: uppercase;">
                Comparativa: Segmento ${props.tipo_municipio}
            </h4>
            <canvas id="chartRadar" width="300" height="300"></canvas>
        </div>`
        
};
              
