// Preços padrão (espelham as configurações do Firestore)
export const PRECOS_HCM: Record<number, number> = {
    300: 40,
    400: 46,
    500: 60,
};

export const PRECOS_ESC: Record<number, number> = {
    25: 12.5,
    30: 15,
    40: 20,
};

export const CONFIG_SPT = {
    precoPorMetro: 75,
    mobilizacao: 600,
    art: 108.39,
    metragemMinima: 40,
    sinalFixo: 1500,
};

export const MOBILIZACAO_HCM = 4000;
export const MOBILIZACAO_ESC = 500;
export const MINIMO_DIARIO_HCM_DEFAULT = 8000; 
export const MINIMO_OBRA_ESC_DEFAULT = 3000;   

import { ItemProposta, TipoServico } from '../../types';

export interface ResultadoCalculo {
    subtotalExecucao: number;
    valorMobilizacao: number;
    valorART: number;
    valorImposto: number;
    valorTotal: number;
    valorSinal: number;
    valorSaldo: number;
    linhasDetalhadas: { descricao: string; valor: number; destaque?: boolean }[];
    condicoesPagamento: string;
}

// ─── HCM ─────────────────────────────────────────────────────
export function calcularPropostaHCM(
    itens: ItemProposta[],
    mobilizacao: number = MOBILIZACAO_HCM,
    faturamentoMinimo: number = MINIMO_DIARIO_HCM_DEFAULT,
    incluirART: boolean = true,
    valorART: number = 0,
    emiteNF: boolean = false,
    percentualNF: number = 0
): ResultadoCalculo {
    const linhas = [];
    let subtotal = 0;

    for (const item of itens) {
        linhas.push({
            descricao: `Ø${item.diametro}mm — ${item.quantidadeEstacas} estacas × ${item.comprimentoUnitario}m = ${item.totalMetros}m × R$ ${item.precoMetro}/m`,
            valor: item.subtotal || 0,
        });
        subtotal += item.subtotal || 0;
    }

    linhas.push({ descricao: 'Mobilização e desmobilização', valor: mobilizacao });
    
    let art = 0;
    if (incluirART && valorART > 0) {
        art = valorART;
        linhas.push({ descricao: 'ART (Anotação de Responsabilidade Técnica)', valor: art });
    }

    const totalSemImposto = subtotal + mobilizacao + art;
    let imposto = 0;
    if (emiteNF && percentualNF > 0) {
        imposto = totalSemImposto * (percentualNF / 100);
        linhas.push({ descricao: `Impostos / Nota Fiscal (${percentualNF}%)`, valor: imposto });
    }

    const total = totalSemImposto + imposto;
    const sinal = total * 0.5;

    return {
        subtotalExecucao: subtotal,
        valorMobilizacao: mobilizacao,
        valorART: art,
        valorImposto: imposto,
        valorTotal: total,
        valorSinal: sinal,
        valorSaldo: total - sinal,
        linhasDetalhadas: linhas,
        condicoesPagamento:
            '50% de sinal em até 3 dias após a assinatura + 50% do saldo em até 7 dias após a entrega da medição.',
    };
}

