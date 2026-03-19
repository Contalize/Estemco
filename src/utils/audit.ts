import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export async function logAudit(
    userId: string,
    acao: string,
    modulo: string,
    detalhes: string,
    tenantId: string
): Promise<void> {
    if (!userId || !tenantId) return;

    try {
        const auditRef = collection(db, 'empresas', tenantId, 'audit_log');
        await addDoc(auditRef, {
            userId,
            acao,
            modulo,
            detalhes,
            tenantId,
            createdAt: Timestamp.now()
        });
    } catch (error) {
        console.error("Falha ao registrar log de auditoria:", error);
    }
}
