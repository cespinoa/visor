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

        this._inyectarFuente(wrapper, config);
        if (config.colapsible) this._activarColapsible(wrapper);
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
    /**
     * Tabla censal de viviendas no habituales por isla.
     * Columnas: isla | 2001 (n, %) | 2011 (n, %) | 2021 (n, %)
     * Orden: Orientales → Centrales → Occidentales, alfabético dentro de cada grupo.
     * Canarias aparece destacada al pie.
     */
    crearTablaCensosIslas: function(config) {
        const vp     = drupalSettings.visorProject || {};
        const census = vp['$censo_viviendas_no_habituales'] || [];
        const snap   = vp.datosDashboard || [];
        const años   = ['2001', '2011', '2021'];

        if (!census.length) return null;

        const fmt    = n => n != null ? Math.round(n).toLocaleString('es-ES') : '—';
        const fmtPct = v => v != null ? v.toFixed(1) + ' %' : '—';

        const ordenTipo = { 'oriental': 0, 'central': 1, 'occidental': 2 };

        // Islas: cruzar censo con snap para obtener etiqueta y tipo_isla
        const islas = census
            .filter(d => d.ambito === 'isla')
            .map(d => {
                const snapIsla = snap.find(s => s.ambito === 'isla' && s.isla_id === d.isla_id) || {};
                return { ...d, etiqueta: snapIsla.etiqueta || 'Isla ' + d.isla_id, tipo_isla: snapIsla.tipo_isla || '' };
            })
            .sort((a, b) => {
                const oa = ordenTipo[a.tipo_isla] ?? 9;
                const ob = ordenTipo[b.tipo_isla] ?? 9;
                if (oa !== ob) return oa - ob;
                return a.etiqueta.localeCompare(b.etiqueta, 'es');
            });

        const canarias = census.find(d => d.ambito === 'canarias');

        // Construir tabla a partir del template base
        const tplBase = document.getElementById('tpl-tabla-base');
        if (!tplBase) return null;

        const fragment = tplBase.content.cloneNode(true);
        const wrapper  = fragment.querySelector('.contenedor-tabla');
        const table    = fragment.querySelector('table');
        const thead    = fragment.querySelector('thead');
        const tbody    = fragment.querySelector('tbody');

        wrapper.querySelector('.tabla-titulo').textContent = config.titulo || 'Viviendas no habituales por isla (censos)';

        // Cabeceras de dos filas
        thead.innerHTML = `
            <tr>
                <th rowspan="2">Isla</th>
                ${años.map(y => `<th colspan="2">${y}</th>`).join('')}
            </tr>
            <tr>
                ${años.map(() => '<th>n</th><th>%</th>').join('')}
            </tr>`;

        const crearFila = (d, etiqueta, destacada) => {
            const tr = document.createElement('tr');
            if (destacada) tr.classList.add('fila-resaltada');
            const celdas = `<th class="col-etiqueta">${etiqueta}</th>`
                + años.map(y =>
                    `<td class="col-dato">${fmt(d['no_hab_' + y])}</td>`
                  + `<td class="col-dato">${fmtPct(d['no_hab_' + y + '_porc'])}</td>`
                ).join('');
            tr.innerHTML = celdas;
            return tr;
        };

        islas.forEach(d => tbody.appendChild(crearFila(d, d.etiqueta, false)));
        if (canarias) tbody.appendChild(crearFila(canarias, 'Canarias', true));

        this._inyectarFuente(wrapper, config);
        if (config.colapsible) this._activarColapsible(wrapper);
        return wrapper;
    },

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

    /**
     * Tabla histórica de turismo: turistas totales, plazas regladas, tasa de
     * ocupación y estancia media, con variación acumulada desde baseYear.
     */
    crearTablaHistoricoTurismo: function(config, props) {
        const vp       = drupalSettings.visorProject || {};
        const baseYear = String(config.baseYear || '2010');
        const fmt      = window.visorProject.utils.formatearDato;
        const ambito   = props.ambito;
        const islaId   = String(props.isla_id || '');

        const filtrar = (ds) => {
            const arr = Array.isArray(ds) ? ds : [];
            if (ambito === 'canarias') return arr.filter(r => r.ambito === 'canarias');
            return arr.filter(r => r.ambito === 'isla' && String(r.isla_id) === islaId);
        };

        const toMap = (ds, yearField, campo) => {
            const m = {};
            filtrar(ds).forEach(r => { m[String(r[yearField])] = parseFloat(r[campo]); });
            return m;
        };

        const llegadas  = toMap(vp['$historicoLlegadas']       || [], 'year',      'turistas');
        const plazas    = toMap(vp['$historicoPlazasRegladas'] || [], 'ejercicio', 'plazas');
        const ocupacion = toMap(vp['$historicoTasaOcupacion']  || [], 'ejercicio', 'tasa');
        const estancia  = toMap(vp['$historico_estancia_media']|| [], 'ejercicio', 'estancia');

        const años = [...new Set([
            ...Object.keys(llegadas),
            ...Object.keys(plazas),
            ...Object.keys(ocupacion),
            ...Object.keys(estancia),
        ])].sort();

        if (!años.length) return null;

        const varPct = (v, base) => {
            if (v == null || base == null || base === 0) return null;
            return (v / base - 1) * 100;
        };
        const fmtVar = v => v != null ? fmt(v, 'decimal_1') + '\u00a0%' : '—';

        const base = {
            turistas:  llegadas[baseYear]  ?? null,
            plazas:    plazas[baseYear]    ?? null,
            ocupacion: ocupacion[baseYear] ?? null,
            estancia:  estancia[baseYear]  ?? null,
        };

        const dataset = años.map(y => {
            const tur = llegadas[y]  ?? null;
            const pla = plazas[y]   ?? null;
            const ocu = ocupacion[y] ?? null;
            const est = estancia[y]  ?? null;
            return {
                etiqueta:    y,
                esDestacada: y === baseYear,
                celdas: [
                    { valor: tur != null ? fmt(tur, 'entero')    : '—', clase: 'col-dato' },
                    { valor: fmtVar(varPct(tur, base.turistas)),          clase: 'col-dato' },
                    { valor: pla != null ? fmt(pla, 'entero')    : '—', clase: 'col-dato' },
                    { valor: fmtVar(varPct(pla, base.plazas)),            clase: 'col-dato' },
                    { valor: ocu != null ? fmt(ocu, 'decimal_1') : '—', clase: 'col-dato' },
                    { valor: fmtVar(varPct(ocu, base.ocupacion)),         clase: 'col-dato' },
                    { valor: est != null ? fmt(est, 'decimal_1') : '—', clase: 'col-dato' },
                    { valor: fmtVar(varPct(est, base.estancia)),          clase: 'col-dato' },
                ],
            };
        });

        const cab = [
            'Año',
            'Turistas',  'Var\u00a0%',
            'Plazas',    'Var\u00a0%',
            'Ocupación', 'Var\u00a0%',
            'Estancia',  'Var\u00a0%',
        ];
        dataset._cabecerasTabla = cab;
        dataset._columnasCSV    = cab;
        dataset._datosPuros     = this.aplanarParaCSV(dataset);

        const wrapper = this.crearTabla(config, dataset);
        if (wrapper) wrapper.querySelector('table').classList.add('tabla-anyo-estrecho');
        return wrapper;
    },

    /**
     * Tabla derivada de turismo reglado vs vacacional.
     *
     * Fórmula: T. reglados = (ocupacion/100) × plazas × 365 / estancia_media
     * T. vacacionales = turistas_totales − T. reglados
     *
     * Para canarias: suma isla a isla con las 5 islas de la E16028B (excluye
     * El Hierro y La Gomera que no están en esa encuesta). Se añade nota al pie.
     * Para isla: cálculo directo con los datos de esa isla.
     */
    crearTablaHistoricoTurismoDerivado: function(config, props) {
        const vp       = drupalSettings.visorProject || {};
        const baseYear    = String(config.baseYear    || '2010');
        const baseYearVac = String(config.baseYearVac || '2012');
        const fmt      = window.visorProject.utils.formatearDato;
        const ambito   = props.ambito;
        const islaId   = String(props.isla_id || '');

        const filtrar = (ds) => {
            const arr = Array.isArray(ds) ? ds : [];
            if (ambito === 'canarias') return arr.filter(r => r.ambito === 'canarias');
            return arr.filter(r => r.ambito === 'isla' && String(r.isla_id) === islaId);
        };

        const toMap = (ds, yearField, campo) => {
            const m = {};
            filtrar(ds).forEach(r => { m[String(r[yearField])] = parseFloat(r[campo]); });
            return m;
        };

        const toMapIslas = (ds, yearField, campo) => {
            const m = {};
            (Array.isArray(ds) ? ds : [])
                .filter(r => r.ambito === 'isla')
                .forEach(r => {
                    const y = String(r[yearField]);
                    if (!m[y]) m[y] = {};
                    m[y][String(r.isla_id)] = parseFloat(r[campo]);
                });
            return m;
        };

        const llegadas  = toMap(vp['$historicoLlegadas']       || [], 'year',      'turistas');
        const plazas    = toMap(vp['$historicoPlazasRegladas'] || [], 'ejercicio', 'plazas');
        const ocupacion = toMap(vp['$historicoTasaOcupacion']  || [], 'ejercicio', 'tasa');
        const estancia  = toMap(vp['$historico_estancia_media']|| [], 'ejercicio', 'estancia');

        const años = [...new Set([
            ...Object.keys(llegadas),
            ...Object.keys(plazas),
            ...Object.keys(ocupacion),
            ...Object.keys(estancia),
        ])].sort();

        if (!años.length) return null;

        // Calcular T. reglados por año
        const tReglados = {};
        if (ambito === 'canarias') {
            const islaIdsConLlegadas = new Set(
                (vp['$historicoLlegadas'] || [])
                    .filter(r => r.ambito === 'isla')
                    .map(r => String(r.isla_id))
            );
            const plazasIsla    = toMapIslas(vp['$historicoPlazasRegladas'] || [], 'ejercicio', 'plazas');
            const ocupacionIsla = toMapIslas(vp['$historicoTasaOcupacion']  || [], 'ejercicio', 'tasa');
            const estanciaIsla  = toMapIslas(vp['$historico_estancia_media']|| [], 'ejercicio', 'estancia');
            años.forEach(y => {
                let suma = 0;
                for (const iid of islaIdsConLlegadas) {
                    const pl = (plazasIsla[y]    || {})[iid];
                    const oc = (ocupacionIsla[y]  || {})[iid];
                    const es = (estanciaIsla[y]   || {})[iid];
                    if (pl != null && oc != null && es != null && es > 0) {
                        suma += (oc / 100) * pl * 365 / es;
                    }
                }
                if (islaIdsConLlegadas.size > 0) tReglados[y] = suma;
            });
        } else {
            años.forEach(y => {
                const oc = ocupacion[y], pl = plazas[y], es = estancia[y];
                if (oc != null && pl != null && es != null && es > 0) {
                    tReglados[y] = (oc / 100) * pl * 365 / es;
                }
            });
        }

        const varPct = (v, base) => {
            if (v == null || base == null || base === 0) return null;
            return (v / base - 1) * 100;
        };
        const fmtVar = v => v != null ? fmt(v, 'decimal_1') + '\u00a0%' : '—';

        const tVacBase = (() => {
            const t = llegadas[baseYearVac] ?? null;
            const r = tReglados[baseYearVac] ?? null;
            return (t != null && r != null) ? t - r : null;
        })();

        const base = {
            tReglados: tReglados[baseYear] ?? null,
        };

        const dataset = años.map(y => {
            const tur  = llegadas[y]  ?? null;
            const treg = tReglados[y] ?? null;
            const tvac = (tur != null && treg != null) ? tur - treg : null;
            return {
                etiqueta:    y,
                esDestacada: y === baseYear,
                celdas: [
                    { valor: treg != null ? fmt(treg, 'entero') : '—', clase: 'col-dato' },
                    { valor: fmtVar(varPct(treg, base.tReglados)),       clase: 'col-dato' },
                    { valor: tvac != null ? fmt(tvac, 'entero') : '—', clase: 'col-dato' },
                    { valor: y > baseYearVac ? fmtVar(varPct(tvac, tVacBase)) : '—', clase: 'col-dato' },
                ],
            };
        });

        const cab = [
            'Año',
            'T. reglados',    'Var\u00a0%',
            'T. vacacionales','Var\u00a0%',
        ];
        dataset._cabecerasTabla = cab;
        dataset._columnasCSV    = cab;
        dataset._datosPuros     = this.aplanarParaCSV(dataset);

        const wrapper = this.crearTabla(config, dataset);
        if (!wrapper) return null;
        wrapper.querySelector('table').classList.add('tabla-anyo-estrecho');

        const fuenteDiv = this._inyectarFuente(wrapper, config);

        // Nota al pie solo para canarias: El Hierro y La Gomera excluidos
        if (ambito === 'canarias') {
            const nota = document.createElement('p');
            nota.className = 'tabla-nota-metodologica';
            nota.textContent = 'Nota: El Hierro y La Gomera no están incluidos en la Encuesta de Turismo Receptor (E16028B/Frontur-Canarias). Los turistas reglados de ambas islas (~141.000 en 2025) no se suman al total para mantener consistencia con el dato de llegadas totales. El efecto sobre el resultado es inferior al 1\u00a0%.';
            fuenteDiv.prepend(nota);
        }

        return wrapper;
    },

    /**
     * Calcula T. reglados y T. vacacionales para el ámbito activo (props)
     * y devuelve un objeto plano con los valores del último año disponible.
     *
     * Se inyecta en drupalSettings como $turismo_derivado_ultimo antes de
     * llamar a _prefetchLongtexts, quedando disponible en longtexts como:
     *   {{ turismo_derivado_ultimo.anyo }}
     *   {{ turismo_derivado_ultimo.t_reglados }}
     *   {{ turismo_derivado_ultimo.t_vacacionales }}
     *   {{ turismo_derivado_ultimo.var_tr }}     (var% desde 2010, con signo)
     *   {{ turismo_derivado_ultimo.var_tv }}     (var% desde 2012, con signo)
     *   {{ turismo_derivado_ultimo.total }}
     */
    calcularTurismoDerivadoUltimo: function(props) {
        const vp      = drupalSettings.visorProject || {};
        const baseYear    = '2010';
        const baseYearVac = '2012';
        const fmt     = window.visorProject.utils.formatearDato;
        const ambito  = props.ambito;
        const islaId  = String(props.isla_id || '');

        const filtrar = (ds) => {
            const arr = Array.isArray(ds) ? ds : [];
            if (ambito === 'canarias') return arr.filter(r => r.ambito === 'canarias');
            return arr.filter(r => r.ambito === 'isla' && String(r.isla_id) === islaId);
        };
        const toMap = (ds, yearField, campo) => {
            const m = {};
            filtrar(ds).forEach(r => { m[String(r[yearField])] = parseFloat(r[campo]); });
            return m;
        };
        const toMapIslas = (ds, yearField, campo) => {
            const m = {};
            (Array.isArray(ds) ? ds : []).filter(r => r.ambito === 'isla').forEach(r => {
                const y = String(r[yearField]);
                if (!m[y]) m[y] = {};
                m[y][String(r.isla_id)] = parseFloat(r[campo]);
            });
            return m;
        };

        const llegadas  = toMap(vp['$historicoLlegadas']       || [], 'year',      'turistas');
        const plazas    = toMap(vp['$historicoPlazasRegladas'] || [], 'ejercicio', 'plazas');
        const ocupacion = toMap(vp['$historicoTasaOcupacion']  || [], 'ejercicio', 'tasa');
        const estancia  = toMap(vp['$historico_estancia_media']|| [], 'ejercicio', 'estancia');

        const años = [...new Set([
            ...Object.keys(llegadas), ...Object.keys(plazas),
            ...Object.keys(ocupacion), ...Object.keys(estancia),
        ])].sort();

        if (!años.length) return {};

        // T. reglados por año (misma lógica que crearTablaHistoricoTurismoDerivado)
        const tReglados = {};
        if (ambito === 'canarias') {
            const islaIdsConLlegadas = new Set(
                (vp['$historicoLlegadas'] || []).filter(r => r.ambito === 'isla').map(r => String(r.isla_id))
            );
            const plazasIsla    = toMapIslas(vp['$historicoPlazasRegladas'] || [], 'ejercicio', 'plazas');
            const ocupacionIsla = toMapIslas(vp['$historicoTasaOcupacion']  || [], 'ejercicio', 'tasa');
            const estanciaIsla  = toMapIslas(vp['$historico_estancia_media']|| [], 'ejercicio', 'estancia');
            años.forEach(y => {
                let suma = 0;
                for (const iid of islaIdsConLlegadas) {
                    const pl = (plazasIsla[y]    || {})[iid];
                    const oc = (ocupacionIsla[y]  || {})[iid];
                    const es = (estanciaIsla[y]   || {})[iid];
                    if (pl != null && oc != null && es != null && es > 0) suma += (oc / 100) * pl * 365 / es;
                }
                if (islaIdsConLlegadas.size > 0) tReglados[y] = suma;
            });
        } else {
            años.forEach(y => {
                const oc = ocupacion[y], pl = plazas[y], es = estancia[y];
                if (oc != null && pl != null && es != null && es > 0)
                    tReglados[y] = (oc / 100) * pl * 365 / es;
            });
        }

        // Último año con todos los datos disponibles
        const ultimoAño = [...años].reverse().find(y =>
            llegadas[y] != null && tReglados[y] != null
        );
        if (!ultimoAño) return {};

        const tur  = llegadas[ultimoAño];
        const treg = Math.round(tReglados[ultimoAño]);
        const tvac = Math.round(tur - treg);

        const varPct = (v, base) => (v != null && base != null && base !== 0)
            ? ((v / base - 1) * 100) : null;

        const tRegBase = tReglados[baseYear]    ? Math.round(tReglados[baseYear]) : null;
        const tVacBase = (llegadas[baseYearVac] != null && tReglados[baseYearVac] != null)
            ? Math.round(llegadas[baseYearVac] - tReglados[baseYearVac]) : null;

        const varTr = varPct(treg, tRegBase);
        const varTv = varPct(tvac, tVacBase);

        const fmtVar = v => v != null
            ? (v >= 0 ? '+' : '') + fmt(v, 'decimal_1') + '\u00a0%'
            : '—';

        // ── Pendientes por tramo (2010-2017 / 2017-fin), excluyendo COVID ──
        const PIVOTE  = '2017';
        const COVID   = new Set(['2020', '2021', '2022']);

        // Regresión lineal — devuelve solo la pendiente
        const lrPendiente = (puntos) => {
            if (puntos.length < 2) return null;
            const n   = puntos.length;
            const sx  = puntos.reduce((s, p) => s + p.x, 0);
            const sy  = puntos.reduce((s, p) => s + p.y, 0);
            const sx2 = puntos.reduce((s, p) => s + p.x * p.x, 0);
            const sxy = puntos.reduce((s, p) => s + p.x * p.y, 0);
            const den = n * sx2 - sx * sx;
            return den ? (n * sxy - sx * sy) / den : null;
        };

        // Valores de cada serie en millones (eje X = posición del año en el array)
        const regM = años.map(y => tReglados[y] != null ? tReglados[y] / 1e6 : null);
        const vacM = años.map(y => {
            const t = llegadas[y], r = tReglados[y];
            return (t != null && r != null) ? (t - r) / 1e6 : null;
        });

        const iPivote = años.indexOf(PIVOTE);
        const slopeTramo = (serie, iDesde, iHasta) => {
            const pts = [];
            for (let i = iDesde; i <= iHasta && i < años.length; i++) {
                if (!COVID.has(años[i]) && serie[i] != null) pts.push({ x: i, y: serie[i] });
            }
            return lrPendiente(pts);
        };

        let pRegA = null, pRegB = null, pVacA = null, pVacB = null;
        if (iPivote >= 0) {
            pRegA = slopeTramo(regM, 0,        iPivote);
            pRegB = slopeTramo(regM, iPivote,  años.length - 1);
            pVacA = slopeTramo(vacM, 0,        iPivote);
            pVacB = slopeTramo(vacM, iPivote,  años.length - 1);
        }

        // Categoría: compara pendientes de ambos tramos.
        // Umbral: diferencia > 0,1 M/año (~100.000 turistas/año) para llamarlo cambio.
        const categTend = (a, b) => {
            if (a == null || b == null) return '—';
            if (b - a >  0.10) return 'incremento';
            if (b - a < -0.10) return 'descenso';
            return 'estable';
        };

        // Formato de pendiente: "+0,35 M/año" con signo explícito
        const fmtP = v => v != null
            ? (v >= 0 ? '+' : '−') + fmt(Math.abs(v), 'decimal_2') + '\u00a0M/año'
            : '—';

        return {
            anyo:              ultimoAño,
            total:             fmt(tur,  'entero'),
            t_reglados:        fmt(treg, 'entero'),
            t_vacacionales:    fmt(tvac, 'entero'),
            var_tr:            fmtVar(varTr),
            var_tv:            fmtVar(varTv),
            // Pendientes por tramo
            pend_reg_a:        fmtP(pRegA),
            pend_reg_b:        fmtP(pRegB),
            pend_vac_a:        fmtP(pVacA),
            pend_vac_b:        fmtP(pVacB),
            tend_reg:          categTend(pRegA, pRegB),
            tend_vac:          categTend(pVacA, pVacB),
            // Valores numéricos sin formato
            total_n:           Math.round(tur),
            t_reglados_n:      treg,
            t_vacacionales_n:  tvac,
            pend_reg_a_n:      pRegA != null ? Math.round(pRegA * 1e5) / 1e5 : null,
            pend_reg_b_n:      pRegB != null ? Math.round(pRegB * 1e5) / 1e5 : null,
            pend_vac_a_n:      pVacA != null ? Math.round(pVacA * 1e5) / 1e5 : null,
            pend_vac_b_n:      pVacB != null ? Math.round(pVacB * 1e5) / 1e5 : null,
        };
    },

    calcularEcepovDerivadoUltimo: function(props) {
        const fmt = window.visorProject.utils.formatearDato;
        const censo  = parseFloat(props.viviendas_habituales);
        const ecepov = parseFloat(props.hogares_total);
        if (isNaN(censo) || isNaN(ecepov) || ecepov === 0) return {};

        const dif    = censo - ecepov;
        const difPct = (dif / ecepov) * 100;

        const signo = n => (n >= 0 ? '+' : '') + fmt(n, 'entero');
        const signoPct = n => (n >= 0 ? '+' : '') + fmt(n, 'decimal_1') + '\u00a0%';

        return {
            censo:       fmt(censo,  'entero'),
            ecepov:      fmt(ecepov, 'entero'),
            dif:         signo(dif),
            dif_pct:     signoPct(difPct),
            censo_n:     Math.round(censo),
            ecepov_n:    Math.round(ecepov),
            dif_n:       Math.round(dif),
            dif_pct_n:   Math.round(difPct * 10) / 10,
        };
    },

    calcularHogarDerivadoUltimo: function(props) {
        const vp     = drupalSettings.visorProject || {};
        const fmt    = window.visorProject.utils.formatearDato;
        const ambito = props.ambito;
        const islaId = String(props.isla_id || '');
        const muniId = String(props.municipio_id || '');

        const filtrar = (ds) => {
            const arr = Array.isArray(ds) ? ds : [];
            if (ambito === 'canarias') return arr.filter(r => r.ambito === 'canarias');
            if (ambito === 'isla')     return arr.filter(r => r.ambito === 'isla' && String(r.isla_id) === islaId);
            return arr.filter(r => r.ambito === 'municipio' && String(r.municipio_id) === muniId);
        };

        const registros = filtrar(vp['$personas_hogar'] || []);
        if (!registros.length) return {};

        const hogarMap = {};
        registros.forEach(r => { hogarMap[String(r.year)] = parseFloat(r.miembros); });

        // Datos censales: 1981, 1991, 2001, 2011, 2021
        const años = Object.keys(hogarMap).sort();
        if (años.length < 2) return {};

        const ultimoAño = años[años.length - 1];

        // Tramo A: 1981–2011 (4 puntos); tramo B: 2011–2021 (2 puntos).
        // x = año real → pendiente en p/año.
        const PIVOTE = '2011';

        const lrPendiente = (puntos) => {
            if (puntos.length < 2) return null;
            const n   = puntos.length;
            const sx  = puntos.reduce((s, p) => s + p.x, 0);
            const sy  = puntos.reduce((s, p) => s + p.y, 0);
            const sx2 = puntos.reduce((s, p) => s + p.x * p.x, 0);
            const sxy = puntos.reduce((s, p) => s + p.x * p.y, 0);
            const den = n * sx2 - sx * sx;
            return den ? (n * sxy - sx * sy) / den : null;
        };

        const slopeTramo = (iDesde, iHasta) => {
            const pts = [];
            for (let i = iDesde; i <= iHasta && i < años.length; i++) {
                const v = hogarMap[años[i]];
                if (v != null) pts.push({ x: parseInt(años[i]), y: v });
            }
            return lrPendiente(pts);
        };

        const iPivote = años.indexOf(PIVOTE);
        let pHogarA = null, pHogarB = null;
        if (iPivote >= 0) {
            pHogarA = slopeTramo(0,       iPivote);
            pHogarB = slopeTramo(iPivote, años.length - 1);
        }

        const v2011 = hogarMap[PIVOTE];
        const v2021 = hogarMap[ultimoAño];
        const delta  = (v2011 != null && v2021 != null) ? v2021 - v2011 : null;

        // Categoría basada en delta 2011–2021 y comparación con tendencia histórica.
        // Umbral estabilidad: ±0,05 p en la década (≈ ±0,005 p/año).
        const categTend = (d, pA, pB) => {
            if (d == null) return '—';
            if (d >  0.05) return 'sube';            // 2021 > 2011
            if (d > -0.05) return 'estable';         // sin cambio significativo
            // 2021 < 2011: distinguir si la bajada se modera o se mantiene
            if (pA != null && pB != null && pB > pA) return 'baja_modera';      // ritmo se reduce
            return 'baja_consistente';               // ritmo se mantiene o acelera
        };

        const fmtP = v => v != null
            ? (v >= 0 ? '+' : '\u2212') + fmt(Math.abs(v), 'decimal_3') + '\u00a0p/año'
            : '—';
        const fmtD = v => v != null
            ? (v >= 0 ? '+' : '\u2212') + fmt(Math.abs(v), 'decimal_2')
            : '—';

        const tendUltimo = categTend(delta, pHogarA, pHogarB);

        const variacion2021 = parseFloat(props.tamanio_hogar_variacion_2021);
        const tend2021Hoy = isNaN(variacion2021) ? '—'
            : variacion2021 >  0.05 ? 'sube'
            : variacion2021 < -0.05 ? 'baja'
            : 'estable';

        const tend1simple = tendUltimo.startsWith('baja') ? 'baja'
            : tendUltimo === 'estable' ? 'estable'
            : tendUltimo === 'sube' ? 'sube'
            : '—';

        const tendCombinada = (tend1simple !== '—' && tend2021Hoy !== '—')
            ? tend1simple + '_' + tend2021Hoy
            : '—';

        return {
            anyo:              ultimoAño,
            valor:             fmt(v2021, 'decimal_2'),
            valor_2011:        v2011 != null ? fmt(v2011, 'decimal_2') : '—',
            delta_ultimo:      fmtD(delta),
            pend_historica:    fmtP(pHogarA),
            pend_reciente:     fmtP(pHogarB),
            tend_ultimo:       tendUltimo,
            tend_2021_hoy:     tend2021Hoy,
            tend_combinada:    tendCombinada,
            valor_n:           v2021 != null ? Math.round(v2021 * 1e3) / 1e3 : null,
            valor_2011_n:      v2011 != null ? Math.round(v2011 * 1e3) / 1e3 : null,
            delta_ultimo_n:    delta != null ? Math.round(delta * 1e4) / 1e4 : null,
            pend_historica_n:  pHogarA != null ? Math.round(pHogarA * 1e7) / 1e7 : null,
            pend_reciente_n:   pHogarB != null ? Math.round(pHogarB * 1e7) / 1e7 : null,
        };
    },

    crearTablaEcepovDiferencia: function(config) {
        const snap    = (drupalSettings.visorProject || {}).datosDashboard || [];
        const fmt     = v => window.visorProject.utils.formatearDato(v, 'entero');
        const fmtPct  = v => v != null
            ? (v >= 0 ? '+' : '') + window.visorProject.utils.formatearDato(v, 'decimal_1') + '\u00a0%'
            : '—';
        const fmtDif  = v => v != null
            ? (v >= 0 ? '+' : '') + window.visorProject.utils.formatearDato(v, 'entero')
            : '—';

        // Orientales → Centrales → Occidentales, alfabético dentro de cada grupo
        const ordenIsla = { 2: 1, 6: 2, 3: 3, 7: 4, 1: 5, 4: 6, 5: 7 };
        const islas = snap
            .filter(d => d.ambito === 'isla')
            .sort((a, b) => (ordenIsla[a.isla_id] || 99) - (ordenIsla[b.isla_id] || 99));
        const canarias = snap.find(d => d.ambito === 'canarias');

        const tpl = document.getElementById('tpl-tabla-base');
        if (!tpl) return null;
        const wrapper = tpl.content.cloneNode(true).querySelector('.contenedor-tabla');

        wrapper.querySelector('.tabla-titulo').textContent = config.titulo;

        const thead = wrapper.querySelector('thead tr');
        ['Isla / Territorio', 'Censo', 'ECEPOV', 'Diferencia', 'Dif.\u00a0%'].forEach((texto, i) => {
            const th = document.createElement('th');
            th.className = i === 0 ? 'col-etiqueta' : 'col-dato';
            th.textContent = texto;
            thead.appendChild(th);
        });

        const tbody = wrapper.querySelector('tbody');
        const crearFila = (d, etiqueta, destacada) => {
            const censo  = parseFloat(d.viviendas_habituales);
            const ecepov = parseFloat(d.hogares_total);
            const dif    = !isNaN(censo) && !isNaN(ecepov) ? censo - ecepov : null;
            const difPct = dif != null && ecepov !== 0 ? (dif / ecepov) * 100 : null;
            const tr = document.createElement('tr');
            if (destacada) tr.classList.add('fila-resaltada');
            tr.innerHTML = `<th class="col-etiqueta">${etiqueta}</th>`
                + `<td class="col-dato">${fmt(censo)}</td>`
                + `<td class="col-dato">${fmt(ecepov)}</td>`
                + `<td class="col-dato">${fmtDif(dif)}</td>`
                + `<td class="col-dato">${fmtPct(difPct)}</td>`;
            return tr;
        };

        islas.forEach(d => tbody.appendChild(crearFila(d, d.etiqueta, false)));
        if (canarias) tbody.appendChild(crearFila(canarias, 'Canarias', true));

        this._inyectarFuente(wrapper, config);
        return wrapper;
    },

    _inyectarFuente: function(wrapper, config) {
        const div = document.createElement('div');
        div.className = 'tabla-fuente';
        if (config.fuente || config.fecha) {
            const p = document.createElement('p');
            p.className = 'tabla-fuente-dato';
            const parts = [];
            if (config.fuente) parts.push('Fuente: ' + config.fuente);
            if (config.fecha) parts.push('Datos: ' + config.fecha);
            p.textContent = parts.join(' · ');
            div.appendChild(p);
        }
        wrapper.appendChild(div);
        return div;
    },

    _activarColapsible: function(wrapper) {
        wrapper.classList.add('tabla-colapsible', 'tabla-colapsada');
        const header = wrapper.querySelector('.tabla-header');
        const titulo = wrapper.querySelector('.tabla-titulo');

        const tableIcon = document.createElement('i');
        tableIcon.className = 'material-icons tabla-tipo-icon';
        tableIcon.textContent = 'table_chart';
        titulo.prepend(tableIcon);

        const chevron = document.createElement('span');
        chevron.className = 'tabla-toggle-icon';
        titulo.appendChild(chevron);

        header.addEventListener('click', () => {
            wrapper.classList.toggle('tabla-colapsada');
        });
    },
  };

})(window.jQuery, window.Drupal);
