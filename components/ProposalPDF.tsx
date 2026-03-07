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
  titulo: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 4,
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
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDateString = (dtStr: string) => {
    if (!dtStr) return '';
    const date = new Date(dtStr);
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  };

  const formatDateSimple = (dtStr: string) => {
    if (!dtStr) return '';
    const date = new Date(dtStr);
    return date.toLocaleDateString('pt-BR');
  };

  const dataEmissaoExtenso = formatDateString(proposta.dataEmissao || new Date().toISOString());
  const inicioPrevistoFormatado = formatDateSimple((proposta as any).inicioPrevisto || (proposta as any).dataPrevistaInicio || new Date().toISOString());

  const tiposEstacaUnicos = Array.from(new Set(proposta.servicos?.map(s => s.tipoEstaca) || [])).join(' / ');
  const totalMetros = (proposta.servicos || []).reduce((acc, s) => acc + (s.quantidade * s.metragemPrevista), 0);

  const valorTotalExtenso = numberToWords(proposta.valorTotal || 0);
  const horaParadaExtenso = numberToWords(proposta.horaParada || 0);

  const getObrigacoesContratante = () => {
    if (proposta.textoObrigacoesContratante && proposta.textoObrigacoesContratante.trim() !== '') {
      return (
        <View style={{ marginBottom: 4 }}>
          <Text style={styles.textoNormal}>{proposta.textoObrigacoesContratante}</Text>
        </View>
      );
    }
    return (
      <View>
        <Text style={styles.textoNormal}>1. Fornecimento de cimento, areia, brita, ferro e água potável próximos da estaca para a execução da obra.</Text>
        <Text style={styles.textoNormal}>2. Fornecimento de energia elétrica provisória e/ou definitiva compatível com a exigência da obra.</Text>
        <Text style={styles.textoNormal}>3. Locação dos pontos a serem perfurados bem como o fornecimento das referências de nível (R.N) para o total de projeto.</Text>
        <Text style={styles.textoNormal}>4. Obtenção de todas as licenças, alvarás necessários e ART do projeto e responsabilidade da obra.</Text>
        <Text style={styles.textoNormal}>5. Isolamento e proteção da área que irá trabalhar a máquina.</Text>
        <Text style={styles.textoNormal}>6. Fornecimento de ajudantes, sendo a Contratada responsável apenas pela equipe técnica de perfuração e concretagem.</Text>
        <Text style={styles.textoNormal}>7. A água do lençol freático, caso o poço venha a encontrar, deverá ser esgotada por conta da CONTRATANTE caso prejudique o processo a ser efetuado.</Text>
        <Text style={styles.textoNormal}>8. Responsabilizar-se por danos causados a propriedades vizinhas, ou não, provenientes de vibrações derivadas do processo normal ou falhas do projeto ou do solo.</Text>
        <Text style={styles.textoNormal}>9. Executar as escavações prévias caso necessário.</Text>
      </View>
    );
  };

  const getObrigacoesContratada = () => {
    if (proposta.textoObrigacoesContratada && proposta.textoObrigacoesContratada.trim() !== '') {
      return (
        <View style={{ marginBottom: 4 }}>
          <Text style={styles.textoNormal}>{proposta.textoObrigacoesContratada}</Text>
        </View>
      );
    }
    return (
      <View>
        <Text style={styles.textoNormal}>1. Fornecimento de mão de obra especializada em fundações, incluindo operador e equipe para garantir o perfeito andamento dos serviços.</Text>
        <Text style={styles.textoNormal}>2. Fornecimento de todos os equipamentos necessários descritos à perfeita realização e acabamento da obra.</Text>
        <Text style={styles.textoNormal}>3. Fornecimento de EPI's (Equipamentos de Proteção Individual).</Text>
        <Text style={styles.textoNormal}>4. Manter a obra em bom estado de limpeza.</Text>
        <Text style={styles.textoNormal}>5. Fornecimento de todos materiais necessários à proteção de nossos funcionários.</Text>
        <Text style={styles.textoNormal}>6. Obedecer e cumprir a legislação trabalhista vigente e demais exigências dos órgãos públicos referente a registros de empregados e de nossa responsabilidade.</Text>
        <Text style={styles.textoNormal}>7. Dar andamento normal à execução dos serviços, devendo tomar providências para evitar acidentes e danos que porventura venham a ocorrer durante a execução dos nossos trabalhos.</Text>
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* 1. CABEÇALHO */}
        {empresa.logoUrl && (
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <Image src={empresa.logoUrl} style={{ height: 50 }} />
          </View>
        )}

        <Text style={styles.titulo}>PROPOSTA DE PRESTAÇÃO DE SERVIÇO DE ESTACAS TIPO</Text>
        <Text style={[styles.titulo, { fontSize: 10, marginBottom: 15 }]}>{tiposEstacaUnicos}</Text>

        <Text style={styles.cityDateRow}>Socorro/SP de {dataEmissaoExtenso}</Text>

        <View style={{ marginBottom: 15 }}>
          <Text style={styles.textoBold}>AO SENHOR: <Text style={styles.textoNormal}>{cliente.nomeRazaoSocial}</Text></Text>
          <Text style={styles.textoBold}>ENDEREÇO: <Text style={styles.textoNormal}>{cliente.enderecoFaturamento}</Text></Text>
          <Text style={[styles.textoBold, { marginTop: 10 }]}>PROPOSTA N. <Text style={styles.textoNormal}>{proposta.id?.substring(0, 8).toUpperCase()}</Text></Text>
          <Text style={styles.textoBold}>VALIDADE: <Text style={styles.textoNormal}>{proposta.validadeDias || 15} DIAS</Text></Text>
        </View>

        {/* 2. ESPECIFICAÇÕES TÉCNICAS */}
        <Text style={styles.secaoTitulo}>DAS ESPECIFICAÇÕES TÉCNICAS.</Text>
        {(proposta.servicos || []).map((s, i) => (
          <View key={i} style={{ marginBottom: 4 }}>
            <Text style={styles.textoBold}>ESTACAS {s.tipoEstaca}:</Text>
            <Text style={styles.textoNormal}>
              Estacas d= {s.diametro ? `Ø${s.diametro}` : 'N/D'}, comprimento previsto: {s.quantidade} estacas x {s.metragemPrevista}m = {(s.quantidade * s.metragemPrevista).toFixed(1)}m
            </Text>
          </View>
        ))}
        <Text style={[styles.textoBold, { marginTop: 4 }]}>TOTAL = {totalMetros.toFixed(1)}m</Text>

        {/* 3. PRAZO E INÍCIO */}
        <Text style={[styles.secaoTitulo, { marginTop: 15 }]}>PRAZO DE EXECUÇÃO e INÍCIO DA OBRA.</Text>
        <Text style={styles.textoNormal}>Gostaríamos de informar que o prazo de execução para esta referida obra será de {proposta.prazoExecucao} dias trabalhados.</Text>
        <Text style={[styles.textoNormal, { marginTop: 4 }]}>Início da prestação de serviço {inicioPrevistoFormatado}</Text>
        <View style={styles.separador} />

        {/* 4. TABELA DE VALORES */}
        <Text style={[styles.titulo, { fontSize: 10, marginTop: 10, textAlign: 'left' }]}>
          VALORES PARA PRESTAÇÃO DE SERVIÇO ESTACAS DO TIPO {tiposEstacaUnicos}
        </Text>

        <View style={{ marginTop: 8 }}>
          {(proposta.servicos || []).map((s, i) => {
            const rowTotal = s.quantidade * s.metragemPrevista * s.precoMetro;
            return (
              <View key={i} style={styles.linha}>
                <Text style={[styles.textoNormal, { flex: 1 }]}>Estacas de Ø{s.diametro}</Text>
                <Text style={[styles.textoNormal, { flex: 1, textAlign: 'center' }]}>{formatCurrency(s.precoMetro)}</Text>
                <Text style={[styles.textoNormal, { flex: 2, textAlign: 'right' }]}>
                  {s.quantidade}x{s.metragemPrevista}m x {formatCurrency(s.precoMetro)} = {formatCurrency(rowTotal)}
                </Text>
              </View>
            );
          })}

          <View style={[styles.linha, { marginTop: 4 }]}>
            <Text style={[styles.textoNormal, { flex: 1 }]}>Mobilização e desmobilização</Text>
            <Text style={[styles.textoNormal, { flex: 1, textAlign: 'center' }]}> </Text>
            <Text style={[styles.textoNormal, { flex: 2, textAlign: 'right' }]}>
              {formatCurrency(proposta.mobilizacao || 0)}
            </Text>
          </View>

          {proposta.solicitaART && (
            <View style={styles.linha}>
              <Text style={[styles.textoNormal, { flex: 1 }]}>ART - Anotação de Responsabilidade Técnica</Text>
              <Text style={[styles.textoNormal, { flex: 1, textAlign: 'center' }]}> </Text>
              <Text style={[styles.textoNormal, { flex: 2, textAlign: 'right' }]}>
                {formatCurrency(proposta.valorART || 0)}
              </Text>
            </View>
          )}

          <View style={[styles.totalLinha, { marginTop: 8 }]}>
            <Text style={[styles.textoBold, { flex: 1 }]}>Valor total:</Text>
            <Text style={[styles.textoBold, { flex: 3, textAlign: 'right' }]}>
              {formatCurrency(proposta.valorTotal || 0)} ({valorTotalExtenso})
            </Text>
          </View>
          <Text style={[styles.textoNormal, { fontSize: 8, color: '#64748b', marginTop: 4 }]}>
            * O mesmo podendo se alterar dependendo das situações encontradas na obra.
          </Text>
        </View>

        {/* 5. CONDIÇÕES DE PAGAMENTO */}
        <Text style={[styles.secaoTitulo, { marginTop: 15 }]}>CONDIÇÃO DE PAGAMENTO</Text>
        <Text style={styles.textoNormal}>• Sinal: {proposta.sinalPercentual}% na assinatura da proposta.</Text>
        <Text style={styles.textoNormal}>• Saldo restante: {proposta.prazoSaldoDias} após entrega ou conclusão.</Text>

        {proposta.parcelas && proposta.parcelas.length > 0 && (
          <View style={{ marginTop: 8, marginBottom: 8 }}>
            <View style={styles.tabelaHeader}>
              <Text style={[styles.textoBold, { flex: 1 }]}>Parcela</Text>
              <Text style={[styles.textoBold, { flex: 1, textAlign: 'center' }]}>Dias</Text>
              <Text style={[styles.textoBold, { flex: 1, textAlign: 'right' }]}>Valor</Text>
            </View>
            {proposta.parcelas.map((p, i) => (
              <View key={i} style={styles.tabelaLinha}>
                <Text style={[styles.textoNormal, { flex: 1 }]}>{(p as any).numero || i + 1}ª Parcela</Text>
                <Text style={[styles.textoNormal, { flex: 1, textAlign: 'center' }]}>{p.dias} dias</Text>
                <Text style={[styles.textoNormal, { flex: 1, textAlign: 'right' }]}>{formatCurrency(p.valor)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ marginTop: 10 }}>
          <View style={styles.checkboxLinha}>
            <View style={styles.checkbox}>
              <Text style={{ fontSize: 8 }}>{proposta.solicitaNF ? 'X' : ' '}</Text>
            </View>
            <Text style={styles.textoNormal}>Solicito a emissão da nota fiscal {proposta.solicitaNF && proposta.impostoNF ? `(acrescentar ${proposta.impostoNF}% no valor)` : ''}</Text>
          </View>

          <View style={styles.checkboxLinha}>
            <View style={styles.checkbox}>
              <Text style={{ fontSize: 8 }}>{!proposta.solicitaNF ? 'X' : ' '}</Text>
            </View>
            <Text style={styles.textoNormal}>Não solicito a emissão da nota fiscal</Text>
          </View>

          <View style={[styles.checkboxLinha, { marginTop: 6 }]}>
            <View style={styles.checkbox}>
              <Text style={{ fontSize: 8 }}>{proposta.solicitaART ? 'X' : ' '}</Text>
            </View>
            <Text style={styles.textoNormal}>Solicito a emissão da ART (taxa de emissão no valor de {formatCurrency(proposta.valorART || 0)})</Text>
          </View>

          <View style={styles.checkboxLinha}>
            <View style={styles.checkbox}>
              <Text style={{ fontSize: 8 }}>{!proposta.solicitaART ? 'X' : ' '}</Text>
            </View>
            <Text style={styles.textoNormal}>Não solicito a emissão da ART</Text>
          </View>
        </View>

        {/* 6. DAS COBRANÇAS E FATURAMENTO */}
        <Text style={[styles.secaoTitulo, { marginTop: 15 }]}>DAS COBRANÇAS & FATURAMENTO MÍNIMO</Text>
        <Text style={styles.textoNormal}>1. Mínimo de faturamento da obra {formatCurrency(proposta.faturamentoMinimo || 0)}</Text>
        <Text style={styles.textoNormal}>2. Se atingido o nível de água, será cobrado um adicional de {formatCurrency(proposta.taxaAgua || 0)} por estaca.</Text>
        <Text style={styles.textoNormal}>3. Ao encontrar pedras, matacão, entulho ou madeiras, que impossibilitem o avanço do trado, as estacas serão cobradas pela metragem perfurada. Serão locadas novas estacas lado a lado.</Text>
        <Text style={styles.textoNormal}>4. Pela impossibilidade no andamento da obra, sendo os motivos por irresponsabilidade ou falta de gerenciamento da CONTRATANTE e que venha a ocorrer que nosso equipamento fique parado, será cobrado o valor de {formatCurrency(proposta.horaParada || 0)} ({horaParadaExtenso}) por cada hora de perfuratriz inoperante no local com todos envolvidos.</Text>
        <Text style={styles.textoNormal}>5. Os volumes de concreto calculados não contemplam o concreto que venha a se perder por quebra de barranco, formigueiros ou pelo terreno se tratar de aterro recentemente compactado (terrenos moles).</Text>

        {/* 7. OBRIGAÇÕES DA CONTRATANTE */}
        <Text style={[styles.secaoTitulo, { marginTop: 15 }]}>OBRIGAÇÕES DA CONTRATANTE:</Text>
        {getObrigacoesContratante()}

        {/* 8. OBRIGAÇÕES DA CONTRATADA */}
        <Text style={[styles.secaoTitulo, { marginTop: 15 }]}>OBRIGAÇÕES DA CONTRATADA:</Text>
        {getObrigacoesContratada()}

        {/* 9. DOS DIREITOS */}
        <Text style={[styles.secaoTitulo, { marginTop: 15 }]}>DOS DIREITOS</Text>
        <Text style={styles.textoNormal}>1. Reservamo-nos o direito de rescisão deste contrato se na execução dos trabalhos for encontrado matacão ou rochas, pois o equipamento acima se destina a perfuração somente de solo regular.</Text>
        <Text style={styles.textoNormal}>2. As propostas aprovadas estão sujeitas a programação de disponibilidade de perfuratriz e equipe.</Text>

        {/* 10. TEXTO DE ENCERRAMENTO */}
        <View style={{ marginTop: 20 }}>
          <Text style={styles.textoNormal}>Sendo o que temos a apresentar, esperamos que os nossos serviços e condições de execução atendam os interesses de sua conceituada organização e encontramo-nos às ordens para detalhamentos julgados necessários.</Text>
          {proposta.textoCondicoesRisco && proposta.textoCondicoesRisco.trim() !== '' && (
            <Text style={[styles.textoNormal, { marginTop: 10, color: '#b91c1c' }]}>{proposta.textoCondicoesRisco}</Text>
          )}
        </View>

        <View style={styles.separador} />

        {/* 11. TERMO DE ACEITAÇÃO */}
        <View style={{ marginTop: 20 }}>
          <Text style={[styles.textoBold, { textAlign: 'center', fontSize: 12 }]}>ESTEMCO ENGENHARIA EM FUNDAÇÕES S/S LTDA</Text>
          <Text style={[styles.textoNormal, { textAlign: 'center' }]}>CNPJ: 57.486.102/0001-86</Text>
          <Text style={[styles.textoNormal, { textAlign: 'center' }]}>Rodovia Capitão Barduino, Km 131,5 - Socorro SP</Text>

          <Text style={[styles.textoNormal, { marginTop: 15, marginBottom: 15 }]}>
            Pelo presente, declaramos estar ciente e de acordo com todas as premissas deste contrato.
          </Text>

          <Text style={styles.textoBold}>Proposta n {proposta.id?.substring(0, 8).toUpperCase() || 'XXX'} emitida em {formatDateSimple(proposta.dataEmissao || new Date().toISOString())}</Text>

          <View style={{ marginTop: 15, lineHeight: 2.5 }}>
            <Text style={styles.textoBold}>RAZÃO SOCIAL: ____________________________________________________________________</Text>
            <Text style={styles.textoBold}>CNPJ/CPF: ____________________________________________________________________</Text>
            <Text style={styles.textoBold}>INSCRIÇÃO ESTADUAL: ____________________________________________________________________</Text>
            <Text style={styles.textoBold}>ENDEREÇO DA OBRA: ____________________________________________________________________</Text>
            <Text style={styles.textoBold}>ENDEREÇO DE COBRANÇA: ____________________________________________________________________</Text>
            <Text style={styles.textoBold}>NOME DO RESPONSÁVEL: ____________________________________________________________________</Text>
          </View>

          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <View style={styles.assinaturaLinha} />
            <Text style={styles.textoBold}>ASSINATURA RESPONSÁVEL</Text>
          </View>

          <Text style={[styles.cityDateRow, { marginTop: 20, textAlign: 'center' }]}>Socorro/SP de {dataEmissaoExtenso}</Text>

          <View style={{ alignItems: 'center', marginTop: 30 }}>
            <View style={styles.assinaturaLinha} />
            <Text style={styles.textoBold}>Atenciosamente</Text>
            <Text style={styles.textoNormal}>Estemco Engenharia em Fundações S/S Ltda.</Text>
          </View>

          {proposta.textoTermoAceite && proposta.textoTermoAceite.trim() !== '' && (
            <Text style={[styles.textoNormal, { marginTop: 15, fontSize: 8, fontStyle: 'italic', color: '#475569' }]}>
              *{proposta.textoTermoAceite}
            </Text>
          )}
        </View>

      </Page>
    </Document>
  );
};

export default ProposalPDF;
