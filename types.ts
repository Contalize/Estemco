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
  name: string;
  clientName: string;
  status: 'Ativa' | 'Pausada' | 'Concluída';
  stage: ProjectStage;
  startDate: string; // ISO Date YYYY-MM-DD
  endDate: string;   // ISO Date YYYY-MM-DD
  
  // Financials
  totalBudget: number;
  revenue: number;
  totalCost: number;
  
  // Production Metrics
  contractMeters: number;
  executedMeters: number;
  
  // Concrete Control
  concreteTheoreticalVol: number;
  concreteRealVol: number;
  
  // Machine Efficiency
  machineHoursTotal: number;
  machineHoursStopped: number;

  data: CostCategory[];
  extraExpenses: ExtraExpense[];
  documents: SiteDocument[];

  // Geolocation for Grounding
  latitude?: number;
  longitude?: number;
  address?: string;
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
  TEAM = 'team'
}

export type StatusProposta = 'RASCUNHO' | 'ENVIADA' | 'ACEITA' | 'RECUSADA';
export type TipoItem = 'SERVICO_METRO' | 'TAXA_FIXA' | 'HORA_PARADA';
export type OrigemEquipamento = 'PROPRIO' | 'TERCEIRO';
export type FormaPagamento = 'BOLETO' | 'PIX' | 'TED' | 'CARTAO_CREDITO';

export interface Maquina {
  id: string;
  nome: string;
  status: 'DISPONIVEL' | 'EM_OBRA' | 'MANUTENCAO';
}

export interface Agendamento {
  id: string;
  maquinaId: string;
  clienteNome: string;
  dataInicio: string;
  dataFim: string;
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