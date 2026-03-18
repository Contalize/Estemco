import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const BASE_NUMERO = {
    HCM: 5000,
    ESC: 4800,
    SPT: 2037,
};

export async function proximoNumeroAtomico(
    empresaId: string,
    tipo: 'HCM' | 'ESC' | 'SPT'
): Promise<string> {
    const contadorRef = doc(db, `empresas/${empresaId}/contadores/propostas_${tipo}`);

    const novoNumeroSeq = await runTransaction(db, async (tx) => {
        const snap = await tx.get(contadorRef);
        const atual = snap.exists() ? (snap.data().ultimo ?? BASE_NUMERO[tipo]) : BASE_NUMERO[tipo];
        const proximo = atual + 1;
        tx.set(contadorRef, {
            ultimo: proximo,
            ultimaAtualizacao: serverTimestamp()
        }, { merge: true });
        return proximo;
    });

    // Formatação
    const seq = String(novoNumeroSeq).padStart(4, '0');
    if (tipo === 'SPT') {
        const ano = new Date().getFullYear().toString().slice(-2);
        return `${seq}-${ano}`;
    }
    return `${seq}-${tipo}`;
}

// Keep for backward compatibility if needed, but internally uses atomic
export async function proximoNumeroOrcamento(empresaId: string, tipo: 'HCM' | 'ESC' | 'SPT'): Promise<string> {
    return proximoNumeroAtomico(empresaId, tipo);
}
