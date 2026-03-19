export interface CostCategory {
  name: string;
  value: number; // Percentage 0-100
  color: string;
}

export type ProjectStage = 'PROPOSTA' | 'ACEITE' | 'CONTRATO' | 'EXECUCAO' | 'MEDICAO' | 'FATURAMENTO' | 'RECEBIMENTO';

export interface ExtraExpense {
  id: string;
  type: 'CONCRETO_EXTRA' | 'HORA_PARADA_CLIENTE' | 'HORA_PARADA_MANUTENCAO' | 'MOBILIZACAO' | 'OUTROS';
  description: string;
  value: number;
  date: string;
}

export interface SiteDocument {
  id: string;
  name: string;
  type: 'PROPOSTA' | 'CONTRATO' | 'RDO_DIGITAL' | 'OUTROS';
  status: 'PENDENTE' | 'ASSINADO';
  uploadDate: string;
}

export interface ConstructionSite {
  id: string;
  name?: string; // Optional as it might not be populated
  clienteNome: string; // Changed from clientName
  enderecoDaObra: string; // Changed from address
  statusObra: 'Em Andamento' | 'Paralisada' | 'Concluída' | 'Cancelada';
  dataInicio?: any; // Timestamp
  dataPrevistaFim?: any; // Timestamp
  dataFimReal?: any; // Timestamp
  motivoParalisacao?: string;
  responsavelEngenheiro?: string;
  observacoes?: string;
  medicoes?: number;
  ultimoBoletim?: any; // Timestamp
  stage?: ProjectStage;
  startDate?: string;
  endDate?: string;

  // Financials
  totalBudget?: number;
  revenue?: number;
  totalCost?: number;

  // Production Metrics
  contractMeters?: number;
  executedMeters?: number;

  // Concrete Control
  concreteTheoreticalVol?: number;
  concreteRealVol?: number;

  // Machine Efficiency
  machineHoursTotal?: number;
  machineHoursStopped?: number;

  data?: CostCategory[];
  extraExpenses?: ExtraExpense[];
  documents?: SiteDocument[];

  // Geolocation for Grounding
  latitude?: number;
  longitude?: number;
  address?: string; // Keep address as optional for backward compatibility or if used elsewhere
  clientName?: string; // Keep clientName as optional
  tenantId: string;
  servicos?: any[]; // Propagated from proposal
  createdAt?: any;
  updatedAt?: any;
}

export interface EmployeeCost {
  id: string;
  role: string;
  dailyCost: number;
}

export interface GlobalConfig {
  dieselPrice: number;
  employees: EmployeeCost[];
}

export enum Tab {
  DASHBOARD = 'dashboard',
  WORKFLOW = 'workflow',
  CALENDAR = 'calendar',
  CONFIG = 'config',
  QUOTE = 'quote',
  PROPOSALS = 'PROPOSALS',
  SETTINGS = 'settings',
  CLIENTS = 'clients',
  TEAM = 'team',
  BOLETIM = 'boletim',
  DRE = 'dre',
  FINANCES = 'finances',
  MACHINES = 'machines'
}

export interface Medicao {
  id?: string;
  tenantId: string;
  obraId: string;
  clienteNome: string;
  numero: number;
  dataEmissao: string;
  dataVencimento: string;
  valorMedido: number;
  status: 'Pendente' | 'Enviada ao Cliente' | 'Aprovada' | 'Paga';
  nfNumero?: string;
  observacoes: string;
  createdByUserId: string;
  createdAt: any; // Timestamp
}

export interface Recebimento {
  id?: string;
  tenantId: string;
  obraId: string;
  medicaoId: string;
  clienteNome: string;
  valor: number;
  dataPagamento: string;
  formaPagamento: 'PIX' | 'TED' | 'Boleto' | 'Cheque';
  observacao?: string;
  createdAt: any; // Timestamp
}

