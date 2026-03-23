// src/services/templateService.ts
// Busca o template de proposta do Google Drive e injeta variáveis.
// O texto fica no Drive — edita lá, reflete imediatamente no PDF gerado.

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { pdfTexts } from '../utils/pdfTexts';
import { NovaPropostaData } from '../types/propostaForm';
import { numberToWords } from '../utils/numberToWords'; // Corrected path

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

// ── Estrutura do Documento ────────────────────────────────────────────────────
export interface ConfiguracaoTemplate {
    clausulas_ativo: boolean;
    fat_minimo_titulo: string;
    fat_minimo_items: string[];
    isencao_titulo: string;
    isencao_items: string[];
    cobrancas_titulo: string;
    cobrancas_items: string[];
    obrig_contratante: string[];
    obrig_proponente: string[];
    clausula_risco: string;
    termo_aceite: string;
    versao: number;
    updatedAt?: any;
    updatedBy?: string;
}

// ── Funções Auxiliares ────────────────────────────────────────────────────────
function formatTemplateToString(data: Partial<ConfiguracaoTemplate>): string {
    let parts: string[] = [];

    if (data.fat_minimo_titulo || data.fat_minimo_items?.length) {
        if (data.fat_minimo_titulo) parts.push(data.fat_minimo_titulo.toUpperCase());
        (data.fat_minimo_items || []).forEach((item, i) => parts.push(`${i + 1}. ${item}`));
    }
    
    if (data.isencao_titulo || data.isencao_items?.length) {
        if (data.isencao_titulo) parts.push('\n' + data.isencao_titulo.toUpperCase());
        (data.isencao_items || []).forEach((item, i) => parts.push(`${i + 1}. ${item}`));
    }

    if (data.cobrancas_titulo || data.cobrancas_items?.length) {
        if (data.cobrancas_titulo) parts.push('\n' + data.cobrancas_titulo.toUpperCase());
        (data.cobrancas_items || []).forEach((item, i) => parts.push(`${i + 1}. ${item}`));
    }
    
    if (data.obrig_contratante?.length) {
        parts.push('\nOBRIGAÇÕES DO CONTRATANTE');
        data.obrig_contratante.forEach((item, i) => parts.push(`${i + 1}. ${item}`));
    }

    if (data.obrig_proponente?.length) {
        parts.push('\nOBRIGAÇÕES DA CONTRATADA');
        data.obrig_proponente.forEach((item, i) => parts.push(`${i + 1}. ${item}`));
    }

    if (data.clausula_risco) {
        parts.push('\nDIREITOS E RISCO GEOTÉCNICO');
        parts.push(data.clausula_risco);
    }
    
    return parts.join('\n');
}

export function getFallbackTemplateText(tipo: 'HCM' | 'ESC' | 'SPT'): string {
    // Retorna fallback do pdfTexts baseado no tipo
    const hcm = pdfTexts.proposals.hcm;
    const fallbackData: Partial<ConfiguracaoTemplate> = {
        fat_minimo_titulo: hcm.minBilling.title,
        fat_minimo_items: hcm.minBilling.items,
        isencao_titulo: hcm.exemption.title,
        isencao_items: hcm.exemption.items,
        cobrancas_titulo: hcm.generalBilling.title,
        cobrancas_items: hcm.generalBilling.items,
        // Fallback default
        obrig_contratante: hcm.responsibilities.contratante,
        obrig_proponente: hcm.responsibilities.proponente,
        clausula_risco: pdfTexts.proposals.riskClause,
        termo_aceite: pdfTexts.proposals.acceptanceTerm,
    };
    return formatTemplateToString(fallbackData);
}

// ── Cache simples em memória (evita rebuscar a cada geração) ─────────────────
const _cache: Record<string, { text: string; expiresAt: number }> = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// ── Busca o conteúdo do Template no Firestore ─────────────────────────────────
async function fetchTemplateText(tenantId: string, tipo: 'HCM' | 'ESC' | 'SPT'): Promise<string> {
    if (!tenantId) return getFallbackTemplateText(tipo);

    const cacheKey = `${tenantId}_${tipo}`;
    const cached = _cache[cacheKey];
    if (cached && cached.expiresAt > Date.now()) return cached.text;

    try {
        const ref = doc(db, 'empresas', tenantId, 'templates', tipo);
        const snap = await getDoc(ref);
        
        if (snap.exists()) {
            const data = snap.data() as ConfiguracaoTemplate;
            if (data.clausulas_ativo) {
                const text = formatTemplateToString(data);
                _cache[cacheKey] = { text, expiresAt: Date.now() + CACHE_TTL_MS };
                return text;
            }
        }
    } catch (e) {
        console.warn(`Erro ao buscar template ${tipo} no Firestore`, e);
    }

    // Fallback if not found, inactive, or error
    const fallbackText = getFallbackTemplateText(tipo);
    _cache[cacheKey] = { text: fallbackText, expiresAt: Date.now() + CACHE_TTL_MS };
    return fallbackText;
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
    vars: TemplateVars,
    tenantId: string
): Promise<string> {
    const template = await fetchTemplateText(tenantId, tipo);
    return injectVars(template, vars);
}

// ── Helper: monta as vars a partir dos dados do formulário ───────────────────
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

    // Normaliza os itens, pois podem vir vazios na visualização da tabela
    const itensNormalizados = (data.itens && data.itens.length > 0)
        ? data.itens
        : (data as any).itensHCM || (data as any).itensESC || (data as any).itensSPT || [];

    // Agrupa itens para a linha de descrição
    const primeiroItem = itensNormalizados[0] || {};
    const diametroMm  = primeiroItem.diametro || 0;
    const diametroCm  = diametroMm / 10;
    const qtd         = itensNormalizados.reduce((s: number, i: any) => s + (i.quantidadeEstacas || 0), 0);
    const compMedio   = primeiroItem.comprimentoUnitario || 0;
    const totalMetros = itensNormalizados.reduce((s: number, i: any) => s + (i.totalMetros || i.profundidade || 0), 0);

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
