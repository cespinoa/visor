var F = {
    _fmt: (v, decimals = 0) => {
        let n = parseFloat(v);
        if (isNaN(n)) return "0";
        let [entero, dec] = n.toFixed(decimals).split('.');
        entero = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        return decimals > 0 ? `${entero},${dec}` : entero;
    },
    num: (v) => F._fmt(v, 0),
    pct: (v) => F._fmt(v, 2) + '%',
    den: (v) => F._fmt(v, 1),

    row: (label, val, pct) => `
        <tr>
            <td class="data-label">${label}</td>
            <td class="data-value">${F.num(val)}</td>
            <td class="data-percent">${F.pct(pct)}</td>
        </tr>`,

    rowRit: (label, valHab, valKm) => `
        <tr>
            <td class="data-label">${label}</td>
            <td class="data-value">${F.den(valHab)}</td>
            <td class="data-value">${F.den(valKm)}</td>
        </tr>`,

    rowDen: (label, val, pct) => `
            <tr>
              <td class="data-label">${label}</td>
              <td class="data-value">${F.den(val)}</td>
              <td class="data-percent">${F.pct(pct)}</td>
            </tr>`,


    kpiRow: (label, m, i, c, tipo, ambito) => {
        // Restauramos tu lógica original de formateo que funciona bien
        const f = tipo === 'num' ? F.num : (tipo === 'pct' ? F.pct : F.den);
        
        const esCanarias = ambito === 'canarias';
        const esIsla = ambito === 'isla';

        return `
            <tr">
                <td>${label}</td>
                
                ${(!esIsla && !esCanarias) ? 
                    `<td>${f(m)}</td>` : ''}
                
                ${(!esCanarias) ? 
                    `<td>${f(i)}</td>` : ''}
                
                <td>${f(c)}</td>
            </tr>`;
    }
};
