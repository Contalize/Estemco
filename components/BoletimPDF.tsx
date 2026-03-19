import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { Boletim } from '../types';
import { formatarData } from '../src/utils/formatDate';
import { pdfTexts } from '../src/utils/pdfTexts';

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
  empresa?: {
    logoUrl?: string;
  };
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    color: '#000000'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 10
  },
  headerInfo: {
    textAlign: 'right'
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 20,
    textTransform: 'uppercase'
  },
  infoBox: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 8,
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#eeeeee',
    padding: 4,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#000000'
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4
  },
  label: {
    width: 100,
    fontFamily: 'Helvetica-Bold'
  },
  value: {
    flex: 1
  },
  table: {
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#000000'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    padding: 4,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    padding: 4,
    fontSize: 9
  },
  col: { flex: 1 },
  colCenter: { flex: 1, textAlign: 'center' },
  colRight: { flex: 1, textAlign: 'right' },
  signatureBox: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  signatureLine: {
    width: 200,
    borderTopWidth: 1,
    borderTopColor: '#000000',
    paddingTop: 4,
    alignItems: 'center'
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 7,
    color: '#666666'
  }
});

export const BoletimPDF: React.FC<BoletimPDFProps> = ({ bdo, empresa }) => {
  const calculateHours = (start?: string, end?: string) => {
    if (!start || !end) return '0.0';
    try {
      const s = start.split(':').map(Number);
      const e = end.split(':').map(Number);
      const startMin = s[0] * 60 + s[1];
      const endMin = e[0] * 60 + e[1];
      const diff = endMin - startMin;
      return (diff / 60).toFixed(1);
    } catch (err) {
      return '0.0';
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER (Shielded) */}
        <View style={styles.headerRow}>
          {empresa?.logoUrl && <Image src={empresa.logoUrl} style={{ height: 40 }} />}
          <View style={styles.headerInfo}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10 }}>{`${pdfTexts.header.companyName}`}</Text>
            <Text style={{ fontSize: 8 }}>{`${pdfTexts.header.contact}`}</Text>
          </View>
        </View>

        <Text style={styles.title}>{`${pdfTexts.reports.dailyTitle}`}</Text>

        {/* GENERAL INFO (Shielded) */}
        <View style={styles.infoBox}>
          <View style={styles.row}>
            <Text style={styles.label}>{`DATA:`}</Text>
            <Text style={styles.value}>{`${formatarData(bdo.data)}`}</Text>
            <Text style={styles.label}>{`CONTRATO:`}</Text>
            <Text style={styles.value}>{`${(bdo as any).contratoNumero || '---'}`}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{`CLIENTE / OBRA:`}</Text>
            <Text style={styles.value}>{`${bdo.clienteNome}`}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{`EQUIPAMENTO:`}</Text>
            <Text style={styles.value}>{`${bdo.equipamentoNome}`}</Text>
            <Text style={styles.label}>{`OPERADOR:`}</Text>
            <Text style={styles.value}>{`${bdo.operador}`}</Text>
          </View>
        </View>

        {/* PRODUCTION SECTION (Shielded) */}
        <Text style={styles.sectionTitle}>{`DETALHAMENTO DA PRODUÇÃO`}</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col, { flex: 2 }]}>{`SERVIÇO / ESTACA`}</Text>
            <Text style={styles.colCenter}>{`QUANTIDADE`}</Text>
            <Text style={styles.colRight}>{`METRAGEM (m)`}</Text>
          </View>
          {(bdo.servicos || []).map((s, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.col, { flex: 2 }]}>{`${s.tipoEstaca}`}</Text>
              <Text style={styles.colCenter}>{`${s.quantidade}`}</Text>
              <Text style={styles.colRight}>{`${s.metrosPerfurados.toFixed(2)}`}</Text>
            </View>
          ))}
          <View style={[styles.tableRow, { fontFamily: 'Helvetica-Bold', borderBottomWidth: 0 }]}>
            <Text style={[styles.col, { flex: 2 }]}>{`TOTAL DO DIA`}</Text>
            <Text style={styles.colCenter}>{`${(bdo.servicos || []).reduce((acc, s) => acc + (s.quantidade || 0), 0)}`}</Text>
            <Text style={styles.colRight}>{`${bdo.metrosExecutados.toFixed(2)} m`}</Text>
          </View>
        </View>

        {/* IMPRODUCTIVE TIMES (Shielded) */}
        <Text style={styles.sectionTitle}>{`${pdfTexts.reports.sections.improductiveTimes}`}</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col, { flex: 1.5 }]}>{`CATEGORIA / MOTIVO`}</Text>
            <Text style={styles.colCenter}>{`INÍCIO`}</Text>
            <Text style={styles.colCenter}>{`FIM`}</Text>
            <Text style={styles.colRight}>{`TOTAL (Horas)`}</Text>
          </View>
          {bdo.paradas && bdo.paradas.length > 0 ? (
            bdo.paradas.map((p, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.col, { flex: 1.5 }]}>{`${p.categoria}: ${p.motivo}`}</Text>
                <Text style={styles.colCenter}>{`${p.horaInicio}`}</Text>
                <Text style={styles.colCenter}>{`${p.horaFim}`}</Text>
                <Text style={styles.colRight}>{`${calculateHours(p.horaInicio, p.horaFim)}`}</Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={{ flex: 1, textAlign: 'center', fontStyle: 'italic', color: '#666666' }}>{`Nenhuma parada registrada.`}</Text>
            </View>
          )}
        </View>

        {/* FINANCIAL MEASUREMENT (Shielded) */}
        <Text style={styles.sectionTitle}>{`${pdfTexts.reports.sections.financialMeasurement}`}</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col, { flex: 2 }]}>{`DESCRIÇÃO DO SERVIÇO / DATA`}</Text>
            <Text style={styles.colCenter}>{`DETALHE DA COBRANÇA`}</Text>
            <Text style={styles.colRight}>{`VALOR TOTAL (R$)`}</Text>
          </View>
          {bdo.faturamentoMinimoAplicado ? (
            <View style={styles.tableRow}>
              <Text style={[styles.col, { flex: 2 }]}>{`Produção do dia ${formatarData(bdo.data)}`}</Text>
              <Text style={styles.colCenter}>{`Faturamento Mínimo`}</Text>
              <Text style={styles.colRight}>{`${bdo.faturamentoMinimoAplicado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</Text>
            </View>
          ) : (
             <View style={styles.tableRow}>
              <Text style={[styles.col, { flex: 2 }]}>{`Produção do dia ${formatarData(bdo.data)}`}</Text>
              <Text style={styles.colCenter}>{`${bdo.metrosExecutados.toFixed(2)} metros executados`}</Text>
              <Text style={styles.colRight}>{`---`}</Text>
            </View>
          )}
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
             <Text style={styles.value}>{`Obs: ${bdo.observacoes || 'Sem observações.'}`}</Text>
          </View>
        </View>

        {/* SIGNATURES (Shielded) */}
        <View style={styles.signatureBox}>
          <View style={styles.signatureLine}>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>{`ESTEMCO ENGENHARIA`}</Text>
            <Text style={{ fontSize: 8 }}>{`RESPONSÁVEL TÉCNICO`}</Text>
          </View>
          <View style={styles.signatureLine}>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>{`${bdo.clienteNome?.toUpperCase()}`}</Text>
            <Text style={{ fontSize: 8 }}>{`CONTRATANTE / FISCALIZAÇÃO`}</Text>
          </View>
        </View>

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
          `${pdfTexts.header.companyName} • Página ${pageNumber} de ${totalPages} • Gerado em ${new Date().toLocaleString('pt-BR')}`
        )} />

      </Page>
    </Document>
  );
};
