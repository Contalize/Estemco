export function numberToWords(value: number): string {
    if (value === 0) return 'zero reais';

    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const dezenas10 = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cem', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    function getGroupWords(n: number): string {
        if (n === 0) return '';
        if (n === 100) return 'cem';

        const c = Math.floor(n / 100);
        const currD = n % 100;
        const d = Math.floor(currD / 10);
        const u = currD % 10;

        let res = [];
        if (c > 0) {
            if (c === 1 && currD > 0) res.push('cento');
            else res.push(centenas[c]);
        }

        if (d === 1) {
            res.push(dezenas10[u]);
        } else {
            if (d > 1) res.push(dezenas[d]);
            if (u > 0) res.push(unidades[u]);
        }

        return res.join(' e ');
    }

    // Handle rounding issues with floats
    const valString = value.toFixed(2);
    const parts = valString.split('.');
    const reaisPart = parseInt(parts[0], 10);
    const centavosPart = parseInt(parts[1], 10);

    let words = [];

    if (reaisPart > 0) {
        const milhoes = Math.floor(reaisPart / 1000000);
        const milhares = Math.floor((reaisPart % 1000000) / 1000);
        const centenasPart = reaisPart % 1000;

        if (milhoes > 0) {
            words.push(getGroupWords(milhoes) + (milhoes === 1 ? ' milhão' : ' milhões'));
        }

        if (milhares > 0) {
            const g = getGroupWords(milhares);
            if (g === 'um' && milhoes === 0) {
                words.push('mil');
            } else {
                words.push(g + ' mil');
            }
        }

        if (centenasPart > 0) {
            const g = getGroupWords(centenasPart);
            if (words.length > 0) {
                if (centenasPart <= 100 || centenasPart % 100 === 0) words.push('e ' + g);
                else words.push(g);
            } else {
                words.push(g);
            }
        }

        const reaisText = reaisPart === 1 ? 'real' : 'reais';
        if (reaisPart % 1000000 === 0 && reaisPart > 0) words.push('de ' + reaisText);
        else words.push(reaisText);
    }

    const reaisStr = words.join(' ').replace(/\s+/g, ' ').trim();

    if (centavosPart > 0) {
        const centavosWords = getGroupWords(centavosPart);
        const centavosStr = centavosWords + (centavosPart === 1 ? ' centavo' : ' centavos');

        if (reaisPart > 0) return `${reaisStr} e ${centavosStr}`;
        return centavosStr;
    }

    return reaisStr;
}
