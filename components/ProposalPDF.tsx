import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { PropostaData } from '../services/propostasService';
import { numberToWords } from '../src/utils/numberToWords';

// Register fonts
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Bold.ttf', fontWeight: 'bold' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Oblique.ttf', fontStyle: 'italic' }
  ]
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.5,
  },
  logoHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    color: '#0f172a'
  },
  headerBox: {
    marginBottom: 20,
  },
  documentTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#0f172a',
    textDecoration: 'underline'
  },
  cityDateRow: {
    textAlign: 'right',
    marginBottom: 20,
    fontSize: 10
  },
  clientBox: {
    marginBottom: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb'
  },
  clientRow: {
    flexDirection: 'row',
    marginBottom: 4
  },
  clientLabel: {
    width: 70,
    fontWeight: 'bold',
    color: '#0f172a'
  },
  clientValue: {
    flex: 1
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    textDecoration: 'underline',
    marginTop: 15,
    marginBottom: 8,
  },
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify'
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 10
  },
  bullet: {
    width: 15,
  },
  listText: {
    flex: 1,
    textAlign: 'justify'
  },

  // Table
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeaderItem: {
    padding: 6,
    fontWeight: 'bold',
    backgroundColor: '#f9fafb',
    color: '#0f172a',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    textAlign: 'center'
  },
  tableCellItem: {
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    textAlign: 'center'
  },
  tableTotalRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
  },
  totalGeneralBold: {
    fontWeight: 'bold',
    color: '#0f172a',
  },

  // Checkbox row
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: '#0f172a',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxChecked: {
    width: 8,
    height: 8,
    backgroundColor: '#0f172a'
  },

  // Signature
  signatureArea: {
    marginTop: 50,
    flexDirection: 'column',
    alignItems: 'center',
  },
  signatureLine: {
    width: 300,
    borderTopWidth: 1,
    borderTopColor: '#0f172a',
    marginBottom: 5,
  },
  signatureText: {
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center'
  },
  footerText: {
    textAlign: 'center',
    marginTop: 30,
    fontStyle: 'italic',
    color: '#6b7280'
  }
});

interface CompanyData {
  logoUrl?: string;
  razaoSocial: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco?: string;
}

interface ClientData {
  nomeRazaoSocial: string;
  nomeFantasia?: string;
  documento: string;
  enderecoFaturamento: string;
  contatos?: {
    nome: string;
    email: string;
    telefone: string;
    cargo?: string;
  }[];
}

interface ProposalPDFProps {
  proposal: PropostaData;
  client: ClientData;
  company: CompanyData;
}

