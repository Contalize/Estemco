// src/services/templateService.ts
// Busca o template de proposta do Google Drive e injeta variáveis.
// O texto fica no Drive — edita lá, reflete imediatamente no PDF gerado.

// ── IDs dos templates no Google Drive ────────────────────────────────────────
// Cada tipo de proposta pode ter seu próprio template
export const TEMPLATE_IDS = {
    HCM: '1Bq2xJqwYPniMGXFWSyyhg-SGArIbeN48z6FAT-wVA1w', // << seu doc atual
    ESC: '1Bq2xJqwYPniMGXFWSyyhg-SGArIbeN48z6FAT-wVA1w', // Mude para o ESC quando criar
    SPT: '1Bq2xJqwYPniMGXFWSyyhg-SGArIbeN48z6FAT-wVA1w', // Mude para o SPT quando criar
};

// ── Variáveis usadas no template ─────────────────────────────────────────────
export interface TemplateVars {
    TIPO_ESTACA_INPUT: string;           // Ex: "HÉLICE CONTÍNUA MONITORADA"
    HELPER_DATA_PROPOSTA_TXT: string;    // Ex: "18 de março de 2026"
    NOME_CLIENTE_INPUT: string;
    ENDERECO_CLIENTE_INPUT: string;
    NUM_PROPOSTA_INPUT: string;          // Ex: "5014-HCM"
    VALIDADE_DIAS_INPUT: string;         // Ex: "15"
    HELPER_DIAMETRO_TXT: string;         // Ex: "Ø40cm"
    HELPER_QTD_COMP_TXT: string;         // Ex: "20 estacas x 8,00 m"
    HELPER_TOTAL_METROS_TXT: string;     // Ex: "160,00 metros"
    PRAZO_EXECUCAO_INPUT: string;        // Ex: "2 dias úteis"
    INICIO_PREVISTO_INPUT: string;       // Ex: "a combinar"
    PRECO_METRO_INPUT: string;           // Ex: "R$ 40,00"
    CUSTO_MOB_DESMOB_INPUT: string;      // Ex: "R$ 4.000,00"
    CALC_VALOR_SERVICO: string;          // Calculado
    CALC_TOTAL_GERAL: string;            // Ex: "R$ 20.000,00"
    CALC_TOTAL_GERAL_EXTENSO: string;    // Ex: "vinte mil reais"
    SINAL_PERC_INPUT: string;            // Ex: "50"
    HELPER_PRAZO_SALDO_TXT: string;      // Ex: "7 dias"
    FAT_MINIMO_OBRA_INPUT: string;       // Ex: "R$ 8.000,00"
    TAXA_AGUA_INPUT: string;             // Ex: "R$ 500,00"
    TAXA_HORA_PARADA_INPUT: string;      // Ex: "R$ 300,00"
    HELPER_TAXA_HORA_PARADA_EXT: string; // Por extenso
}

