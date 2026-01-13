import { SoilType } from './data/soils';

export interface CostCategory {
  name: string;
  value: number; // Percentage 0-100
  color: string;
}

export type ProjectStage = 'PROPOSTA' | 'ACEITE' | 'CONTRATO' | 'EXECUCAO' | 'MEDICAO' | 'FATURAMENTO' | 'A_FATURAR' | 'RECEBIMENTO';

export interface ExtraExpense {
  id: string;
  type: 'CONCRETO_EXTRA' | 'HORA_PARADA_CLIENTE' | 'HORA_PARADA_MANUTENCAO' | 'MOBILIZACAO' | 'OUTROS';
  category: 'RECEITA' | 'DESPESA';
  description: string;
  value: number;
  date: string;
  photos?: string[];
}

export interface DashboardFilters {
  startDate: string;
  endDate: string;
  viewMode: 'SYNTHETIC' | 'ANALYTICAL';
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
  status: 'PROPOSTA' | 'NEGOCIACAO' | 'ACEITE' | 'CONTRATO' | 'EXECUCAO' | 'MEDICAO' | 'A_FATURAR' | 'FINALIZADO' | 'PERDIDO' | 'CANCELADO';
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
  itens?: any[]; // NovaProposta items for Scope Preview

  // Geolocation for Grounding
  latitude?: number;
  longitude?: number;
  address?: string;

  // Golden Thread Financials (from Proposal)
  valorUnitarioMetro?: number;
  valorHoraParada?: number;
  faturamentoMinimo?: number;
  valorMobilizacao?: number;
  totalMetrosEstimados?: number;

  // Proposal Specifics (For Acceptance, Measuring & Billing)
  inscricaoEstadual?: string;
  responsavelObra?: string;
  emailFaturamento?: string;
  siteAddress?: string;
  billingAddress?: string;

  // Financial Conditions
  sinalPerc?: number;
  sinalValue?: number;
  installments?: number; // Number of installments
  prazoSaldo?: number; // Legacy
  includeNF?: boolean;
  includeART?: boolean;

  // Safeguards (Detailed)
  // Safeguards (Detailed)
  taxaAgua?: number;
  taxaHoraParada?: number;

  // New Financial Field for ERP logic
  listaParcelas?: InstallmentItem[];
  prazoDias?: number;

  // Proposal 2.0 Payment Data
  paymentMethod?: FormaPagamento;
  paymentDetails?: {
    pixKey?: string;
    boletoDays?: string; // "15/30/45"
    cardBrand?: string;
    cardInstallments?: number;
    bankDetails?: string;
  };

  // Resources
  selectedAssetObj?: Asset;

  // Unit Economics (Cost Center)
  costs?: {
    concretePriceM3: number;
    dieselPriceL: number;
    teamCostDay: number;
  };
}

export interface EmployeeCost {
  id: string;
  role: string;
  dailyCost: number;
}

export interface GlobalConfig {
  dieselPrice: number;
  taxRateNF?: number; // 10%
  taxValueART?: number; // 99.96
  employees: EmployeeCost[];
}

export enum Tab {
  DASHBOARD = 'dashboard',
  REPORTS = 'relatorios',
  QUOTE = 'propostas',
  REGISTERS = 'clientes',
  WORKFLOW = 'obras',
  CALENDAR = 'agenda',
  ASSETS = 'frota',
  CONFIG = 'config',
  FINANCIAL = 'financial',
  TEMPLATES = 'templates'
}

export type StatusProposta = 'RASCUNHO' | 'ENVIADA' | 'ACEITA' | 'RECUSADA';
export type TipoItem = 'SERVICO_METRO' | 'TAXA_FIXA' | 'HORA_PARADA';
export type OrigemEquipamento = 'PROPRIO' | 'TERCEIRO';
export type FormaPagamento = 'BOLETO' | 'PIX' | 'TED' | 'CARTAO_CREDITO' | 'DINHEIRO';

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

export interface InstallmentItem {
  number: number;
  value: number;
  date?: string; // Optional due date
}

export interface CondicaoPagamento {
  percentualEntrada: number;
  valorEntrada: number;
  qtdeParcelas: number;
  listaParcelas?: InstallmentItem[]; // New field
  textoParcelamento: string;
  formaPagamento: FormaPagamento;
}

// --- ENTIDADES CADASTRAIS ---

export type TipoFornecedor = 'CONCRETO' | 'ACO' | 'COMBUSTIVEL' | 'MANUTENCAO' | 'LOCACAO_EQUIPAMENTOS' | 'OUTROS';

export interface Contato {
  nome: string;
  telefone: string;
  email: string;
  cargo?: string;
}

