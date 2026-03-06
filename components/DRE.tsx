import React, { useState, useEffect } from 'react';
import { useCollection } from '../src/firebase/firestore/use-collection';
import { useAuth } from '../contexts/AuthContext';
import { doc, onSnapshot, collection, where, query, orderBy, limit, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, Label, Select, Button } from './ui';
import { FileText, TrendingUp, TrendingDown, AlertCircle, Clock, DollarSign, Activity, Download, Search } from 'lucide-react';
import { GlobalConfig, ConstructionSite, DREObra, Boletim } from '../types';
import { Page, Text, View, Document, StyleSheet, pdf, Image } from '@react-pdf/renderer';

interface DREProps {
  config: GlobalConfig;
}

// --- PDF STYLES ---
const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 10 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 10, color: '#666' },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 5, backgroundColor: '#F3F4F6', padding: 4 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingVertical: 4 },
  colLabel: { width: '50%' },
  colValue: { width: '25%', textAlign: 'right' },
  colPercent: { width: '25%', textAlign: 'right' },
  totalRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#000', paddingVertical: 4, marginTop: 2, fontWeight: 'bold' },
  kpiContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  kpiBox: { width: '30%', padding: 10, backgroundColor: '#F9FAFB', borderRadius: 4 },
  kpiLabel: { fontSize: 8, color: '#666' },
  kpiValue: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#E5E7EB', paddingVertical: 4, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingVertical: 4 },
  tableCol: { flex: 1, textAlign: 'center' },
});