export const ProposalPDF: React.FC<ProposalPDFProps> = ({ proposal, client, company }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getFormatDateExtended = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${date.getDate().toString().padStart(2, '0')} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  };

  // Variables mapping
  const helperDataPropostaTxt = getFormatDateExtended(proposal.dataEmissao);
  const numPropostaInput = proposal.id?.substring(0, 8).toUpperCase() || '';
  const helperDiametroTxt = Array.from(new Set(proposal.servicos?.map(s => `Ø${s.diam}cm`) || [])).join(', ');

  const totalMetros = proposal.servicos?.reduce((acc, curr) => acc + ((curr.quantidade || 0) * (curr.metragemPrevista || 0)), 0) || 0;

  const subtotalServicos = proposal.servicos?.reduce((acc, curr) => acc + ((curr.quantidade || 0) * (curr.metragemPrevista || 0) * (curr.precoMetro || 0)), 0) || 0;

  // Calculate Final Total based on inputs
  let calcTotalGeral = subtotalServicos + (proposal.mobilizacao || 0);
  if (proposal.solicitaART) calcTotalGeral += (proposal.valorART || 0);
  if (proposal.solicitaNF) calcTotalGeral = calcTotalGeral * (1 + (proposal.impostoNF || 0) / 100);

  const calcTotalGeralExtenso = numberToWords(calcTotalGeral);

  // Get all unique stake types
  const tiposEstaca = Array.from(new Set(proposal.servicos?.map(s => s.tipoEstaca) || [])).join(' E ');

  const Checkbox = ({ checked, label }: { checked: boolean, label: string }) => (
    <View style={styles.checkboxRow}>
      <View style={styles.checkbox}>
        {checked && <View style={styles.checkboxChecked} />}
      </View>
      <Text>{label}</Text>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* 1. CABEÇALHO */}
        <View style={styles.headerBox}>
          <Text style={styles.documentTitle}>PROPOSTA DE PRESTAÇÃO DE SERVIÇO DE ESTACAS TIPO {tiposEstaca?.toUpperCase() || ''}</Text>
          <Text style={styles.cityDateRow}>Socorro/SP de {helperDataPropostaTxt}.</Text>

          <View style={styles.clientBox}>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>A/C SENHOR:</Text>
              <Text style={[styles.clientValue, { fontWeight: 'bold', color: '#0f172a' }]}>{client.nomeRazaoSocial.toUpperCase()}</Text>
            </View>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>ENDEREÇO:</Text>
              <Text style={styles.clientValue}>{client.enderecoFaturamento}</Text>
            </View>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>PROPOSTA N.:</Text>
              <Text style={[styles.clientValue, { fontWeight: 'bold' }]}>{numPropostaInput}</Text>
            </View>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>VALIDADE:</Text>
              <Text style={styles.clientValue}>{proposal.validadeDias} DIAS</Text>
            </View>
          </View>
        </View>

        <Text style={styles.paragraph}>
          Cumprimentando-os cordialmente, vimos pelo presente apresentar a Vossa Senhoria nossos preços e condições para a execução das obras em referência, de acordo com as especificações a nós fornecidas.
        </Text>

        {/* 2. ESPECIFICAÇÕES TÉCNICAS */}
        <Text style={styles.sectionTitle}>1. ESPECIFICAÇÕES TÉCNICAS (ESCOPO)</Text>
        <Text style={styles.paragraph}>Perfuração e concretagem de estacas tipo {tiposEstaca}, conforme as características a seguir:</Text>
        <View style={{ marginBottom: 10 }}>
          {proposal.servicos?.map((s, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Estacas {s.tipoEstaca} Ø{s.diametro}, comprimento previsto: {s.quantidade} estacas x {s.metragemPrevista}m = {(s.quantidade * s.metragemPrevista).toFixed(2)}m</Text>
            </View>
          ))}
          <View style={[styles.listItem, { marginTop: 4 }]}>
            <Text style={styles.bullet}>•</Text>
            <Text style={[styles.listText, { fontWeight: 'bold' }]}>TOTAL ESTIMADO DE METROS: {totalMetros.toFixed(2)}m</Text>
          </View>
        </View>

        {/* 3. PRAZO E INÍCIO */}
        <Text style={styles.sectionTitle}>2. PRAZO E INÍCIO</Text>
        <Text style={styles.paragraph}>
          O prazo previsto para a execução dos serviços é de <Text style={{ fontWeight: 'bold' }}>{proposal.prazoExecucao} dias</Text> úteis, contados a partir da mobilização dos equipamentos e liberação das frentes de serviço.
        </Text>
        {proposal.inicioPrevisto && (
          <Text style={styles.paragraph}>
            Início previsto: <Text style={{ fontWeight: 'bold' }}>{getFormatDateExtended(proposal.inicioPrevisto)}</Text>.
          </Text>
        )}

        {/* 4. TABELA DE VALORES */}
        <Text style={styles.sectionTitle}>3. TABELA DE VALORES</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={[styles.tableHeaderItem, { width: '20%' }]}>Diâmetro</Text>
            <Text style={[styles.tableHeaderItem, { width: '25%' }]}>Preço/m</Text>
            <Text style={[styles.tableHeaderItem, { width: '30%' }]}>Cálculo</Text>
            <Text style={[styles.tableHeaderItem, { width: '25%', borderRightWidth: 0 }]}>Subtotal</Text>
          </View>

          {proposal.servicos?.map((s, i) => {
            const mTotal = s.quantidade * s.metragemPrevista;
            const sub = mTotal * s.precoMetro;
            return (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCellItem, { width: '20%' }]}>Ø{s.diametro}</Text>
                <Text style={[styles.tableCellItem, { width: '25%' }]}>{formatCurrency(s.precoMetro)} / m</Text>
                <Text style={[styles.tableCellItem, { width: '30%' }]}>{mTotal}m x {formatCurrency(s.precoMetro)}</Text>
                <Text style={[styles.tableCellItem, { width: '25%', borderRightWidth: 0 }]}>{formatCurrency(sub)}</Text>
              </View>
            );
          })}

          <View style={styles.tableRow}>
            <Text style={[styles.tableCellItem, { width: '75%', textAlign: 'right' }]}>Mobilização / Desmobilização de Equipamentos:</Text>
            <Text style={[styles.tableCellItem, { width: '25%', borderRightWidth: 0 }]}>{formatCurrency(proposal.mobilizacao || 0)}</Text>
          </View>

          {proposal.solicitaART && (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCellItem, { width: '75%', textAlign: 'right' }]}>ART (Anotação de Responsabilidade Técnica):</Text>
              <Text style={[styles.tableCellItem, { width: '25%', borderRightWidth: 0 }]}>{formatCurrency(proposal.valorART || 0)}</Text>
            </View>
          )}

          <View style={styles.tableTotalRow}>
            <Text style={[styles.tableCellItem, styles.totalGeneralBold, { width: '75%', textAlign: 'right' }]}>TOTAL GERAL ESTIMADO (Incluso NF-e):</Text>
            <Text style={[styles.tableCellItem, styles.totalGeneralBold, { width: '25%', borderRightWidth: 0 }]}>{formatCurrency(calcTotalGeral)}</Text>
          </View>
        </View>
        <Text style={[styles.paragraph, { fontSize: 9, fontStyle: 'italic', marginTop: -10, marginBottom: 15 }]}>
          Valor total por extenso: {calcTotalGeralExtenso}.
        </Text>

        {/* 5. CONDIÇÕES DE PAGAMENTO */}
        <Text style={styles.sectionTitle}>4. CONDIÇÕES DE PAGAMENTO</Text>
        <View style={styles.listItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.listText}>Sinal de <Text style={{ fontWeight: 'bold' }}>{proposal.sinalPercentual}%</Text> no aceite da proposta (ou mobilização).</Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.listText}>Saldo Restante: {
            proposal.parcelas && proposal.parcelas.length > 0
              ? `dividido em ${proposal.parcelas.length} parcelas de ${proposal.parcelas.map(p => p.dias).join(', ')} dias.`
              : `a combinar (${proposal.prazoSaldoDias} dias após o término/medição).`
          }</Text>
        </View>

        <View style={{ marginTop: 10, marginBottom: 10, paddingLeft: 10 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Emissão de Nota Fiscal de Serviços:</Text>
          <Checkbox checked={proposal.solicitaNF} label={`Sim, emitir Nota Fiscal com incidência de ${proposal.impostoNF}% sobre o valor medido.`} />
          <Checkbox checked={!proposal.solicitaNF} label="Não será necessária a emissão de Nota Fiscal." />
        </View>

        <View style={{ marginTop: 5, marginBottom: 15, paddingLeft: 10 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Recolhimento de ART (Engenheiro Responsável):</Text>
          <Checkbox checked={proposal.solicitaART} label={`Sim, com acréscimo de ${formatCurrency(proposal.valorART || 0)} (Taxa CREA).`} />
          <Checkbox checked={!proposal.solicitaART} label="Não solicitamos ART por parte da contratada." />
        </View>

        {/* 6. COBRANÇAS E FATURAMENTO MINIMO */}
        <Text style={styles.sectionTitle}>5. COBRANÇAS E FATURAMENTO MÍNIMO</Text>
        <View style={styles.listItem}>
          <Text style={styles.bullet}>1.</Text>
          <Text style={styles.listText}>Será faturado o mínimo de <Text style={{ fontWeight: 'bold' }}>{formatCurrency(proposal.faturamentoMinimo || 0)}</Text> por obra ou mobilização, caso a medição real não alcance este valor.</Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.bullet}>2.</Text>
          <Text style={styles.listText}>A contratante se responsabiliza pelo fornecimento de água no local. Caso haja necessidade de locação de caminhão pipa, será cobrada a taxa de <Text style={{ fontWeight: 'bold' }}>{formatCurrency(proposal.taxaAgua || 0)}</Text> por viagem.</Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.bullet}>3.</Text>
          <Text style={styles.listText}>Horas Paradas / Ociosidade por culpa da CONTRATANTE (falta de concreto, ferragem, frente liberada, acesso) serão cobradas à razão de <Text style={{ fontWeight: 'bold' }}>{formatCurrency(proposal.horaParada || 0)}</Text> ({numberToWords(proposal.horaParada || 0)}) por hora parada do equipamento no pátio da obra.</Text>
        </View>

        {/* 7. OBRIGAÇÕES DA CONTRATANTE */}
        <Text style={styles.sectionTitle}>6. OBRIGAÇÕES DA CONTRATANTE</Text>
        {proposal.textoObrigacoesContratante ? (
          <Text style={styles.paragraph}>{proposal.textoObrigacoesContratante}</Text>
        ) : (
          <>
            <View style={styles.listItem}><Text style={styles.bullet}>1.</Text><Text style={styles.listText}>Fornecer locação, piqueteamento e níveis topográficos precisos e livres de obstáculos para o posicionamento correto da perfuratriz.</Text></View>
            <View style={styles.listItem}><Text style={styles.bullet}>2.</Text><Text style={styles.listText}>Manter o acesso estável, plano e seguro (com pedras britadas ou forração adequada se houver lama) para o trânsito da Perfuratriz e dos Caminhões Betoneira.</Text></View>
            <View style={styles.listItem}><Text style={styles.bullet}>3.</Text><Text style={styles.listText}>Providenciar programação do concreto usinado (FCK adequado com slump correto para {tiposEstaca}), eximindo a Contratada de qualquer ônus se o concreto atrasar, secar no balão ou for recusado.</Text></View>
            <View style={styles.listItem}><Text style={styles.bullet}>4.</Text><Text style={styles.listText}>Fornecimento de armaduras (ferragens) devidamente montadas e prontas no local exato de cada estaca, além de mão de obra para introdução das armaduras no concreto fresco imediatamente após a perfuração.</Text></View>
            <View style={styles.listItem}><Text style={styles.bullet}>5.</Text><Text style={styles.listText}>Fornecer água potável, energia elétrica e instalações sanitárias (ou banheiro químico) para a equipe da Contratada durante o período de execução.</Text></View>
            <View style={styles.listItem}><Text style={styles.bullet}>6.</Text><Text style={styles.listText}>Garantir que não haja redes de esgoto, galerias pluviais, cabos elétricos, telefonia ou adutoras de gás na linha de furação das estacas.</Text></View>
          </>
        )}

        {/* break page for proper formatting if needed, but react-pdf auto-wraps */}

        {/* 8. OBRIGAÇÕES DA CONTRATADA */}
        <Text style={styles.sectionTitle}>7. OBRIGAÇÕES DA CONTRATADA</Text>
        {proposal.textoObrigacoesContratada ? (
          <Text style={styles.paragraph}>{proposal.textoObrigacoesContratada}</Text>
        ) : (
          <>
            <View style={styles.listItem}><Text style={styles.bullet}>1.</Text><Text style={styles.listText}>Fornecer os equipamentos e Perfuratrizes em bom estado operacional, acompanhados de operadores e ajudantes capacitados e devidamente registrados.</Text></View>
            <View style={styles.listItem}><Text style={styles.bullet}>2.</Text><Text style={styles.listText}>Acompanhar rigorosamente o projeto estrutural (cargas, furos e profundidades) fornecido pela Contratante.</Text></View>
            <View style={styles.listItem}><Text style={styles.bullet}>3.</Text><Text style={styles.listText}>Fornecer todos os EPI's necessários para a sua força de trabalho, de acordo com as normas regulamentadoras do Ministério do Trabalho.</Text></View>
            <View style={styles.listItem}><Text style={styles.bullet}>4.</Text><Text style={styles.listText}>Executar diariamente o preenchimento do Boletim Diário de Obra (BDO), submetendo-o à aprovação/abono do engenheiro ou mestre encarregado da obra pela Contratante.</Text></View>
          </>
        )}

        {/* 9. DOS DIREITOS */}
        <Text style={styles.sectionTitle}>8. DOS DIREITOS (CONDIÇÕES GEOTÉCNICAS E IMPREVISTOS)</Text>
        <Text style={styles.paragraph}>
          Fica resguardado o direito da Contratada de paralisar as atividades (e contabilizar quebra, desgaste e hora técnica) caso as perfuratrizes encontrem **matacões, rochas sãs, lençol freático extremo, entulhos soterrados** ou qualquer elemento geológico natural e artificial não especificado previamente na sondagem SPT inicial que impeça o avanço rotativo convencional das brocas.
          Em ocorrência de quebra de ferramentas na tentativa de superar tais obstáculos solicitados pela contratante em campo, os reparos poderão ser direcionados ao centro de custos da Contratante mediante acordo formal prévio.
        </Text>

        {/* EXTRA CLAUSES IF ANY */}
        {proposal.clausulasExtras && proposal.clausulasExtras.length > 0 && (
          <View style={{ marginTop: 10 }}>
            {proposal.clausulasExtras.map((clausula, idx) => (
              <View key={idx} style={{ marginBottom: 10 }}>
                <Text style={styles.sectionTitle}>8.{idx + 1}. {clausula.titulo?.toUpperCase()}</Text>
                <Text style={styles.paragraph}>{clausula.texto}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 10. TERMO DE ACEITAÇÃO E ASSINATURAS */}
        <Text style={styles.sectionTitle}>9. TERMO DE ACEITE</Text>
        <Text style={styles.paragraph}>
          Temos plena certeza de estarmos cumprindo com nosso dever em excelência de forma a satisfazermos na íntegra a necessidade em questão e de participarmos dignamente desta obra. E por estarmos de acordo com as cláusulas, condições comerciais e financeiras propostas neste documento de Proposta Nº {numPropostaInput}, as partes firmam o presente termo.
        </Text>

        <View style={styles.signatureArea}>
          <Text style={{ marginBottom: 40, fontStyle: 'italic', fontSize: 10 }}>Socorro, {helperDataPropostaTxt}</Text>

          <View style={styles.signatureLine} />
          <Text style={styles.signatureText}>{client.nomeRazaoSocial}</Text>
          <Text style={{ fontSize: 9, color: '#6b7280' }}>CNPJ/CPF: {client.documento}</Text>
          <Text style={{ fontSize: 9, color: '#6b7280' }}>Contratante / Aceite</Text>

          <View style={{ marginTop: 50 }} />

          <View style={styles.signatureLine} />
          <Text style={styles.signatureText}>ESTEMCO ENGENHARIA EM FUNDAÇÕES S/S LTDA</Text>
          <Text style={{ fontSize: 9, color: '#6b7280' }}>CNPJ: 57.486.102/0001-86</Text>
          <Text style={{ fontSize: 9, color: '#6b7280' }}>Contratada / Emissor</Text>
        </View>

        <Text style={styles.footerText} fixed>
          Atenciosamente, Estemco Engenharia em Fundações S/S Ltda. - Proposta Comercial Nº {numPropostaInput}
        </Text>

      </Page>
    </Document>
  );
};
