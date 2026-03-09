import { db } from '../../lib/firebase';
import {
    collection, addDoc, updateDoc, doc, serverTimestamp,
    query, orderBy, getDocs, limit, where
} from 'firebase/firestore';
import { Proposta, TipoServico, StatusProposta } from '../../types';
import { gerarNumeroProposta } from '../utils/calculosProposta';

// Bases numéricas por tipo (para sequência correta)
const BASE_NUMERO: Record<TipoServico, number> = {
    HCM: 5000,
    ESC: 4800,
    SPT: 2037,
};

export async function criarProposta(
    empresaId: string,
    dados: Omit<Proposta, 'id' | 'numero' | 'criadoEm' | 'atualizadoEm' | 'status'>
): Promise<string> {
    const propostasRef = collection(db, `empresas/${empresaId}/propostas`);

    // Buscar maior número do tipo
    const q = query(
        propostasRef,
        where('tipo', '==', dados.tipo),
        orderBy('criadoEm', 'desc'),
        limit(1)
    );
    const snap = await getDocs(q);

    let ultimoNumero = BASE_NUMERO[dados.tipo];
    if (!snap.empty) {
        const ultimaProposta = snap.docs[0].data() as Proposta;
        if (ultimaProposta && ultimaProposta.numero) {
            const parsed = parseInt(ultimaProposta.numero.split('-')[0]);
            if (!isNaN(parsed)) ultimoNumero = parsed;
        }
    }

    const numero = gerarNumeroProposta(dados.tipo, ultimoNumero);

    const docRef = await addDoc(propostasRef, {
        ...dados,
        numero,
        status: 'rascunho',
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
    });

    return docRef.id;
}

export async function atualizarProposta(
    empresaId: string,
    propostaId: string,
    dados: Partial<Proposta>
): Promise<void> {
    const docRef = doc(db, `empresas/${empresaId}/propostas/${propostaId}`);
    await updateDoc(docRef, { ...dados, atualizadoEm: serverTimestamp() });
}

export async function atualizarStatus(
    empresaId: string,
    propostaId: string,
    status: StatusProposta
): Promise<void> {
    await atualizarProposta(empresaId, propostaId, { status });
}
