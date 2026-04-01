// src/services/pdfService.tsx
// CORREÇÕES:
// 1. borderLeft/borderBottom shorthand → propriedades separadas com borderStyle:'solid'
// 2. Número da proposta usa o campo `numero` (ex: "5014-HCM"), não data
// 3. CPF/CNPJ com máscara formatada
// 4. Endereço sem vírgula inicial quando logradouro está vazio
// 5. Descrição de item usa tipo real ("Estaca HCM Ø40cm"), não "Peça de fundação"
// 6. Prazo vem do campo preenchido pelo usuário, não hardcoded "30"

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, pdf } from '@react-pdf/renderer';
import { NovaPropostaData } from '../types/propostaForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileDown } from 'lucide-react';
import { calcularPropostaHCM, calcularPropostaESC, calcularPropostaSPT } from '../utils/calculosProposta';
import { ItemProposta, ItemFuroSPT } from '../../types';
import { buildPropostaText, buildTemplateVars, getFallbackTemplateText } from './templateService';
import { montarNomeArquivoProposta } from '../utils/formatters';
import { DadosEmpresa } from '../hooks/useEmpresa';

// ── Formatadores ────────────────────────────────────────────────────────────
const formatCurrency = (valor: number | undefined | null) => {
    if (valor === undefined || valor === null || isNaN(valor)) return 'R$ 0,00';
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor); }
    catch { return 'R$ 0,00'; }
};

const formatMeters = (valor: number | undefined | null) => {
    if (valor === undefined || valor === null || isNaN(valor)) return '0,00 m';
    try { return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' m'; }
    catch { return '0,00 m'; }
};

// ── Formatação de CPF/CNPJ ──────────────────────────────────────────────────
const formatDocumento = (doc: string | undefined): string => {
    if (!doc) return '';
    const digits = doc.replace(/\D/g, '');
    if (digits.length === 11) {
        return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (digits.length === 14) {
        return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
};

const safeFormatDate = (date: any, formatStr: string) => {
    if (!date) return 'A combinar';
    try {
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return 'A combinar';
        return format(d, formatStr, { locale: ptBR });
    } catch { return 'A combinar'; }
};

// ── Descrição do item por tipo ──────────────────────────────────────────────
const descricaoItem = (item: any, tipo: string): string => {
    const diametroMm = item?.diametro || 0;
    const diametroCm = diametroMm / 10;
    if (tipo === 'HCM') return `Estaca Hélice Contínua Monitorada Ø${diametroCm}cm`;
    if (tipo === 'ESC') return `Estaca Escavada Ø${diametroCm}cm`;
    if (tipo === 'SPT') return `Furo de Sondagem SPT nº${item?.numeroFuro || 1}`;
    return `Estaca Ø${diametroCm}cm`;
};

// ── Estilos — TODOS com borderStyle:'solid' explícito ───────────────────────
const styles = StyleSheet.create({
    page: {
        paddingTop: 30,
        paddingBottom: 60,
        paddingHorizontal: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
        color: '#1e293b',
    },
    header: {
        marginBottom: 20,
    },
    companyTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1e1b4b' },
    companyContact: { fontSize: 7, color: '#64748b', marginTop: 4, lineHeight: 1.4 },
    docInfo: { textAlign: 'right', flexWrap: 'wrap' },
    docTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1e1b4b' },
    metaText: { fontSize: 8, color: '#64748b', marginTop: 2 },
    section: { marginBottom: 15 },
    sectionHeader: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        backgroundColor: '#f1f5f9',
        padding: 5,
        color: '#1e1b4b',
        textTransform: 'uppercase',
        borderLeftWidth: 4,
        borderLeftStyle: 'solid',
        borderLeftColor: '#1e1b4b',
        marginBottom: 8,
    },
    row: { flexDirection: 'row', marginBottom: 4 },
    label: { fontFamily: 'Helvetica-Bold', width: 80, fontSize: 9, color: '#475569' },
    value: { flex: 1, fontSize: 9 },
    table: {
        width: '100%',
        marginTop: 10,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: '#e2e8f0',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomStyle: 'solid',
        borderBottomColor: '#e2e8f0',
        minHeight: 28,
        alignItems: 'center',
    },
    tableHeader: {
        backgroundColor: '#1e1b4b',
    },
    tableCol: { padding: 6, flex: 1 },
    tableCell: { fontSize: 9, color: '#1e293b' },
    tableCellHeader: { fontSize: 9, color: '#ffffff', fontFamily: 'Helvetica-Bold' },
    textCenter: { textAlign: 'center' },
    textRight: { textAlign: 'right' },
    totalRow: {
        flexDirection: 'row',
        borderTopWidth: 2,
        borderTopStyle: 'solid',
        borderTopColor: '#1e1b4b',
        paddingVertical: 6,
        paddingHorizontal: 4,
        marginTop: 2,
    },
    investmentCard: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: '#e2e8f0',
        borderRadius: 4,
        padding: 8,
        marginBottom: 6,
    },
    investmentLabel: { fontSize: 7, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
    investmentValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1e1b4b', marginTop: 2 },
    investmentValueRed: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#dc2626', marginTop: 2 },
    investmentValueGreen: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#059669' },
    separator: {
        borderBottomWidth: 1,
        borderBottomStyle: 'solid',
        borderBottomColor: '#e2e8f0',
        marginVertical: 8,
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomStyle: 'solid',
        borderBottomColor: '#f1f5f9',
    },
    paymentLabel: { fontFamily: 'Helvetica-Bold', fontSize: 9 },
    paymentValue: { fontSize: 9, color: '#475569', textAlign: 'right', flex: 1 },
    termContainer: {
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: '#e2e8f0',
        borderRadius: 4,
        padding: 12,
        marginTop: 10,
    },
    signatureContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 40 },
    signatureBox: { alignItems: 'center', width: 200 },
    signatureLine: {
        width: '100%',
        borderTopWidth: 1,
        borderTopStyle: 'solid',
        borderTopColor: '#000',
        marginBottom: 5,
    },
    signatureLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
    signatureSub: { fontSize: 7, color: '#64748b', marginTop: 2 },
    acceptanceTitle: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'center',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    acceptanceText: { fontSize: 8, lineHeight: 1.5, color: '#475569', textAlign: 'center', fontStyle: 'italic' },
});

