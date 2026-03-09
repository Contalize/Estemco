export interface ParcelaProposta {
    id: string;
    descricao: string;               // Ex: "Sinal", "Medição 1", "Saldo Final"
    percentual: number;              // % do valor total
    prazo: string;                   // Ex: "3 dias após assinatura"
    formaPagamento: 'pix' | 'boleto' | 'dinheiro' | 'transferencia' | 'cartao' | 'cheque';
}

export interface NovaPropostaData {
    tipo: 'HCM' | 'ESC' | 'SPT' | null;
    clienteId: string;
    clienteNome: string;
    enderecoObra: {
        logradouro: string;
        numero: string;
        bairro: string;
        cidade: string;
        estado: string;
        cep: string;
    };
    observacoes: string;
    validadeProposta: number;

    // Itens em tela
    itens: any[];
    mobilizacao: number;

    // Condições de Pagamento Customizadas
    condicoesPagamento: ParcelaProposta[];

    // Custom ESC
    modalidadeESC: 'por_metro' | 'preco_fechado' | 'saida_diaria';
    precoFechadoESC?: number;
    metrosDiariosESC?: number;
    precoExcedenteESC?: number;

    // Custom SPT
    incluirART: boolean;
    valorART: number;
}
