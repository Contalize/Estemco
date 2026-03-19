import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { numberToWords } from '../src/utils/numberToWords';
import { formatarData } from '../src/utils/formatDate';
import { pdfTexts } from '../src/utils/pdfTexts';

// Roboto, Helvetica are native standard fonts in react-pdf
// Helvetica is used via StyleSheet, no registration needed for standard version.

interface PropostaDataItem {
  tipoEstaca?: string;
  diametro?: string | number;
  quantidade?: number;
  metragemPrevista?: number;
  precoMetro?: number;
  totalMetros?: number;
  subtotal?: number;
  comprimentoUnitario?: number;
}

interface ParcelaProposta {
  id?: string;
  descricao?: string;
  percentual?: number;
  prazo?: string;
  dias?: number;
  formaPagamento?: string;
  valor?: number;
  numero?: number;
}

export interface PropostaData {
  id?: string;
  tipo?: 'HCM' | 'ESC' | 'SPT' | string;
  dataEmissao?: string;
  validadeDias?: number;
  prazoExecucao?: number | string;
  diasExecucao?: number;
  faturamentoMinimo?: number;
  horaParada?: number;
  valorTotal?: number;
  mobilizacao?: number;
  sinalPercentual?: number;
  prazoSaldoDias?: string;
  solicitaNF?: boolean;
  solicitaART?: boolean;
  valorART?: number;
  impostoNF?: number;
  taxaAgua?: number;
  textoObrigacoesContratante?: string;
  textoObrigacoesContratada?: string;
  textoCondicoesRisco?: string;
  textoTermoAceite?: string;
  servicos?: PropostaDataItem[];
  parcelas?: ParcelaProposta[];
  inicioPrevisto?: string;
  dataPrevistaInicio?: string;
}

interface ProposalPDFProps {
  proposta: PropostaData;
  cliente: {
    nomeRazaoSocial: string;
    documento: string;
    enderecoFaturamento: string;
    contatos?: { nome: string; cargo: string; telefone: string }[];
  };
  empresa: {
    razaoSocial?: string;
    cnpj?: string;
    endereco?: string;
    telefone?: string;
    email?: string;
    logoUrl?: string;
  };
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 45,
    color: '#1e293b'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    paddingBottom: 10
  },
  headerText: {
    fontSize: 8,
    color: '#666666',
    textAlign: 'right'
  },
  titulo: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 15,
    textTransform: 'uppercase'
  },
  secaoTitulo: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textDecoration: 'underline',
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  textoNormal: { fontSize: 10, lineHeight: 1.5 },
  textoBold: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  linha: {
    flexDirection: 'row',
    marginBottom: 3
  },
  tabelaHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 5,
    paddingHorizontal: 4
  },
  tabelaLinha: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 4,
    paddingHorizontal: 4
  },
  totalLinha: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderTopWidth: 2,
    borderColor: '#0f172a',
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: 2
  },
  separador: {
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 10
  },
  assinaturaLinha: {
    borderBottomWidth: 1,
    borderColor: '#374151',
    marginTop: 30,
    marginBottom: 4,
    width: '60%'
  },
  checkboxLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  checkbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: '#374151',
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cityDateRow: {
    textAlign: 'right',
    marginBottom: 20,
    fontSize: 10
  }
});

