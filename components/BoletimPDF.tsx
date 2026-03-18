import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { Boletim } from '../types';
import { formatarData } from '../src/utils/formatDate';

// Register fonts
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Bold.ttf', fontWeight: 'bold' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Oblique.ttf', fontStyle: 'italic' }
  ]
});

interface BoletimPDFProps {
  bdo: Boletim;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 30,
    color: '#1e293b'
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#0f172a',
    paddingBottom: 10,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a'
  },
  section: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    color: '#334155',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4
  },
  label: {
    width: 120,
    fontFamily: 'Helvetica-Bold',
    color: '#475569'
  },
  value: {
    flex: 1,
    color: '#1e293b'
  },
  table: {
    marginTop: 10
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    padding: 6,
    fontFamily: 'Helvetica-Bold'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    padding: 6
  },
  col: {
    flex: 1
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8'
  }
});

export const BoletimPDF: React.FC<BoletimPDFProps> = ({ bdo }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Boletim Diário de Obra (BDO)</Text>
            <Text style={{ fontSize: 10, color: '#64748b' }}>Estemco Engenharia em Fundações</Text>
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text style={styles.label}>Data:</Text>
            <Text>{formatarData(bdo.data)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Gerais</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Cliente/Obra:</Text>
            <Text style={styles.value}>{bdo.clienteNome}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Equipamento:</Text>
            <Text style={styles.value}>{bdo.equipamentoNome}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Operador:</Text>
            <Text style={styles.value}>{bdo.operador}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Produção</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Estacas Executadas:</Text>
            <Text style={styles.value}>{bdo.estacasExecutadas}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Metros Executados:</Text>
            <Text style={styles.value}>{bdo.metrosExecutados.toFixed(2)}m</Text>
          </View>
          {bdo.faturamentoMinimoAplicado ? (
            <View style={styles.row}>
              <Text style={styles.label}>Faturamento Mínimo:</Text>
              <Text style={styles.value}>R$ {bdo.faturamentoMinimoAplicado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipe</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.col, { flex: 2 }]}>Nome</Text>
              <Text style={styles.col}>Cargo</Text>
            </View>
            {(bdo.equipe || []).map((m, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.col, { flex: 2 }]}>{m.nome}</Text>
                <Text style={styles.col}>{m.cargo}</Text>
              </View>
            ))}
          </View>
        </View>

        {bdo.paradas && bdo.paradas.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ocorrências / Paradas</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.col}>Categoria</Text>
                <Text style={[styles.col, { flex: 2 }]}>Motivo</Text>
                <Text style={styles.col}>Duração</Text>
              </View>
              {bdo.paradas.map((p, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.col}>{p.categoria}</Text>
                  <Text style={[styles.col, { flex: 2 }]}>{p.motivo}</Text>
                  <Text style={styles.col}>{p.horaInicio} - {p.horaFim}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observações</Text>
          <Text style={styles.value}>{bdo.observacoes || 'Nenhuma observação registrada.'}</Text>
        </View>

        <View style={{ marginTop: 50, flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ width: 200, borderTopWidth: 1, borderTopColor: '#0f172a', paddingTop: 5, alignItems: 'center' }}>
            <Text style={{ fontSize: 8 }}>Responsável Estemco</Text>
          </View>
          <View style={{ width: 200, borderTopWidth: 1, borderTopColor: '#0f172a', paddingTop: 5, alignItems: 'center' }}>
            <Text style={{ fontSize: 8 }}>Fiscal/Cliente</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Gerado em {new Date().toLocaleString('pt-BR')} • Estemco Engenharia em Fundações S/S Ltda.
        </Text>
      </Page>
    </Document>
  );
};