// ─── ESC ─────────────────────────────────────────────────────
export function calcularPropostaESC(
    itens: ItemProposta[],
    mobilizacao: number = MOBILIZACAO_ESC,
    modalidade: 'por_metro' | 'preco_fechado' | 'saida_diaria' = 'por_metro',
    precoFechado?: number,
    metrosDiarios?: number,
    precoExcedente?: number,
    faturamentoMinimo: number = MINIMO_OBRA_ESC_DEFAULT,
    incluirART: boolean = true,
    valorART: number = 0,
    emiteNF: boolean = false,
    percentualNF: number = 0
): ResultadoCalculo {
    const linhas = [];
    let subtotal = 0;

    if (modalidade === 'preco_fechado' && precoFechado) {
        linhas.push({ descricao: 'Execução — Preço fechado', valor: precoFechado });
        subtotal = precoFechado;
    } else if (modalidade === 'saida_diaria') {
        for (const item of itens) {
            linhas.push({
                descricao: `Ø${item.diametro}cm — Saída diária ${metrosDiarios}m/dia | ${item.totalMetros}m × R$ ${item.precoMetro}/m`,
                valor: item.subtotal || 0,
            });
            subtotal += item.subtotal || 0;
        }
        linhas.push({
            descricao: `Excedente acima de ${metrosDiarios}m/dia: R$ ${precoExcedente}/m (cobrado na medição)`,
            valor: 0,
        });
    } else {
        for (const item of itens) {
            linhas.push({
                descricao: `Ø${item.diametro}cm — ${item.quantidadeEstacas} estacas × ${item.comprimentoUnitario}m = ${item.totalMetros}m × R$ ${item.precoMetro}/m`,
                valor: item.subtotal || 0,
            });
            subtotal += item.subtotal || 0;
        }
    }

    linhas.push({ descricao: 'Mobilização e desmobilização', valor: mobilizacao });
    
    let art = 0;
    if (incluirART && valorART > 0) {
        art = valorART;
        linhas.push({ descricao: 'ART (Anotação de Responsabilidade Técnica)', valor: art });
    }

    const totalBase = subtotal + mobilizacao + art;
    // REGRA: mínimo é da OBRA, não diário
    const totalSemNF = Math.max(totalBase, faturamentoMinimo);

    if (totalSemNF > totalBase) {
        linhas.push({
            descricao: `Ajuste faturamento mínimo da obra (R$ ${faturamentoMinimo.toLocaleString('pt-BR')})`,
            valor: totalSemNF - totalBase,
            destaque: true,
        });
    }

    let imposto = 0;
    if (emiteNF && percentualNF > 0) {
        imposto = totalSemNF * (percentualNF / 100);
        linhas.push({ descricao: `Impostos / Nota Fiscal (${percentualNF}%)`, valor: imposto });
    }

    const total = totalSemNF + imposto;
    const sinal = total * 0.5;

    return {
        subtotalExecucao: subtotal,
        valorMobilizacao: mobilizacao,
        valorART: art,
        valorImposto: imposto,
        valorTotal: total,
        valorSinal: sinal,
        valorSaldo: total - sinal,
        linhasDetalhadas: linhas,
        condicoesPagamento:
            '50% de sinal na assinatura da proposta + 50% do saldo em até 3 dias após a entrega do relatório de execução.',
    };
}

// ─── SPT ─────────────────────────────────────────────────────
export function calcularPropostaSPT(
    furos: { profundidade: number }[],
    mobilizacao: number = CONFIG_SPT.mobilizacao,
    incluirART: boolean = true,
    valorART: number = CONFIG_SPT.art,
    emiteNF: boolean = false,
    percentualNF: number = 0
): ResultadoCalculo {
    const totalMetros = furos.reduce((acc, f) => acc + f.profundidade, 0);
    const metrosFaturados = Math.max(totalMetros, CONFIG_SPT.metragemMinima);
    const execucao = metrosFaturados * CONFIG_SPT.precoPorMetro;

    const linhas = [
        {
            descricao: `Sondagem SPT — ${furos.length} furo(s) | ${totalMetros.toFixed(1)}m${totalMetros < CONFIG_SPT.metragemMinima ? ` (mínimo ${CONFIG_SPT.metragemMinima}m)` : ''} × R$ ${CONFIG_SPT.precoPorMetro}/m`,
            valor: execucao,
        },
        { descricao: 'Mobilização + laboratório + locomoção', valor: mobilizacao },
    ];

    let art = 0;
    if (incluirART) {
        art = valorART;
        linhas.push({ descricao: 'ART (Anotação de Responsabilidade Técnica)', valor: art });
    }

    const totalSemNF = execucao + mobilizacao + art;
    
    let imposto = 0;
    if (emiteNF && percentualNF > 0) {
        imposto = totalSemNF * (percentualNF / 100);
        linhas.push({ descricao: `Impostos / Nota Fiscal (${percentualNF}%)`, valor: imposto });
    }

    const total = totalSemNF + imposto;
    // REGRA: sinal FIXO R$ 1.500, não percentual
    const sinal = Math.min(CONFIG_SPT.sinalFixo, total);

    return {
        subtotalExecucao: execucao,
        valorMobilizacao: mobilizacao,
        valorART: art,
        valorImposto: imposto,
        valorTotal: total,
        valorSinal: sinal,
        valorSaldo: total - sinal,
        linhasDetalhadas: linhas,
        condicoesPagamento:
            'Sinal fixo de R$ 1.500,00 para agendamento + saldo na entrega do relatório. Parcelamento cartão em até 4x (taxa por conta do contratante). Prazo: 5 dias úteis.',
    };
}

// Gerador de número movido para src/lib/numeracao.ts (Atômico com runTransaction)

export const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