const ProposalPDF: React.FC<ProposalPDFProps> = ({ proposta, cliente, empresa }) => {
  const formatCurrency = (val?: number | null) => {
    if (val == null || isNaN(val)) return 'R$ 0,00';
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    } catch (e) {
      return 'R$ 0,00';
    }
  };

  const formatDateString = (dtStr?: any) => {
    if (!dtStr) return '---';
    try {
      const date = dtStr?.toDate ? dtStr.toDate() : (dtStr && typeof dtStr === 'object' && 'seconds' in dtStr) ? new Date(dtStr.seconds * 1000) : new Date(dtStr);
      if (isNaN(date.getTime())) return '---';
      const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
    } catch (e) {
      return '---';
    }
  };

  const formatMeters = (valor: number | undefined | null) => {
    if (valor === undefined || valor === null || isNaN(valor)) return '0,00 m';
    try {
      return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m';
    } catch (e) {
      return '0,00 m';
    }
  };

  const formatDateSimple = (dtStr: any) => {
    if (!dtStr) return '---';
    try {
      return formatarData(dtStr);
    } catch (e) {
      return '---';
    }
  };
  const dataEmissaoExtenso = formatDateString(proposta.dataEmissao || new Date().toISOString());
  const inicioPrevistoFormatado = formatDateSimple(proposta.inicioPrevisto || proposta.dataPrevistaInicio || null);

  const totalMetros = (proposta.servicos || []).reduce((acc, s) => acc + ((s.quantidade || 0) * (s.metragemPrevista || s.comprimentoUnitario || 0)), 0);

  const valorTotalExtenso = numberToWords(proposta.valorTotal || 0);
  const horaParadaExtenso = numberToWords(proposta.horaParada || 0);

  const diasExecucao = proposta.diasExecucao || proposta.prazoExecucao || 0;

  // Texts from Dictionary (Shielded with template literals)
  const getTitle = () => {
    const tipo = (proposta.tipo || 'GENERIC') as keyof typeof pdfTexts.proposals.titles;
    return pdfTexts.proposals.titles[tipo] || pdfTexts.proposals.titles.GENERIC;
  };

  const getIntroText = () => {
    if (proposta.tipo === 'HCM') return pdfTexts.proposals.hcm.intro;
    return `Prezado(a), conforme solicitado, segue orçamento para execução das estacas do tipo ${proposta.tipo || 'Fundação'}.`;
  };

  const getObrigacoesContratante = () => {
    if (proposta.textoObrigacoesContratante && proposta.textoObrigacoesContratante.trim() !== '') {
      return (
        <View style={{ marginBottom: 4 }}>
          <Text style={styles.textoNormal}>{proposta.textoObrigacoesContratante || ''}</Text>
        </View>
      );
    }
    const list = proposta.tipo === 'HCM' ? pdfTexts.proposals.hcm.responsibilities.contratante : pdfTexts.proposals.responsibilities.contratante;
    return (
      <View>
        {list.map((text, i) => (
          <Text key={i} style={styles.textoNormal}>{`${i + 1}. ${text}`}</Text>
        ))}
      </View>
    );
  };

  const getObrigacoesContratada = () => {
    if (proposta.textoObrigacoesContratada && proposta.textoObrigacoesContratada.trim() !== '') {
      return (
        <View style={{ marginBottom: 4 }}>
          <Text style={styles.textoNormal}>{proposta.textoObrigacoesContratada || ''}</Text>
        </View>
      );
    }
    const list = proposta.tipo === 'HCM' ? pdfTexts.proposals.hcm.responsibilities.proponente : pdfTexts.proposals.responsibilities.proponente;
    const responsabilidades = [...list];
    if (proposta.solicitaART) {
      responsabilidades.push('Fornecimento de ART (Anotação de Responsabilidade Técnica) do projeto e execução;');
    }
    return (
      <View>
        {responsabilidades.map((text, i) => (
          <Text key={i} style={styles.textoNormal}>{`${i + 1}. ${text}`}</Text>
        ))}
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* 1. CABEÇALHO (Shielded) */}
        <View style={styles.headerRow}>
          {empresa?.logoUrl ? (
            <Image src={empresa.logoUrl} style={{ height: 40 }} />
          ) : (
            <View style={{ height: 40, width: 100, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 8 }}>{`ESTEMCO`}</Text>
            </View>
          )}
          <View>
            <Text style={[styles.textoBold, { fontSize: 8 }]}>{`${pdfTexts.header.companyName}`}</Text>
            <Text style={styles.headerText}>{`${pdfTexts.header.address}`}</Text>
            <Text style={styles.headerText}>{`${pdfTexts.header.contact}`}</Text>
          </View>
        </View>

        <Text style={styles.titulo}>{`${getTitle()}`}</Text>

        <Text style={styles.cityDateRow}>{`Socorro/SP, ${dataEmissaoExtenso}`}</Text>

        <View style={{ marginBottom: 15 }}>
          <Text style={styles.textoBold}>{`AO SENHOR: `}<Text style={styles.textoNormal}>{`${cliente?.nomeRazaoSocial || 'Não informado'}`}</Text></Text>
          <Text style={styles.textoBold}>{`ENDEREÇO OBRA: `}<Text style={styles.textoNormal}>{`${cliente?.enderecoFaturamento || 'Não informado'}`}</Text></Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <Text style={styles.textoBold}>{`PROPOSTA N. `}<Text style={styles.textoNormal}>{`${(proposta as any).numero || proposta?.id?.substring(0, 8).toUpperCase() || 'NOVO'}`}</Text></Text>
            <Text style={styles.textoBold}>{`VALIDADE: `}<Text style={styles.textoNormal}>{`${proposta?.validadeDias || 15} DIAS`}</Text></Text>
          </View>
        </View>

        <Text style={[styles.textoNormal, { marginBottom: 10 }]}>{`${getIntroText()}`}</Text>

        {/* 2. ESPECIFICAÇÕES TÉCNICAS (Shielded) */}
        <Text style={styles.secaoTitulo}>{`1. DAS ESPECIFICAÇÕES TÉCNICAS.`}</Text>
        {(proposta.servicos || []).map((s, i) => (
          <View key={i} style={{ marginBottom: 4 }}>
            <Text style={styles.textoBold}>{`• ESTACAS ${s.tipoEstaca || 'SB'}:`}</Text>
            <Text style={styles.textoNormal}>
              {`Estacas d= ${s.diametro ? `Ø${s.diametro}` : 'N/D'}, comprimento previsto: ${s.quantidade || 0} estacas x ${s.metragemPrevista || s.comprimentoUnitario || 0}m = ${formatMeters((s.quantidade || 0) * (s.metragemPrevista || s.comprimentoUnitario || 0))}`}
            </Text>
          </View>
        ))}
        <Text style={[styles.textoBold, { marginTop: 4 }]}>{`TOTAL PREVISTO = ${formatMeters(totalMetros || 0)}`}</Text>

        {/* 3. PRAZO E INÍCIO (Shielded) */}
        <Text style={styles.secaoTitulo}>{`2. PRAZO DE EXECUÇÃO e INÍCIO DA OBRA.`}</Text>
        {proposta.tipo === 'HCM' ? (
          <Text style={styles.textoNormal}>{`${pdfTexts.proposals.hcm.timing(Number(diasExecucao))}`}</Text>
        ) : (
          <>
            <Text style={styles.textoNormal}>{`Gostaríamos de informar que o prazo de execução para esta referida obra será de ${diasExecucao} dias trabalhados.`}</Text>
            <Text style={[styles.textoNormal, { marginTop: 4 }]}>{`Início da prestação de serviço: ${inicioPrevistoFormatado || 'A combinar'}`}</Text>
          </>
        )}

        {/* 4. TABELA DE VALORES (Shielded) */}
        <Text style={styles.secaoTitulo}>{`3. VALORES PARA PRESTAÇÃO DE SERVIÇO.`}</Text>
        <Text style={[styles.textoNormal, { marginBottom: 6 }]}>{`Os preços propostos para a execução dos serviços são:`}</Text>

        <View style={{ marginTop: 8 }}>
          <View style={styles.tabelaHeader}>
            <Text style={[styles.textoBold, { flex: 2 }]}>{`Descrição do Serviço`}</Text>
            <Text style={[styles.textoBold, { flex: 1, textAlign: 'center' }]}>{`Preço Unit.`}</Text>
            <Text style={[styles.textoBold, { flex: 1, textAlign: 'right' }]}>{`Total`}</Text>
          </View>

          {(proposta.servicos || []).map((s, i) => {
            const rowTotal = (s.quantidade || 0) * (s.metragemPrevista || s.comprimentoUnitario || 0) * (s.precoMetro || 0);
            return (
              <View key={i} style={styles.tabelaLinha}>
                <Text style={[styles.textoNormal, { flex: 2 }]}>{`Execução de Estaca Ø${s.diametro || 'N/D'} (${s.quantidade || 0}x${s.metragemPrevista || s.comprimentoUnitario || 0}m)`}</Text>
                <Text style={[styles.textoNormal, { flex: 1, textAlign: 'center' }]}>{`${formatCurrency(s.precoMetro || 0)}`}</Text>
                <Text style={[styles.textoNormal, { flex: 1, textAlign: 'right' }]}>{`${formatCurrency(rowTotal)}`}</Text>
              </View>
            );
          })}

          <View style={styles.tabelaLinha}>
            <Text style={[styles.textoNormal, { flex: 2 }]}>{`Mobilização e desmobilização de equipamentos`}</Text>
            <Text style={[styles.textoNormal, { flex: 1, textAlign: 'center' }]}>{`-`}</Text>
            <Text style={[styles.textoNormal, { flex: 1, textAlign: 'right' }]}>{`${formatCurrency(proposta.mobilizacao || 0)}`}</Text>
          </View>

          {proposta.solicitaART ? (
            <View style={styles.tabelaLinha}>
              <Text style={[styles.textoNormal, { flex: 2 }]}>{`ART - Anotação de Responsabilidade Técnica`}</Text>
              <Text style={[styles.textoNormal, { flex: 1, textAlign: 'center' }]}>{`-`}</Text>
              <Text style={[styles.textoNormal, { flex: 1, textAlign: 'right' }]}>{`${formatCurrency(proposta.valorART || 0)}`}</Text>
            </View>
          ) : null}

          <View style={styles.totalLinha}>
            <Text style={[styles.textoBold, { flex: 1 }]}>{`VALOR TOTAL ESTIMADO DA PROPOSTA:`}</Text>
            <Text style={[styles.textoBold, { flex: 1, textAlign: 'right' }]}>
              {`${formatCurrency(proposta.valorTotal || 0)}`}
            </Text>
          </View>
          <Text style={[styles.textoNormal, { fontSize: 8, fontStyle: 'italic', marginTop: 4, color: '#444444' }]}>
            {`Extenso: ${valorTotalExtenso || 'zero reais'}`}
          </Text>
        </View>

        {/* 5. CONDIÇÕES DE PAGAMENTO (Shielded) */}
        <View wrap={false}>
          <Text style={styles.secaoTitulo}>{`4. DAS COBRANÇAS E FATURAMENTO.`}</Text>
          {proposta.tipo === 'HCM' ? (
            <>
              <Text style={[styles.textoBold, { fontSize: 9, marginBottom: 4 }]}>{`${pdfTexts.proposals.hcm.minBilling.title}`}</Text>
              {pdfTexts.proposals.hcm.minBilling.items.map((item, i) => (
                <Text key={i} style={[styles.textoNormal, { marginBottom: 3, textAlign: 'justify' }]}>{`${i+1}. ${item}`}</Text>
              ))}
              
              <Text style={[styles.secaoTitulo, { textDecoration: 'none', marginTop: 10 }]}>{`${pdfTexts.proposals.hcm.exemption.title}`}</Text>
              {pdfTexts.proposals.hcm.exemption.items.map((item, i) => (
                <Text key={i} style={[styles.textoNormal, { marginBottom: 2 }]}>{`${i+1}. ${item}`}</Text>
              ))}

              <Text style={[styles.secaoTitulo, { textDecoration: 'none', marginTop: 10 }]}>{`${pdfTexts.proposals.hcm.generalBilling.title}`}</Text>
              {pdfTexts.proposals.hcm.generalBilling.items.map((item, i) => (
                <Text key={i} style={[styles.textoNormal, { marginBottom: 2 }]}>{`${i+1}. ${item}`}</Text>
              ))}
            </>
          ) : (
            <>
              <Text style={styles.textoNormal}>{`1. Mínimo de faturamento da obra: ${formatCurrency(proposta.faturamentoMinimo || 0)}`}</Text>
              <Text style={styles.textoNormal}>{`2. Se atingido o nível de água, será cobrado um adicional de ${formatCurrency(proposta.taxaAgua || 0)} por estaca.`}</Text>
              <Text style={styles.textoNormal}>{`3. Pela impossibilidade no andamento da obra por motivos da CONTRATANTE, será cobrado o valor de ${formatCurrency(proposta.horaParada || 0)} (${horaParadaExtenso || 'zero reais'}) por cada hora de equipamento parado.`}</Text>
            </>
          )}
        </View>

        <View wrap={false} style={{ marginTop: 10 }}>
          <Text style={[styles.textoBold, { marginBottom: 4 }]}>{`CONDIÇÕES DE PAGAMENTO:`}</Text>
          {(proposta.parcelas && proposta.parcelas.length > 0) ? (
            proposta.parcelas.map((p, i) => (
              <Text key={i} style={styles.textoNormal}>{`• ${p.percentual}% (${p.descricao || 'Sinal'}): ${p.prazo || 'A combinar'}.`}</Text>
            ))
          ) : (
            <>
              <Text style={styles.textoNormal}>{`• Sinal: ${proposta.sinalPercentual || 0}% na assinatura da proposta.`}</Text>
              <Text style={styles.textoNormal}>{`• Saldo restante: ${proposta.prazoSaldoDias || 'A combinar'}.`}</Text>
            </>
          )}
          
          <View style={{ marginTop: 10 }}>
            <View style={styles.checkboxLinha}>
              <View style={styles.checkbox}>
                <Text style={{ fontSize: 8 }}>{proposta.solicitaNF ? 'X' : ' '}</Text>
              </View>
              <Text style={styles.textoNormal}>{`Solicito emissão de Nota Fiscal ${proposta.solicitaNF && proposta.impostoNF ? `(acrescentar ${proposta.impostoNF}% no valor)` : ''}`}</Text>
            </View>
            <View style={styles.checkboxLinha}>
              <View style={styles.checkbox}>
                <Text style={{ fontSize: 8 }}>{!proposta.solicitaNF ? 'X' : ' '}</Text>
              </View>
              <Text style={styles.textoNormal}>{`Não solicito emissão de Nota Fiscal`}</Text>
            </View>
          </View>
        </View>

        {/* 6. RESPONSABILIDADES (Shielded) */}
        <View wrap={false}>
          <Text style={styles.secaoTitulo}>{`5. OBRIGAÇÕES DA CONTRATANTE:`}</Text>
          {getObrigacoesContratante()}
        </View>

        <View wrap={false}>
          <Text style={styles.secaoTitulo}>{`6. OBRIGAÇÕES DA CONTRATADA:`}</Text>
          {getObrigacoesContratada()}
        </View>

        {/* 7. CLÁUSULA DE RISCO (Shielded) */}
        {(proposta.tipo === 'HCM' || proposta.tipo === 'ESC') ? (
          <View wrap={false} style={{ marginTop: 15, padding: 8, border: 1, borderColor: '#000000' }}>
            <Text style={[styles.textoBold, { marginBottom: 4 }]}>{`CLÁUSULA DE SEGURANÇA E RISCO:`}</Text>
            <Text style={[styles.textoNormal, { fontSize: 8, textAlign: 'justify' }]}>
              {`${pdfTexts.proposals.riskClause || ''}`}
            </Text>
          </View>
        ) : null}

        {/* 8. TERMO DE ACEITE (Shielded) */}
        <View wrap={false} style={{ marginTop: 25 }}>
          <Text style={styles.secaoTitulo}>{`7. TERMO DE ACEITAÇÃO DA PROPOSTA.`}</Text>
          <Text style={styles.textoNormal}>{`${pdfTexts.proposals.acceptanceTerm}`}</Text>

          <View style={{ marginTop: 20, alignItems: 'center' }}>
            <View style={styles.assinaturaLinha} />
            <Text style={styles.textoBold}>{`${pdfTexts.header.companyName}`}</Text>
          </View>

          <View style={{ marginTop: 30, alignItems: 'center' }}>
            <View style={styles.assinaturaLinha} />
            <Text style={styles.textoBold}>{`ASSINATURA DO CONTRATANTE (CLIENTE)`}</Text>
            <Text style={styles.textoNormal}>{`${cliente?.nomeRazaoSocial || '____________________________________'}`}</Text>
          </View>

          <Text style={[styles.cityDateRow, { marginTop: 20, textAlign: 'center' }]}>{`Socorro/SP, ${dataEmissaoExtenso}`}</Text>
        </View>

        {/* Footer Page Number */}
        <Text style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center', fontSize: 7, color: '#999999' }} render={({ pageNumber, totalPages }) => (
          `Página ${pageNumber} de ${totalPages}`
        )} />

      </Page>
    </Document>
  );
};

export default ProposalPDF;
