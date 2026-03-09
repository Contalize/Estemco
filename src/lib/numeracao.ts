import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export async function proximoNumeroOrcamento(empresaId: string, tipo: 'HCM' | 'ESC' | 'SPT'): Promise<string> {
    const anoAtual = new Date().getFullYear().toString().slice(-2); // Ex: "26" ou "24"
    const suffix = tipo === 'SPT' ? `-${anoAtual}` : `-${tipo}`;

    try {
        const q = query(
            collection(db, 'empresas', empresaId, 'orcamentos'),
            orderBy('criadoEm', 'desc'),
            limit(50)
        );

        const snap = await getDocs(q);
        const orcamentosTipo = snap.docs
            .map(d => d.data().numero as string)
            .filter(n => n && n.endsWith(suffix));

        if (orcamentosTipo.length === 0) {
            // Começo inicial sequencial ESTEMCO real
            const iniciais = { HCM: 5016, ESC: 4918, SPT: 2040 };
            return `${iniciais[tipo]}${suffix}`;
        }

        // Pega o maior numero
        const numeros = orcamentosTipo.map(n => parseInt(n.split('-')[0]) || 0);
        const maximo = Math.max(...numeros, 0);
        return `${maximo + 1}${suffix}`;
    } catch (error) {
        console.error("Erro ao puxar próxima numeração de orçamento", error);
        // Fallback seguro em caso de indisponibilidade de rede
        return `${Math.floor(Math.random() * 9000) + 1000}${suffix}`;
    }
}