// --- PDF COMPONENT ---
const DREPDF = ({ dre, obra, boletins }: { dre: DREObra, obra: ConstructionSite, boletins: Boletim[] }) => {
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatPercent = (val: number) => `${val.toFixed(1)}%`;

  const receitaLiquida = dre.receitaContratada; // Assuming no taxes for now or pre-calculated
  const custoDiretoTotal = dre.totalDieselGasto + dre.totalCustoConcreto + dre.totalCustoMaoDeObra + dre.totalCustoHorasParadas + dre.custoMobilizacao + dre.custoART;
  const margemContribuicao = receitaLiquida - custoDiretoTotal;
  const margemPercent = receitaLiquida > 0 ? (margemContribuicao / receitaLiquida) * 100 : 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>DRE - Demonstrativo de Resultado</Text>
            <Text style={styles.subtitle}>{obra.clienteNome} - {obra.enderecoDaObra}</Text>
          </View>
          <View>
            <Text style={styles.subtitle}>Gerado em: {new Date().toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.kpiContainer}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>RECEITA CONTRATADA</Text>
            <Text style={styles.kpiValue}>{formatCurrency(dre.receitaContratada)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>CUSTO TOTAL REAL</Text>
            <Text style={styles.kpiValue}>{formatCurrency(custoDiretoTotal)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>MARGEM BRUTA</Text>
            <Text style={{ ...styles.kpiValue, color: margemContribuicao >= 0 ? 'green' : 'red' }}>
              {formatCurrency(margemContribuicao)} ({margemPercent.toFixed(1)}%)
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demonstrativo Detalhado</Text>
          <View style={styles.row}>
            <Text style={styles.colLabel}>(+) RECEITA BRUTA CONTRATADA</Text>
            <Text style={styles.colValue}>{formatCurrency(dre.receitaContratada)}</Text>
            <Text style={styles.colPercent}>100%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.colLabel}>(-) IMPOSTOS</Text>
            <Text style={styles.colValue}>{formatCurrency(0)}</Text>
            <Text style={styles.colPercent}>0%</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.colLabel}>(=) RECEITA LÍQUIDA</Text>
            <Text style={styles.colValue}>{formatCurrency(receitaLiquida)}</Text>
            <Text style={styles.colPercent}>100%</Text>
          </View>

          <Text style={{ ...styles.sectionTitle, marginTop: 10 }}>Custos Diretos Variáveis</Text>
          <View style={styles.row}>
            <Text style={styles.colLabel}>(-) Combustível (Diesel)</Text>
            <Text style={styles.colValue}>{formatCurrency(dre.totalDieselGasto)}</Text>
            <Text style={styles.colPercent}>{receitaLiquida > 0 ? formatPercent((dre.totalDieselGasto / receitaLiquida) * 100) : '0%'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.colLabel}>(-) Concreto</Text>
            <Text style={styles.colValue}>{formatCurrency(dre.totalCustoConcreto)}</Text>
            <Text style={styles.colPercent}>{receitaLiquida > 0 ? formatPercent((dre.totalCustoConcreto / receitaLiquida) * 100) : '0%'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.colLabel}>(-) Mão de Obra Direta</Text>
            <Text style={styles.colValue}>{formatCurrency(dre.totalCustoMaoDeObra)}</Text>
            <Text style={styles.colPercent}>{receitaLiquida > 0 ? formatPercent((dre.totalCustoMaoDeObra / receitaLiquida) * 100) : '0%'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.colLabel}>(-) Custo de Horas Paradas</Text>
            <Text style={styles.colValue}>{formatCurrency(dre.totalCustoHorasParadas)}</Text>
            <Text style={styles.colPercent}>{receitaLiquida > 0 ? formatPercent((dre.totalCustoHorasParadas / receitaLiquida) * 100) : '0%'}</Text>
          </View>

          <Text style={{ ...styles.sectionTitle, marginTop: 10 }}>Custos Diretos Fixos</Text>
          <View style={styles.row}>
            <Text style={styles.colLabel}>(-) Mobilização</Text>
            <Text style={styles.colValue}>{formatCurrency(dre.custoMobilizacao)}</Text>
            <Text style={styles.colPercent}>{receitaLiquida > 0 ? formatPercent((dre.custoMobilizacao / receitaLiquida) * 100) : '0%'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.colLabel}>(-) ART</Text>
            <Text style={styles.colValue}>{formatCurrency(dre.custoART)}</Text>
            <Text style={styles.colPercent}>{receitaLiquida > 0 ? formatPercent((dre.custoART / receitaLiquida) * 100) : '0%'}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.colLabel}>(=) MARGEM DE CONTRIBUIÇÃO</Text>
            <Text style={styles.colValue}>{formatCurrency(margemContribuicao)}</Text>
            <Text style={styles.colPercent}>{formatPercent(margemPercent)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico Recente (Últimos 10 Boletins)</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCol}>Data</Text>
            <Text style={styles.tableCol}>Metros</Text>
            <Text style={styles.tableCol}>Diesel</Text>
            <Text style={styles.tableCol}>Overbreak</Text>
            <Text style={styles.tableCol}>Custo</Text>
          </View>
          {boletins.slice(0, 10).map((b, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.tableCol}>{new Date(b.data.seconds * 1000).toLocaleDateString()}</Text>
              <Text style={styles.tableCol}>{b.metrosExecutados} m</Text>
              <Text style={styles.tableCol}>{b.dieselConsumidoLitros} L</Text>
              <Text style={styles.tableCol}>{b.overbreakPct.toFixed(1)}%</Text>
              <Text style={styles.tableCol}>{formatCurrency(b.custoDiesel + b.custoMaoDeObra + b.custoHorasParadas)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

export const DRE: React.FC<DREProps> = ({ config }) => {
  const { user, profile } = useAuth();
  const [selectedObraId, setSelectedObraId] = useState<string>('');
  const [dreData, setDreData] = useState<DREObra | null>(null);
  const [boletins, setBoletins] = useState<Boletim[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch Obras for Selector
  const { data: obras } = useCollection<ConstructionSite>('obras', 
    profile?.tenantId ? [where('tenantId', '==', profile.tenantId), where('statusObra', '==', 'Em Andamento')] : []
  );

  // Fetch DRE Data Real-time
  useEffect(() => {
    if (!selectedObraId) {
      setDreData(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'dre_obras', selectedObraId), (docSnap) => {
      if (docSnap.exists()) {
        setDreData(docSnap.data() as DREObra);
      } else {
        setDreData(null);
      }
    });

    return () => unsubscribe();
  }, [selectedObraId]);

  // Fetch Boletins History
  useEffect(() => {
    if (!selectedObraId) {
      setBoletins([]);
      return;
    }

    const q = query(
      collection(db, 'boletins'),
      where('obraId', '==', selectedObraId),
      orderBy('data', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Boletim));
      setBoletins(data);
    });

    return () => unsubscribe();
  }, [selectedObraId]);

  const handleExportPDF = async () => {
    if (!dreData || !selectedObraId) return;
    const obra = obras.find(o => o.id === selectedObraId);
    if (!obra) return;

    const blob = await pdf(<DREPDF dre={dreData} obra={obra} boletins={boletins} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DRE_${obra.clienteNome}_${new Date().toISOString().split('T')[0]}.pdf`;
    link.click();
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (!profile?.tenantId) return null;

  // Calculations
  const receitaLiquida = dreData ? dreData.receitaContratada : 0; // TODO: Subtract taxes if available
  const custoDiretoTotal = dreData ? (
    dreData.totalDieselGasto + 
    dreData.totalCustoConcreto + 
    dreData.totalCustoMaoDeObra + 
    dreData.totalCustoHorasParadas + 
    dreData.custoMobilizacao + 
    dreData.custoART
  ) : 0;
  
  const margemContribuicao = receitaLiquida - custoDiretoTotal;
  const margemPercent = receitaLiquida > 0 ? (margemContribuicao / receitaLiquida) * 100 : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header & Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">DRE - Demonstrativo de Resultado</h1>
          <p className="text-sm text-slate-500 mt-1">Análise financeira e operacional da obra.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Select 
              value={selectedObraId} 
              onChange={(e) => setSelectedObraId(e.target.value)}
              className="w-full"
            >
              <option value="">Selecione uma obra...</option>
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.clienteNome} - {o.enderecoDaObra}</option>
              ))}
            </Select>
          </div>
          <Button onClick={handleExportPDF} disabled={!dreData} variant="outline" className="gap-2">
            <Download size={16} /> Exportar PDF
          </Button>
        </div>
      </div>

      {selectedObraId && dreData ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Row 1 */}
            <Card className="p-4 border-l-4 border-l-blue-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Receita Contratada</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(dreData.receitaContratada)}</h3>
                </div>
                <DollarSign className="text-blue-500 opacity-20" size={32} />
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-red-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Custo Total Real</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(custoDiretoTotal)}</h3>
                </div>
                <TrendingDown className="text-red-500 opacity-20" size={32} />
              </div>
            </Card>
            <Card className={`p-4 border-l-4 ${margemPercent >= 0 ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Margem Bruta</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <h3 className={`text-2xl font-bold ${margemPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(margemContribuicao)}
                    </h3>
                    <span className={`text-sm font-medium ${margemPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      ({margemPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <TrendingUp className={`${margemPercent >= 0 ? 'text-emerald-500' : 'text-red-500'} opacity-20`} size={32} />
              </div>
            </Card>

            {/* Row 2 */}
            <Card className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Progresso Físico</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{dreData.totalMetrosExecutados.toFixed(1)} m</h3>
                  <p className="text-xs text-slate-400 mt-1">Total executado</p>
                </div>
                <Activity className="text-slate-400 opacity-20" size={32} />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Overbreak Médio</p>
                  <h3 className={`text-2xl font-bold mt-1 ${
                    dreData.overbreakMedio > 25 ? 'text-red-600' : 
                    dreData.overbreakMedio > 15 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {dreData.overbreakMedio.toFixed(1)}%
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Meta: &lt; 15%</p>
                </div>
                <AlertCircle className={`${dreData.overbreakMedio > 15 ? 'text-amber-500' : 'text-emerald-500'} opacity-20`} size={32} />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Horas Paradas</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{dreData.totalHorasParadas.toFixed(1)} h</h3>
                  <p className="text-xs text-slate-400 mt-1">Total acumulado</p>
                </div>
                <Clock className="text-slate-400 opacity-20" size={32} />
              </div>
            </Card>
          </div>

          {/* Detailed Statement */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800">Demonstrativo Detalhado</h3>
            </div>
            <div className="p-6 space-y-1">
              {/* Receita */}
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="font-medium text-slate-700">(+) RECEITA BRUTA CONTRATADA</span>
                <span className="font-bold text-slate-900">{formatCurrency(dreData.receitaContratada)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 text-slate-500">
                <span>(-) IMPOSTOS SOBRE RECEITA</span>
                <span>{formatCurrency(0)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b-2 border-slate-200 bg-slate-50/50 px-2 -mx-2">
                <span className="font-bold text-slate-800">(=) RECEITA LÍQUIDA</span>
                <span className="font-bold text-slate-900">{formatCurrency(receitaLiquida)}</span>
              </div>

              {/* Custos Variáveis */}
              <div className="pt-4 pb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custos Diretos Variáveis</span>
              </div>
              <div className="flex justify-between items-center py-1 text-sm">
                <span className="text-slate-600">(-) Combustível (Diesel)</span>
                <span className="text-red-600">{formatCurrency(dreData.totalDieselGasto)}</span>
              </div>
              <div className="flex justify-between items-center py-1 text-sm">
                <span className="text-slate-600">(-) Concreto</span>
                <span className="text-red-600">{formatCurrency(dreData.totalCustoConcreto)}</span>
              </div>
              <div className="flex justify-between items-center py-1 text-sm">
                <span className="text-slate-600">(-) Mão de Obra Direta</span>
                <span className="text-red-600">{formatCurrency(dreData.totalCustoMaoDeObra)}</span>
              </div>
              <div className="flex justify-between items-center py-1 text-sm">
                <span className="text-slate-600">(-) Custo de Horas Paradas</span>
                <span className="text-red-600">{formatCurrency(dreData.totalCustoHorasParadas)}</span>
              </div>

              {/* Custos Fixos */}
              <div className="pt-4 pb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custos Diretos Fixos</span>
              </div>
              <div className="flex justify-between items-center py-1 text-sm">
                <span className="text-slate-600">(-) Mobilização</span>
                <span className="text-red-600">{formatCurrency(dreData.custoMobilizacao)}</span>
              </div>
              <div className="flex justify-between items-center py-1 text-sm">
                <span className="text-slate-600">(-) ART</span>
                <span className="text-red-600">{formatCurrency(dreData.custoART)}</span>
              </div>

              {/* Totais */}
              <div className="flex justify-between items-center py-3 mt-4 border-t border-slate-200">
                <span className="font-bold text-slate-700">(=) CUSTO DIRETO TOTAL</span>
                <span className="font-bold text-red-700">{formatCurrency(custoDiretoTotal)}</span>
              </div>
              <div className={`flex justify-between items-center py-4 px-4 -mx-4 rounded-lg mt-2 ${margemContribuicao >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <span className={`font-bold text-lg ${margemContribuicao >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                  (=) MARGEM DE CONTRIBUIÇÃO
                </span>
                <div className="text-right">
                  <div className={`font-bold text-xl ${margemContribuicao >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {formatCurrency(margemContribuicao)}
                  </div>
                  <div className={`text-sm font-medium ${margemContribuicao >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {margemPercent.toFixed(1)}% da Receita
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Comparativo Orçado vs Realizado (Simplified) */}
          <Card>
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800">Comparativo de Custos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 font-medium">Item</th>
                    <th className="px-6 py-3 font-medium text-right">Realizado</th>
                    <th className="px-6 py-3 font-medium text-right">% do Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="px-6 py-3 font-medium text-slate-700">Diesel</td>
                    <td className="px-6 py-3 text-right text-slate-900">{formatCurrency(dreData.totalDieselGasto)}</td>
                    <td className="px-6 py-3 text-right text-slate-500">{custoDiretoTotal > 0 ? ((dreData.totalDieselGasto / custoDiretoTotal) * 100).toFixed(1) : 0}%</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3 font-medium text-slate-700">Concreto</td>
                    <td className="px-6 py-3 text-right text-slate-900">{formatCurrency(dreData.totalCustoConcreto)}</td>
                    <td className="px-6 py-3 text-right text-slate-500">{custoDiretoTotal > 0 ? ((dreData.totalCustoConcreto / custoDiretoTotal) * 100).toFixed(1) : 0}%</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3 font-medium text-slate-700">Mão de Obra</td>
                    <td className="px-6 py-3 text-right text-slate-900">{formatCurrency(dreData.totalCustoMaoDeObra)}</td>
                    <td className="px-6 py-3 text-right text-slate-500">{custoDiretoTotal > 0 ? ((dreData.totalCustoMaoDeObra / custoDiretoTotal) * 100).toFixed(1) : 0}%</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3 font-medium text-slate-700">Custos Fixos (Mob + ART)</td>
                    <td className="px-6 py-3 text-right text-slate-900">{formatCurrency(dreData.custoMobilizacao + dreData.custoART)}</td>
                    <td className="px-6 py-3 text-right text-slate-500">{custoDiretoTotal > 0 ? (((dreData.custoMobilizacao + dreData.custoART) / custoDiretoTotal) * 100).toFixed(1) : 0}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* History */}
          <Card>
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800">Histórico de Boletins (Últimos 10)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 font-medium">Data</th>
                    <th className="px-6 py-3 font-medium text-right">Metros</th>
                    <th className="px-6 py-3 font-medium text-right">Diesel</th>
                    <th className="px-6 py-3 font-medium text-right">Overbreak</th>
                    <th className="px-6 py-3 font-medium text-right">Custo do Dia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {boletins.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Nenhum boletim encontrado.</td>
                    </tr>
                  ) : (
                    boletins.map((b) => (
                      <tr key={b.id} className="bg-white hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-medium text-slate-900">
                          {b.data?.toDate ? b.data.toDate().toLocaleDateString('pt-BR') : new Date(b.data).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-3 text-right">{b.metrosExecutados} m</td>
                        <td className="px-6 py-3 text-right">{b.dieselConsumidoLitros} L</td>
                        <td className="px-6 py-3 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            b.overbreakPct > 25 ? 'bg-red-100 text-red-800' : 
                            b.overbreakPct > 15 ? 'bg-amber-100 text-amber-800' : 
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {b.overbreakPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-medium text-slate-900">
                          {formatCurrency(b.custoDiesel + b.custoHorasParadas + b.custoMaoDeObra)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <FileText className="text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-slate-900">Selecione uma obra</h3>
          <p className="text-slate-500">Escolha uma obra acima para visualizar o DRE.</p>
        </div>
      )}
    </div>
  );
};
