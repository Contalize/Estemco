import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCollection } from '../src/firebase/firestore/use-collection';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Card, Select, Button, Badge } from './ui';
import { FileText, Download, TrendingUp, TrendingDown, Clock, Activity, AlertCircle, Building2, MapPin, Calendar, HardHat } from 'lucide-react';
import { ConstructionSite, DREObra, GlobalConfig } from '../types';
import { Page, Text, View, Document, StyleSheet, pdf } from '@react-pdf/renderer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { formatarData } from '../src/utils/formatDate';

interface DREProps {
  config: GlobalConfig;
}

// ============================================================================
// PDF STYLES & COMPONENT
// ============================================================================
const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 10 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 10, color: '#666' },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 5, backgroundColor: '#F3F4F6', padding: 4 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingVertical: 4 },
  colLabel: { width: '50%' },
  colOrcado: { width: '15%', textAlign: 'right' },
  colPercent: { width: '15%', textAlign: 'right' },
  colReal: { width: '20%', textAlign: 'right' },
  totalRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#000', paddingVertical: 4, marginTop: 2, fontWeight: 'bold' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#E5E7EB', paddingVertical: 4, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingVertical: 4 },
  tableCol: { flex: 1, textAlign: 'center' },
  tableColWide: { flex: 2, textAlign: 'left' }
});

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const DREPDFDetalhado = ({ dre, obra, companyData }: { dre: DREObra, obra: ConstructionSite, companyData: any }) => {
  const formatPercent = (val: number) => `${val.toFixed(1)}%`;

  const receitaLiquida = dre.receitaContratada;
  const orcadoAlvo = (dre.totalMetrosExecutados > 0 ? dre.totalMetrosExecutados : (obra.contractMeters || 1));

  // Orçado Estimates (Simplificado: proporcional aos metros executados ou total contratado)
  const orcadoDiesel = orcadoAlvo * (companyData?.consumoDieselPorMetro || 0) * (companyData?.precoDiesel || 0);
  const orcadoConcreto = orcadoAlvo * (companyData?.consumoConcretoPorMetro || 0) * (companyData?.precoConcreto || 0);
  const orcadoMaoDeObra = (dre.totalBoletins || 1) * (companyData?.custoEquipeDiario || 0);

  const realDiesel = dre.totalDieselGasto || 0;
  const realConcreto = dre.totalCustoConcreto || 0;
  const realMaoDeObra = dre.totalCustoMaoDeObra || 0;
  const realHorasParadas = dre.totalCustoHorasParadas || 0;
  const realMob = dre.custoMobilizacao || 0;
  const realART = dre.custoART || 0;

  const custoDiretoTotal = realDiesel + realConcreto + realMaoDeObra + realHorasParadas + realMob + realART;
  const margemContribuicao = receitaLiquida - custoDiretoTotal;
  const margemPercent = receitaLiquida > 0 ? (margemContribuicao / receitaLiquida) * 100 : 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>DRE Detalhado - {obra.clienteNome}</Text>
            <Text style={styles.subtitle}>{obra.enderecoDaObra}</Text>
          </View>
          <View>
            <Text style={styles.subtitle}>Gerado em: {new Date().toLocaleDateString('pt-BR')}</Text>
            <Text style={styles.subtitle}>Status: {obra.statusObra}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demonstrativo Contábil</Text>

          {/* Header row */}
          <View style={styles.tableHeader}>
            <Text style={styles.colLabel}>DESCRIÇÃO</Text>
            <Text style={styles.colOrcado}>ORÇADO</Text>
            <Text style={styles.colPercent}>% REC</Text>
            <Text style={styles.colReal}>REAL</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.colLabel}>(+) RECEITA BRUTA</Text>
            <Text style={styles.colOrcado}>{formatCurrency(dre.receitaContratada)}</Text>
            <Text style={styles.colPercent}>100%</Text>
            <Text style={styles.colReal}>{formatCurrency(dre.receitaContratada)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.colLabel}>(=) RECEITA LÍQUIDA</Text>
            <Text style={styles.colOrcado}>{formatCurrency(receitaLiquida)}</Text>
            <Text style={styles.colPercent}>100%</Text>
            <Text style={styles.colReal}>{formatCurrency(receitaLiquida)}</Text>
          </View>

          <Text style={{ ...styles.sectionTitle, marginTop: 10 }}>CUSTOS DIRETOS</Text>

          <View style={styles.row}>
            <Text style={styles.colLabel}>(-) Diesel / Combustível</Text>
            <Text style={styles.colOrcado}>{formatCurrency(orcadoDiesel)}</Text>
            <Text style={styles.colPercent}>{receitaLiquida > 0 ? formatPercent((realDiesel / receitaLiquida) * 100) : '0%'}</Text>
            <Text style={styles.colReal}>{formatCurrency(realDiesel)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.colLabel}>(-) Concreto</Text>
            <Text style={styles.colOrcado}>{formatCurrency(orcadoConcreto)}</Text>
            <Text style={styles.colPercent}>{receitaLiquida > 0 ? formatPercent((realConcreto / receitaLiquida) * 100) : '0%'}</Text>
            <Text style={styles.colReal}>{formatCurrency(realConcreto)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.colLabel}>(-) Mão de Obra</Text>
            <Text style={styles.colOrcado}>{formatCurrency(orcadoMaoDeObra)}</Text>
            <Text style={styles.colPercent}>{receitaLiquida > 0 ? formatPercent((realMaoDeObra / receitaLiquida) * 100) : '0%'}</Text>
            <Text style={styles.colReal}>{formatCurrency(realMaoDeObra)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.colLabel}>(-) Horas Paradas</Text>
            <Text style={styles.colOrcado}>R$ 0,00</Text>
            <Text style={styles.colPercent}>{receitaLiquida > 0 ? formatPercent((realHorasParadas / receitaLiquida) * 100) : '0%'}</Text>
            <Text style={styles.colReal}>{formatCurrency(realHorasParadas)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.colLabel}>(-) Mobilização / Transporte</Text>
            <Text style={styles.colOrcado}>-</Text>
            <Text style={styles.colPercent}>{receitaLiquida > 0 ? formatPercent((realMob / receitaLiquida) * 100) : '0%'}</Text>
            <Text style={styles.colReal}>{formatCurrency(realMob)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.colLabel}>(-) ART / Taxas</Text>
            <Text style={styles.colOrcado}>-</Text>
            <Text style={styles.colPercent}>{receitaLiquida > 0 ? formatPercent((realART / receitaLiquida) * 100) : '0%'}</Text>
            <Text style={styles.colReal}>{formatCurrency(realART)}</Text>
          </View>

          <View style={{ ...styles.totalRow, color: '#DC2626' }}>
            <Text style={styles.colLabel}>(=) TOTAL CUSTOS</Text>
            <Text style={styles.colOrcado}>-</Text>
            <Text style={styles.colPercent}>{receitaLiquida > 0 ? formatPercent((custoDiretoTotal / receitaLiquida) * 100) : '0%'}</Text>
            <Text style={styles.colReal}>{formatCurrency(custoDiretoTotal)}</Text>
          </View>

          <View style={{ ...styles.totalRow, marginTop: 10, backgroundColor: margemContribuicao >= 0 ? '#ECFDF5' : '#FEF2F2', padding: 8 }}>
            <Text style={styles.colLabel}>(=) MARGEM DE CONTRIBUIÇÃO</Text>
            <Text style={styles.colOrcado}>-</Text>
            <Text style={styles.colPercent}>{formatPercent(margemPercent)}</Text>
            <Text style={styles.colReal}>{formatCurrency(margemContribuicao)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Métricas Físicas</Text>
          <View style={styles.row}><Text style={styles.colLabel}>Metros Executados:</Text><Text style={styles.colReal}>{dre.totalMetrosExecutados.toFixed(1)} m</Text></View>
          <View style={styles.row}><Text style={styles.colLabel}>Overbreak Médio:</Text><Text style={styles.colReal}>{dre.overbreakMedio?.toFixed(1) || 0}%</Text></View>
          <View style={styles.row}><Text style={styles.colLabel}>Total Boletins:</Text><Text style={styles.colReal}>{dre.totalBoletins || 0}</Text></View>
        </View>

      </Page>
    </Document>
  );
};

