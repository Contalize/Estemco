import { Cliente, ServicoCatalogo, Maquina, Agendamento } from '../types';

export const CLIENTES_MOCK: Cliente[] = [
  { id: '1', razaoSocial: 'Leonardi Pré-Fabricados', cnpj: '12.345.678/0001-90', enderecoFaturamento: 'Indaiatuba-SP' }
];

// Adicionei a propriedade 'categoria' nas máquinas para o filtro
export const MAQUINAS_MOCK: (Maquina & { categoria: string })[] = [
  { id: 'm1', nome: 'Hélice Contínua 01 (Caminhão)', status: 'DISPONIVEL', categoria: 'HELICE' },
  { id: 'm2', nome: 'Hélice Contínua 02 (Esteira)', status: 'EM_OBRA', categoria: 'HELICE' },
  { id: 'm3', nome: 'Perfuratriz Escavada 01', status: 'DISPONIVEL', categoria: 'ESCAVADA' },
  { id: 'm4', nome: 'Perfuratriz Escavada 02', status: 'MANUTENCAO', categoria: 'ESCAVADA' },
];

export const AGENDAMENTOS_MOCK: Agendamento[] = [
  { id: 'a1', maquinaId: 'm2', clienteNome: 'Obra Tenda', dataInicio: '2025-12-01', dataFim: '2025-12-15' }
];

// --- GERAÇÃO AUTOMÁTICA DE SERVIÇOS (10cm a 100cm, passo 5) ---

// Gera array [10, 15, 20, ..., 100]
const diameters = Array.from({ length: 19 }, (_, i) => 10 + (i * 5));

const servicosHelice: ServicoCatalogo[] = diameters.map(d => ({
    id: `hc${d}`,
    nome: `Hélice Contínua Ø ${d}cm`,
    unidade: 'm',
    // Preço fictício base + fator diâmetro para simulação
    precoPadrao: 25.00 + (d * 0.9), 
    categoria: 'HELICE'
}));

const servicosEscavada: ServicoCatalogo[] = diameters.map(d => ({
    id: `esc${d}`,
    nome: `Escavada Mecanicamente Ø ${d}cm`,
    unidade: 'm',
    // Preço fictício base + fator diâmetro para simulação
    precoPadrao: 18.00 + (d * 0.7), 
    categoria: 'ESCAVADA'
}));

export const SERVICOS_MOCK: ServicoCatalogo[] = [
  ...servicosHelice,
  ...servicosEscavada,
  // Itens Adicionais Fixos
  { id: 'mob', nome: 'Mobilização/Desmobilização', unidade: 'un', precoPadrao: 1500.00, categoria: 'OUTROS' },
  { id: 'spt', nome: 'Sondagem SPT', unidade: 'm', precoPadrao: 120.00, categoria: 'SONDAGEM' },
  { id: 'taxa_minima', nome: 'Taxa Mínima Operacional', unidade: 'vb', precoPadrao: 5000.00, categoria: 'OUTROS' },
];