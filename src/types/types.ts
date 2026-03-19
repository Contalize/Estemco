// ============================================================
// COLE ISSO NO TOPO do arquivo src/types/types.ts
// (logo após os imports existentes)
// ============================================================

export type TipoServico = 'HCM' | 'ESC' | 'SPT';

export type StatusProposta = 'RASCUNHO' | 'ENVIADA' | 'ACEITA' | 'RECUSADA' | 'EXPIRADA';

export interface ItemFuroSPT {
    id: string;
    numero: number;
    profundidade: number;
    valorPorMetro: number;
    total: number;
}

// ============================================================
// SUBSTITUA a interface Proposta existente por esta:
// ============================================================

export interface Proposta {
    id: string;
    numero: string;                    // ex: "5013-HCM"
    tipo: TipoServico;                 // 'HCM' | 'ESC' | 'SPT'
    status: StatusProposta;
    tenantId: string;

    // Cliente
    clienteNome: string;
    clienteCpfCnpj?: string;
    clienteEmail?: string;
    clienteTelefone?: string;

    // Obra
    enderecoObra: {
        logradouro?: string;
        bairro?: string;
        cidade?: string;
        estado?: string;
        cep?: string;
    };

    // Valores
    valorTotal: number;
    valorMobilizacao?: number;
    valorFaturamentoMinimo?: number;
    percentualSinal?: number;

    // Condições
    validadeDias?: number;
    prazoExecucaoDias?: number;
    condicoesPagamento?: string;
    observacoes?: string;

    // Metadados Firestore
    criadoEm: any;    // Firestore Timestamp
    atualizadoEm?: any;
}