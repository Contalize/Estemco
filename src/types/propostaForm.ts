// src/types/propostaForm.ts
// Tipos do formulário wizard de Nova Proposta (HCM / ESC / SPT)

export type TipoServico = 'HCM' | 'ESC' | 'SPT';

// Item de furo SPT
export interface ItemFuroSPT {
    id: string;
    numero: number;           // Nº do furo (F1, F2...)
    profundidade: number;     // metros
    valorPorMetro: number;    // R$/m
    total: number;            // calculado
}

// Item de estaca HCM ou ESC
export interface ItemEstaca {
    id: string;
    diametro: number;         // mm (ex: 400)
    quantidade: number;
    profundidade: number;     // metros médios
    metrosTotais: number;     // calculado
    valorPorMetro?: number;   // ESC = R$/m
    valorDiaria?: number;     // HCM = R$/diária
    quantidadeDiarias?: number;
    subtotal: number;
}

// Estado completo do formulário de proposta
export interface PropostaFormData {
    // Etapa 1 — Tipo de serviço
    tipo: TipoServico;

    // Etapa 2 — Cliente e obra
    clienteNome: string;
    clienteCpfCnpj?: string;
    clienteEmail?: string;
    clienteTelefone?: string;
    enderecoObra: {
        logradouro: string;
        bairro?: string;
        cidade: string;
        estado: string;
        cep?: string;
    };

    // Etapa 3 — Itens de serviço
    // HCM / ESC
    estacas?: ItemEstaca[];
    valorMobilizacao?: number;
    valorDesmobilizacao?: number;
    // SPT
    furosSPT?: ItemFuroSPT[];
    // Campos de faturamento mínimo HCM
    possuiFaturamentoMinimo?: boolean;
    valorFaturamentoMinimo?: number;

    // Etapa 4 — Revisão e condições
    validadeDias: number;           // padrão: 15
    prazoExecucaoDias: number;
    condicoesPagamento: string;     // ex: "50% sinal + 50% medição"
    percentualSinal: number;        // ex: 50
    observacoes?: string;

    // Calculados
    valorTotal: number;
}

// Valor padrão para inicializar o formulário
export const propostaFormDefault: PropostaFormData = {
    tipo: 'HCM',
    clienteNome: '',
    enderecoObra: {
        logradouro: '',
        cidade: '',
        estado: 'SP',
    },
    validadeDias: 15,
    prazoExecucaoDias: 2,
    condicoesPagamento: '50% do sinal 3 dias após assinatura do contrato e 50% do saldo 7 dias após entrega da medição.',
    percentualSinal: 50,
    valorTotal: 0,
};