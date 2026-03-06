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
  SETTINGS = 'settings',
  CLIENTS = 'clients',
  TEAM = 'team',
  BOLETIM = 'boletim',
  DRE = 'dre'
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

export type StatusProposta = 'RASCUNHO' | 'ENVIADA' | 'ACEITA' | 'RECUSADA';
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
  totalMetros: number;
  quantidade: number;
  valorUnitario: number;
  origem: OrigemEquipamento;
  total: number;
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

  // Consumo
  dieselConsumidoLitros: number;
  precoLitroDieselReferencia?: number; // Snapshot do preço no momento do registro

  // Horas
  horasProducao: number;
  horasParada: number;
  motivoParada: string;

  // Concreto
  concretoConsumidoM3: number;
  concretoTeoricoM3: number;
  overbreakPct: number;

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

export interface Proposta {
  id: string;
  clienteId: string;
  obraLocal: string;
  data: Date;
  itens: ItemProposta[];
  valorTotal: number;
  pagamento: CondicaoPagamento;
  status: StatusProposta;
}