import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ConfigHCM, ConfigESC, ConfigSPT } from '../../types';

export type TipoEquipamento = 'HCM' | 'ESC' | 'SPT';

const DEFAULTS: Record<TipoEquipamento, any> = {
    HCM: {
        diametros: [{ mm: 300, preco: 40 }, { mm: 400, preco: 46 }, { mm: 500, preco: 60 }],
        faturamentoMinimoDiario: 8000,
        mobilizacaoPadrao: 4000,
        comprimentoMinimo: 5,
        acrescimoFimDeSemana: 30,
        condicoesPagamento: [{ nome: 'Sinal', percentual: 50, prazo: '3 dias após assinatura' }, { nome: 'Saldo', percentual: 50, prazo: '7 dias após medição' }],
        multaDesistencia: 8000, multaAtrasoContratante: 8000, multaInadimplencia: 5, jurosMensais: 1, multaDescumprimento: 2, indiceCorrecao: 'IGP-M/FGV',
        causasFaturamentoMinimo: ["Ineficiência no fornecimento de concreto"],
        causasIsencaoMinimo: ["Condições climáticas", "Quebra do equipamento HCM"]
    } as ConfigHCM,
    ESC: {
        diametros: [{ mm: 250, preco: 12.5 }, { mm: 300, preco: 15 }, { mm: 400, preco: 20 }],
        faturamentoMinimoObra: 3000,
        taxaHoraParada: 500,
        mobilizacaoPadrao: 500,
        acrescimoFimDeSemana: 30,
        condicoesPagamento: [{ nome: 'Sinal', percentual: 50, prazo: 'na assinatura' }],
        contratoSaidaDiariaPadrao: { metrosContratadosPorDia: 70, precoExcedentePorMetro: 15 }
    } as ConfigESC,
    SPT: {
        precoPorMetro: 75,
        mobilizacaoLaboratorio: 600,
        artPadrao: 108.39,
        metragemMinimaTotal: 40,
        metrosPorFuroEstimado: 13.33,
        prazoEntregaRelatorio: '5 dias úteis',
        aplicarFaturamentoMinimoAcima2Furos: true,
        sinalAgendamento: 1500,
        maximoParcelasCartao: 4
    } as ConfigSPT,
};

export function useConfiguracoes<T = ConfigHCM | ConfigESC | ConfigSPT>(empresaId: string | undefined, tipo: TipoEquipamento) {
    const [config, setConfig] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!empresaId) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchConfig = async () => {
            try {
                const ref = doc(db, 'empresas', empresaId, 'configuracoes', tipo);
                const snap = await getDoc(ref);

                if (cancelled) return;

                if (snap.exists()) {
                    setConfig(snap.data() as T);
                } else {
                    const defaults = DEFAULTS[tipo] as T;
                    await setDoc(ref, defaults as object);
                    if (!cancelled) setConfig(defaults);
                }
            } catch (err) {
                console.error("Erro ao buscar configurações", err);
                if (!cancelled) {
                    setConfig(DEFAULTS[tipo] as T);
                    setError("Usando parâmetros padrão. Personalize em Parâmetros do Sistema.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchConfig();
        return () => { cancelled = true; };
    }, [empresaId, tipo]);

    return { config, loading, error };
}
