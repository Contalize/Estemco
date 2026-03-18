import { db } from '../../lib/firebase';
import {
    collection, addDoc, updateDoc, doc, serverTimestamp,
    runTransaction, setDoc
} from 'firebase/firestore';
import { TipoServico, StatusProposta } from '../../types';
import { proximoNumeroAtomico } from '../lib/numeracao';

export async function criarProposta(
    empresaId: string,
    dados: Record<string, any>
): Promise<string> {
    if (!dados.tipo) throw new Error('Tipo de serviço não informado.');

    const tipo = dados.tipo as TipoServico;
    const propostasRef = collection(db, `empresas/${empresaId}/propostas`);
    // Generate the atomic proposal number
    const numero = await proximoNumeroAtomico(empresaId, tipo);

    const docRef = await addDoc(propostasRef, {
        ...dados,
        numero,
        status: dados.status || 'RASCUNHO',
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
    });

    return docRef.id;
}

export async function atualizarProposta(
    empresaId: string,
    propostaId: string,
    dados: Record<string, any>
): Promise<void> {
    const docRef = doc(db, `empresas/${empresaId}/propostas`, propostaId);
    await updateDoc(docRef, { ...dados, atualizadoEm: serverTimestamp() });
}

export async function atualizarStatus(
    empresaId: string,
    propostaId: string,
    status: StatusProposta
): Promise<void> {
    await atualizarProposta(empresaId, propostaId, { status });
}