// ── Estilos da Capa ──────────────────────────────────────────────────────────
const capaStyles = StyleSheet.create({
    capaPage: {
        backgroundColor: '#1e1b4b',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 0,
    },
    capaTopStripe: {
        backgroundColor: '#312e81',
        paddingHorizontal: 50,
        paddingVertical: 40,
    },
    capaLogoArea: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    capaLogoBox: {
        width: 48,
        height: 48,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    capaLogoText: {
        fontSize: 20,
        fontFamily: 'Helvetica-Bold',
        color: '#1e1b4b',
        textAlign: 'center',
        marginTop: 8,
    },
    capaEmpresaNome: {
        fontSize: 22,
        fontFamily: 'Helvetica-Bold',
        color: '#ffffff',
    },
    capaEmpresaSub: {
        fontSize: 10,
        color: '#a5b4fc',
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    capaBody: {
        flex: 1,
        paddingHorizontal: 50,
        paddingVertical: 50,
        justifyContent: 'center',
    },
    capaDocType: {
        fontSize: 11,
        color: '#818cf8',
        textTransform: 'uppercase',
        letterSpacing: 3,
        marginBottom: 12,
    },
    capaTituloServico: {
        fontSize: 28,
        fontFamily: 'Helvetica-Bold',
        color: '#ffffff',
        lineHeight: 1.3,
        marginBottom: 30,
    },
    capaDivider: {
        width: 60,
        height: 4,
        backgroundColor: '#818cf8',
        marginBottom: 30,
    },
    capaClienteLabel: {
        fontSize: 9,
        color: '#818cf8',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 6,
    },
    capaClienteNome: {
        fontSize: 20,
        fontFamily: 'Helvetica-Bold',
        color: '#ffffff',
        marginBottom: 8,
    },
    capaObraLinha: {
        fontSize: 10,
        color: '#c7d2fe',
        marginBottom: 4,
    },
    capaValorBox: {
        marginTop: 40,
        backgroundColor: '#4f46e5',
        borderRadius: 8,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    capaValorLabel: {
        fontSize: 10,
        color: '#c7d2fe',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    capaValorNumero: {
        fontSize: 28,
        fontFamily: 'Helvetica-Bold',
        color: '#34d399',
        marginTop: 4,
    },
    capaValorMeta: {
        fontSize: 9,
        color: '#a5b4fc',
        textAlign: 'right',
    },
    capaFooter: {
        backgroundColor: '#0f0e24',
        paddingHorizontal: 50,
        paddingVertical: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    capaFooterLeft: {
        fontSize: 8,
        color: '#6366f1',
    },
    capaFooterRight: {
        fontSize: 8,
        color: '#6366f1',
        textAlign: 'right',
    },
    capaNumero: {
        fontSize: 11,
        color: '#c7d2fe',
        fontFamily: 'Helvetica-Bold',
        textAlign: 'right',
        marginBottom: 4,
    },
});

// ── Página de Capa ───────────────────────────────────────────────────────────
const PropostaCapa: React.FC<{ data: NovaPropostaData; calc: any; empresa?: DadosEmpresa; numeroDoc: string }> = ({ data, calc, empresa, numeroDoc }) => {
    const tipoCompleto = {
        HCM: 'Hélice Contínua\nMonitorada',
        ESC: 'Estaca Escavada\nMecanicamente',
        SPT: 'Sondagem de\nReconhecimento SPT',
    }[data?.tipo || 'HCM'] || 'Fundação Especial';

    const dataEmissao = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const endObra = [data?.enderecoObra?.cidade, data?.enderecoObra?.estado].filter(Boolean).join(' / ');

    return (
        <Page size="A4" style={capaStyles.capaPage}>
            {/* Topo */}
            <View style={capaStyles.capaTopStripe}>
                <View style={capaStyles.capaLogoArea}>
                    <View style={capaStyles.capaLogoBox}>
                        <Text style={capaStyles.capaLogoText}>E</Text>
                    </View>
                    <View>
                        <Text style={capaStyles.capaEmpresaNome}>{empresa?.razaoSocial || 'ESTEMCO'}</Text>
                        <Text style={capaStyles.capaEmpresaSub}>Engenharia em Fundações</Text>
                    </View>
                </View>
            </View>

            {/* Corpo */}
            <View style={capaStyles.capaBody}>
                <Text style={capaStyles.capaDocType}>Proposta Comercial</Text>
                <Text style={capaStyles.capaTituloServico}>{tipoCompleto}</Text>
                <View style={capaStyles.capaDivider} />

                <Text style={capaStyles.capaClienteLabel}>Apresentado a</Text>
                <Text style={capaStyles.capaClienteNome}>{data?.clienteNome || '—'}</Text>
                {endObra ? <Text style={capaStyles.capaObraLinha}>Obra: {endObra}</Text> : null}
                {data?.enderecoObra?.logradouro ? (
                    <Text style={capaStyles.capaObraLinha}>{data.enderecoObra.logradouro}{data.enderecoObra.numero ? `, nº ${data.enderecoObra.numero}` : ''}</Text>
                ) : null}

                {/* Card de Valor */}
                <View style={capaStyles.capaValorBox}>
                    <View>
                        <Text style={capaStyles.capaValorLabel}>Investimento Total Estimado</Text>
                        <Text style={capaStyles.capaValorNumero}>{formatCurrency(calc?.valorTotal || 0)}</Text>
                    </View>
                    <View>
                        <Text style={capaStyles.capaNumero}>Nº {numeroDoc}</Text>
                        <Text style={capaStyles.capaValorMeta}>Válida por {data?.validadeProposta || 15} dias</Text>
                        <Text style={capaStyles.capaValorMeta}>Emitida em {format(new Date(), 'dd/MM/yyyy')}</Text>
                    </View>
                </View>
            </View>

            {/* Rodapé */}
            <View style={capaStyles.capaFooter}>
                <View>
                    <Text style={capaStyles.capaFooterLeft}>{empresa?.endereco || 'Rod. Capitão Barduíno, Km 131 - Socorro/SP'}</Text>
                    <Text style={capaStyles.capaFooterLeft}>Tel: {empresa?.telefone || '(19) 3895-2630'} | {empresa?.email || 'contato@estemco.com.br'}</Text>
                </View>
                <Text style={capaStyles.capaFooterRight}>CNPJ: {empresa?.cnpj || '57.486.102/0001-86'}</Text>
            </View>
        </Page>
    );
};

// ── Componente Principal ────────────────────────────────────────────────────
interface PDFProps { data: NovaPropostaData; templateText?: string; tenantId?: string; empresa?: DadosEmpresa; }

const PropostaDocument: React.FC<PDFProps> = ({ data, templateText, tenantId, empresa }) => {
    let calc: any = { linhasDetalhadas: [], valorTotal: 0, valorMobilizacao: 0, valorART: 0, valorImposto: 0, subtotalExecucao: 0 };

    const itensNormalizados = data.itens || (data as any).itensHCM || (data as any).itensESC || (data as any).itensSPT || [];

    const mobilizacaoNorm = data.mobilizacao
        || (data as any).mobilizacaoHCM
        || (data as any).mobilizacaoESC
        || (data as any).mobilizacaoSPT
        || 0;

    try {
        if (data?.tipo === 'HCM') calc = calcularPropostaHCM(itensNormalizados as ItemProposta[], mobilizacaoNorm, data.faturamentoMinimo, data.incluirART, data.valorART || 0, data.emiteNotaFiscal, data.percentualImposto || 0);
        if (data?.tipo === 'ESC') calc = calcularPropostaESC(itensNormalizados as ItemProposta[], mobilizacaoNorm, data.modalidadeESC || 'por_metro', data.precoFechadoESC, data.metrosDiariosESC, data.precoExcedenteESC, data.faturamentoMinimo, data.incluirART, data.valorART || 0, data.emiteNotaFiscal, data.percentualImposto || 0);
        if (data?.tipo === 'SPT') calc = calcularPropostaSPT(itensNormalizados as ItemFuroSPT[], mobilizacaoNorm, data.incluirART, data.valorART || 0, data.emiteNotaFiscal, data.percentualImposto || 0);
    } catch (e) { console.error('Erro no cálculo do PDF:', e); }

    const totalMetros = (itensNormalizados ?? []).reduce(
        (acc: number, item: any) => acc + (
            item?.totalMetros || 
            item?.profundidade || 
            ((item?.quantidadeEstacas || 1) * (item?.comprimentoUnitario || 0))
        ), 0
    );
    const tipoTexto = data?.tipo === 'HCM' ? 'HÉLICE CONTÍNUA MONITORADA' : data?.tipo === 'ESC' ? 'ESTACA ESCAVADA' : 'SPT (SONDAGEM)';
    const dataEmissao = safeFormatDate(new Date(), 'dd/MM/yyyy');

    // Número da proposta — usa o campo gerado, nunca a data
    const numeroDoc = (data as any)?.numero || `${data?.tipo || 'ORÇ'}-RASCUNHO`;

    const tituloProposta = {
        HCM: 'PROPOSTA DE PRESTAÇÃO DE SERVIÇOS DE HÉLICE CONTÍNUA MONITORADA',
        ESC: 'PROPOSTA DE PRESTAÇÃO DE SERVIÇO DE ESTACAS TIPO ESCAVADA MECANICAMENTE',
        SPT: 'PROPOSTA PARA EXECUÇÃO DO SERVIÇO DE SONDAGEM DE SIMPLES RECONHECIMENTO DE SOLO SPT',
    }[data?.tipo || 'HCM'];

    // Endereço sem vírgula inicial
    const enderecoPartes = [
        data?.enderecoObra?.logradouro,
        data?.enderecoObra?.numero ? `nº ${data.enderecoObra.numero}` : null,
        data?.enderecoObra?.bairro,
    ].filter(Boolean);
    const cidadeEstado = [data?.enderecoObra?.cidade, data?.enderecoObra?.estado].filter(Boolean).join('/');
    const enderecoLinha1 = enderecoPartes.length > 0 ? enderecoPartes.join(', ') : cidadeEstado;
    const enderecoLinha2 = enderecoPartes.length > 0 ? cidadeEstado : '';

    // CPF/CNPJ formatado
    const docFormatado = formatDocumento((data as any)?.clienteDocumento || '');

    // Condições de pagamento
    const parcelas = data?.condicoesPagamento || [];

    return (
        <Document title={`Proposta ${numeroDoc} — ${data?.clienteNome || ''}`}>
            <PropostaCapa data={data} calc={calc} empresa={empresa} numeroDoc={numeroDoc} />
            <Page size="A4" style={styles.page}>

                {/* CABEÇALHO */}
                <View style={styles.header} fixed>
                  {/* Linha 1: empresa (esquerda) + número/data (direita) */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View>
                        <Text style={styles.companyTitle}>{empresa?.razaoSocial || 'ESTEMCO - ENGENHARIA EM FUNDAÇÕES'}</Text>
                        <Text style={styles.companyContact}>
                            {empresa?.endereco || 'Rod. Capitão Barduíno, Km 131 - Margem da SP 008 - Socorro/SP'}{"\n"}
                            Tel: {empresa?.telefone || '(19) 3895-2630'}{empresa?.whatsapp ? ` / WhatsApp: ${empresa.whatsapp}` : ''} | {empresa?.email || 'contato@estemco.com.br'}{"\n"}
                            CNPJ: {empresa?.cnpj || '57.486.102/0001-86'}
                        </Text>
                    </View>
                    <View style={{ textAlign: 'right' }}>
                        <Text style={styles.metaText}>Nº {numeroDoc}</Text>
                        <Text style={styles.metaText}>Emitida em: {dataEmissao}</Text>
                        <Text style={styles.metaText}>Validade: {data?.validadeProposta || 15} dias</Text>
                    </View>
                  </View>
                  {/* Linha 2: título centralizado */}
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center', color: '#1e1b4b', borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: '#1e1b4b', paddingBottom: 4 }}>
                    {tituloProposta}
                  </Text>
                </View>

                {/* IDENTIFICAÇÃO */}
                {data?.tipo === 'SPT' ? (
                  <View style={styles.section}>
                    <Text style={{ fontSize: 9, marginBottom: 12, color: '#64748b' }}>
                      Socorro/SP, {dataEmissao}.
                    </Text>
                    <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>À</Text>
                    <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>{data?.clienteNome?.toUpperCase()}</Text>
                    <Text style={{ fontSize: 9, marginBottom: 12 }}>
                      {[data?.enderecoObra?.logradouro, data?.enderecoObra?.bairro, `${data?.enderecoObra?.cidade}-${data?.enderecoObra?.estado}`].filter(Boolean).join(' – ')}
                    </Text>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', fontStyle: 'italic', marginBottom: 8 }}>
                      REF. PROPOSTA PARA EXECUÇÃO DO SERVIÇO DE SONDAGEM DE SIMPLES RECONHECIMENTO DE SOLO SPT (Nº{numeroDoc}).
                    </Text>
                  </View>
                ) : (
                  <View style={styles.section}>
                      <Text style={styles.sectionHeader}>
                          I. Proposta de Prestação de Serviço de {tipoTexto}
                      </Text>
                      <View style={styles.row}>
                          <Text style={styles.label}>CLIENTE:</Text>
                          <Text style={styles.value}>
                              {data?.clienteNome || '—'}
                              {docFormatado ? `   CPF/CNPJ: ${docFormatado}` : ''}
                          </Text>
                      </View>
                      <View style={styles.row}>
                          <Text style={styles.label}>LOCAL:</Text>
                          <Text style={styles.value}>
                              {enderecoLinha1}{enderecoLinha2 ? `\n${enderecoLinha2}` : ''}
                              {data?.enderecoObra?.cep ? `   CEP: ${data.enderecoObra.cep}` : ''}
                          </Text>
                      </View>
                  </View>
                )}

                {/* ESPECIFICAÇÕES TÉCNICAS */}
                {/* ESPECIFICAÇÕES TÉCNICAS */}
                {data?.tipo === 'SPT' ? (
                  <View style={styles.section}>
                    <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 8 }}>
                      Quantidade de furos – {itensNormalizados.length} unidades
                    </Text>
                    <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center' }}>
                      Sendo estimados aproximadamente {(totalMetros / Math.max(itensNormalizados.length, 1)).toFixed(2)} metros para cada furo = {totalMetros.toFixed(2)} metros
                    </Text>
                  </View>
                ) : (
                  <View style={styles.section} wrap={false}>
                      <Text style={styles.sectionHeader}>II. Especificações Técnicas</Text>
                      <View style={styles.table}>
                          <View style={[styles.tableRow, styles.tableHeader]}>
                              <View style={[styles.tableCol, { width: '40%' }]}>
                                  <Text style={styles.tableCellHeader}>DESCRIÇÃO</Text>
                              </View>
                              <View style={[styles.tableCol, { width: '15%' }]}>
                                  <Text style={[styles.tableCellHeader, styles.textCenter]}>DIÂM.</Text>
                              </View>
                              <View style={[styles.tableCol, { width: '10%' }]}>
                                  <Text style={[styles.tableCellHeader, styles.textCenter]}>QTD</Text>
                              </View>
                              <View style={[styles.tableCol, { width: '17%' }]}>
                                  <Text style={[styles.tableCellHeader, styles.textRight]}>COMP. (m)</Text>
                              </View>
                              <View style={[styles.tableCol, { width: '18%' }]}>
                                  <Text style={[styles.tableCellHeader, styles.textRight]}>TOTAL (m)</Text>
                              </View>
                          </View>

                          {itensNormalizados.map((item: any, i: number) => (
                              <View key={i} style={styles.tableRow}>
                                  <View style={[styles.tableCol, { width: '40%' }]}>
                                      <Text style={styles.tableCell}>
                                          {descricaoItem(item, data?.tipo || '')}
                                      </Text>
                                  </View>
                                  <View style={[styles.tableCol, { width: '15%' }]}>
                                      <Text style={[styles.tableCell, styles.textCenter]}>
                                          {item?.diametro ? `${item.diametro / 10} cm` : (item?.numeroFuro ? `Furo ${item.numeroFuro}` : '—')}
                                      </Text>
                                  </View>
                                  <View style={[styles.tableCol, { width: '10%' }]}>
                                      <Text style={[styles.tableCell, styles.textCenter]}>
                                          {item?.quantidadeEstacas || 1}
                                      </Text>
                                  </View>
                                  <View style={[styles.tableCol, { width: '17%' }]}>
                                      <Text style={[styles.tableCell, styles.textRight]}>
                                          {(item?.comprimentoUnitario || item?.profundidade || 0).toFixed(2)}
                                      </Text>
                                  </View>
                                  <View style={[styles.tableCol, { width: '18%' }]}>
                                      <Text style={[styles.tableCell, styles.textRight]}>
                                          {formatMeters(item?.totalMetros || item?.profundidade || 0)}
                                      </Text>
                                  </View>
                              </View>
                          ))}
                      </View>
                      <Text style={{ marginTop: 6, fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'right' }}>
                          METRAGEM TOTAL ESTIMADA: {formatMeters(totalMetros)}
                      </Text>
                  </View>
                )}

                {/* PRAZO */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>III. Prazo de Execução</Text>
                    <Text style={{ fontSize: 9, lineHeight: 1.6 }}>
                        Levando em conta o quantitativo apresentado, o prazo de execução para esta referida obra será de{' '}
                        <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                            {data?.prazoExecucao || 2} dia(s) útil(is)
                        </Text>
                        . O início das atividades{' '}
                        {data?.dataPrevistaInicio
                            ? `está previsto para o dia: ${safeFormatDate(data.dataPrevistaInicio, "dd 'de' MMMM 'de' yyyy")}.`
                            : 'fica a combinar após assinatura.'}
                    </Text>
                </View>

                {/* INVESTIMENTO */}
                <View style={[styles.section, { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }]} wrap={false}>
                    <Text style={[styles.sectionHeader, { width: '100%' }]}>V. Investimento e Condições</Text>

                    {mobilizacaoNorm > 0 && (
                        <View style={[styles.investmentCard, { width: '47%' }]}>
                            <Text style={styles.investmentLabel}>MOBILIZAÇÃO</Text>
                            <Text style={styles.investmentValue}>{formatCurrency(mobilizacaoNorm)}</Text>
                        </View>
                    )}
                    {data?.incluirART && (data?.valorART || 0) > 0 && (
                        <View style={[styles.investmentCard, { width: '47%' }]}>
                            <Text style={styles.investmentLabel}>TAXA ART</Text>
                            <Text style={styles.investmentValue}>{formatCurrency(data.valorART)}</Text>
                        </View>
                    )}
                    {data?.emiteNotaFiscal && (calc?.valorImposto || 0) > 0 && (
                        <View style={[styles.investmentCard, { width: '47%' }]}>
                            <Text style={styles.investmentLabel}>IMPOSTOS ({data?.percentualImposto || 0}%)</Text>
                            <Text style={styles.investmentValueRed}>{formatCurrency(calc.valorImposto)}</Text>
                        </View>
                    )}
                    <View style={[styles.investmentCard, { width: '100%', backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
                        <Text style={[styles.investmentLabel, { color: '#166534' }]}>TOTAL FINAL ESTIMADO</Text>
                        <Text style={styles.investmentValueGreen}>{formatCurrency(calc?.valorTotal)}</Text>
                    </View>
                </View>

                {/* FATURAMENTO E PAGAMENTO */}
                <View style={styles.section} wrap={false}>
                    {data?.emiteNotaFiscal && (
                        <Text style={{ fontSize: 8, color: '#475569', marginBottom: 8, fontStyle: 'italic' }}>
                            Inclusa emissão de NF com incidência de {data.percentualImposto || 0}% de impostos.
                        </Text>
                    )}

                    {parcelas.length > 0 && (
                        <View>
                            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 6, color: '#475569', textTransform: 'uppercase' }}>
                                Formas de Pagamento
                            </Text>
                            {parcelas.map((p: any, i: number) => {
                                const valor = ((p.percentual || 0) / 100) * (calc?.valorTotal || 0);
                                const formaLabel: Record<string, string> = {
                                    pix: 'PIX', boleto: 'Boleto', transferencia: 'TED/DOC',
                                    dinheiro: 'Dinheiro', cartao: 'Cartão', cheque: 'Cheque',
                                };
                                return (
                                    <View key={i} style={styles.paymentRow}>
                                        <Text style={styles.paymentLabel}>
                                            {p.descricao || `Parcela ${i + 1}`} ({p.percentual || 0}%)
                                        </Text>
                                        <Text style={styles.paymentValue}>
                                            {formatCurrency(valor)}   {p.prazo || ''}  –  {formaLabel[p.formaPagamento] || 'PIX'}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* CONDIÇÕES GERAIS (TEMPLATE DYNAMIC) */}
                {templateText && (
                    <View style={styles.section} wrap={false}>
                        <Text style={styles.sectionHeader}>VI. CONDIÇÕES GERAIS</Text>
                        <Text style={{ fontSize: 8, lineHeight: 1.4, color: '#475569', textAlign: 'justify' }}>
                            {templateText}
                        </Text>
                    </View>
                )}

                {/* TERMO DE ACEITAÇÃO */}
                <View style={[styles.termContainer, { marginTop: 20 }]} wrap={false}>
                  <Text style={styles.acceptanceTitle}>TERMO DE ACEITAÇÃO DA PROPOSTA</Text>
                  <Text style={styles.acceptanceText}>
                    Pelo presente, declaramos estar cientes e de acordo com as exigências dos itens desta Proposta
                    (Nº {numeroDoc}), para os serviços referidos. Por esta razão, autorizamos a execução dos serviços
                    a partir do dia ____ de _____________ de ______.
                  </Text>

                  {/* Campos de faturamento */}
                  <View style={{ marginTop: 16, gap: 8 }}>
                    {[
                      'RAZÃO SOCIAL',
                      'CNPJ / CPF',
                      'INSCRIÇÃO ESTADUAL',
                      'ENDEREÇO DA OBRA',
                      'ENDEREÇO DE COBRANÇA',
                      'NOME DO RESPONSÁVEL',
                    ].map((label) => (
                      <View key={label} style={{ flexDirection: 'row', borderBottomWidth: 0.5, borderBottomStyle: 'solid', borderBottomColor: '#cbd5e1', paddingBottom: 4, marginBottom: 4 }}>
                        <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', width: 120, color: '#475569' }}>{label}:</Text>
                        <Text style={{ fontSize: 8, flex: 1 }}> </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.signatureContainer}>
                    <View style={styles.signatureBox}>
                      <View style={styles.signatureLine} />
                      <Text style={styles.signatureLabel}>{empresa?.razaoSocial || 'ESTEMCO ENGENHARIA EM FUNDAÇÕES S/S LTDA'}</Text>
                      <Text style={styles.signatureSub}>CNPJ: {empresa?.cnpj || '57.486.102/0001-86'}</Text>
                    </View>
                    <View style={styles.signatureBox}>
                      <View style={styles.signatureLine} />
                      <Text style={styles.signatureLabel}>ASSINATURA DO RESPONSÁVEL</Text>
                      <Text style={styles.signatureSub}>DATA: ____/____/________</Text>
                    </View>
                  </View>
                </View>

                {/* RODAPÉ */}
                <Text
                    style={{ position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 7, color: '#94a3b8' }}
                    render={({ pageNumber, totalPages }) =>
                        `Página ${pageNumber} de ${totalPages} | ${empresa?.razaoSocial || 'Estemco Engenharia em Fundações S/S Ltda.'} | CNPJ ${empresa?.cnpj || '57.486.102/0001-86'}`
                    }
                    fixed
                />
            </Page>
        </Document>
    );
};

// ── Exportações ─────────────────────────────────────────────────────────────
export const generatePropostaBlob = async (data: NovaPropostaData, tenantId?: string, empresa?: DadosEmpresa): Promise<Blob> => {
    let templateText: string | undefined;
    try {
        const itensNormalizados = data.itens || (data as any).itensHCM || (data as any).itensESC || (data as any).itensSPT || [];

        const mobilizacaoNorm = data.mobilizacao
            || (data as any).mobilizacaoHCM
            || (data as any).mobilizacaoESC
            || (data as any).mobilizacaoSPT
            || 0;

        const taxaArt = data.valorART || 0;
        
        let calc: any = { subtotalExecucao: 0, valorTotal: 0 };
        if (data.tipo === 'HCM') calc = calcularPropostaHCM(itensNormalizados as ItemProposta[], mobilizacaoNorm, data.faturamentoMinimo, data.incluirART, taxaArt, data.emiteNotaFiscal, data.percentualImposto);
        if (data.tipo === 'ESC') calc = calcularPropostaESC(itensNormalizados as ItemProposta[], mobilizacaoNorm, data.modalidadeESC || 'por_metro', data.precoFechadoESC, data.metrosDiariosESC, data.precoExcedenteESC, data.faturamentoMinimo, data.incluirART, taxaArt, data.emiteNotaFiscal, data.percentualImposto);
        if (data.tipo === 'SPT') calc = calcularPropostaSPT(itensNormalizados as any, mobilizacaoNorm, data.incluirART, taxaArt, data.emiteNotaFiscal, data.percentualImposto);

        const vars = buildTemplateVars(data, calc, (data as any).numero || 'PREVIEW');
        templateText = await buildPropostaText(data.tipo as any, vars, tenantId || '');
        console.log('templateText:', JSON.stringify(templateText?.substring(0, 100)));
        console.log('tipo:', data.tipo, 'tenantId:', tenantId);
    } catch (e) {
        console.warn("Erro ao buscar do Drive/Firestore, forçando fallback:", e);
    }

    if (!templateText || templateText.trim().length < 10) {
        const { getFallbackTemplateText } = await import('./templateService');
        templateText = getFallbackTemplateText(data.tipo as any);
        console.log('usando fallback, length:', templateText.length);
    }

    return await pdf(<PropostaDocument data={data} templateText={templateText} tenantId={tenantId} empresa={empresa} />).toBlob();
};

export const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const DownloadPropostaPDF: React.FC<PDFProps> = ({ data, tenantId, empresa }) => {
    const filename = montarNomeArquivoProposta(data, data);

    const handleDownload = async () => {
        try {
            const blob = await generatePropostaBlob(data, tenantId, empresa);
            downloadBlob(blob, filename);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Erro ao gerar o PDF. Verifique o console para detalhes.');
        }
    };

    return (
        <button
            onClick={handleDownload}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md font-bold hover:bg-indigo-700 transition-colors shadow-sm gap-2 text-sm"
        >
            <FileDown size={16} /> Baixar PDF
        </button>
    );
};
