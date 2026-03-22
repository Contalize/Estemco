// src/types/propostaForm.ts
// Tipos do formulário wizard de Nova Proposta (HCM / ESC / SPT)

export type TipoServico = 'HCM' | 'ESC' | 'SPT';

export interface ParcelaProposta {
    id: string;
    descricao: string;
    percentual: number;
    prazo: string;
    formaPagamento: 'pix' | 'boleto' | 'transferencia' | 'dinheiro' | 'cartao' | 'cheque';
}

// Interface unificada para refletir o uso no Wizard e Services
export interface NovaPropostaData {
    tipo: TipoServico;
    
    // Cliente e Obra
    clienteId?: string;
    clienteNome: string;
    enderecoObra: {
        logradouro: string;
        cidade: string;
        estado: string;
        bairro?: string;
        cep?: string;
        numero?: string;
    };

    // Itens e Valores (Genéricos para o formulário)
    itens: any[]; 
    mobilizacao: number;
    faturamentoMinimo: number;
    
    // Configurações e Prazos
    validadeProposta: number;
    prazoExecucao: number;
    dataPrevistaInicio?: string;
    diasExecucao?: number;
    
    // Impostos e ART
    incluirART: boolean;
    valorART: number;
    emiteNotaFiscal: boolean;
    percentualImposto: number;
    
    // Condições de Pagamento (Nova estrutura com parcelas)
    condicoesPagamento: ParcelaProposta[];
    
    // Campos específicos de ESC (opcionais no objeto geral)
    modalidadeESC?: 'por_metro' | 'preco_fechado' | 'saida_diaria';
    precoFechadoESC?: number;
    metrosDiariosESC?: number;
    precoExcedenteESC?: number;

    observacoes?: string;

    // Textos do Modelo de Contrato (Enterprise ECM)
    textoObrigacoesContratante?: string;
    textoObrigacoesContratada?: string;
    textoCondicoesCobranca?: string;
    textoDireitosRisco?: string;
    textoTermoAceite?: string;

    // Totais calculados
    valorTotal: number;
}

export const propostaFormDefault: NovaPropostaData = {
    tipo: 'HCM',
    clienteNome: '',
    enderecoObra: {
        logradouro: '',
        cidade: '',
        estado: 'SP',
    },
    itens: [],
    mobilizacao: 4000,
    faturamentoMinimo: 8000,
    validadeProposta: 15,
    prazoExecucao: 2,
    incluirART: true,
    valorART: 108.39,
    emiteNotaFiscal: true,
    percentualImposto: 16.5,
    condicoesPagamento: [
        { id: '1', descricao: 'Sinal / Entrada', percentual: 50, prazo: '3 dias após assinatura', formaPagamento: 'pix' },
        { id: '2', descricao: 'Saldo Final', percentual: 50, prazo: '7 dias após medição', formaPagamento: 'pix' }
    ],
    valorTotal: 0,
};