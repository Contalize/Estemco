// components/ProposalPDF.tsx
// Versão corrigida — react-pdf v4 exige borderStyle: 'solid' em TODOS os borderWidth

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { numberToWords } from '../src/utils/numberToWords';
import { formatarData } from '../src/utils/formatDate';

// ── Fontes ─────────────────────────────────────────────────────────────────
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Bold.ttf', fontWeight: 'bold' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Oblique.ttf', fontStyle: 'italic' },
  ],
});

// ── Tipos ───────────────────────────────────────────────────────────────────
interface PropostaDataItem {
  tipoEstaca?: string;
  diametro?: string | number;
  quantidade?: number;
  metragemPrevista?: number;
  precoMetro?: number;
  totalMetros?: number;
  subtotal?: number;
}

interface ParcelaProposta {
  id?: string;
  descricao?: string;
  percentual?: number;
  prazo?: string;
  dias?: number;
  formaPagamento?: string;
  valor?: number;
}

export interface PropostaData {
  id?: string;
  dataEmissao?: string;
  validadeDias?: number;
  prazoExecucao?: number | string;
  faturamentoMinimo?: number;
  horaParada?: number;
  valorTotal?: number;
  mobilizacao?: number;
  sinalPercentual?: number;
  prazoSaldoDias?: string;
  solicitaNF?: boolean;
  impostoNF?: number;
  solicitaART?: boolean;
  valorART?: number;
  taxaAgua?: number;
  textoObrigacoesContratante?: string;
  textoObrigacoesContratada?: string;
  textoCondicoesCobranca?: string;
  textoDireitosRisco?: string;
  textoTermoAceite?: string;
  servicos?: PropostaDataItem[];
  parcelas?: ParcelaProposta[];
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

// ── Estilos ─────────────────────────────────────────────────────────────────
// REGRA react-pdf v4: todo borderWidth precisa de borderStyle: 'solid' explícito.
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 45,
    color: '#1e293b',
  },
  titulo: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  secaoTitulo: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textDecoration: 'underline',
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  textoNormal: { fontSize: 10, lineHeight: 1.5 },
  textoBold: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  linha: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  tabelaHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: '#cbd5e1',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#cbd5e1',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tabelaLinha: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#e2e8f0',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  totalLinha: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderTopWidth: 2,
    borderTopStyle: 'solid',
    borderTopColor: '#0f172a',
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  separador: {
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#e2e8f0',
    marginVertical: 10,
  },
  assinaturaLinha: {
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#374151',
    marginTop: 30,
    marginBottom: 4,
    width: '60%',
  },
  checkboxLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#374151',
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityDateRow: {
    textAlign: 'right',
    marginBottom: 20,
    fontSize: 10,
  },
});

