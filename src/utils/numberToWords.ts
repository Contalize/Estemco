export function numberToWords(num: number): string {
    if (num === 0) return 'zero reais';

    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const dezAteDezenove = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    function converterGrupo(n: number): string {
        if (n === 0) return '';
        if (n === 100) return 'cem';

        let texto = '';
        const centena = Math.floor(n / 100);
        const dezena = Math.floor((n % 100) / 10);
        const unidade = n % 10;

        if (centena > 0) {
            texto += centenas[centena];
            if (dezena > 0 || unidade > 0) texto += ' e ';
        }

        if (dezena === 1) {
            texto += dezAteDezenove[unidade];
        } else {
            if (dezena > 1) {
                texto += dezenas[dezena];
                if (unidade > 0) texto += ' e ';
            }
            if (unidade > 0) {
                texto += unidades[unidade];
            }
        }
        return texto;
    }

    const partesMoeda = Math.abs(num).toFixed(2).split('.').map(Number);
    const inteiros = partesMoeda[0];
    const centavos = partesMoeda[1];

    let textoReais = '';

    if (inteiros > 0) {
        if (inteiros < 1000) {
            textoReais = converterGrupo(inteiros);
        } else if (inteiros < 1000000) {
            const milhar = Math.floor(inteiros / 1000);
            const resto = inteiros % 1000;
            textoReais = (milhar === 1 ? 'mil' : converterGrupo(milhar) + ' mil');
            if (resto > 0) {
                if (resto < 100 || resto % 100 === 0) {
                    textoReais += ' e ' + converterGrupo(resto);
                } else {
                    textoReais += ' ' + converterGrupo(resto);
                }
            }
        } else {
            const milhao = Math.floor(inteiros / 1000000);
            const resto = inteiros % 1000000;
            textoReais = converterGrupo(milhao) + (milhao === 1 ? ' milhão' : ' milhões');

            if (resto > 0) {
                const milhar = Math.floor(resto / 1000);
                const restoMilhar = resto % 1000;

                if (milhar > 0) {
                    textoReais += ' ' + (milhar === 1 ? 'mil' : converterGrupo(milhar) + ' mil');
                }

                if (restoMilhar > 0) {
                    if (restoMilhar < 100 || restoMilhar % 100 === 0) {
                        textoReais += ' e ' + converterGrupo(restoMilhar);
                    } else {
                        textoReais += ' ' + converterGrupo(restoMilhar);
                    }
                }
            }
        }

        textoReais += inteiros === 1 ? ' real' : ' reais';
    }

    let textoCentavos = '';
    if (centavos > 0) {
        textoCentavos = converterGrupo(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
    }

    if (textoReais && textoCentavos) {
        return `${textoReais} e ${textoCentavos}`;
    }

    return textoReais || textoCentavos;
}
