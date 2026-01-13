import { Template } from '../types';

export const DEFAULT_TEMPLATES: Template[] = [
    {
        id: '1',
        titulo: 'Contrato Padrão Hélice Contínua (Completo)',
        texto: `PROPOSTA COMERCIAL E CONTRATUAL - SISTEMA ESTEMCO ERP
Nº PROPOSTA: {{NUM_PROPOSTA_INPUT}}
DATA: {{HELPER_DATA_PROPOSTA_TXT}}

1. IDENTIFICAÇÃO DAS PARTES
CONTRATANTE: {{NOME_CLIENTE_INPUT}}
ENDEREÇO DE COBRANÇA: {{ENDERECO_FATURAMENTO}}
LOCAL DA OBRA: {{ENDERECO_OBRA}}

CONTRATADA: ESTEMCO ENGENHARIA EM FUNDAÇÕES S/S LTDA
CNPJ: 57.486.102/0001-86 | Socorro - SP

2. OBJETO DO CONTRATO
Prestação de serviços de engenharia de fundações conforme escopo abaixo:

{{HELPER_QTD_COMP_TXT}}

TOTAL ESTIMADO DE METROS: {{HELPER_TOTAL_METROS_TXT}}m

3. PREÇOS E CONDIÇÕES COMERCIAIS
Valor Total dos Serviços: {{CALC_TOTAL_GERAL}}
(Sujeito a medição final "in loco")

CONDIÇÃO DE PAGAMENTO:
Sinal/Entrada: R$ {{VALOR_SINAL}} ({{SINAL_PERC_INPUT}}%)
Saldo Restante:
{{HELPER_PRAZO_SALDO_TXT}}

4. OBRIGAÇÕES E RESPONSABILIDADES
4.1. Da CONTRATADA (Estemco):
   a) Fornecer equipamentos, mão-de-obra e ferramentas necessárias.
   b) Executar os serviços conforme norma NBR 6122.
   c) Fornecer ART e Nota Fiscal (se contratadas).

4.2. Da CONTRATANTE (Cliente):
   a) Fornecer concreto, aço e água no canteiro.
   b) Garantir acesso plano e firme para a perfuratriz.
   c) Demarcar os furos (locação topográfica).
   d) Arcar com custos de bota-fora do material escavado.

5. DISPOSIÇÕES GERAIS E MULTAS
5.1. Faturamento Mínimo: Fica estabelecido o valor mínimo de R$ {{FAT_MINIMO_OBRA_INPUT}} por mobilização.
5.2. Horas Paradas: Caso o equipamento fique parado por falta de concreto, frente de serviço ou acesso, será cobrada a taxa de R$ {{TAXA_HORA_PARADA_INPUT}} por hora.
5.3. Rocha/Água: A ocorrência de rocha ou nível d'água excessivo implicará na taxa de desmobilização/adequação de R$ {{TAXA_AGUA_INPUT}}, se aplicável.

6. FORO
Fica eleito o foro da comarca de Socorro/SP para dirimir quaisquer dúvidas.

(O restante desta página foi deixado intencionalmente em branco)

----------------------------------------------------------------------
TERMO DE ACEITAÇÃO E AUTORIZAÇÃO DE SERVIÇO

Eu, representante legal da CONTRATANTE, declaro ter lido e aprovado todas as condições técnicas e comerciais acima descritas.

Autorizo o início dos serviços e o faturamento conforme as condições de pagamento estipuladas.


_______________________________________________________
Assinatura do Responsável (Cliente)
Nome: {{NOME_CLIENTE_INPUT}}
Data: ____/____/_______

_______________________________________________________
ESTEMCO ENGENHARIA EM FUNDAÇÕES
Depto. Comercial
`
    },
    {
        id: '2',
        titulo: 'Contrato Estaca Escavada (Simples)',
        texto: `PROPOSTA TÉCNICA - ESTACA ESCAVADA
CLIENTE: {{NOME_CLIENTE_INPUT}}
DATA: {{HELPER_DATA_PROPOSTA_TXT}}

ESCOPO:
{{HELPER_QTD_COMP_TXT}}

VALOR TOTAL: {{CALC_TOTAL_GERAL}}

Condições de Pagamento:
{{HELPER_PRAZO_SALDO_TXT}}

Obs: Concreto e armação por conta do cliente.
`
    }
];

export const Templates = () => {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-6">Modelos de Contrato</h1>
            <div className="grid gap-4">
                {DEFAULT_TEMPLATES.map(t => (
                    <div key={t.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <h3 className="font-bold text-lg text-slate-800 mb-2">{t.titulo}</h3>
                        <div className="text-xs text-slate-500 font-mono bg-slate-50 p-3 rounded border overflow-hidden max-h-32">
                            {t.texto.slice(0, 200)}...
                        </div>
                        <button className="mt-4 text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wide">
                            Editar Modelo
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