export interface ItemBoletim {
  tipoEstaca: string;
  quantidade: number;
  metrosPerfurados: number;
  concretoUsado?: number;
}

export interface BoletimDiario {
  id?: string;
  tenantId: string;
  obraId: string;
  data: string; // YYYY-MM-DD
  equipamento: string;
  horimetroInicial: number;
  horimetroFinal: number;
  horasTrabalhadas: number;
  dieselConsumido: number;
  equipe: string[]; // IDs or Names of employees
  servicos: ItemBoletim[];
  observacoes?: string;
  createdAt: string;
  createdBy: string;
}

export type StatusProposta = 'RASCUNHO' | 'ENVIADA' | 'ACEITA' | 'RECUSADA' | 'EXPIRADA';
export type TipoItem = 'SERVICO_METRO' | 'TAXA_FIXA' | 'HORA_PARADA';
export type OrigemEquipamento = 'PROPRIO' | 'TERCEIRO';
export type FormaPagamento = 'BOLETO' | 'PIX' | 'TED' | 'CARTAO_CREDITO';

export interface Maquina {
  id: string;
  nome: string;
  status: 'DISPONIVEL' | 'EM_OBRA' | 'MANUTENCAO';
  tenantId: string;
}

export interface Agendamento {
  id: string;
  maquinaId: string;
  clienteNome: string;
  dataInicio: string;
  dataFim: string;
  tenantId: string;
}

export interface CondicaoPagamento {
  percentualEntrada: number;
  valorEntrada: number;
  qtdeParcelas: number;
  textoParcelamento: string;
  formaPagamento: FormaPagamento;
}

export interface Cliente {
  id: string;
  razaoSocial: string;
  cnpj: string;
  enderecoFaturamento: string;
}

export interface ServicoCatalogo {
  id: string;
  nome: string;
  unidade: 'm' | 'un' | 'h' | 'vb';
  precoPadrao: number;
  categoria: 'HELICE' | 'ESCAVADA' | 'SONDAGEM' | 'OUTROS';
}

export interface ItemProposta {
  id: string;
  servicoId?: string;
  descricao: string;
  unidade: string;
  qtdeFuros: number;
  profundidade: number;
  // Campos de HCM / ESC:
  diametro?: number;
  quantidadeEstacas?: number;
  comprimentoUnitario?: number;
  // Campos gerais:
  totalMetros: number;
  quantidade: number;
  valorUnitario: number;
  precoMetro?: number;
  origem: OrigemEquipamento;
  subtotal?: number;
  total: number;
  faturamentoMinimo?: number;
}

export type CategoriaParada =
  | 'CONCRETO_BOMBA'
  | 'EQUIPAMENTO'
  | 'TERRENO_GEOLOGIA'
  | 'CLIMA'
  | 'GESTAO_LOGISTICA'
  | 'MAO_DE_OBRA'
  | 'FATORES_EXTERNOS'
  | 'OUTROS';

export interface ParadaBDO {
  id: string;
  categoria: CategoriaParada;
  motivo: string;       // subMotivo específico
  descricao: string;    // texto livre de detalhe
  horaInicio: string;
  horaFim: string;
  cobravel: boolean;    // true = cobrado do contratante; false = custo da Estemco
}

export interface CaminhaoBetoneiraBDO {
  id: string;
  numeroFaturamento: string;
  volumeM3: number;
  horaChegada: string;
  horaSaida: string;
}

export interface Boletim {
  id?: string;
  tenantId: string;
  obraId: string;
  clienteNome: string;
  data: any; // Timestamp
  equipamentoId: string;
  equipamentoNome: string;
  operador: string;

  // Produção
  estacasExecutadas: number;
  metrosExecutados: number;
  faturamentoMinimoAplicado?: number;
  servicos?: { tipoEstaca: string, quantidade: number, metrosPerfurados: number }[];

  // Horários Globais do Dia
  horaInicioObra?: string;
  horaFimObra?: string;