export interface Endereco {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface Cliente {
  id: string;
  tipoPessoa: 'PF' | 'PJ';
  documento: string; // CPF or CNPJ
  rg?: string; // Only for PF
  razaoSocial: string; // Name for PF
  nomeFantasia?: string;
  cnpj: string; // Deprecated, keep for legacy compatibility
  inscricaoEstadual?: string;
  endereco: Endereco;
  enderecoFaturamento: string;
  telefone: string;
  email: string;
  contatos: Contato[];
  observacoes?: string;
  createdAt?: string; // ISO
}

export interface Asset {
  id: string;
  name: string;
  type: 'HELICE' | 'ESCAVADA' | 'SONDAGEM' | 'OUTROS';
  dailyCost: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'SOLD';
  plate?: string;

  // Cost Specs
  consumptionPerHour: number; // Liters/Hour

  // Technical Specs (Physics of the Machine)
  technicalSpecs?: {
    torqueNominal: number; // kNm
    pullBackForce: number; // kN (Arrancamento)
    maxDepth: number; // meters
    tools: number[]; // Array of allowed diameters (cm) e.g. [30, 40, 50, 60]
  };
  [key: string]: any;
}

export interface Fornecedor {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  tipo: TipoFornecedor;
  endereco: Endereco;
  contatos: Contato[];
  dadosBancarios?: {
    banco: string;
    agencia: string;
    conta: string;
    pix?: string;
  };
  createdAt?: string;
}

export type MetodoExecucao = 'HELICE_CONTINUA' | 'ESTACA_ESCAVADA' | 'SONDAGEM_SPT' | 'OUTROS';

export interface Contrato {
  id: string;
  numeroContrato: string; // Identificador interno ex: EST-2023-001
  clienteId: string;
  obraNome: string; // Nome da obra específico para este contrato
  enderecoObra: Endereco;
  metodoExecucao: MetodoExecucao[]; // Pode ter mais de um método
  valorTotal: number;
  dataAssinatura: string;
  dataInicioPrevista: string;
  status: 'EM_NEGOCIACAO' | 'ASSINADO' | 'EM_EXECUCAO' | 'CONCLUIDO' | 'CANCELADO';
  condicoesPagamento: CondicaoPagamento;
  arquivosUrl?: string[]; // Links para PDF do contrato assinado
}

// --- FIM ENTIDADES CADASTRAIS ---

export interface ServicoCatalogo {
  id: string;
  nome: string;
  unidade: 'm' | 'un' | 'h' | 'vb';
  precoPadrao: number;
  categoria: 'HELICE' | 'ESCAVADA' | 'SONDAGEM' | 'OUTROS';
}

// ... existing Proposta interfaces ...
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

// --- RESTORED INTERFACES ---

export interface PileEntry {
  id: string;
  number: string; // Changed from 'identificacao' to match usage
  depth: number; // Changed from 'profundidadeReal' to match usage
  diameter: number;
  status?: 'CONCLUIDA' | 'OBSTRUCAO' | 'PENDENTE';
}

export interface IdleEvent {
  id: string;
  reason: string; // Changed from 'motivo'
  hours: number; // Changed from 'duracaoHoras'
}

export interface DailyLog {
  id: string;
  projetoId: string;
  date: string;
  weather: 'SOL' | 'NUBLADO' | 'CHUVA' | 'IMPRATICAVEL';
  team: {
    operator: string;
    helper: string;
  };

  // Production
  estacas: PileEntry[];
  idleEvents: IdleEvent[];

  // Totals
  totalMeters: number;
  totalIdleHours: number;

  // Unit Economics (Financials)
  horimeterStart?: number;
  horimeterEnd?: number;
  engineHours?: number;
  concreteTotalVolume?: number;

  createdAt?: any;
}

// --- GEOTECHNICAL CORE ---

export interface SampleLayer {
  id: string;
  depthFrom: number;
  depthTo: number;
  soilType: SoilType; // Linked to Soil Library
  description: string; // "Areia Média com Pedregulho"
  nspt: number;
  blowCounts?: {
    n1: number; // 1st 15cm
    n2: number; // 2nd 15cm
    n3: number; // 3rd 15cm (N3+N2 = NSPT)
  };
}

export interface Borehole {
  id: string;
  projectId: string; // Link to the Commercial Project
  name: string; // e.g., "SP-01", "SP-02"
  coordinateX?: number; // UTM or Local
  coordinateY?: number;
  elevationZ?: number; // Cota de Boca
  waterLevelDepth?: number; // Profundidade do Nível d'água
  layers: SampleLayer[];
  samples: SPTSample[]; // The full profile (Reconciled with Geotechnical Core Phase 1)
  date?: string;
  status: 'PLANNED' | 'EXECUTED';
}

export interface SPTSample {
  depth: number;      // Depth in meters (1m, 2m...)
  n1: number;         // 1st 15cm blows
  n2: number;         // 2nd 15cm blows
  n3: number;         // 3rd 15cm blows
  nspt: number;       // Computed: n2 + n3
  soilType: SoilType;   // Enum from SOIL_LIBRARY
  color?: string;     // Visual description
  waterLevel?: boolean; // If water was found at this depth
}

export interface Template {
  id: string;
  titulo: string;
  texto: string;
}