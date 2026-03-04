import { collection, addDoc, getDocs, query, where, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export interface PropostaData {
  id?: string;
  cliente: string;
  clienteId: string;
  dataEmissao: string;
  status: string;
  valorTotal: number;
  servicos?: {
    tipoEstaca: string;
    diametro: string;
    quantidade: number;
    metragemPrevista: number;
    precoMetro: number;
  }[];
  tipoEstaca?: string;
  diametro?: string;
  metragemPrevista?: number;
  precoMetro?: number;
  prazoExecucao: number;
  mobilizacao: number;
  faturamentoMinimo: number;
  taxaAgua: number;
  horaParada: number;
  solicitaNF: boolean;
  impostoNF?: number;
  solicitaART: boolean;
  valorART?: number;
  sinalPercentual: number;
  prazoSaldoDias: string;
  parcelas?: {
    dias: number;
    valor: number;
  }[];
  textoObrigacoesContratante?: string;
  textoObrigacoesContratada?: string;
  textoCondicoesRisco?: string;
  textoTermoAceite?: string;
  clausulasExtras?: { titulo: string; texto: string }[];
  mesmoEnderecoCliente?: boolean;
  obraCep?: string;
  obraEndereco?: string;
  obraNumero?: string;
  obraComplemento?: string;
  obraBairro?: string;
  obraCidade?: string;
  obraUf?: string;
  tenantId?: string;
  createdAt?: any;
}

const COLLECTION_NAME = 'propostas';

export const propostasService = {
  async criarProposta(data: Omit<PropostaData, 'id' | 'createdAt'>) {
    try {
      if (!auth.currentUser) throw new Error("Usuário não autenticado");
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...data,
        createdByUserId: auth.currentUser.uid,
        createdAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar proposta: ", error);
      throw error;
    }
  },

  async atualizarProposta(id: string, data: Partial<PropostaData>) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error("Erro ao atualizar proposta: ", error);
      throw error;
    }
  },

  async listarPropostas(tenantId: string): Promise<PropostaData[]> {
    try {
      if (!tenantId) return [];
      const q = query(
        collection(db, COLLECTION_NAME), 
        where('tenantId', '==', tenantId)
      );
      const querySnapshot = await getDocs(q);
      
      // Sort in memory instead of requiring a composite index
      const propostas = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PropostaData[];
      
      return propostas.sort((a, b) => {
        const dateA = a.createdAt?.toMillis?.() || new Date(a.dataEmissao).getTime();
        const dateB = b.createdAt?.toMillis?.() || new Date(b.dataEmissao).getTime();
        return dateB - dateA;
      });
    } catch (error) {
      console.error("Erro ao listar propostas: ", error);
      throw error;
    }
  }
};