const DREPDFConsolidado = ({ dres, obras }: { dres: DREObra[], obras: ConstructionSite[] }) => {
  const getObraName = (id: string) => obras.find(o => o.id === id)?.clienteNome || 'Desconhecida';
  const getObraStatus = (id: string) => obras.find(o => o.id === id)?.statusObra || '-';

  const consolidated = dres.map(d => {
    const custo = (d.totalDieselGasto || 0) + (d.totalCustoConcreto || 0) + (d.totalCustoMaoDeObra || 0) + (d.totalCustoHorasParadas || 0) + (d.custoMobilizacao || 0) + (d.custoART || 0);
    const rec = d.receitaContratada || 0;
    const margem = rec - custo;
    const pct = rec > 0 ? (margem / rec) * 100 : 0;
    return { ...d, custo, margem, pct };
  });

  const totalRec = consolidated.reduce((acc, obj) => acc + obj.receitaContratada, 0);
  const totalCusto = consolidated.reduce((acc, obj) => acc + obj.custo, 0);
  const totalMargem = totalRec - totalCusto;
  const totalPct = totalRec > 0 ? (totalMargem / totalRec) * 100 : 0;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>DRE Consolidado - Todas as Obras</Text>
            <Text style={styles.subtitle}>Visão de Portfólio</Text>
          </View>
          <View>
            <Text style={styles.subtitle}>Gerado em: {new Date().toLocaleDateString('pt-BR')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableColWide}>Obra / Cliente</Text>
            <Text style={styles.tableCol}>Status</Text>
            <Text style={styles.tableCol}>Receita</Text>
            <Text style={styles.tableCol}>Custo</Text>
            <Text style={styles.tableCol}>Margem (R$)</Text>
            <Text style={styles.tableCol}>Margem (%)</Text>
          </View>

          {consolidated.map((d, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.tableColWide}>{getObraName(d.obraId || '')}</Text>
              <Text style={styles.tableCol}>{getObraStatus(d.obraId || '')}</Text>
              <Text style={styles.tableCol}>{formatCurrency(d.receitaContratada)}</Text>
              <Text style={styles.tableCol}>{formatCurrency(d.custo)}</Text>
              <Text style={{ ...styles.tableCol, color: d.margem >= 0 ? 'green' : 'red' }}>{formatCurrency(d.margem)}</Text>
              <Text style={{ ...styles.tableCol, color: d.pct >= 0 ? 'green' : 'red' }}>{d.pct.toFixed(1)}%</Text>
            </View>
          ))}

          <View style={{ ...styles.totalRow, backgroundColor: '#F3F4F6', padding: 8 }}>
            <Text style={styles.tableColWide}>TOTAIS GERAIS</Text>
            <Text style={styles.tableCol}>-</Text>
            <Text style={styles.tableCol}>{formatCurrency(totalRec)}</Text>
            <Text style={styles.tableCol}>{formatCurrency(totalCusto)}</Text>
            <Text style={{ ...styles.tableCol, color: totalMargem >= 0 ? 'green' : 'red' }}>{formatCurrency(totalMargem)}</Text>
            <Text style={{ ...styles.tableCol, color: totalPct >= 0 ? 'green' : 'red' }}>{totalPct.toFixed(1)}%</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}


