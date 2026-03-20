// js/dashboard/utils-tablas.js

(function ($, Drupal) {
  "use strict";

  window.visorProject = window.visorProject || {};

  window.visorProject.utilsTablas = {

    /**
     * Punto de entrada único.
     */
    prepararDataset: function(config, registros, props) {
        if (!registros || registros.length === 0) return [];
        
        let resultado = [];
        if (config.modo === 'lista') {
            resultado = this.prepararDatasetLista(config, registros, props);
        } else {
            resultado = this.prepararDatasetFicha(config, registros);
        }

        // Ahora pasamos 'resultado' entero, que ya contiene '_columnasCSV'
        resultado._datosPuros = this.aplanarParaCSV(resultado);

        return resultado;
    },

    /**
     * Convierte el dataset complejo (con clases y tags) en un array de objetos simples
     */
    aplanarParaCSV: function(dataset) {
        // Recuperamos las cabeceras que guardamos en el paso 1
        const cabeceras = dataset._columnasCSV || [];
        
        return dataset.map(fila => {
            // La primera columna (id 0) es la etiqueta
            const obj = {};
            const nombreEtiqueta = cabeceras[0] || 'Ámbito';
            obj[nombreEtiqueta] = fila.etiqueta;

            // Las demás columnas (celdas)
            fila.celdas.forEach((celda, i) => {
                // El nombre está en la posición i + 1 (porque el 0 es la etiqueta)
                const nombreCol = cabeceras[i + 1] || `Dato ${i + 1}`;
                
                // Limpiamos el valor para que sea un número legible por Excel
                const valorLimpio = celda.valor
                    .replace(/[▲▼=]/g, '')
                    .replace(/\./g, '') // Quita puntos de miles
                    .replace(',', '.')  // Cambia coma decimal por punto
                    .trim();
                    
                obj[nombreCol] = valorLimpio;
            });
            return obj;
        });
    },

    /**
     * MODO LISTA: Compara la misma variable para distintas entidades (Islas, etc.)
     */
    prepararDatasetLista: function(config, registros, props) {
        let resultado = [];
    
        // 1. Agrupamos los registros por su ID de entidad (Isla, Municipio o Grupo)
        const grupos = registros.reduce((acc, reg) => {
            const id = reg.es_grupo ? 
                (reg.isla_id || reg.etiqueta) : 
                (reg.localidad_id || reg.municipio_id || reg.isla_id || reg.etiqueta);
            
            if (!acc[id]) acc[id] = [];
            acc[id].push(reg);
            return acc;
        }, {});

        // 2. OBTENEMOS LOS IDs SIGUIENDO EL ORDEN ORIGINAL DEL ARRAY 'registros'
        // Esto es lo que garantiza que el orden Central -> Oriental -> Occidental se mantenga.
        const idsOrdenados = [...new Set(registros.map(reg => 
            reg.es_grupo ? 
                (reg.isla_id || reg.etiqueta) : 
                (reg.localidad_id || reg.municipio_id || reg.isla_id || reg.etiqueta)
        ))];

        // Obtenemos todas las fechas únicas para el modo comparativa
        const todasLasFechas = [...new Set(registros.map(r => r.fecha_calculo))].sort();

        // --- NUEVO: Construimos las cabeceras reales para el CSV ---
        let cabecerasCSV = [config.etiquetas ? config.etiquetas[0] : 'Ámbito'];
        if (config.comparativa && todasLasFechas.length >= 2) {
            todasLasFechas.forEach(f => cabecerasCSV.push(this.formatearFechaES(f)));
            if (config.comparativa === 'completa') cabecerasCSV.push("Variación");
            cabecerasCSV.push("% Var.");
        } else {
            config.columnas.slice(1).forEach(col => cabecerasCSV.push(col[0])); 
        }

        // 3. ITERAMOS POR LOS IDs ORDENADOS
        idsOrdenados.forEach(id => {
            const serie = grupos[id];
            if (!serie) return;

            // Ordenamos cronológicamente la serie interna para asegurar que regActual es el último
            serie.sort((a, b) => new Date(a.fecha_calculo) - new Date(b.fecha_calculo));
            const regActual = serie[serie.length - 1];

            let celdas = [];

            // MODO A: Pivotaje Temporal (Evolución en columnas)
            if (config.comparativa && todasLasFechas.length >= 2) {
                const idCampo = config.columnas[1][0]; // Primer dato tras la etiqueta
                const formato = this.obtenerFormato(idCampo, config.columnas[1][1]);
                const regPenultimo = serie.length >= 2 ? serie[serie.length - 2] : null;

                // Creamos una celda por cada fecha existente en el dataset
                celdas = todasLasFechas.map(fIso => {
                    const r = serie.find(reg => reg.fecha_calculo === fIso);
                    return { 
                        valor: this._f(r ? r[idCampo] : null, formato), 
                        clase: "col-dato" 
                    };
                });

                // Inyectamos cálculos de variación si existe el dato previo
                if (regPenultimo) {
                    this._inyectarCalculos(celdas, config, regPenultimo[idCampo], regActual[idCampo]);
                }
            } 
            // MODO B: Lista Estándar (Varios indicadores en una misma fecha)
            else {
                celdas = config.columnas.slice(1).map(col => {
                    const [idCampo, tipoManual] = col;
                    const formato = this.obtenerFormato(idCampo, tipoManual);
                    return {
                        valor: this._f(regActual[idCampo], formato),
                        clase: "col-dato"
                    };
                });
            }

            // 4. IDENTIFICACIÓN DE FILA DESTACADA (TOTALES)
            const esFilaPadre = (config.total_padre && regActual.ambito === props.ambito);

            // 5. EMPUJAMOS AL RESULTADO FINAL
            resultado.push({
                etiqueta: regActual.etiqueta || regActual.nombre,
                celdas: celdas,
                esDestacada: esFilaPadre,
                fechasCabecera: todasLasFechas,
                // Guardamos el tipo para posibles estilos CSS por grupo
                tipo_isla: regActual.tipo_isla 
            });
        });

        resultado._columnasCSV = cabecerasCSV;
        return resultado;
    },

    /**
     * MODO FICHA: Compara distintos indicadores para una misma entidad.
     */
    //~ prepararDatasetFicha: function(config, registros) {
        //~ if (!config.filas || !registros || registros.length === 0) return [];

        //~ // 1. Detectamos si es una ficha COMPARATIVA (2 registros y flag activo)
        //~ const esComparativaTemporal = config.comparativa && registros.length >= 2;

        //~ if (esComparativaTemporal) {
            //~ // ... (Mantenemos la lógica de pivotaje temporal que ya hicimos) ...
            //~ registros.sort((a, b) => new Date(a.fecha_calculo) - new Date(b.fecha_calculo));
            //~ const regAntiguo = registros[0];
            //~ const regActual = registros[registros.length - 1];

            //~ return config.filas.map(filaConfig => {
                //~ const [etiqueta, ...items] = filaConfig;
                //~ const itemDato = items.find(it => Array.isArray(it) && it[1] !== 'literal');
                //~ const idCampo = itemDato[0];
                //~ const formato = this.obtenerFormato(idCampo, itemDato[1]);

                //~ const celdas = [
                    //~ { valor: this._f(regAntiguo[idCampo], formato), clase: "col-dato col-antiguo" },
                    //~ { valor: this._f(regActual[idCampo], formato), clase: "col-dato col-reciente" }
                //~ ];
                //~ this._inyectarCalculos(celdas, config, regAntiguo[idCampo], regActual[idCampo]);

                //~ return { etiqueta, celdas, esDestacada: items.includes('destacada'), fechas: [regAntiguo.fecha_calculo, regActual.fecha_calculo] };
            //~ });
        //~ } 

        //~ // 2. MODO FICHA CLÁSICA (Distribución, Estructura, etc.)
        //~ const regUnico = registros[registros.length - 1]; // Tomamos el más reciente
        //~ return config.filas.map(filaConfig => {
            //~ const [etiqueta, ...items] = filaConfig;
            //~ let esDestacada = false;
            //~ const celdas = [];

            //~ items.forEach(item => {
                //~ if (Array.isArray(item)) {
                    //~ let [idOTexto, tipoManual] = item;
                    //~ let valorFinal = (tipoManual === 'literal') 
                        //~ ? idOTexto 
                        //~ : this._f(regUnico[idOTexto], this.obtenerFormato(idOTexto, tipoManual));
                    
                    //~ celdas.push({
                        //~ valor: valorFinal,
                        //~ clase: "col-dato"
                    //~ });
                //~ } else if (item === 'destacada') {
                    //~ esDestacada = true;
                //~ }
            //~ });

            //~ return { etiqueta, celdas, esDestacada };
        //~ });
    //~ },

    prepararDatasetFicha: function(config, registros) {
        if (!config.filas || !registros || registros.length === 0) return [];

        let resultado = [];
        let cabecerasCSV = [config.etiquetas ? config.etiquetas[0] : 'Indicador'];

        const esComparativaTemporal = config.comparativa && registros.length >= 2;

        if (esComparativaTemporal) {
            registros.sort((a, b) => new Date(a.fecha_calculo) - new Date(b.fecha_calculo));
            const regAntiguo = registros[0];
            const regActual = registros[registros.length - 1];

            // Definimos cabeceras para el CSV: [Indicador, Fecha1, Fecha2, Variación, %]
            cabecerasCSV.push(this.formatearFechaES(regAntiguo.fecha_calculo));
            cabecerasCSV.push(this.formatearFechaES(regActual.fecha_calculo));
            if (config.comparativa === 'completa') cabecerasCSV.push("Variación");
            cabecerasCSV.push("% Var.");

            resultado = config.filas.map(filaConfig => {
                const [etiqueta, ...items] = filaConfig;
                const itemDato = items.find(it => Array.isArray(it) && it[1] !== 'literal');
                const idCampo = itemDato[0];
                const formato = this.obtenerFormato(idCampo, itemDato[1]);

                const celdas = [
                    { valor: this._f(regAntiguo[idCampo], formato), clase: "col-dato col-antiguo" },
                    { valor: this._f(regActual[idCampo], formato), clase: "col-dato col-reciente" }
                ];
                this._inyectarCalculos(celdas, config, regAntiguo[idCampo], regActual[idCampo]);

                return { etiqueta, celdas, esDestacada: items.includes('destacada') };
            });
        } else {
            // MODO FICHA CLÁSICA (Varias columnas de datos estáticos)
            const regUnico = registros[registros.length - 1];
            
            // Sacamos las cabeceras de la config o de las etiquetas
            if (config.cabecera) {
                cabecerasCSV = config.cabecera;
            } else {
                // Si no hay cabecera explícita, intentamos deducirla (ej: Indicador, Valor)
                cabecerasCSV.push("Valor");
            }

            resultado = config.filas.map(filaConfig => {
                const [etiqueta, ...items] = filaConfig;
                let esDestacada = false;
                const celdas = [];

                items.forEach(item => {
                    if (Array.isArray(item)) {
                        let [idOTexto, tipoManual] = item;
                        let valorFinal = (tipoManual === 'literal') 
                            ? idOTexto 
                            : this._f(regUnico[idOTexto], this.obtenerFormato(idOTexto, tipoManual));
                        
                        celdas.push({ valor: valorFinal, clase: "col-dato" });
                    } else if (item === 'destacada') {
                        esDestacada = true;
                    }
                });

                return { etiqueta, celdas, esDestacada };
            });
        }

        // IMPORTANTE: Pegamos las cabeceras al resultado
        resultado._columnasCSV = cabecerasCSV;
        return resultado;
    },

    /**
     * Realiza el cálculo de variaciones e inyecta las celdas finales.
     */
    _inyectarCalculos: function(celdas, config, vAntiguo, vActual) {
        const n1 = parseFloat(vAntiguo) || 0;
        const n2 = parseFloat(vActual) || 0;
        const absoluto = n2 - n1;
        const porcentual = n1 !== 0 ? (absoluto / n1) * 100 : 0;

        const icono = absoluto > 0 ? '▲' : (absoluto < 0 ? '▼' : '=');
        const claseTendencia = absoluto > 0 ? 'tendencia-up' : (absoluto < 0 ? 'tendencia-down' : 'tendencia-equal');

        if (config.comparativa === 'completa') {
            celdas.push({
                valor: (absoluto > 0 ? '+' : '') + window.visorProject.utils.formatearDato(absoluto, 'entero'),
                clase: `col-dato col-comparativa ${claseTendencia}`
            });
        }

        celdas.push({
            valor: `${icono} ${Math.abs(porcentual).toFixed(1)}%`,
            clase: `col-dato col-porcentaje ${claseTendencia}`
        });
    },

    /**
     * Helper de formateo rápido
     */
    _f: function(valor, formato) {
        if (valor === undefined || valor === null) return "-";
        return window.visorProject.utils.formatearDato(valor, formato);
    },

    _agruparPorEntidad: function(registros) {
        return registros.reduce((acc, reg) => {
            const id = reg.localidad_id || reg.municipio_id || reg.isla_id || reg.localidad_id || reg.etiqueta || 'unico';
            if (!acc[id]) acc[id] = [];
            acc[id].push(reg);
            return acc;
        }, {});
    },

    /**
     * Formatea fecha de YYYY-MM-DD a DD/MM/YYYY
     */
    formatearFechaES: function(isoDate) {
        if (!isoDate) return "";
        const [y, m, d] = isoDate.split('-');
        return `${d}/${m}/${y}`;
    },

    crearTabla: function(config, dataset) {
        const tplBase = document.getElementById('tpl-tabla-base');
        const tplFila = document.getElementById('tpl-tabla-fila');
        const tplCelda = document.getElementById('tpl-tabla-celda');
        if (!tplBase || dataset.length === 0) return document.createElement('div');

        const fragmentBase = tplBase.content.cloneNode(true);
        const wrapper = fragmentBase.querySelector('.contenedor-tabla');
        if (dataset._datosPuros) {
            wrapper.dataset.csvLimpio = JSON.stringify(dataset._datosPuros);
        }
        const table = fragmentBase.querySelector('table');
        const theadRow = fragmentBase.querySelector('thead tr');
        const tbody = fragmentBase.querySelector('tbody');

        wrapper.querySelector('.tabla-titulo').textContent = config.titulo;
        
        // --- CABECERAS INTELIGENTES (ELÁSTICAS O ESTÁTICAS) ---
        let etiquetasFinales = [];
        const fechasRef = dataset[0].fechasCabecera || [];

        // CASO A: Es una comparativa temporal (hay fechas detectadas)
        if (fechasRef.length > 0 && config.comparativa) {
            // Primera columna: Etiqueta (Ámbito o Ratio)
            etiquetasFinales.push(config.etiquetas ? config.etiquetas[0] : (config.modo === 'ficha' ? 'Ratio' : 'Ámbito'));
            
            // Columnas de fechas
            fechasRef.forEach(fIso => {
                etiquetasFinales.push(this.formatearFechaES(fIso));
            });

            // Columnas de cálculo
            if (fechasRef.length >= 2) {
                if (config.comparativa === 'completa') etiquetasFinales.push("Variación");
                etiquetasFinales.push("% Var.");
            }
        } 
        // CASO B: Es una ficha estática o distribución (usamos el config)
        else {
            etiquetasFinales = [...(config.cabecera || config.etiquetas || [])];
        }

        // Renderizado de los TH
        etiquetasFinales.forEach((texto, index) => {
            const th = document.createElement('th');
            th.textContent = texto;
            
            // Alineación a la izquierda solo para la primera columna
            if (index === 0) th.style.textAlign = 'left';

            if (config.ordenable) {
                th.classList.add('th-sortable');
                th.innerHTML += ' <span class="sort-icon">↕</span>'; // Restauramos el icono
                th.addEventListener('click', () => this.ordenarTabla(table, index));
            }
            theadRow.appendChild(th);
        });

        // --- FILAS ---
        dataset.forEach((filaData, index) => {
            const fragmentFila = tplFila.content.cloneNode(true);
            const tr = fragmentFila.querySelector('tr');
            const tdEtiqueta = tr.querySelector('.col-etiqueta');
            
            if (filaData.esDestacada) tr.classList.add('fila-resaltada');
            tdEtiqueta.textContent = filaData.etiqueta;

            filaData.celdas.forEach(celdaData => {
                const fragmentCelda = tplCelda.content.cloneNode(true);
                const td = fragmentCelda.querySelector('.col-dato');
                td.className = celdaData.clase;
                td.querySelector('.valor-texto').textContent = celdaData.valor;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        return wrapper;
    },

    // ... (Mantener funciones de obtenerFormato, exportarDatos y ordenarTabla igual que antes)
    obtenerFormato: function(idCampo, tipoManual) {
        if (tipoManual) return tipoManual;
        const dicc = drupalSettings.visorProject.diccionario;
        return (dicc && dicc[idCampo] && dicc[idCampo].formato) ? dicc[idCampo].formato : 'entero';
    },

    ordenarTabla: function(tabla, colIndex) {
        const tbody = tabla.querySelector('tbody');
        const filas = Array.from(tbody.querySelectorAll('tr'));
        const dir = tabla.getAttribute('data-sort-dir') === 'asc' ? 'desc' : 'asc';
        
        filas.sort((a, b) => {
            let valA = this._limpiarDatoParaOrdenar(a.children[colIndex].textContent);
            let valB = this._limpiarDatoParaOrdenar(b.children[colIndex].textContent);
            return dir === 'asc' ? (isNaN(valA) ? valA.localeCompare(valB) : valA - valB) : (isNaN(valB) ? valB.localeCompare(valA) : valB - valA);
        });

        filas.forEach(f => tbody.appendChild(f));
        tabla.setAttribute('data-sort-dir', dir);
    },

    _limpiarDatoParaOrdenar: function(texto) {
        return texto.trim().replace(/\./g, '').replace(',', '.').replace('%', '').replace(/[▲▼=]/g, '');
    }
  };

})(window.jQuery, window.Drupal);
