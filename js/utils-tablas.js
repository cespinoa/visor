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
        } else if (config.contexto === 'PARENTS') {
            resultado = this.prepararDatasetFichaParents(config, registros);
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
                const extra = this._obtenerExtra();
                celdas = config.columnas.slice(1).map(col => {
                    const [idCampo, tipoManual] = col;
                    const formato = this.obtenerFormato(idCampo, tipoManual);
                    return {
                        valor: this._f(this._resolverCampo(idCampo, regActual, extra), formato),
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

    obtenerUnidad: function(idCampo) {
        const dicc = drupalSettings.visorProject.diccionario;
        return (dicc && dicc[idCampo] && dicc[idCampo].unidades) ? dicc[idCampo].unidades : '';
    },

    /**
     * MODO FICHA + CONTEXTO PARENTS: columnas = ámbitos jerárquicos (self, isla, canarias)
     */
    prepararDatasetFichaParents: function(config, registros) {
        if (!config.filas || !registros || registros.length === 0) return [];

        const usarUnidades = config.unidades === true;
        const extra = this._obtenerExtra();

        // Cabeceras dinámicas: Indicador + nombre de cada entidad + Unidades?
        const cabeceras = ['Indicador', ...registros.map(r => r.etiqueta)];
        if (usarUnidades) cabeceras.push('Unidades');

        const resultado = config.filas.map(filaConfig => {
            const [etiqueta, campoSpec, ...rest] = filaConfig;
            const esDestacada = rest.includes('destacada');

            // campoSpec puede ser string "campo" o array ["campo", "formato"]
            const idCampo = Array.isArray(campoSpec) ? campoSpec[0] : campoSpec;
            const formato = this.obtenerFormato(idCampo, Array.isArray(campoSpec) ? campoSpec[1] : null);

            const celdas = registros.map(reg => ({
                valor: this._f(this._resolverCampo(idCampo, reg, extra), formato),
                clase: 'col-dato'
            }));

            if (usarUnidades) {
                celdas.push({ valor: this.obtenerUnidad(idCampo), clase: 'col-dato col-unidad' });
            }

            return { etiqueta, celdas, esDestacada };
        });

        resultado._columnasCSV = cabeceras;
        resultado._cabecerasTabla = cabeceras;
        resultado._clasesColumnas = cabeceras.map((_, i) =>
            usarUnidades && i === cabeceras.length - 1 ? 'col-unidad' : ''
        );
        return resultado;
    },

    prepararDatasetFicha: function(config, registros) {
        if (!config.filas || !registros || registros.length === 0) return [];

        let resultado = [];
        let cabecerasCSV = [config.etiquetas ? config.etiquetas[0] : 'Indicador'];

        const extra = this._obtenerExtra();
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
                    { valor: this._f(this._resolverCampo(idCampo, regAntiguo, extra), formato), clase: "col-dato col-antiguo" },
                    { valor: this._f(this._resolverCampo(idCampo, regActual, extra), formato), clase: "col-dato col-reciente" }
                ];
                this._inyectarCalculos(celdas, config, this._resolverCampo(idCampo, regAntiguo, extra), this._resolverCampo(idCampo, regActual, extra));

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
                            : this._f(this._resolverCampo(idOTexto, regUnico, extra), this.obtenerFormato(idOTexto, tipoManual));

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

        // CASO 0: Cabeceras dinámicas pre-calculadas (ej: contexto PARENTS)
        if (dataset._cabecerasTabla) {
            etiquetasFinales = dataset._cabecerasTabla;
        }
        // CASO A: Es una comparativa temporal (hay fechas detectadas)
        else if (fechasRef.length > 0 && config.comparativa) {
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

            if (dataset._clasesColumnas && dataset._clasesColumnas[index]) {
                th.classList.add(dataset._clasesColumnas[index]);
            }

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

    /**
     * Prepara un dataset desde un objeto drupalSettings (p.ej. {2021: '3011', total: '13941'}).
     * Genera una fila por clave, con la clave indicada en config.fila_total como destacada.
     */
    prepararDatasetFuente: function(config, datosRaw) {
        const formato    = config.formato || 'entero';
        const claveTotal = config.fila_total || 'total';

        const resultado = Object.entries(datosRaw)
            .filter(([k]) => k !== claveTotal)
            .map(([k, v]) => ({
                etiqueta:    k,
                celdas:      [{ valor: this._f(v, formato), clase: 'col-dato' }],
                esDestacada: false,
            }));

        if (claveTotal in datosRaw) {
            resultado.push({
                etiqueta:    config.etiqueta_total || 'Total',
                celdas:      [{ valor: this._f(datosRaw[claveTotal], formato), clase: 'col-dato' }],
                esDestacada: true,
            });
        }

        resultado._columnasCSV = config.cabecera || ['Clave', 'Valor'];
        return resultado;
    },

    // ... (Mantener funciones de obtenerFormato, exportarDatos y ordenarTabla igual que antes)
    obtenerFormato: function(idCampo, tipoManual) {
        if (tipoManual) return tipoManual;
        // Extraer formato embebido en [[expr | formato]]
        const mFmt = /^\[\[[\s\S]+?\|\s*(\w+)\s*\]\]$/.exec(idCampo);
        if (mFmt) return mFmt[1];
        const dicc = drupalSettings.visorProject.diccionario;
        return (dicc && dicc[idCampo] && dicc[idCampo].formato) ? dicc[idCampo].formato : 'entero';
    },

    /**
     * Devuelve los datasets externos: claves $-prefijadas de drupalSettings.visorProject,
     * sin el prefijo. Ej: '$viviendas_terminadas' → extra['viviendas_terminadas'].
     */
    _obtenerExtra: function() {
        const vp = drupalSettings.visorProject || {};
        return Object.fromEntries(
            Object.entries(vp)
                .filter(([k]) => k.startsWith('$'))
                .map(([k, v]) => [k.slice(1), v])
        );
    },

    /**
     * Resuelve el valor de una celda dado su spec, un registro del snapshot
     * y (opcionalmente) un objeto extra con datasets externos.
     *
     * Notaciones soportadas:
     *   campo_normal              → registro[campo_normal]
     *   $dataset.clave            → extra[dataset][clave]
     *   [[ expr ]]                → evalúa expr aritmética (solo snapshot)
     *   [[ expr con $dataset.k ]] → evalúa expr aritmética mixta (snapshot + externos)
     *
     * El formato opcional [[ expr | formato ]] se ignora aquí
     * (obtenerFormato lo extrae por separado).
     *
     * Devuelve null si la expresión no es válida (→ _f mostrará "-").
     */
    /**
     * Resuelve un campo dentro de un dataset extra.
     *
     * Si el dataset es un array de objetos, busca el registro que coincide
     * con la entidad activa (ambito + isla_id / municipio_id del registro).
     * Si es un objeto key-value simple, accede directamente por clave.
     */
    _resolverExtraField: function(dataset, clave, extra, registro) {
        const ds = extra[dataset];
        if (ds === undefined) return null;

        // Array de objetos: buscar el que coincide con la entidad del registro
        if (Array.isArray(ds)) {
            const ambito = registro.ambito;
            const found = ds.find(r => {
                if (r.ambito !== ambito) return false;
                if (ambito === 'isla')      return String(r.isla_id      ?? '') === String(registro.isla_id      ?? '');
                if (ambito === 'municipio') return String(r.municipio_id ?? '') === String(registro.municipio_id ?? '');
                return true; // canarias
            });
            return found !== undefined ? (found[clave] ?? null) : null;
        }

        // Key-value simple
        return ds[clave] ?? null;
    },

    _resolverCampo: function(spec, registro, extra) {
        extra = extra || {};

        const m = /^\[\[([\s\S]+?)\]\]$/.exec(spec);

        if (!m) {
            // Notación $dataset.clave (campo plano externo)
            if (typeof spec === 'string' && spec.startsWith('$')) {
                const dot = spec.indexOf('.', 1);
                if (dot !== -1) {
                    const dataset = spec.slice(1, dot);
                    const clave   = spec.slice(dot + 1);
                    return this._resolverExtraField(dataset, clave, extra, registro);
                }
            }
            return registro[spec];
        }

        // Expresión aritmética: eliminar el fragmento de formato opcional
        const exprStr = m[1].split('|')[0].trim();

        // 1. Sustituir $dataset.clave antes que los identificadores normales
        let exprNum = exprStr.replace(/\$([a-zA-Z_]\w*)\.([a-zA-Z0-9_]+)/g, (_, dataset, clave) => {
            const val = this._resolverExtraField(dataset, clave, extra, registro);
            if (val === undefined || val === null) {
                console.warn('visor-tablas: campo externo no encontrado:', dataset, clave);
                return 0;
            }
            const n = parseFloat(val);
            return isNaN(n) ? 0 : n;
        });

        // 2. Sustituir identificadores del registro snapshot
        exprNum = exprNum.replace(/\b([a-zA-Z_]\w*)\b/g, (_, token) => {
            if (token in registro) {
                const val = parseFloat(registro[token]);
                return isNaN(val) ? 0 : val;
            }
            console.warn('visor-tablas: campo no encontrado en registro:', token);
            return 0;
        });

        // Validar: solo dígitos, espacios, punto decimal y operadores básicos
        if (!/^[\d\s.\+\-\*\/\(\)]+$/.test(exprNum)) {
            console.warn('visor-tablas: expresión no válida:', exprNum);
            return null;
        }

        try {
            // eslint-disable-next-line no-new-func
            return Function('"use strict"; return (' + exprNum + ')')();
        } catch (e) {
            console.warn('visor-tablas: error al evaluar:', exprNum, e);
            return null;
        }
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
    },

    // ─────────────────────────────────────────────────────────────────────
    // TABLA CCAA × AÑOS SOBRE DATASET EXTERNO
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Genera una tabla con una fila por CCAA y una columna por año,
     * ordenada de mayor a menor por el valor del último año disponible.
     * Las filas en config.destacadas reciben clase fila-resaltada.
     */
    crearTablaCCAA: function(config, props) {
        const settings  = drupalSettings.visorProject || {};
        const dsKey     = config.dataset.replace(/^\$/, '');
        const ds        = settings['$' + dsKey] || settings[dsKey] || [];
        if (!ds.length) return null;

        const campo     = config.campo        || 'miembros';
        const yearField = config.yearField    || 'ejercicio';
        const etiqField = config.etiquetaField || 'ccaa_nombre';
        const destacadas = config.destacadas  || [];
        const formato   = config.formato      || 'decimal_2';
        const fmt       = window.visorProject.utils.formatearDato;

        const allYears = [...new Set(ds.map(r => String(r[yearField])))].sort();
        const maxYear  = allYears[allYears.length - 1];

        const getVal = (ccaa, year) => {
            const r = ds.find(x => x[etiqField] === ccaa && String(x[yearField]) === year);
            return (r && r[campo] !== null && r[campo] !== undefined) ? parseFloat(r[campo]) : null;
        };

        // CCAA únicas, ordenadas por valor del último año descendente
        const allCCAA = [...new Set(ds.map(r => r[etiqField]))]
            .sort((a, b) => (getVal(b, maxYear) ?? -Infinity) - (getVal(a, maxYear) ?? -Infinity));

        const dataset = allCCAA.map(ccaa => ({
            etiqueta:    ccaa,
            esDestacada: destacadas.includes(ccaa),
            celdas: allYears.map(year => {
                const v = getVal(ccaa, year);
                return { valor: v !== null ? fmt(v, formato) : '—', clase: 'col-dato' };
            }),
        }));

        const cabeceras = [etiqField === 'ccaa_nombre' ? 'CCAA' : etiqField, ...allYears];
        dataset._cabecerasTabla = cabeceras;
        dataset._columnasCSV    = cabeceras;
        dataset._datosPuros     = this.aplanarParaCSV(dataset);

        return this.crearTabla(config, dataset);
    },

    // HISTÓRICO MULTI-SERIE SOBRE DATASETS EXTERNOS
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Genera una tabla con una fila por año y columnas de valor + variación %
     * acumulada (respecto a config.baseYear) para cada serie del config.
     * Solo aplica a ámbitos canarias e isla (los datasets no tienen municipio).
     */
    crearTablaHistoricoExt: function(config, props) {
        const settings  = drupalSettings.visorProject || {};
        const baseYear  = String(config.baseYear || '2010');
        const series    = config.series || [];
        const ambito    = props.ambito;
        const islaId    = String(props.isla_id || '');
        const fmt       = window.visorProject.utils.formatearDato;

        const filtrarEntidad = (ds) => {
            if (ambito === 'canarias') return ds.filter(r => r.ambito === 'canarias');
            return ds.filter(r => r.ambito === 'isla' && String(r.isla_id) === islaId);
        };

        const seriesData = series.map(sc => {
            const ds      = settings[sc.dataset] || settings['$' + sc.dataset] || [];
            const ordered = filtrarEntidad(ds).slice()
                .sort((a, b) => String(a[sc.yearField]).localeCompare(String(b[sc.yearField])));
            const baseRec   = ordered.find(r => String(r[sc.yearField]) === baseYear);
            const baseValue = baseRec ? parseFloat(baseRec[sc.campo]) : null;
            return {
                ...sc,
                rows: ordered.map(r => ({ year: String(r[sc.yearField]), value: parseFloat(r[sc.campo]) })),
                baseValue,
            };
        });

        const allYears = [...new Set(seriesData.flatMap(s => s.rows.map(r => r.year)))].sort();
        if (!allYears.length) return null;

        const getVal = (s, year) => {
            const r = s.rows.find(x => x.year === year);
            return (r && !isNaN(r.value)) ? r.value : null;
        };

        const dataset = allYears.map(year => {
            const celdas = [];

            // Columnas de valor
            seriesData.forEach(s => {
                const v = getVal(s, year);
                celdas.push({
                    valor: v !== null ? fmt(v, s.formato || 'decimal_1') : '—',
                    clase: 'col-dato',
                });
            });

            // Columnas de variación % acumulada desde baseYear
            seriesData.forEach(s => {
                const v  = getVal(s, year);
                const bv = s.baseValue;
                let txt  = '—';
                if (year !== baseYear && v !== null && bv) {
                    const pct = (v / bv - 1) * 100;
                    txt = fmt(pct, 'decimal_1') + '\u00a0%';
                }
                celdas.push({ valor: txt, clase: 'col-dato' });
            });

            return {
                etiqueta:    year,
                esDestacada: year === baseYear,
                celdas,
            };
        });

        const cabeceras = [
            'Año',
            ...series.map(s => s.etiqueta),
            ...series.map(s => 'Var ' + s.etiqueta + '\u00a0%'),
        ];
        dataset._cabecerasTabla = cabeceras;
        dataset._columnasCSV    = cabeceras;
        dataset._datosPuros     = this.aplanarParaCSV(dataset);

        return this.crearTabla(config, dataset);
    },

    // ÍNDICE DE PRESIÓN (área del polígono radar)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Tabla de índice de presión basada en el área del polígono del gráfico
     * radar-sintesis. Ámbito canarias/isla → tabla de islas.
     * Ámbito municipio → tabla de municipios del mismo tipo_municipio.
     * Última fila: polígono de referencia (_avg).
     */
    crearTablaIndicePression: function(props) {
      const radarConfig = window.CONFIG_GRAFICOS['radar-sintesis'];
      if (!radarConfig) return null;
      const campos = radarConfig.config.campos;
      const snapshot = drupalSettings.visorProject.datosDashboard || [];
      const esIslas = props.ambito !== 'municipio';

      let entidades, tituloSufijo, refLabel;

      if (esIslas) {
        const ORDEN = ['Lanzarote', 'Fuerteventura', 'Gran Canaria', 'Tenerife', 'El Hierro', 'La Gomera', 'La Palma'];
        entidades = ORDEN
          .map(nombre => snapshot.find(d => d.ambito === 'isla' && d.etiqueta === nombre))
          .filter(Boolean);
        tituloSufijo = 'Islas';
        refLabel = 'Media Canarias';
      } else {
        const tipo = props.tipo_municipio;
        const ORDEN_TIPO_ISLA = { oriental: 0, central: 1, occidental: 2 };
        entidades = snapshot
          .filter(d => d.ambito === 'municipio' && d.tipo_municipio === tipo)
          .sort((a, b) => {
            const tA = ORDEN_TIPO_ISLA[a.tipo_isla] ?? 9;
            const tB = ORDEN_TIPO_ISLA[b.tipo_isla] ?? 9;
            if (tA !== tB) return tA - tB;
            if (a.isla_id !== b.isla_id) return (a.isla_id || 0) - (b.isla_id || 0);
            return a.etiqueta.localeCompare(b.etiqueta, 'es');
          });
        tituloSufijo = tipo;
        refLabel = 'Media municipios ' + tipo;
      }

      if (!entidades.length) return null;

      // Los valores _max son iguales para todas las entidades del mismo ámbito;
      // usamos la primera como referencia.
      const maxRef = entidades[0];

      // Calcular área para cada entidad
      const filas = entidades.map(ent => ({
        etiqueta: ent.etiqueta,
        indice: this._calcularAreaRadar(ent, campos, maxRef),
        activo: ent.etiqueta === props.etiqueta,
        esRef: false,
      }));

      // Fila de referencia: polígono _avg (el gris de fondo del radar)
      const avgDatos = {};
      campos.forEach(c => { avgDatos[c] = maxRef[c + '_avg']; });
      filas.push({
        etiqueta: refLabel,
        indice: this._calcularAreaRadar(avgDatos, campos, maxRef),
        activo: false,
        esRef: true,
      });

      // Construir el DOM con inline styles en todos los elementos para ser
      // inmune a cualquier regla CSS externa (Bootstrap, Gin, col-*…).
      const wrapper = document.createElement('div');
      wrapper.className = 'contenedor-tabla';

      const h3 = document.createElement('h3');
      h3.className = 'tabla-titulo mdc-typography--headline6';
      h3.textContent = 'Índice de presión — ' + tituloSufijo;
      wrapper.appendChild(h3);

      const table = document.createElement('table');
      table.className = 'tabla-visor';
      table.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.9rem;color:#333;';

      // Cabeceras
      const thead    = document.createElement('thead');
      const headerTr = document.createElement('tr');
      ['Ámbito', 'Índice de presión'].forEach((texto, i) => {
        const th = document.createElement('th');
        th.textContent = texto;
        th.style.cssText = 'padding:12px;border-bottom:2px solid #333;font-weight:700;'
          + 'text-align:' + (i === 0 ? 'left' : 'right') + ';';
        headerTr.appendChild(th);
      });
      thead.appendChild(headerTr);
      table.appendChild(thead);

      // Filas (sin clases col-* para evitar colisiones con el grid CSS)
      const tbody = document.createElement('tbody');
      const ESTILO_TD = 'display:table-cell;padding:8px 12px;border-bottom:1px solid #f0f0f0;';
      filas.forEach(f => {
        const tr = document.createElement('tr');
        if (f.activo || f.esRef) {
          tr.style.cssText = 'font-weight:700;background:#f9f9f9;';
        }

        const td1 = document.createElement('td');
        td1.style.cssText = ESTILO_TD + 'text-align:left;width:70%;';
        td1.textContent = f.etiqueta;
        tr.appendChild(td1);

        const td2 = document.createElement('td');
        td2.style.cssText = ESTILO_TD + 'text-align:right;';
        td2.textContent = f.indice.toFixed(2);
        tr.appendChild(td2);

        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrapper.appendChild(table);

      return wrapper;
    },

    /**
     * Calcula el área del polígono radar usando la fórmula shoelace en
     * coordenadas polares con n vértices equiangulares.
     * r_k ∈ [0, 1] (valor normalizado respecto al _max).
     * Área = (sin(2π/n) / 2) × Σ(r_k × r_{k+1 mod n})
     * Rango: 0 – n × sin(2π/n) / 2  (≈ 0–2.83 para n=8)
     */
    _calcularAreaRadar: function(datos, campos, maxRef) {
      const n = campos.length;
      const radios = campos.map(campo => {
        const max = maxRef[campo + '_max'];
        if (!max) return 0;
        return Math.min((datos[campo] || 0) / max, 1);
      });

      let suma = 0;
      for (let i = 0; i < n; i++) {
        suma += radios[i] * radios[(i + 1) % n];
      }
      return (Math.sin(2 * Math.PI / n) / 2) * suma;
    },

    // ─────────────────────────────────────────────────────────────────────
    // TABLA HISTÓRICO POBLACIÓN / VIVIENDA
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Genera una tabla año × indicadores comparando el crecimiento de la
     * población (convertido a hogares necesarios) con las viviendas terminadas.
     * Usa $historico_poblacion, $historico_viviendas_terminadas y el dataset
     * derivado $historico_hogares_necesarios (calculado en main.js).
     */
    crearTablaHistoricoPobViv: function(config) {
        const vp      = drupalSettings.visorProject || {};
        const pob     = vp['$historico_poblacion']                  || {};
        const viv     = vp['$historico_viviendas_terminadas']       || {};
        const deltaP  = vp['$historico_delta_poblacion']            || {};
        const deltaA  = vp['$historico_delta_poblacion_acum']       || {};
        const hogNec  = vp['$historico_hogares_necesarios']         || {};
        const hogAcum = vp['$historico_hogares_necesarios_acum']    || {};
        const vivAcum = vp['$historico_viviendas_terminadas_acum']  || {};
        const saldo   = vp['$historico_saldo_acum']                 || {};

        const años = Object.keys(hogNec).sort();
        if (!años.length) return null;

        const fmt      = window.visorProject.utils.formatearDato;
        const fmtDelta = n => {
            if (n == null || isNaN(n)) return '—';
            const signo = n >= 0 ? '+' : '−';
            return signo + fmt(Math.abs(n), 'entero');
        };

        const dataset = años.map(y => {
            const pobVal  = parseFloat(pob[y]);
            const vivVal  = y in viv ? parseFloat(viv[y]) : null;
            const saldoV  = saldo[y] ?? null;
            const saldoClase = (saldoV ?? 0) >= 0 ? 'col-dato saldo-positivo' : 'col-dato saldo-negativo';

            return {
                etiqueta:    y,
                esDestacada: false,
                celdas: [
                    { valor: !isNaN(pobVal) ? fmt(pobVal, 'entero') : '—',  clase: 'col-dato' },
                    { valor: fmtDelta(deltaP[y]),                           clase: 'col-dato' },
                    { valor: fmtDelta(deltaA[y]),                           clase: 'col-dato' },
                    { valor: fmt(hogNec[y]  || 0, 'entero'),                clase: 'col-dato' },
                    { valor: fmt(hogAcum[y] || 0, 'entero'),                clase: 'col-dato' },
                    { valor: vivVal !== null ? fmt(vivVal, 'entero') : '—', clase: 'col-dato' },
                    { valor: fmt(vivAcum[y] || 0, 'entero'),                clase: 'col-dato' },
                    { valor: saldoV !== null ? fmtDelta(saldoV) : '—',      clase: saldoClase },
                ],
            };
        });

        dataset._cabecerasTabla = [
            'Año',
            'Población',
            'Δ Población',
            'Δ Pob. acum.',
            'Hogares necesarios',
            'Hogares acum.',
            'Viviendas terminadas',
            'Viviendas acum.',
            'Saldo acum.',
        ];
        dataset._columnasCSV = dataset._cabecerasTabla;
        dataset._datosPuros  = this.aplanarParaCSV(dataset);

        return this.crearTabla(config, dataset);
    },
  };

})(window.jQuery, window.Drupal);