// ── Cache simples em memória (evita rebuscar a cada geração) ─────────────────
const _cache: Record<string, { text: string; expiresAt: number }> = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// ── Busca o conteúdo do Doc como texto puro ───────────────────────────────────
async function fetchDocText(docId: string): Promise<string> {
    const cached = _cache[docId];
    if (cached && cached.expiresAt > Date.now()) return cached.text;

    // URL pública de exportação como texto (funciona para docs compartilhados)
    const url = `https://docs.google.com/document/d/${docId}/export?format=txt`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Falha ao buscar template (${res.status}). Verifique se o doc está público.`);

    const text = await res.text();
    _cache[docId] = { text, expiresAt: Date.now() + CACHE_TTL_MS };
    return text;
}

// ── Injeta variáveis no template ──────────────────────────────────────────────
function injectVars(template: string, vars: TemplateVars): string {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
        // Substitui todas as ocorrências de {{CHAVE}} pelo valor
        result = result.replaceAll(`{{${key}}}`, value ?? '');
    }
    return result;
}

// ── Função principal ──────────────────────────────────────────────────────────
export async function buildPropostaText(
    tipo: 'HCM' | 'ESC' | 'SPT',
    vars: TemplateVars
): Promise<string> {
    const docId = TEMPLATE_IDS[tipo];
    const template = await fetchDocText(docId);
    return injectVars(template, vars);
}

// ── Helper: monta as vars a partir dos dados do formulário ───────────────────
import { NovaPropostaData } from '../types/propostaForm';
import { numberToWords } from '../utils/numberToWords'; // Corrected path

const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const meses = [
    'janeiro','fevereiro','março','abril','maio','junho',
    'julho','agosto','setembro','outubro','novembro','dezembro',
];

export function buildTemplateVars(
    data: NovaPropostaData,
    calc: { valorTotal: number; subtotalExecucao: number },
    numero: string
): TemplateVars {
    const hoje = new Date();
    const dataExtenso = `${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;

    // Agrupa itens para a linha de descrição
    const primeiroItem = (data.itens as any[])?.[0] || {};
    const diametroMm  = primeiroItem.diametro || 0;
    const diametroCm  = diametroMm / 10;
    const qtd         = (data.itens as any[]).reduce((s, i) => s + (i.quantidadeEstacas || 0), 0);
    const compMedio   = primeiroItem.comprimentoUnitario || 0;
    const totalMetros = (data.itens as any[]).reduce((s, i) => s + (i.totalMetros || 0), 0);

    const tipoTexto: Record<string, string> = {
        HCM: 'HÉLICE CONTÍNUA MONITORADA',
        ESC: 'ESTACA ESCAVADA',
        SPT: 'SPT (SONDAGEM)',
    };

    const sinalPerc = data.condicoesPagamento?.[0]?.percentual || 50;
    const prazoParcelas = data.condicoesPagamento
        ?.filter((_, i) => i > 0)
        .map(p => p.prazo)
        .join(' / ') || '7 dias';

    return {
        TIPO_ESTACA_INPUT:          tipoTexto[data.tipo] || data.tipo,
        HELPER_DATA_PROPOSTA_TXT:   dataExtenso,
        NOME_CLIENTE_INPUT:         data.clienteNome || '',
        ENDERECO_CLIENTE_INPUT:     [
            data.enderecoObra?.logradouro,
            data.enderecoObra?.cidade,
            data.enderecoObra?.estado,
        ].filter(Boolean).join(', '),
        NUM_PROPOSTA_INPUT:         numero,
        VALIDADE_DIAS_INPUT:        String(data.validadeProposta || 15),
        HELPER_DIAMETRO_TXT:        `Ø${diametroCm}cm`,
        HELPER_QTD_COMP_TXT:        `${qtd} estaca(s) x ${compMedio.toFixed(2)} metros`,
        HELPER_TOTAL_METROS_TXT:    `${totalMetros.toFixed(2)} metros`,
        PRAZO_EXECUCAO_INPUT:       `${data.prazoExecucao || 2} dia(s) útil(is)`,
        INICIO_PREVISTO_INPUT:      data.dataPrevistaInicio || 'a combinar',
        PRECO_METRO_INPUT:          fmt(primeiroItem.precoMetro || 0),
        CUSTO_MOB_DESMOB_INPUT:     fmt(data.mobilizacao || 0),
        CALC_VALOR_SERVICO:         fmt(calc.subtotalExecucao),
        CALC_TOTAL_GERAL:           fmt(calc.valorTotal),
        CALC_TOTAL_GERAL_EXTENSO:   numberToWords(calc.valorTotal),
        SINAL_PERC_INPUT:           String(sinalPerc),
        HELPER_PRAZO_SALDO_TXT:     prazoParcelas,
        FAT_MINIMO_OBRA_INPUT:      fmt(data.faturamentoMinimo || 0),
        TAXA_AGUA_INPUT:            fmt((data as any).taxaAgua || 0),
        TAXA_HORA_PARADA_INPUT:     fmt((data as any).taxaHoraParada || 0),
        HELPER_TAXA_HORA_PARADA_EXT: numberToWords((data as any).taxaHoraParada || 0),
    };
}