// ============================================================================
// MAIN DRE COMPONENT
// ============================================================================
export const DRE: React.FC<DREProps> = ({ config }) => {
  const { profile } = useAuth();

  // Filtros
  const [filtroObraId, setFiltroObraId] = useState<string>('todas');
  const [filtroMes, setFiltroMes] = useState<number>(new Date().getMonth() + 1);
  const [filtroAno, setFiltroAno] = useState<number>(new Date().getFullYear());
  const [filtroEngenheiro, setFiltroEngenheiro] = useState<string>('todos');

  // Estados de Dados
  const [obrasList, setObrasList] = useState<ConstructionSite[]>([]);
  const [engenheirosList, setEngenheirosList] = useState<string[]>([]);

  const [companyData, setCompanyData] = useState<any>(null);
  const [detailedDre, setDetailedDre] = useState<DREObra | null>(null);
  const [consolidatedDres, setConsolidatedDres] = useState<DREObra[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const anosDisponiveis = [new Date().getFullYear() - 2, new Date().getFullYear() - 1, new Date().getFullYear()];
  const mesesDisponiveis = [
    { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' }, { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' }, { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' }
  ];

  // 1. Fetch Master Data (Obras & Empresa)
  useEffect(() => {
    if (!profile?.tenantId) return;

    const fetchEmpr = async () => {
      const ref = doc(db, 'empresas', profile.tenantId!);
      const snap = await getDoc(ref);
      if (snap.exists()) setCompanyData(snap.data());
    };
    fetchEmpr();

    const fetchObras = async () => {
      const q = query(collection(db, 'obras'), where('tenantId', '==', profile.tenantId));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ConstructionSite));

      // Ordenação: Em Andamento primeiro
      docs.sort((a, b) => {
        if (a.statusObra === 'Em Andamento' && b.statusObra !== 'Em Andamento') return -1;
        if (a.statusObra !== 'Em Andamento' && b.statusObra === 'Em Andamento') return 1;
        return 0;
      });

      setObrasList(docs);

      // Extract unique engineers
      const engs = Array.from(new Set(docs.map(o => o.responsavelEngenheiro).filter(Boolean))) as string[];
      setEngenheirosList(engs);
    };

    fetchObras();
  }, [profile?.tenantId]);

  // 2. Fetch DRE Data based on Filters
  useEffect(() => {
    if (!profile?.tenantId) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (filtroObraId !== 'todas') {
          // Detailed View
          const dreDocRef = doc(db, 'dre_obras', filtroObraId);
          const dreSnap = await getDoc(dreDocRef);
          if (dreSnap.exists()) {
            setDetailedDre({ id: dreSnap.id, ...dreSnap.data() } as DREObra);
          } else {
            setDetailedDre(null);
          }
        } else {
          // Consolidated View
          const q = query(collection(db, 'dre_obras'), where('tenantId', '==', profile.tenantId));
          const snap = await getDocs(q);

          let docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as DREObra));

          // Apply Engineer Filter if 'todos' is not selected
          if (filtroEngenheiro !== 'todos') {
            const allowedObrasIds = obrasList.filter(o => o.responsavelEngenheiro === filtroEngenheiro).map(o => o.id);
            docs = docs.filter(d => d.obraId && allowedObrasIds.includes(d.obraId));
          }

          setConsolidatedDres(docs);
        }
      } catch (error) {
        console.error("Erro ao buscar DRE:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Note: Mês e Ano logic should be implemented on Firebase backend functions slicing data,
    // Since Native DRE structures accumulate metrics across all time. 
    // We fetch current unified DRE state for this proof-of-concept.
    fetchData();
  }, [profile?.tenantId, filtroObraId, filtroEngenheiro, obrasList]);

  const handleClearFilters = () => {
    setFiltroObraId('todas');
    setFiltroEngenheiro('todos');
    setFiltroMes(new Date().getMonth() + 1);
    setFiltroAno(new Date().getFullYear());
  };

  const handleExportPDF = async () => {
    if (filtroObraId !== 'todas' && detailedDre) {
      const obra = obrasList.find(o => o.id === filtroObraId);
      if (!obra) return;
      const blob = await pdf(<DREPDFDetalhado dre={detailedDre} obra={obra} companyData={companyData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DRE_${obra.clienteNome}_${filtroAno}_${filtroMes}.pdf`;
      link.click();
    } else if (filtroObraId === 'todas') {
      const blob = await pdf(<DREPDFConsolidado dres={consolidatedDres} obras={obrasList} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DRE_Consolidado_${filtroAno}_${filtroMes}.pdf`;
      link.click();
    }
  };

  if (!profile?.tenantId) return null;

  // Render Logic Helpers
  const renderDetailedView = () => {
    if (!detailedDre) return (
      <div className="py-20 text-center text-slate-500 bg-slate-50 border border-dashed rounded-xl border-slate-300">
        Nenhum registro contábil de obras (DRE) encontrado para os parâmetros selecionados. Lembre-se de lançar boletins.
      </div>
    );

    const obra = obrasList.find(o => o.id === filtroObraId);

    // Core Calcs
    const receitaLiquida = detailedDre.receitaContratada;
    const realDiesel = detailedDre.totalDieselGasto || 0;
    const realConcreto = detailedDre.totalCustoConcreto || 0;
    const realMaoDeObra = detailedDre.totalCustoMaoDeObra || 0;
    const realHorasParadas = detailedDre.totalCustoHorasParadas || 0;
    const realMob = detailedDre.custoMobilizacao || 0;
    const realART = detailedDre.custoART || 0;

    const custoDiretoTotal = realDiesel + realConcreto + realMaoDeObra + realHorasParadas + realMob + realART;
    const margemContribuicao = receitaLiquida - custoDiretoTotal;
    const margemPercent = receitaLiquida > 0 ? (margemContribuicao / receitaLiquida) * 100 : 0;

    // Budget Calcs (Simulated)
    const orcadoAlvo = detailedDre.totalMetrosExecutados > 0 ? detailedDre.totalMetrosExecutados : (obra?.contractMeters || 1);
    const orcadoDiesel = orcadoAlvo * (companyData?.consumoDieselPorMetro || 0) * (companyData?.precoDiesel || 0);
    const orcadoConcreto = orcadoAlvo * (companyData?.consumoConcretoPorMetro || 0) * (companyData?.precoConcreto || 0);
    const orcadoMaoDeObra = (detailedDre.totalBoletins || 1) * (companyData?.custoEquipeDiario || 0);

    const renderCellState = (real: number, orcado: number) => {
      if (orcado === 0) return <span className="font-bold">{formatCurrency(real)}</span>;

      const diff = real - orcado;
      const pctDiff = (diff / orcado) * 100;

      let colorClass = 'text-slate-900';
      if (diff > 0 && pctDiff > 10) colorClass = 'text-red-600 font-bold'; // Bad: over budget
      else if (diff > 0) colorClass = 'text-red-500';
      else if (diff < 0) colorClass = 'text-emerald-600 font-bold'; // Good: under budget

      return (
        <span className={colorClass}>
          {formatCurrency(real)}
        </span>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl shadow-md border-none relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Building2 size={120} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge className={obra?.statusObra === 'Em Andamento' ? 'bg-emerald-500 hover:bg-emerald-600 border-none' : 'bg-slate-600 border-none'}>
                  {obra?.statusObra}
                </Badge>
                <div className="text-slate-300 text-sm flex items-center gap-1">
                  <Calendar size={14} /> Início: {obra?.dataInicio ? formatarData(obra.dataInicio) : 'N/D'}
                </div>
              </div>
              <h2 className="text-3xl font-black text-white">{obra?.clienteNome}</h2>
              <p className="text-slate-300 mt-1 flex items-center gap-2"><MapPin size={16} /> {obra?.enderecoDaObra}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-slate-400 text-sm uppercase tracking-wider font-bold mb-1">Eng. Responsável</p>
              <div className="flex items-center gap-2 text-white justify-end">
                <HardHat size={18} className="text-amber-400" />
                <span className="font-medium">{obra?.responsavelEngenheiro || 'Não atribuído'}</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="p-4 md:col-span-2 border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receita Contratada</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(receitaLiquida)}</h3>
          </Card>
          <Card className="p-4 md:col-span-2 border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receita Medida</p>
            <h3 className="text-2xl font-black text-indigo-600 mt-1">{formatCurrency(detailedDre.receitaMedidaAcumulada || 0)}</h3>
            <p className="text-xs text-slate-500 mt-1">{receitaLiquida > 0 ? ((detailedDre.receitaMedidaAcumulada || 0) / receitaLiquida * 100).toFixed(1) : 0}% faturado</p>
          </Card>
          <Card className={`p-4 col-span-2 md:col-span-1 border-l-4 ${margemContribuicao >= 0 ? 'border-emerald-500' : 'border-red-500'} bg-slate-50`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margem R$</p>
            <h3 className={`text-xl font-black mt-1 ${margemContribuicao >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(margemContribuicao)}</h3>
          </Card>
          <Card className={`p-4 col-span-2 md:col-span-1 border-l-4 ${margemPercent >= 0 ? 'border-emerald-500' : 'border-red-500'} bg-slate-50`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margem %</p>
            <h3 className={`text-xl font-black mt-1 ${margemPercent >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{margemPercent.toFixed(1)}%</h3>
          </Card>
          <Card className="p-4 md:col-span-3 border-slate-200 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Metros Executados</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{detailedDre.totalMetrosExecutados.toFixed(1)} m</h3>
            </div>
            <Activity className="text-slate-300" size={32} />
          </Card>
          <Card className="p-4 md:col-span-3 border-slate-200 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Overbreak Médio</p>
              <h3 className={`text-2xl font-black mt-1 ${detailedDre.overbreakMedio > 20 ? 'text-red-600' : 'text-emerald-600'}`}>{detailedDre.overbreakMedio.toFixed(1)}%</h3>
            </div>
            <AlertCircle className={detailedDre.overbreakMedio > 20 ? 'text-red-300' : 'text-emerald-300'} size={32} />
          </Card>
        </div>

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-100 px-6 py-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 tracking-tight">Demonstrativo Contábil</h3>
            <p className="text-xs text-slate-500 mt-1">Comparativo de orçamento estimado via métricas contratuais vs apontamentos de campo (BDO).</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold">Descrição</th>
                  <th className="px-6 py-4 font-bold text-right">Orçado</th>
                  <th className="px-6 py-4 font-bold text-right">% Rec</th>
                  <th className="px-6 py-4 font-bold text-right">Realizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* RECEITA */}
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-700 font-medium">(+) RECEITA BRUTA CONTRATADA</td>
                  <td className="px-6 py-4 text-right">{formatCurrency(receitaLiquida)}</td>
                  <td className="px-6 py-4 text-right text-slate-400">100%</td>
                  <td className="px-6 py-4 text-right font-medium">{formatCurrency(receitaLiquida)}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-500">(-) Impostos s/ Faturamento</td>
                  <td className="px-6 py-4 text-right">R$ 0,00</td>
                  <td className="px-6 py-4 text-right text-slate-400">0%</td>
                  <td className="px-6 py-4 text-right">R$ 0,00</td>
                </tr>
                <tr className="bg-slate-50/80 border-y-2 border-slate-200 font-bold">
                  <td className="px-6 py-4 text-slate-900">(=) RECEITA LÍQUIDA</td>
                  <td className="px-6 py-4 text-right text-slate-900">{formatCurrency(receitaLiquida)}</td>
                  <td className="px-6 py-4 text-right text-indigo-500">100%</td>
                  <td className="px-6 py-4 text-right text-slate-900">{formatCurrency(receitaLiquida)}</td>
                </tr>

                {/* CUSTOS DIRETOS */}
                <tr className="bg-white"><td colSpan={4} className="px-6 py-2 pb-0"><span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">CUSTOS DIRETOS (CMV/CPV)</span></td></tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-600 pl-10">Diesel / Combustível</td>
                  <td className="px-6 py-3 text-right text-slate-500">{formatCurrency(orcadoDiesel)}</td>
                  <td className="px-6 py-3 text-right text-slate-400">{receitaLiquida > 0 ? (realDiesel / receitaLiquida * 100).toFixed(1) : 0}%</td>
                  <td className="px-6 py-3 text-right">{renderCellState(realDiesel, orcadoDiesel)}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-600 pl-10">Concreto Usinado</td>
                  <td className="px-6 py-3 text-right text-slate-500">{formatCurrency(orcadoConcreto)}</td>
                  <td className="px-6 py-3 text-right text-slate-400">{receitaLiquida > 0 ? (realConcreto / receitaLiquida * 100).toFixed(1) : 0}%</td>
                  <td className="px-6 py-3 text-right">{renderCellState(realConcreto, orcadoConcreto)}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-600 pl-10">Mão de Obra de Campo</td>
                  <td className="px-6 py-3 text-right text-slate-500">{formatCurrency(orcadoMaoDeObra)}</td>
                  <td className="px-6 py-3 text-right text-slate-400">{receitaLiquida > 0 ? (realMaoDeObra / receitaLiquida * 100).toFixed(1) : 0}%</td>
                  <td className="px-6 py-3 text-right">{renderCellState(realMaoDeObra, orcadoMaoDeObra)}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-600 pl-10">Apropriação Horas Paradas</td>
                  <td className="px-6 py-3 text-right text-slate-500">R$ 0,00</td>
                  <td className="px-6 py-3 text-right text-slate-400">{receitaLiquida > 0 ? (realHorasParadas / receitaLiquida * 100).toFixed(1) : 0}%</td>
                  <td className="px-6 py-3 text-right">{renderCellState(realHorasParadas, 0)}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-600 pl-10">Mobilização / Desmob</td>
                  <td className="px-6 py-3 text-right text-slate-500">-</td>
                  <td className="px-6 py-3 text-right text-slate-400">{receitaLiquida > 0 ? (realMob / receitaLiquida * 100).toFixed(1) : 0}%</td>
                  <td className="px-6 py-3 text-right">{renderCellState(realMob, 0)}</td>
                </tr>
                <tr className="hover:bg-slate-50 border-b border-slate-200">
                  <td className="px-6 py-3 text-slate-600 pl-10">Taxas e ART</td>
                  <td className="px-6 py-3 text-right text-slate-500">-</td>
                  <td className="px-6 py-3 text-right text-slate-400">{receitaLiquida > 0 ? (realART / receitaLiquida * 100).toFixed(1) : 0}%</td>
                  <td className="px-6 py-3 text-right">{renderCellState(realART, 0)}</td>
                </tr>

                <tr className="bg-red-50/50 font-bold border-b border-red-100">
                  <td className="px-6 py-4 text-red-900">(=) CUSTO DIRETO TOTAL</td>
                  <td className="px-6 py-4 text-right text-red-800">
                    {formatCurrency(orcadoDiesel + orcadoConcreto + orcadoMaoDeObra)}
                  </td>
                  <td className="px-6 py-4 text-right text-red-700">{receitaLiquida > 0 ? (custoDiretoTotal / receitaLiquida * 100).toFixed(1) : 0}%</td>
                  <td className="px-6 py-4 text-right text-red-900">{formatCurrency(custoDiretoTotal)}</td>
                </tr>

                {/* MARGEM RESULTADO */}
                <tr className={`${margemContribuicao >= 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                  <td className="px-6 py-5 font-black text-base uppercase tracking-wider">(=) Margem de Contribuição</td>
                  <td className="px-6 py-5 text-right font-medium opacity-80">-</td>
                  <td className="px-6 py-5 text-right font-black text-lg">{margemPercent.toFixed(1)}%</td>
                  <td className="px-6 py-5 text-right font-black text-xl">{formatCurrency(margemContribuicao)}</td>
                </tr>

              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderConsolidatedView = () => {
    if (consolidatedDres.length === 0) return (
      <div className="py-20 text-center text-slate-500 bg-slate-50 border border-dashed rounded-xl border-slate-300">
        Não há registros de DRE consolidados encontrados para esse filtro.
      </div>
    );

    // Compute metrics
    const tableData = consolidatedDres.map(d => {
      const obra = obrasList.find(o => o.id === d.obraId);
      const rec = d.receitaContratada || 0;
      const custo = (d.totalDieselGasto || 0) + (d.totalCustoConcreto || 0) + (d.totalCustoMaoDeObra || 0) + (d.totalCustoHorasParadas || 0) + (d.custoMobilizacao || 0) + (d.custoART || 0);
      const margem = rec - custo;
      const pct = rec > 0 ? (margem / rec) * 100 : 0;

      // Chart Bar Color logic mapping (Recharts custom coloring strategy)
      let color = '#10B981'; // emerald
      if (pct < 10) color = '#EF4444'; // red
      else if (pct < 20) color = '#F59E0B'; // amber

      return {
        id: d.id,
        obraNome: obra?.clienteNome || 'Desconhecida',
        status: obra?.statusObra || '-',
        rec, custo, margem, pct, color
      }
    }).sort((a, b) => b.rec - a.rec);

    const totalRec = tableData.reduce((acc, curr) => acc + curr.rec, 0);
    const totalCusto = tableData.reduce((acc, curr) => acc + curr.custo, 0);
    const totalMargem = totalRec - totalCusto;
    const totalPct = totalRec > 0 ? (totalMargem / totalRec) * 100 : 0;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5 border-l-4 border-l-indigo-500">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contratos Ativos (DREs)</p>
            <h3 className="text-3xl font-black text-indigo-900 mt-1">{tableData.length}</h3>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Receita Global Backlog</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{formatCurrency(totalRec)}</h3>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Custo Embutido</p>
            <h3 className="text-3xl font-black text-red-600 mt-1">{formatCurrency(totalCusto)}</h3>
          </Card>
          <Card className={`p-5 border-l-4 ${totalMargem >= 0 ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Margem MC Consolidada</p>
            <div className="flex items-end justify-between mt-1">
              <h3 className={`text-3xl font-black ${totalMargem >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{totalPct.toFixed(1)}%</h3>
            </div>
          </Card>
        </div>

        {/* RECHARTS CHUNK */}
        <Card className="p-6 border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Comparativo de Margem por Obra (%)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tableData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="obraNome" tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                <Tooltip
                  cursor={{ fill: '#F1F5F9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Margem Contribuição']}
                />
                <ReferenceLine y={0} stroke="#000" />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                  {tableData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Table View */}
        <Card className="overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-100 border-b border-slate-200 font-bold">
                <tr>
                  <th className="px-6 py-4">Obra / Cliente</th>
                  <th className="px-6 py-4 text-right">Receita Contratada</th>
                  <th className="px-6 py-4 text-right">Custo Realizado</th>
                  <th className="px-6 py-4 text-right">Margem (R$)</th>
                  <th className="px-6 py-4 text-right">Margem (%)</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-800">{row.obraNome}</td>
                    <td className="px-6 py-4 text-right font-medium">{formatCurrency(row.rec)}</td>
                    <td className="px-6 py-4 text-right">{formatCurrency(row.custo)}</td>
                    <td className={`px-6 py-4 text-right font-bold ${row.margem >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(row.margem)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold">
                      <span className={`px-2 py-1 rounded inline-block ${row.pct < 10 ? 'bg-red-50 text-red-700' :
                        row.pct < 20 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                        {row.pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.status === 'Em Andamento' ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" title="Em Andamento" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" title="Concluída / Inativa" />
                      )}
                    </td>
                  </tr>
                ))}

                {/* GLOBAL TOTALS ROW */}
                <tr className="bg-slate-800 text-white font-black uppercase text-base tracking-wide border-t-4 border-slate-900">
                  <td className="px-6 py-5">TOTAIS GERAIS</td>
                  <td className="px-6 py-5 text-right text-slate-200">{formatCurrency(totalRec)}</td>
                  <td className="px-6 py-5 text-right text-red-300">{formatCurrency(totalCusto)}</td>
                  <td className={`px-6 py-5 text-right ${totalMargem >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(totalMargem)}</td>
                  <td className={`px-6 py-5 text-right ${totalPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{totalPct.toFixed(1)}%</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    );
  };


  return (
    <div className="max-w-[1600px] mx-auto min-h-screen pb-20">
      {/* 1. STICKY FILTER BAR */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="text-indigo-600" size={24} />
              Visão Contábil DRE
            </h1>
            <p className="text-sm text-slate-500 ml-8 font-medium">Análise de margens de contribuição e desvios de orçamento da operação.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filtroObraId}
              onChange={(e) => setFiltroObraId(e.target.value)}
              className="w-48 bg-slate-50 border-slate-300 font-medium font-sans"
            >
              <option value="todas">🏢 TODAS AS OBRAS</option>
              {obrasList.map(o => (
                <option key={o.id} value={o.id}>
                  {o.statusObra === 'Em Andamento' ? '🏗️' : '✅'} {o.clienteNome}
                </option>
              ))}
            </Select>

            <Select
              value={filtroEngenheiro}
              onChange={(e) => setFiltroEngenheiro(e.target.value)}
              className="w-40 bg-slate-50 border-slate-300"
              disabled={filtroObraId !== 'todas'}
            >
              <option value="todos">👷 Todos Eng.</option>
              {engenheirosList.map(eng => (
                <option key={eng} value={eng}>{eng}</option>
              ))}
            </Select>

            <Select
              value={filtroMes}
              onChange={(e) => setFiltroMes(Number(e.target.value))}
              className="w-32 bg-slate-50 border-slate-300"
            >
              {mesesDisponiveis.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>

            <Select
              value={filtroAno}
              onChange={(e) => setFiltroAno(Number(e.target.value))}
              className="w-24 bg-slate-50 border-slate-300"
            >
              {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
            </Select>

            <Button onClick={handleClearFilters} variant="ghost" className="text-slate-500 hover:text-slate-800 px-3">
              Limpar Filtros
            </Button>

            <div className="w-px h-8 bg-slate-200 mx-1"></div>

            <Button onClick={handleExportPDF} disabled={isLoading || (filtroObraId === 'todas' && consolidatedDres.length === 0)} className="bg-slate-900 border-none hover:bg-slate-800 text-white gap-2 font-bold px-5">
              <Download size={16} /> Exportar {filtroObraId === 'todas' ? 'Geral' : 'Obra'}
            </Button>
          </div>
        </div>
      </div>

      {/* 2. BODY CONTENT */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium animate-pulse">Computando balanços patrimoniais...</p>
          </div>
        ) : (
          filtroObraId === 'todas' ? renderConsolidatedView() : renderDetailedView()
        )}
      </div>
    </div>
  );
};