// ── Componente ───────────────────────────────────────────────────────────────
const ProposalPDF: React.FC<ProposalPDFProps> = ({ proposta, cliente, empresa }) => {

  const formatCurrency = (val: number | undefined | null): string => {
    if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    } catch {
      return 'R$ 0,00';
    }
  };

  const formatMeters = (val: number | undefined | null): string => {
    if (!val && val !== 0) return '0,00 m';
    return `${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m`;
  };

  const formatDateSimple = (dtStr: any): string => {
    if (!dtStr) return '---';
    try {
      const date = dtStr?.toDate
        ? dtStr.toDate()
        : dtStr && typeof dtStr === 'object' && 'seconds' in dtStr
        ? new Date(dtStr.seconds * 1000)
        : new Date(dtStr);
      if (isNaN(date.getTime())) return '---';
      return date.toLocaleDateString('pt-BR');
    } catch {
      return '---';
    }
  };

  const formatDateExtenso = (dtStr: any): string => {
    if (!dtStr) return '---';
    try {
      const date = dtStr?.toDate
        ? dtStr.toDate()
        : dtStr && typeof dtStr === 'object' && 'seconds' in dtStr
        ? new Date(dtStr.seconds * 1000)
        : new Date(dtStr);
      if (isNaN(date.getTime())) return '---';
      const meses = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
      ];
      return `${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`;
    } catch {
      return '---';
    }
  };

  const servicos = proposta?.servicos || [];
  const tiposEstacaUnicos = [...new Set(servicos.map(s => s?.tipoEstaca).filter(Boolean))].join(' / ');
  const totalMetros = servicos.reduce(
    (acc, s) => acc + ((s?.quantidade || 0) * (s?.metragemPrevista || 0)),
    0
  );
  const dataEmissaoExtenso = formatDateExtenso(proposta?.dataEmissao || new Date().toISOString());
  const horaParadaExtenso = proposta?.horaParada
    ? numberToWords(proposta.horaParada)
    : 'zero reais';
  const valorTotalExtenso = proposta?.valorTotal
    ? numberToWords(proposta.valorTotal)
    : 'zero reais';

  // ── Obrigações com fallback padrão ──────────────────────────────────────
  const getObrigacoesContratante = () => {
    if (proposta?.textoObrigacoesContratante?.trim()) {
      return <Text style={styles.textoNormal}>{proposta.textoObrigacoesContratante}</Text>;
    }
    return (
      <View>
        <Text style={styles.textoNormal}>1. Será responsabilidade do CONTRATANTE qualquer dano a redes subterrâneas e/ou instalações e construções vizinhas advindas do serviço de execução de estacas, bem como a contratação de eventual Seguro da Obra.</Text>
        <Text style={styles.textoNormal}>2. A CONTRATANTE deverá garantir que nenhuma estaca tenha sido deixada de executar devido a erros de locação.</Text>
        <Text style={styles.textoNormal}>3. Cabe à CONTRATANTE informar de antemão qualquer regra e/ou documentação necessária para a entrada, permanência e execução dos trabalhos.</Text>
        <Text style={styles.textoNormal}>4. A CONTRATANTE se responsabilizará pela limpeza de todo o material escavado decorrente da execução das estacas.</Text>
        <Text style={styles.textoNormal}>5. Fornecimento e controle tecnológico do concreto usinado (FCK 30 MPa, Slump 230 ± 20 mm, brita zero, consumo mínimo 350 kg cimento/m³).</Text>
        <Text style={styles.textoNormal}>6. Fornecimento de bomba para concreto com rendimento mínimo de 34 m³/h.</Text>
        <Text style={styles.textoNormal}>7. O terreno deverá estar nivelado, seco e preparado para suportar o equipamento.</Text>
        <Text style={styles.textoNormal}>8. Fornecimento de um ponto de água potável no local para lavagem do equipamento.</Text>
        <Text style={styles.textoNormal}>9. Fornecimento de instalações sanitárias.</Text>
        <Text style={styles.textoNormal}>10. Locação e determinação da profundidade das estacas de acordo com o projeto de fundações.</Text>
        <Text style={styles.textoNormal}>11. Fornecimento de dois sacos de cimento por dia para lubrificação da bomba.</Text>
      </View>
    );
  };

  const getObrigacoesContratada = () => {
    if (proposta?.textoObrigacoesContratada?.trim()) {
      return <Text style={styles.textoNormal}>{proposta.textoObrigacoesContratada}</Text>;
    }
    return (
      <View>
        <Text style={styles.textoNormal}>1. Fornecimento de mão de obra especializada em fundações, incluindo operador e equipe.</Text>
        <Text style={styles.textoNormal}>2. Fornecimento de todos os equipamentos necessários à perfeita realização dos serviços.</Text>
        <Text style={styles.textoNormal}>3. Fornecimento de EPIs (Equipamentos de Proteção Individual).</Text>
        <Text style={styles.textoNormal}>4. Manter a obra em bom estado de limpeza.</Text>
        <Text style={styles.textoNormal}>5. Obedecer e cumprir a legislação trabalhista vigente.</Text>
        <Text style={styles.textoNormal}>6. Dar andamento normal à execução dos serviços, tomando providências para evitar acidentes.</Text>
        <Text style={styles.textoNormal}>7. Fornecimento de todos os materiais necessários à proteção dos funcionários.</Text>
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* 1. CABEÇALHO */}
        {empresa?.logoUrl && (
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <Image src={empresa.logoUrl} style={{ height: 50 }} />
          </View>
        )}

        <Text style={styles.titulo}>PROPOSTA DE PRESTAÇÃO DE SERVIÇO DE ESTACAS TIPO</Text>
        <Text style={[styles.titulo, { fontSize: 10, marginBottom: 15 }]}>
          {tiposEstacaUnicos || 'FUNDAÇÕES'}
        </Text>

        <Text style={styles.cityDateRow}>
          Socorro/SP, {dataEmissaoExtenso}
        </Text>

        <View style={{ marginBottom: 15 }}>
          <Text style={styles.textoBold}>
            AO SENHOR(A):{' '}
            <Text style={styles.textoNormal}>{cliente?.nomeRazaoSocial || 'Não informado'}</Text>
          </Text>
          {cliente?.documento && (
            <Text style={[styles.textoBold, { marginTop: 2 }]}>
              CPF/CNPJ:{' '}
              <Text style={styles.textoNormal}>{cliente.documento}</Text>
            </Text>
          )}
          <Text style={styles.textoBold}>
            ENDEREÇO:{' '}
            <Text style={styles.textoNormal}>{cliente?.enderecoFaturamento || 'Não informado'}</Text>
          </Text>
          <Text style={[styles.textoBold, { marginTop: 10 }]}>
            PROPOSTA N.:{' '}
            <Text style={styles.textoNormal}>
              {proposta?.id?.toUpperCase() || 'NOVO'}
            </Text>
          </Text>
          <Text style={styles.textoBold}>
            VALIDADE:{' '}
            <Text style={styles.textoNormal}>{proposta?.validadeDias || 15} DIAS</Text>
          </Text>
        </View>

        {/* 2. ESPECIFICAÇÕES TÉCNICAS */}
        <Text style={styles.secaoTitulo}>DAS ESPECIFICAÇÕES TÉCNICAS</Text>
        <Text style={[styles.textoNormal, { marginBottom: 6 }]}>
          Prezado(a), conforme solicitado, segue orçamento para execução das estacas do tipo{' '}
          {tiposEstacaUnicos || 'FUNDAÇÕES'}.
        </Text>
        {servicos.map((s, i) => (
          <View key={i} style={{ marginBottom: 4 }}>
            <Text style={styles.textoBold}>ESTACAS {s?.tipoEstaca || ''}:</Text>
            <Text style={styles.textoNormal}>
              Estacas d= Ø{s?.diametro || 'N/D'}, comprimento previsto:{' '}
              {s?.quantidade || 0} estacas × {s?.metragemPrevista || 0} m ={' '}
              {formatMeters((s?.quantidade || 0) * (s?.metragemPrevista || 0))}
            </Text>
          </View>
        ))}
        <Text style={[styles.textoBold, { marginTop: 4 }]}>
          METRAGEM TOTAL: {formatMeters(totalMetros)}
        </Text>

        {/* 3. PRAZO */}
        <Text style={[styles.secaoTitulo, { marginTop: 15 }]}>PRAZO DE EXECUÇÃO E INÍCIO DA OBRA</Text>
        <Text style={styles.textoNormal}>
          Levando em conta o quantitativo apresentado, o prazo para a execução desta referida obra será
          de {proposta?.prazoExecucao || 2} dia(s) útil(is) trabalhado(s). A data de início da
          prestação de serviços fica a combinar.
        </Text>
        <View style={styles.separador} />

        {/* 4. TABELA DE VALORES */}
        <Text style={[styles.titulo, { fontSize: 10, textAlign: 'left', marginTop: 8 }]}>
          VALORES TOTAIS PARA PRESTAÇÃO DO SERVIÇO
        </Text>
        <View style={{ marginTop: 8 }}>
          <View style={styles.tabelaHeader}>
            <Text style={[styles.textoBold, { flex: 3 }]}>Descrição</Text>
            <Text style={[styles.textoBold, { flex: 1, textAlign: 'right' }]}>Valor</Text>
          </View>

          {servicos.map((s, i) => {
            const rowTotal = (s?.quantidade || 0) * (s?.metragemPrevista || 0) * (s?.precoMetro || 0);
            return (
              <View key={i} style={styles.tabelaLinha}>
                <Text style={[styles.textoNormal, { flex: 3 }]}>
                  {s?.quantidade || 0} estacas Ø{s?.diametro || 'N/D'} ×{' '}
                  {s?.metragemPrevista || 0} m × {formatCurrency(s?.precoMetro || 0)}/m
                </Text>
                <Text style={[styles.textoNormal, { flex: 1, textAlign: 'right' }]}>
                  {formatCurrency(rowTotal)}
                </Text>
              </View>
            );
          })}

          {(proposta?.mobilizacao || 0) > 0 && (
            <View style={styles.tabelaLinha}>
              <Text style={[styles.textoNormal, { flex: 3 }]}>Mobilização e desmobilização do equipamento</Text>
              <Text style={[styles.textoNormal, { flex: 1, textAlign: 'right' }]}>
                {formatCurrency(proposta?.mobilizacao || 0)}
              </Text>
            </View>
          )}

          {proposta?.solicitaART && (proposta?.valorART || 0) > 0 && (
            <View style={styles.tabelaLinha}>
              <Text style={[styles.textoNormal, { flex: 3 }]}>ART — Anotação de Responsabilidade Técnica</Text>
              <Text style={[styles.textoNormal, { flex: 1, textAlign: 'right' }]}>
                {formatCurrency(proposta?.valorART || 0)}
              </Text>
            </View>
          )}

          <View style={styles.totalLinha}>
            <Text style={[styles.textoBold, { flex: 3 }]}>VALOR TOTAL</Text>
            <Text style={[styles.textoBold, { flex: 1, textAlign: 'right' }]}>
              {formatCurrency(proposta?.valorTotal || 0)}
            </Text>
          </View>
          <Text style={[styles.textoNormal, { fontSize: 8, color: '#64748b', marginTop: 4 }]}>
            * {valorTotalExtenso}
          </Text>
          <Text style={[styles.textoNormal, { fontSize: 8, color: '#64748b' }]}>
            ** O mesmo podendo se alterar dependendo das situações encontradas em obra durante a execução.
          </Text>
        </View>

        {/* 5. CONDIÇÕES DE PAGAMENTO */}
        <Text style={[styles.secaoTitulo, { marginTop: 15 }]}>CONDIÇÕES DE PAGAMENTO</Text>
        <Text style={styles.textoNormal}>
          • Sinal de {proposta?.sinalPercentual || 50}%:{' '}
          {formatCurrency(((proposta?.sinalPercentual || 50) / 100) * (proposta?.valorTotal || 0))},
          3 dias após a assinatura do contrato.
        </Text>
        <Text style={styles.textoNormal}>
          • Saldo restante:{' '}
          {formatCurrency((1 - (proposta?.sinalPercentual || 50) / 100) * (proposta?.valorTotal || 0))},
          {proposta?.prazoSaldoDias
            ? ` ${proposta.prazoSaldoDias} dias após a entrega da medição.`
            : ' 7 dias após a entrega da medição.'}
        </Text>

        {proposta?.parcelas && proposta.parcelas.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <View style={styles.tabelaHeader}>
              <Text style={[styles.textoBold, { flex: 2 }]}>Parcela</Text>
              <Text style={[styles.textoBold, { flex: 1, textAlign: 'center' }]}>Prazo</Text>
              <Text style={[styles.textoBold, { flex: 1, textAlign: 'right' }]}>Valor</Text>
            </View>
            {proposta.parcelas
              .filter(p => p?.descricao && p.descricao !== 'Nova Parcela') // remove parcelas em branco
              .map((p, i) => {
                // Calcula o valor em reais a partir do percentual (campo que o wizard sempre salva)
                const valorParcela = p?.valor && p.valor > 0
                  ? p.valor
                  : ((p?.percentual || 0) / 100) * (proposta?.valorTotal || 0);
                
                return (
                  <View key={i} style={styles.tabelaLinha}>
                    <Text style={[styles.textoNormal, { flex: 2 }]}>
                      {p?.descricao || `${i + 1}ª Parcela`}
                    </Text>
                    <Text style={[styles.textoNormal, { flex: 1, textAlign: 'center' }]}>
                      {p?.prazo || p?.dias ? `${p.prazo || p.dias} dias` : '—'}
                    </Text>
                    <Text style={[styles.textoNormal, { flex: 1, textAlign: 'right' }]}>
                      {formatCurrency(valorParcela)}
                    </Text>
                  </View>
                );
              })
            }
          </View>
        )}

        {/* Checkboxes NF / ART */}
        <View style={{ marginTop: 10 }}>
          <View style={styles.checkboxLinha}>
            <View style={styles.checkbox}>
              <Text style={{ fontSize: 8 }}>{proposta?.solicitaNF ? 'X' : ' '}</Text>
            </View>
            <Text style={styles.textoNormal}>
              Solicito a emissão da Nota Fiscal
              {proposta?.solicitaNF && proposta?.impostoNF
                ? ` (acrescentar ${proposta.impostoNF}% no valor)`
                : ''}
            </Text>
          </View>
          <View style={styles.checkboxLinha}>
            <View style={styles.checkbox}>
              <Text style={{ fontSize: 8 }}>{!proposta?.solicitaNF ? 'X' : ' '}</Text>
            </View>
            <Text style={styles.textoNormal}>Não solicito a emissão da Nota Fiscal</Text>
          </View>
          <View style={[styles.checkboxLinha, { marginTop: 6 }]}>
            <View style={styles.checkbox}>
              <Text style={{ fontSize: 8 }}>{proposta?.solicitaART ? 'X' : ' '}</Text>
            </View>
            <Text style={styles.textoNormal}>
              Solicito a emissão da ART (taxa de emissão no valor de{' '}
              {formatCurrency(proposta?.valorART || 0)})
            </Text>
          </View>
          <View style={styles.checkboxLinha}>
            <View style={styles.checkbox}>
              <Text style={{ fontSize: 8 }}>{!proposta?.solicitaART ? 'X' : ' '}</Text>
            </View>
            <Text style={styles.textoNormal}>Não solicito a emissão da ART</Text>
          </View>
        </View>

        {/* 6. DAS COBRANÇAS E FATURAMENTO MÍNIMO */}
        <Text style={[styles.secaoTitulo, { marginTop: 15 }]}>DAS COBRANÇAS E FATURAMENTO MÍNIMO</Text>
        {proposta?.textoCondicoesCobranca?.trim() ? (
            <Text style={styles.textoNormal}>{proposta.textoCondicoesCobranca}</Text>
        ) : (
          <View>
            <Text style={styles.textoNormal}>
              ESTA PRESTAÇÃO DE SERVIÇOS CONTEMPLA O FATURAMENTO MÍNIMO DA DIÁRIA DE{' '}
              {formatCurrency(proposta?.faturamentoMinimo || 0)}, QUE SERÁ APLICADO NAS SEGUINTES CONDIÇÕES:
            </Text>
            <Text style={styles.textoNormal}>1. O faturamento mínimo será cobrado em todos os eventos que não decorram de responsabilidade da contratada, incluindo ineficiência no fornecimento de concreto, quebra de bomba, entupimento, atraso por falta de locação, horários restritos em condomínios e fábricas, dificuldades de perfuração advindas do terreno (entulho, matacões, estruturas de construções anteriores), entre outros.</Text>
            <Text style={styles.textoNormal}>2. Ficará isento do pagamento do faturamento mínimo por questões climáticas.</Text>
            <Text style={styles.textoNormal}>3. Ficará isento do pagamento do faturamento mínimo caso haja problemas com o equipamento de perfuração.</Text>
            {(proposta?.taxaAgua || 0) > 0 && (
              <Text style={styles.textoNormal}>
                4. Se atingido o nível d'água, será cobrado um adicional de{' '}
                {formatCurrency(proposta?.taxaAgua || 0)} por estaca.
              </Text>
            )}
            {(proposta?.horaParada || 0) > 0 && (
              <Text style={styles.textoNormal}>
                5. Pelo equipamento ficar parado por responsabilidade da CONTRATANTE, será cobrado{' '}
                {formatCurrency(proposta?.horaParada || 0)} ({horaParadaExtenso}) por hora de perfuratriz inoperante.
              </Text>
            )}
          </View>
        )}

        {/* 7. OBRIGAÇÕES DA CONTRATANTE */}
        <Text style={[styles.secaoTitulo, { marginTop: 15 }]}>OBRIGAÇÕES DA CONTRATANTE</Text>
        {getObrigacoesContratante()}

        {/* 8. OBRIGAÇÕES DA CONTRATADA */}
        <Text style={[styles.secaoTitulo, { marginTop: 15 }]}>OBRIGAÇÕES DA CONTRATADA</Text>
        {getObrigacoesContratada()}

        {/* 9. DOS DIREITOS */}
        <Text style={[styles.secaoTitulo, { marginTop: 15 }]}>DOS DIREITOS</Text>
        {proposta?.textoDireitosRisco?.trim() ? (
            <Text style={styles.textoNormal}>{proposta.textoDireitosRisco}</Text>
        ) : (
          <View>
            <Text style={styles.textoNormal}>1. Reservamo-nos o direito de rescisão deste contrato se na execução dos trabalhos for encontrado matacão ou rochas que impeçam a perfuração normal.</Text>
            <Text style={styles.textoNormal}>2. As propostas aprovadas estão sujeitas à programação de disponibilidade de perfuratriz e equipe.</Text>
            <Text style={styles.textoNormal}>3. O comprimento mínimo cobrado por estaca é de 5,00 m.</Text>
            <Text style={styles.textoNormal}>4. O dia trabalhado será considerado das 7h às 17h, com pausa de 1h para almoço (segunda a sexta-feira). Produção fora deste horário ou aos sábados terá acréscimo de 30% sobre o valor contratado.</Text>
            <Text style={styles.textoNormal}>5. A mobilização será cobrada cada vez que houver mobilização e desmobilização do equipamento.</Text>
          </View>
        )}

      </Page>

      {/* ÚLTIMA PÁGINA — Termo de Aceite */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.secaoTitulo, { marginTop: 0 }]}>TERMO DE ACEITAÇÃO DA PROPOSTA</Text>

        {proposta?.textoTermoAceite?.trim() ? (
          <Text style={styles.textoNormal}>{proposta.textoTermoAceite}</Text>
        ) : (
          <Text style={styles.textoNormal}>
            Ao assinar este documento, o CONTRATANTE declara estar de acordo com as especificações
            técnicas, prazos, responsabilidades e condições financeiras descritas nesta proposta,
            autorizando a ESTEMCO a iniciar o planejamento e mobilização para a execução da obra.
            Esta proposta passará a vigorar como contrato de prestação de serviços para todos os fins
            legais após a assinatura de ambas as partes.
          </Text>
        )}

        <Text style={styles.textoBold}>
          Proposta n.{' '}
          <Text style={styles.textoNormal}>
            {proposta?.id?.toUpperCase() || 'XXX'}
          </Text>{' '}
          emitida em{' '}
          <Text style={styles.textoNormal}>
            {formatDateSimple(proposta?.dataEmissao || new Date().toISOString())}
          </Text>
        </Text>

        <View style={{ marginTop: 15 }}>
          <Text style={styles.textoBold}>RAZÃO SOCIAL: ____________________________________________________________________</Text>
          <Text style={styles.textoBold}>CNPJ/CPF: ____________________________________________________________________</Text>
          <Text style={styles.textoBold}>INSCRIÇÃO ESTADUAL: ____________________________________________________________________</Text>
          <Text style={styles.textoBold}>ENDEREÇO DA OBRA: ____________________________________________________________________</Text>
          <Text style={styles.textoBold}>ENDEREÇO DE COBRANÇA: ____________________________________________________________________</Text>
          <Text style={styles.textoBold}>NOME DO RESPONSÁVEL: ____________________________________________________________________</Text>
        </View>

        <Text style={[styles.cityDateRow, { marginTop: 30 }]}>
          Socorro/SP, {dataEmissaoExtenso}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 }}>
          <View style={{ alignItems: 'center', width: '45%' }}>
            <View style={{
              borderBottomWidth: 1,
              borderBottomStyle: 'solid',
              borderBottomColor: '#374151',
              width: '100%',
              marginBottom: 4,
            }} />
            <Text style={styles.textoBold}>ASSINATURA DO RESPONSÁVEL</Text>
            <Text style={styles.textoNormal}>(CONTRATANTE)</Text>
          </View>
          <View style={{ alignItems: 'center', width: '45%' }}>
            <View style={{
              borderBottomWidth: 1,
              borderBottomStyle: 'solid',
              borderBottomColor: '#374151',
              width: '100%',
              marginBottom: 4,
            }} />
            <Text style={styles.textoBold}>Atenciosamente</Text>
            <Text style={styles.textoNormal}>Estemco Engenharia em Fundações S/S Ltda.</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
};

export default ProposalPDF;