  // Consumo
  dieselConsumidoLitros: number;
  precoLitroDieselReferencia?: number; // Snapshot do preço no momento do registro
  
  horasProducao: number;
  horasParada: number;
  motivoParada: string;
  descricaoParada?: string;
  paradas?: ParadaBDO[];

  // Concreto
  concretoConsumidoM3: number;
  concretoTeoricoM3: number;
  overbreakPct: number;
  horaChegadaBetoneira?: string; // Legado mantido por precaução
  horaTerminoBetoneira?: string;
  caminhoesBetoneira?: CaminhaoBetoneiraBDO[];

  // Custos
  custoDiesel: number;
  custoHorasParadas: number;
  custoMaoDeObra: number;

  // Equipe
  equipe: { cargo: string, nome: string, custoDia: number }[];

  condicaoClima?: string;
  condicaoSolo?: string;

  observacoes: string;
  createdByUserId: string;
  createdAt: any; // Timestamp
}

export interface DREObra {
  id?: string; // obraId
  tenantId: string;
  obraId?: string;
  propostaId?: string;
  clienteNome?: string;

  // Receita
  receitaContratada: number;
  receitaMedidaAcumulada: number;

  // Custos Reais
  totalMetrosExecutados: number;
  totalDieselGasto: number;
  totalHorasParadas: number;
  totalHorasProducao?: number;
  totalCustoHorasParadas: number;
  totalCustoMaoDeObra: number;
  totalCustoConcreto: number;
  totalBoletins: number;
  overbreakMedio: number;

  // Custos Fixos
  custoMobilizacao: number;
  custoART: number;

  updatedAt: any;
}

export type TipoServico = 'HCM' | 'ESC' | 'SPT';

export interface Proposta {
  id?: string;
  numero: string;             // ex: "5013-HCM", "4916-ESC", "2038-26"
  tipo: TipoServico;
  status: StatusProposta;
  clienteId: string;
  clienteNome: string;
  tenantId: string;
  obraLocal: string;
  enderecoObra: any;
  data: Date;
  itens: ItemProposta[];
  valorTotal: number;
  pagamento: CondicaoPagamento;
  
  // Timing / Prazos
  dataPrevistaInicio?: string;
  diasExecucao?: number;
  textoPrazoExecucao?: string;

  // ART e Faturamento
  incluirART: boolean;
  valorART: number;
  emiteNotaFiscal: boolean;
  percentualImposto: number;

  criadoEm?: any;
  atualizadoEm?: any;
}

export interface PermissionsMap {
  dashboard: { ver: boolean };
  orcamento: { ver: boolean; criar: boolean; editar: boolean; aprovar: boolean };
  clientes: { ver: boolean; criar: boolean; editar: boolean; excluir: boolean };
  obras: { ver: boolean; editar: boolean; mudarStatus: boolean };
  boletim: { ver: boolean; criar: boolean; editar: boolean };
  dre: { ver: boolean };
  financeiro: { ver: boolean; lancar: boolean };
  calendario: { ver: boolean };
  equipe: { ver: boolean; gerenciar: boolean };
  configuracoes: { ver: boolean; editar: boolean };
}

export interface AuditLog {
  id?: string;
  userId: string;
  acao: string;
  modulo: string;
  detalhes: string;
  tenantId: string;
  createdAt: any; // Timestamp
}

export interface DiametroPreco {
  mm: number;
  preco: number;
}

export interface ParcelaConfig {
  nome: string;
  percentual: number;
  prazo: string;
}

export interface ConfigHCM {
  diametros: DiametroPreco[];
  faturamentoMinimoDiario: number;
  mobilizacaoPadrao: number;
  comprimentoMinimo: number;
  acrescimoFimDeSemana: number;
  horarioPadraoInicio: string;
  horarioPadraoFim: string;
  condicoesPagamento: ParcelaConfig[];
  multaDesistencia: number;
  multaAtrasoContratante: number;
  multaInadimplencia: number;
  jurosMensais: number;
  multaDescumprimento: number;
  indiceCorrecao: string;
  causasFaturamentoMinimo: string[];
  causasIsencaoMinimo: string[];
}

