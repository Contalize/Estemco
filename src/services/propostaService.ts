// src/services/propostaService.ts
import {
    collection, doc, addDoc, updateDoc, deleteDoc,
    serverTimestamp, getDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Proposta, TipoServico, StatusProposta } from '../types/types';
import { proximoNumeroAtomico } from '../lib/numeracao';

// Dados para criação (sem id e campos automáticos)
export type PropostaCriar = Omit<Proposta, 'id' | 'numero' | 'status' | 'criadoEm' | 'atualizadoEm'>;

/**
 * Cria uma nova proposta com número sequencial automático.
 */
export async function criarProposta(
    tenantId: string,
    dados: PropostaCriar
): Promise<string> {
    const numero = await proximoNumeroAtomico(tenantId, dados.tipo);

    const ref = await addDoc(
        collection(db, 'empresas', tenantId, 'propostas'),
        {
            ...dados,
            numero,
            status: 'RASCUNHO' as StatusProposta,
            tenantId,
            criadoEm: serverTimestamp(),
            atualizadoEm: serverTimestamp(),
        }
    );

    return ref.id;
}

/**
 * Atualiza uma proposta existente.
 */
export async function atualizarProposta(
    tenantId: string,
    propostaId: string,
    dados: Partial<Proposta>
): Promise<void> {
    const ref = doc(db, 'empresas', tenantId, 'propostas', propostaId);
    await updateDoc(ref, {
        ...dados,
        atualizadoEm: serverTimestamp(),
    });
}

/**
 * Altera o status de uma proposta.
 */
export async function alterarStatusProposta(
    tenantId: string,
    propostaId: string,
    novoStatus: StatusProposta
): Promise<void> {
    const ref = doc(db, 'empresas', tenantId, 'propostas', propostaId);
    await updateDoc(ref, {
        status: novoStatus,
        atualizadoEm: serverTimestamp(),
    });
}

/**
 * Exclui uma proposta (só se status for RASCUNHO).
 */
export async function excluirProposta(
    tenantId: string,
    propostaId: string
): Promise<void> {
    const ref = doc(db, 'empresas', tenantId, 'propostas', propostaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Proposta não encontrada.');

    const proposta = snap.data() as Proposta;
    if (proposta.status !== 'RASCUNHO') {
        throw new Error('Apenas propostas em Rascunho podem ser excluídas.');
    }

    await deleteDoc(ref);
}