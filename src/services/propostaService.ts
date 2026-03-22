// src/services/propostaService.ts
// Caminhos corretos para estrutura do projeto Estemco
import {
    collection, addDoc, updateDoc, doc,
    serverTimestamp, deleteDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';          // lib/ está na RAIZ do projeto
import { proximoNumeroAtomico } from '../lib/numeracao'; // src/lib/numeracao.ts

// ── Tipos inline (não dependem de types.ts) ─────────────────────────────────
type TipoServico = 'HCM' | 'ESC' | 'SPT';
type StatusProposta = 'RASCUNHO' | 'ENVIADA' | 'ACEITA' | 'RECUSADA' | 'EXPIRADA';

// ── Criar proposta (salva em empresas/{tenantId}/propostas) ─────────────────
export async function criarProposta(
    empresaId: string,
    dados: Record<string, any>
): Promise<string> {
    if (!dados.tipo) throw new Error('Tipo de serviço não informado (HCM, ESC ou SPT).');

    const tipo = dados.tipo as TipoServico;
    const propostasRef = collection(db, 'empresas', empresaId, 'propostas');

    // Número sequencial atômico (ex: "5014-HCM")
    const numero = await proximoNumeroAtomico(empresaId, tipo);

    const docRef = await addDoc(propostasRef, {
        ...dados,
        numero,
        status: (dados.status || 'RASCUNHO') as StatusProposta,
        tenantId: empresaId,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
    });

    return docRef.id;
}

// ── Atualizar proposta ──────────────────────────────────────────────────────
export async function atualizarProposta(
    empresaId: string,
    propostaId: string,
    dados: Record<string, any>
): Promise<void> {
    const docRef = doc(db, 'empresas', empresaId, 'propostas', propostaId);
    await updateDoc(docRef, {
        ...dados,
        atualizadoEm: serverTimestamp(),
    });
}

// ── Alterar status ──────────────────────────────────────────────────────────
export async function atualizarStatus(
    empresaId: string,
    propostaId: string,
    status: StatusProposta
): Promise<void> {
    await atualizarProposta(empresaId, propostaId, { status });
}

// ── Excluir proposta ────────────────────────────────────────────────────────
export async function excluirProposta(
    empresaId: string,
    propostaId: string
): Promise<void> {
    const docRef = doc(db, 'empresas', empresaId, 'propostas', propostaId);
    await deleteDoc(docRef);
}