export interface ConfigESC {
  diametros: DiametroPreco[];
  faturamentoMinimoObra: number;
  taxaHoraParada: number;
  mobilizacaoPadrao: number;
  acrescimoFimDeSemana: number;
  condicoesPagamento: ParcelaConfig[];
  contratoSaidaDiariaPadrao: {
    metrosContratadosPorDia: number;
    precoExcedentePorMetro: number;
  };
}

export interface ConfigSPT {
  precoPorMetro: number;
  mobilizacaoLaboratorio: number;
  artPadrao: number;
  metragemMinimaTotal: number;
  metrosPorFuroEstimado: number;
  prazoEntregaRelatorio: string;
  aplicarFaturamentoMinimoAcima2Furos: boolean;
  sinalAgendamento: number;
  maximoParcelasCartao: number;
}

export interface Equipamento {
  id?: string;
  tenantId: string;
  nome: string;
  tipo: 'HCM' | 'ESC' | 'SPT';
  marcaModelo: string;
  anoFabricacao?: string;
  capacidadeTorque?: string;
  horimetroInicial?: string;
  operadorPadrao?: string;
  status: 'Ativo' | 'Em manutenção' | 'Inativo';
  operadorResponsavel?: string;
  createdAt: any;
  updatedAt: any;
}

export interface ItemEstacaHCM {
  id: string;
  diametro: 300 | 400 | 500; // mm
  quantidadeEstacas: number;
  comprimentoMedio: number; // metros por estaca
  metrosTotal: number; // calculado: qtd × comprimento
  precoPorMetro: number; // buscado da config pelo diâmetro
  subtotal: number; // calculado: metros × preco
}

export interface ItemEstacaESC {
  id: string;
  diametro: 250 | 300 | 400 | 500 | 600; // mm ou cm
  quantidadeEstacas: number;
  comprimentoMedio: number;
  metrosTotal: number;
  precoPorMetro: number;
  subtotal: number;
}

export type ModalidadeESC = 'por_metro' | 'preco_fechado' | 'saida_diaria';
export type TipoEquipamento = 'HCM' | 'ESC' | 'SPT';
export interface ItemFuroSPT {
  id: string;
  numeroFuro: number;
  profundidade: number;
}

export interface Orcamento {
  id?: string;
  numero: string; // Ex: "5016-HCM", "4917-ESC", "2040-26"
  tipoEquipamento: TipoEquipamento;
  clienteId: string;
  clienteNome: string;
  enderecoObra: string;
  cidadeObra: string;
  status: 'rascunho' | 'enviado' | 'aprovado' | 'reprovado';

  // HCM
  itensHCM?: ItemEstacaHCM[];
  mobilizacaoHCM?: number;

  // ESC
  modalidadeESC?: ModalidadeESC;
  itensESC?: ItemEstacaESC[];
  mobilizacaoESC?: number;
  metrosDiarioESC?: number; // para modalidade saida_diaria
  valorFechadoESC?: number; // para modalidade preco_fechado
  diasObraESC?: number;

  // SPT
  furosSPT?: ItemFuroSPT[]; // Changed from FuroSPT[] to ItemFuroSPT[]
  mobilizacaoSPT?: number;
  artSPT?: number;

  // Totais calculados
  subtotalItens: number;
  totalMobilizacao: number;
  totalArt?: number;
  totalGeral: number;

  // Condições comerciais
  condicoesPagemento: string;
  prazoExecucao: string;
  validadeProposta: number; // dias
  observacoes?: string;

  // Controle
  criadoEm: any;
  atualizadoEm: any;
  empresaId: string;
}