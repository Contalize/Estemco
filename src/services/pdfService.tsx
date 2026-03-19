import React from 'react';
import { Page, Text, View, Document, StyleSheet, PDFDownloadLink, Image, Font, pdf } from '@react-pdf/renderer';
import { NovaPropostaData } from '../types/propostaForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileDown } from 'lucide-react';
import { calcularPropostaHCM, calcularPropostaESC, calcularPropostaSPT } from '../utils/calculosProposta';
import { ItemProposta, ItemFuroSPT } from '../../types';
import { pdfTexts } from '../utils/pdfTexts';
import { numberToWords } from '../utils/numberToWords';

// Utilitários de Formatação com Fallbacks Rigorosos
const formatCurrency = (valor: number | undefined | null) => {
    if (valor === undefined || valor === null || isNaN(valor)) return 'R$ 0,00';
    try {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
    } catch (e) {
        return 'R$ 0,00';
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

const safeFormatDate = (date: any, formatStr: string) => {
    if (!date) return 'A combinar';
    try {
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return 'A combinar';
        return format(d, formatStr, { locale: ptBR });
    } catch (e) {
        return 'A combinar';
    }
};

const styles = StyleSheet.create({
    page: {
        paddingTop: 35,
        paddingBottom: 60,
        paddingHorizontal: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
        color: '#000000',
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
    headerInfo: {
        textAlign: 'right'
    },
    title: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'center',
        marginBottom: 15,
        textTransform: 'uppercase'
    },
    sectionTitle: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        textDecoration: 'underline',
        marginTop: 14,
        marginBottom: 6,
        textTransform: 'uppercase'
    },
    textNormal: { fontSize: 10, lineHeight: 1.4 },
    textBold: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#cccccc',
        paddingVertical: 4,
        paddingHorizontal: 4,
        marginTop: 5
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderColor: '#eeeeee',
        paddingVertical: 4,
        paddingHorizontal: 4
    },
    totalRow: {
        flexDirection: 'row',
        backgroundColor: '#f9f9f9',
        borderTopWidth: 2,
        borderColor: '#000000',
        paddingVertical: 6,
        paddingHorizontal: 4,
        marginTop: 2
    },
    riskBox: {
        marginTop: 15,
        padding: 8,
        borderWidth: 1,
        borderColor: '#000000'
    },
    signatureRow: {
        marginTop: 30,
        flexDirection: 'row',
        justifyContent: 'space-around'
    },
    signatureLine: {
        width: 180,
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
const PropostaDocument: React.FC<{ data: NovaPropostaData }> = ({ data }) => {
    // --- ADAPTER LAYER (Data Normalization) ---
    const listaServicos = (data as any)?.servicos || (data as any)?.itens || (data as any)?.itensHCM || (data as any)?.itensESC || (data as any)?.itensSPT || (data as any)?.furosSPT || [];
    const valorMobilizacao = (data as any)?.mobilizacao || (data as any)?.valorMobilizacao || (data as any)?.mobilizacaoHCM || (data as any)?.mobilizacaoESC || (data as any)?.mobilizacaoSPT || 0;
    const taxaArt = (data as any)?.valorART || (data as any)?.taxaArt || 0;
    const nDiasExecucao = (data as any)?.diasExecucao || (data as any)?.prazoExecucao || 0;
    const dataInicioPrevisto = (data as any)?.inicioPrevisto || (data as any)?.dataPrevistaInicio || null;

    let calc: any = { linhasDetalhadas: [], valorTotal: 0, valorART: 0, valorMobilizacao: 0 };
    try {
        if (data.tipo === 'HCM') calc = calcularPropostaHCM(listaServicos as ItemProposta[], valorMobilizacao, data.faturamentoMinimo, data.incluirART, taxaArt, data.emiteNotaFiscal, data.percentualImposto || 0);
        if (data.tipo === 'ESC') calc = calcularPropostaESC(listaServicos as ItemProposta[], valorMobilizacao, (data as any).modalidadeESC || 'por_metro', (data as any).precoFechadoESC, (data as any).metrosDiariosESC, (data as any).precoExcedenteESC, data.faturamentoMinimo, data.incluirART, taxaArt, data.emiteNotaFiscal, data.percentualImposto || 0);
        if (data.tipo === 'SPT') calc = calcularPropostaSPT(listaServicos as any, valorMobilizacao, data.incluirART, taxaArt, data.emiteNotaFiscal, data.percentualImposto || 0);
    } catch (e) {
        console.error("Erro nos cálculos do documento:", e);
    }

    const title = pdfTexts.proposals.titles[data.tipo as keyof typeof pdfTexts.proposals.titles] || pdfTexts.proposals.titles.GENERIC;
    const dataEmissao = safeFormatDate((data as any).dataEmissao || new Date(), "dd 'de' MMMM 'de' yyyy");
    const valorTotalExtenso = numberToWords(calc.valorTotal || 0);
    const diasExecucao = nDiasExecucao || 0;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* HEADER (Shielded) */}
                <View style={styles.headerRow}>
                   <View>
                        <Text style={[styles.textBold, { fontSize: 14 }]}>{`ESTEMCO`}</Text>
                        <Text style={{ fontSize: 8 }}>{`ENGENHARIA EM FUNDAÇÕES`}</Text>
                   </View>
                    <View style={styles.headerInfo}>
                        <Text style={[styles.textBold, { fontSize: 8 }]}>{`${pdfTexts.header.companyName}`}</Text>
                        <Text style={{ fontSize: 7 }}>{`${pdfTexts.header.address}`}</Text>
                        <Text style={{ fontSize: 7 }}>{`${pdfTexts.header.contact}`}</Text>
                    </View>
                </View>

                <Text style={styles.title}>{`${title}`}</Text>

                <View style={{ textAlign: 'right', marginBottom: 15 }}>
                    <Text>{`Socorro/SP, ${dataEmissao}`}</Text>
                </View>

                <View style={{ marginBottom: 15 }}>
                    <Text style={styles.textBold}>{`AO SENHOR: `}<Text style={styles.textNormal}>{`${data.clienteNome || 'Não informado'}`}</Text></Text>
                    <Text style={styles.textBold}>{`ENDEREÇO DA OBRA: `}<Text style={styles.textNormal}>{`${data.enderecoObra?.logradouro || ''}, ${data.enderecoObra?.numero || ''} - ${data.enderecoObra?.cidade || ''}/${data.enderecoObra?.estado || ''}`}</Text></Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                        <Text style={styles.textBold}>{`PROPOSTA N. `}<Text style={styles.textNormal}>{`${(data as any).numero || '---'}`}</Text></Text>
                        <Text style={styles.textBold}>{`VALIDADE: `}<Text style={styles.textNormal}>{`${data.validadeProposta || (data as any).validadeDias || 15} DIAS`}</Text></Text>
                    </View>
                </View>

                {/* INTRO (Shielded) */}
                <Text style={[styles.textNormal, { marginBottom: 10 }]}>
                    {data.tipo === 'HCM' ? `${pdfTexts.proposals.hcm.intro}` : `Prezado(a), conforme solicitado, segue orçamento para execução das estacas do tipo ${data.tipo || 'Fundação'}.`}
                </Text>

                {/* SPECIFICATIONS (Shielded) */}
                <Text style={styles.sectionTitle}>{`1. DAS ESPECIFICAÇÕES TÉCNICAS.`}</Text>
                {listaServicos.map((s: any, i: number) => {
                    const qtd = s.quantidadeEstacas || s.quantidade || (data.tipo === 'SPT' ? 1 : 0);
                    const metros = s.comprimentoUnitario || s.metragemPrevista || (s as any).totalMetros || 0;
                    return (
                        <View key={i} style={{ marginBottom: 4 }}>
                            <Text style={styles.textBold}>{`• ${(data.tipo === 'SPT' ? 'SONDAGEM SPT' : 'ESTACAS ' + (s.tipoEstaca || data.tipo || 'SB'))}:`}</Text>
                            <Text style={styles.textNormal}>
                                {data.tipo !== 'SPT' ? (
                                    `Estacas d= Ø${s.diametro || 'N/D'}, quant: ${qtd} x ${metros}m = ${formatMeters(qtd * metros)}`
                                ) : (
                                    `Quantidade de furos: ${s.numeroFuro || i+1}, profundidade prevista: ${s.profundidade || 0}m`
                                )}
                            </Text>
                        </View>
                    );
                })}

                {/* TIMING (Shielded) */}
                <Text style={styles.sectionTitle}>{`2. PRAZO DE EXECUÇÃO e INÍCIO DA OBRA.`}</Text>
                {data.tipo === 'HCM' ? (
                    <Text style={styles.textNormal}>{`${pdfTexts.proposals.hcm.timing(Number(diasExecucao))}`}</Text>
                ) : (
                    <>
                        <Text style={styles.textNormal}>{`Prazo de execução estimado: ${diasExecucao} dias trabalhados.`}</Text>
                        <Text style={[styles.textNormal, { marginTop: 4 }]}>{`Início previsto: ${data.dataPrevistaInicio ? safeFormatDate(data.dataPrevistaInicio, "dd/MM/yyyy") : 'A combinar'}`}</Text>
                    </>
                )}

                {/* VALUES (Shielded) */}
                <Text style={styles.sectionTitle}>{`3. VALORES PARA PRESTAÇÃO DE SERVIÇO.`}</Text>
                <Text style={[styles.textNormal, { marginBottom: 6 }]}>{`Os preços propostos para a execução dos serviços são:`}</Text>
                <View style={styles.tableHeader}>
                    <Text style={[styles.textBold, { flex: 2 }]}>{`Descrição`}</Text>
                    <Text style={[styles.textBold, { flex: 1, textAlign: 'center' }]}>{`Preço Unit.`}</Text>
                    <Text style={[styles.textBold, { flex: 1, textAlign: 'right' }]}>{`Subtotal`}</Text>
                </View>
                {(calc.linhasDetalhadas || []).map((l: any, i: number) => (
                    <View key={i} style={styles.tableRow}>
                        <Text style={[styles.textNormal, { flex: 2 }]}>{`${l.descricao}`}</Text>
                        <Text style={[styles.textNormal, { flex: 1, textAlign: 'center' }]}>{`${formatCurrency(l.valorUnitario)}`}</Text>
                        <Text style={[styles.textNormal, { flex: 1, textAlign: 'right' }]}>{`${formatCurrency(l.subtotal)}`}</Text>
                    </View>
                ))}
                
                {valorMobilizacao ? (
                    <View style={styles.tableRow}>
                        <Text style={[styles.textNormal, { flex: 2 }]}>{`Mobilização e desmobilização de equipamentos`}</Text>
                        <Text style={[styles.textNormal, { flex: 1, textAlign: 'center' }]}>{`-`}</Text>
                        <Text style={[styles.textNormal, { flex: 1, textAlign: 'right' }]}>{`${formatCurrency(valorMobilizacao)}`}</Text>
                    </View>
                ) : null}

                {data.incluirART ? (
                    <View style={styles.tableRow}>
                        <Text style={[styles.textNormal, { flex: 2 }]}>{`ART - Anotação de Responsabilidade Técnica`}</Text>
                        <Text style={[styles.textNormal, { flex: 1, textAlign: 'center' }]}>{`-`}</Text>
                        <Text style={[styles.textNormal, { flex: 1, textAlign: 'right' }]}>{`${formatCurrency(taxaArt)}`}</Text>
                    </View>
                ) : null}

                <View style={styles.totalRow}>
                    <Text style={[styles.textBold, { flex: 1 }]}>{`TOTAL ESTIMADO:`}</Text>
                    <Text style={[styles.textBold, { flex: 1, textAlign: 'right' }]}>{`${formatCurrency(calc.valorTotal)}`}</Text>
                </View>
                <Text style={{ fontSize: 8, marginTop: 4, fontStyle: 'italic' }}>{`Extenso: ${valorTotalExtenso}`}</Text>

                {/* CONDITIONS (Shielded) */}
                <View wrap={false}>
                    <Text style={styles.sectionTitle}>{`4. DAS COBRANÇAS E FATURAMENTO.`}</Text>
                    {data.tipo === 'HCM' ? (
                        <>
                            <Text style={[styles.textBold, { fontSize: 9, marginBottom: 4 }]}>{`${pdfTexts.proposals.hcm.minBilling.title}`}</Text>
                            {pdfTexts.proposals.hcm.minBilling.items.map((item, i) => (
                                <Text key={i} style={[styles.textNormal, { marginBottom: 3, textAlign: 'justify' }]}>{`${i+1}. ${item}`}</Text>
                            ))}
                            
                            <Text style={[styles.sectionTitle, { textDecoration: 'none', marginTop: 10 }]}>{`${pdfTexts.proposals.hcm.exemption.title}`}</Text>
                            {pdfTexts.proposals.hcm.exemption.items.map((item, i) => (
                                <Text key={i} style={[styles.textNormal, { marginBottom: 2 }]}>{`${i+1}. ${item}`}</Text>
                            ))}

                            <Text style={[styles.sectionTitle, { textDecoration: 'none', marginTop: 10 }]}>{`${pdfTexts.proposals.hcm.generalBilling.title}`}</Text>
                            {pdfTexts.proposals.hcm.generalBilling.items.map((item, i) => (
                                <Text key={i} style={[styles.textNormal, { marginBottom: 2 }]}>{`${i+1}. ${item}`}</Text>
                            ))}
                        </>
                    ) : (
                        <>
                            <Text style={styles.textNormal}>{`1. Mínimo de faturamento da obra: ${formatCurrency(data.faturamentoMinimo || 0)}`}</Text>
                            <Text style={styles.textNormal}>{`2. Hora parada de equipamento (por responsabilidade do cliente): ${formatCurrency(data.faturamentoMinimo ? data.faturamentoMinimo / 8 : 250)}/hora.`}</Text>
                        </>
                    )}
                </View>

                <View wrap={false} style={{ marginTop: 10 }}>
                    <Text style={[styles.textBold, { marginBottom: 4 }]}>{`CONDIÇÕES DE PAGAMENTO:`}</Text>
                    {(data.condicoesPagamento || []).map((p, i) => (
                        <Text key={i} style={styles.textNormal}>{`• ${p.percentual}% (${p.descricao}): ${p.prazo}`}</Text>
                    ))}
                </View>

                {/* LEGAL SECTIONS (Shielded) */}
                <View wrap={false}>
                    <Text style={styles.sectionTitle}>{`5. OBRIGAÇÕES DA CONTRATANTE:`}</Text>
                    {(data.tipo === 'HCM' ? pdfTexts.proposals.hcm.responsibilities.contratante : pdfTexts.proposals.responsibilities.contratante).map((t, i) => (
                        <Text key={i} style={styles.textNormal}>{`${i + 1}. ${t}`}</Text>
                    ))}
                </View>

                <View wrap={false}>
                    <Text style={styles.sectionTitle}>{`6. OBRIGAÇÕES DA CONTRADA:`}</Text>
                    {(data.tipo === 'HCM' ? pdfTexts.proposals.hcm.responsibilities.proponente : pdfTexts.proposals.responsibilities.proponente).map((t, i) => (
                        <Text key={i} style={styles.textNormal}>{`${i + 1}. ${t}`}</Text>
                    ))}
                </View>

                {(data.tipo === 'HCM' || data.tipo === 'ESC') && (
                    <View wrap={false} style={styles.riskBox}>
                        <Text style={[styles.textBold, { fontSize: 8, marginBottom: 4 }]}>{`CLÁUSULA DE SEGURANÇA E RISCO:`}</Text>
                        <Text style={[styles.textNormal, { fontSize: 8, textAlign: 'justify' }]}>{`${pdfTexts.proposals.riskClause}`}</Text>
                    </View>
                )}

                {/* ACCEPTANCE (Shielded) */}
                <View wrap={false} style={{ marginTop: 25 }}>
                    <Text style={styles.sectionTitle}>{`7. TERMO DE ACEITAÇÃO.`}</Text>
                    <Text style={styles.textNormal}>{`${pdfTexts.proposals.acceptanceTerm}`}</Text>

                    <View style={styles.signatureRow}>
                        <View style={styles.signatureLine}>
                             <Text style={styles.textBold}>{`ESTEMCO ENGENHARIA`}</Text>
                        </View>
                        <View style={styles.signatureLine}>
                             <Text style={styles.textBold}>{`CONTRATANTE (CLIENTE)`}</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
                    `Página ${pageNumber} de ${totalPages} • Gerado via Sistema Estemco`
                )} />
            </Page>
        </Document>
    );
};

export const generatePropostaBlob = async (data: NovaPropostaData) => {
    return await pdf(<PropostaDocument data={data} />).toBlob();
};

export const DownloadPropostaPDF: React.FC<{ data: NovaPropostaData }> = ({ data }) => {
    // Render button only if we have minimum valid data to prevent direct blob generation errors
    const hasData = (data as any)?.id && (data?.tipo === 'SPT' || ((data as any)?.itens?.length > 0) || ((data as any)?.servicos?.length > 0));
    
    if (!hasData) return null;

    return (
        <PDFDownloadLink
            document={<PropostaDocument data={data} />}
            fileName={`Proposta_${data.clienteNome || 'Cliente'}.pdf`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
        >
            {({ loading }) => (loading ? 'Gerando...' : <><FileDown size={16} /> Baixar PDF</>)}
        </PDFDownloadLink>
    );
};
