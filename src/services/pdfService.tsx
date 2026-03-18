import React from 'react';
import { Page, Text, View, Document, StyleSheet, PDFDownloadLink, Image, Font, pdf } from '@react-pdf/renderer';
import { NovaPropostaData } from '../types/propostaForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileDown } from 'lucide-react';
import { calcularPropostaHCM, calcularPropostaESC, calcularPropostaSPT } from '../utils/calculosProposta';
import { ItemProposta, ItemFuroSPT } from '../../types';

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
        paddingTop: 30,
        paddingBottom: 60,
        paddingHorizontal: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
        color: '#1e293b',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottom: '2px solid #1e1b4b',
        paddingBottom: 10,
        marginBottom: 20,
    },
    companyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e1b4b',
    },
    companyContact: {
        fontSize: 7,
        color: '#64748b',
        marginTop: 4,
        lineHeight: 1.4,
    },
    docInfo: {
        textAlign: 'right',
    },
    docTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1e1b4b',
    },
    metaText: {
        fontSize: 8,
        color: '#64748b',
        marginTop: 2,
    },
    section: {
        marginBottom: 15,
    },
    sectionHeader: {
        fontSize: 11,
        fontWeight: 'bold',
        backgroundColor: '#f1f5f9',
        padding: 5,
        color: '#1e1b4b',
        textTransform: 'uppercase',
        borderLeft: '4px solid #1e1b4b',
        marginBottom: 8,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    label: {
        fontWeight: 'bold',
        width: 80,
        fontSize: 9,
        color: '#475569',
    },
    value: {
        flex: 1,
        fontSize: 9,
    },
    table: {
        width: '100%',
        marginTop: 10,
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomColor: '#e2e8f0',
        borderBottomWidth: 1,
        minHeight: 24,
        alignItems: 'center',
    },
    tableHeader: {
        backgroundColor: '#f8fafc',
        fontWeight: 'bold',
    },
    tableCol: {
        paddingHorizontal: 5,
        borderRightColor: '#e2e8f0',
        borderRightWidth: 1,
    },
    tableCell: {
        fontSize: 8,
    },
    textCenter: { textAlign: 'center' },
    textRight: { textAlign: 'right' },
    
    executionBox: {
        backgroundColor: '#f8fafc',
        padding: 10,
        borderRadius: 4,
        border: '1px solid #e2e8f0',
        marginTop: 5,
    },
    executionText: {
        fontSize: 9,
        lineHeight: 1.5,
    },
    
    responsibilityTitle: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#1e1b4b',
        marginTop: 8,
        marginBottom: 4,
        textDecoration: 'underline',
    },
    responsibilityItem: {
        fontSize: 8,
        marginLeft: 10,
        marginBottom: 2,
        lineHeight: 1.3,
    },
    
    investmentGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        gap: 10,
    },
    investmentCard: {
        flex: 1,
        padding: 10,
        border: '1px solid #e2e8f0',
        borderRadius: 4,
        alignItems: 'center',
    },
    totalCard: {
        backgroundColor: '#1e1b4b',
        borderColor: '#1e1b4b',
    },
    cardLabel: {
        fontSize: 7,
        fontWeight: 'bold',
        color: '#64748b',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    cardValue: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    
    acceptanceTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 30,
        marginBottom: 15,
    },
    acceptanceText: {
        fontSize: 8,
        textAlign: 'justify',
        lineHeight: 1.5,
        color: '#475569',
    },
    signatureContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 40,
    },
    signatureBox: {
        alignItems: 'center',
        width: 200,
    },
    signatureLine: {
        width: '100%',
        borderTopWidth: 1,
        borderTopColor: '#000',
        marginBottom: 5,
    },
    signatureLabel: {
        fontSize: 8,
        fontWeight: 'bold',
    },
    signatureSub: {
        fontSize: 7,
        color: '#64748b',
        marginTop: 2,
    }
});

interface PDFProps {
    data: NovaPropostaData;
}

const PropostaDocument: React.FC<PDFProps> = ({ data }) => {
    // Cálculo de valores usando os mesmos utilitários do sistema
    let calc: any = { linhasDetalhadas: [], valorTotal: 0, valorMobilizacao: 0, valorART: 0, valorImposto: 0 };
    
    try {
        if (data?.tipo === 'HCM') calc = calcularPropostaHCM(data.itens as ItemProposta[], data.mobilizacao || 0, data.faturamentoMinimo, data.incluirART, data.valorART || 0, data.emiteNotaFiscal, data.percentualImposto || 0);
        if (data?.tipo === 'ESC') calc = calcularPropostaESC(data.itens as ItemProposta[], data.mobilizacao || 0, data.modalidadeESC || 'por_metro', data.precoFechadoESC, data.metrosDiariosESC, data.precoExcedenteESC, data.faturamentoMinimo, data.incluirART, data.valorART || 0, data.emiteNotaFiscal, data.percentualImposto || 0);
        if (data?.tipo === 'SPT') calc = calcularPropostaSPT(data.itens as ItemFuroSPT[], data.mobilizacao || 0, data.incluirART, data.valorART || 0, data.emiteNotaFiscal, data.percentualImposto || 0);
    } catch (e) {
        console.error("Erro no cálculo do PDF:", e);
    }

    const totalMetros = (data?.itens || []).reduce((acc, item) => acc + (item?.totalMetros || item?.profundidade || 0), 0);
    const tipoTexto = data?.tipo === 'HCM' ? 'HÉLICE CONTÍNUA' : data?.tipo === 'ESC' ? 'ESCAVADA' : 'SPT (SONDAGEM)';
    const dataEmissao = safeFormatDate(new Date(), 'dd/MM/yyyy');
    const validadeTexto = "15 dias";

    return (
        <Document title={`Proposta ${data?.clienteNome || 'Sem Nome'}`}>
            <Page size="A4" style={styles.page}>
                
                {/* A. CABEÇALHO */}
                <View style={styles.header} fixed>
                    <View>
                        <Text style={styles.companyTitle}>ESTEMCO - ENGENHARIA EM FUNDAÇÕES</Text>
                        <Text style={styles.companyContact}>
                            Rod. Capitão Barduíno, Km 131 Margem da SP 008 - Socorro/SP{"\n"}
                            Tel: (19) 3895-2630 / WhatsApp: (19) 9.9703.8028 | contato@estemco.com.br
                        </Text>
                    </View>
                    <View style={styles.docInfo}>
                        <Text style={styles.docTitle}>PROPOSTA DE PRESTAÇÃO DE SERVIÇO</Text>
                        <Text style={styles.metaText}>Nº {data?.tipo || '---'}-{format(new Date(), 'yyyyMMdd')}</Text>
                        <Text style={styles.metaText}>Emitida em: {dataEmissao}</Text>
                        <Text style={styles.metaText}>Validade: {validadeTexto}</Text>
                    </View>
                </View>

                {/* B. IDENTIFICAÇÃO */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>PROPOSTA DE PRESTAÇÃO DE SERVIÇO DE {tipoTexto}</Text>
                    <View style={{ marginTop: 5 }}>
                        <View style={styles.row}>
                            <Text style={styles.label}>CLIENTE:</Text>
                            <Text style={styles.value}>{data?.clienteNome || '---'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>OBRA:</Text>
                            <Text style={styles.value}>
                                {data?.enderecoObra?.logradouro || '---'}, {data?.enderecoObra?.numero || 'S/N'} - {data?.enderecoObra?.bairro || '---'}{"\n"}
                                {data?.enderecoObra?.cidade || '---'} / {data?.enderecoObra?.estado || '---'} - CEP: {data?.enderecoObra?.cep || '---'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* C. ESPECIFICAÇÕES TÉCNICAS */}
                <View style={styles.section} wrap={false}>
                    <Text style={styles.sectionHeader}>ESPECIFICAÇÕES TÉCNICAS</Text>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <View style={[styles.tableCol, { width: '40%' }]}><Text style={styles.tableCell}>DESCRIÇÃO</Text></View>
                            <View style={[styles.tableCol, { width: '15%' }]}><Text style={[styles.tableCell, styles.textCenter]}>DIÂMETRO</Text></View>
                            <View style={[styles.tableCol, { width: '15%' }]}><Text style={[styles.tableCell, styles.textCenter]}>QTD</Text></View>
                            <View style={[styles.tableCol, { width: '15%' }]}><Text style={[styles.tableCell, styles.textRight]}>COMP. (m)</Text></View>
                            <View style={[styles.tableCol, { width: '15%', borderRightWidth: 0 }]}><Text style={[styles.tableCell, styles.textRight]}>TOTAL (m)</Text></View>
                        </View>
                        {(data?.itens || []).map((item, index) => (
                            <View style={styles.tableRow} key={index}>
                                <View style={[styles.tableCol, { width: '40%' }]}>
                                    <Text style={styles.tableCell}>{item?.descricao || (data?.tipo === 'SPT' ? `Furo ${item?.numeroFuro || (index + 1)}` : 'Peça de fundação')}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: '15%' }]}>
                                    <Text style={[styles.tableCell, styles.textCenter]}>{item?.diametro ? `${item.diametro} mm` : '---'}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: '15%' }]}>
                                    <Text style={[styles.tableCell, styles.textCenter]}>{item?.quantidadeEstacas || item?.quantidade || (data?.tipo === 'SPT' ? 1 : 0)}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: '15%' }]}>
                                    <Text style={[styles.tableCell, styles.textRight]}>{formatMeters(item?.comprimentoUnitario || item?.profundidade || 0).replace(' m', '')}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: '15%', borderRightWidth: 0 }]}>
                                    <Text style={[styles.tableCell, styles.textRight]}>{formatMeters(item?.totalMetros || item?.profundidade || 0)}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                    <View style={{ marginTop: 5, alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 9, fontWeight: 'bold' }}>METRAGEM TOTAL DA OBRA: {formatMeters(totalMetros)}</Text>
                    </View>
                </View>

                {/* D. PRAZO DE EXECUÇÃO */}
                <View style={styles.section} wrap={false}>
                    <Text style={styles.sectionHeader}>PRAZO DE EXECUÇÃO</Text>
                    <View style={styles.executionBox}>
                        <Text style={styles.executionText}>
                            Levando em conta o quantitativo apresentado, o prazo de execução para esta referida obra será de {data?.diasExecucao || 0} dias úteis.
                            O início das atividades está previsto para o dia {safeFormatDate(data?.dataPrevistaInicio, 'dd/MM/yyyy')}.
                        </Text>
                    </View>
                </View>

                {/* E. RESPONSABILIDADES CONTRATUAIS */}
                <View style={styles.section} wrap={false}>
                    <Text style={styles.sectionHeader}>RESPONSABILIDADES CONTRATUAIS</Text>
                    
                    <Text style={styles.responsibilityTitle}>1. RESPONSABILIDADE DA PROPONENTE (ESTEMCO):</Text>
                    <Text style={styles.responsibilityItem}>• Fornecimento de toda mão-de-obra, ferramentas e equipamentos necessários para a execução dos serviços.</Text>
                    <Text style={styles.responsibilityItem}>• Fornecimento e uso obrigatório de EPIs por todos os colaboradores.</Text>
                    <Text style={styles.responsibilityItem}>• Supervisão técnica e execução rigorosa conforme as normas de engenharia vigentes.</Text>
                    {data?.incluirART && (
                        <Text style={styles.responsibilityItem}>• Providenciar e recolher a ART (Anotação de Responsabilidade Técnica) junto ao CREA, conforme valores descritos no investimento.</Text>
                    )}

                    <Text style={styles.responsibilityTitle}>2. RESPONSABILIDADE DO CONTRATANTE:</Text>
                    <Text style={styles.responsibilityItem}>• Limpeza, desobstrução e nivelamento adequado do terreno para movimentação do equipamento.</Text>
                    <Text style={styles.responsibilityItem}>• Demarcação/locação precisa de todos os pontos de perfuração conforme projeto.</Text>
                    <Text style={styles.responsibilityItem}>• Fornecimento de pontos de água e energia elétrica compatíveis com a operação.</Text>
                    <Text style={styles.responsibilityItem}>• Remoção e destino final de todo o solo excedente resultante das perfurações.</Text>
                </View>

                {/* F. INVESTIMENTO E CONDIÇÕES DE PAGAMENTO */}
                <View style={styles.section} wrap={false}>
                    <Text style={styles.sectionHeader}>INVESTIMENTO E CONDIÇÕES DE PAGAMENTO</Text>
                    <View style={styles.investmentGrid}>
                        <View style={styles.investmentCard}>
                            <Text style={styles.cardLabel}>MOBILIZAÇÃO</Text>
                            <Text style={styles.cardValue}>{formatCurrency(data?.mobilizacao || 0)}</Text>
                        </View>
                        {data?.incluirART && (
                            <View style={styles.investmentCard}>
                                <Text style={styles.cardLabel}>TAXA ART</Text>
                                <Text style={styles.cardValue}>{formatCurrency(data?.valorART || 0)}</Text>
                            </View>
                        )}
                        <View style={[styles.investmentCard, styles.totalCard]}>
                            <Text style={[styles.cardLabel, { color: '#ffffff' }]}>VALOR TOTAL ESTIMADO</Text>
                            <Text style={[styles.cardValue, { color: '#ffffff', fontSize: 12 }]}>{formatCurrency(calc?.valorTotal || 0)}</Text>
                        </View>
                    </View>
                    
                    <View style={{ marginTop: 15 }}>
                        <Text style={styles.label}>FATURAMENTO E IMPOSTOS:</Text>
                        <Text style={[styles.value, { marginTop: 2 }]}>
                            {data?.emiteNotaFiscal 
                                ? `Os valores acima contemplam a emissão de Nota Fiscal de Serviços com alíquota de impostos inclusa de ${data?.percentualImposto || 0}%.`
                                : "Os valores apresentados não contemplam a emissão de Nota Fiscal. Caso haja necessidade de faturamento oficial, será acrescida a carga tributária correspondente."
                            }
                        </Text>
                    </View>

                    <View style={{ marginTop: 10 }}>
                        <Text style={styles.label}>CONDIÇÕES DE PAGAMENTO:</Text>
                        <View style={{ marginTop: 4 }}>
                            {(data?.condicoesPagamento || []).map((cp, idx) => (
                                <Text key={idx} style={{ fontSize: 8, marginBottom: 2 }}>
                                    • {cp?.descricao || 'Parcela'}: {cp?.percentual || 0}% ({formatCurrency(((cp?.percentual || 0)/100) * (calc?.valorTotal || 0))}) — {cp?.prazo || 'A combinar'} via {(cp?.formaPagamento || 'PIX').toUpperCase()}
                                </Text>
                            ))}
                        </View>
                    </View>
                </View>

                {/* G. TERMO DE ACEITAÇÃO DA PROPOSTA */}
                <View style={[styles.section, { marginTop: 20 }]} wrap={false}>
                    <Text style={styles.acceptanceTitle}>TERMO DE ACEITAÇÃO DA PROPOSTA</Text>
                    <Text style={styles.acceptanceText}>
                        Ao assinar este documento, o CONTRATANTE declara estar de acordo com as especificações técnicas, prazos, 
                        responsabilidades e condições financeiras descritas nesta proposta, autorizando a ESTEMCO a iniciar o 
                        planejamento e mobilização para a execução da obra. Esta proposta passará a vigorar como contrato de 
                        prestação de serviços para todos os fins legais após a assinatura eletrônica ou física de ambas as partes.
                    </Text>

                    <View style={styles.signatureContainer}>
                        <View style={styles.signatureBox}>
                            <View style={styles.signatureLine} />
                            <Text style={styles.signatureLabel}>ESTEMCO ENGENHARIA LTDA</Text>
                            <Text style={styles.signatureSub}>SOCORRO - SP</Text>
                        </View>
                        <View style={styles.signatureBox}>
                            <View style={styles.signatureLine} />
                            <Text style={styles.signatureLabel}>{data?.clienteNome || 'RESPONSÁVEL DO CLIENTE'}</Text>
                            <Text style={styles.signatureSub}>CPF/CNPJ: __________________________</Text>
                            <Text style={styles.signatureSub}>Data: ____ / ____ / ________</Text>
                        </View>
                    </View>
                </View>

                {/* Footer Page Number */}
                <Text style={{ position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 7, color: '#94a3b8' }} render={({ pageNumber, totalPages }) => (
                    `Página ${pageNumber} de ${totalPages} | Gerado em ${format(new Date(), 'dd/MM HH:mm', { locale: ptBR })}`
                )} />

            </Page>
        </Document>
    );
};

export const generatePropostaBlob = async (data: NovaPropostaData): Promise<Blob> => {
    return await pdf(<PropostaDocument data={data} />).toBlob();
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

export const DownloadPropostaPDF: React.FC<PDFProps> = ({ data }) => {
    const filename = `ORC_${data?.tipo || 'PROPOSTA'}_${(data?.clienteNome || 'CLIENTE').replace(/\s+/g, '_')}.pdf`;

    const handleDownload = async () => {
        try {
            const blob = await generatePropostaBlob(data);
            downloadBlob(blob, filename);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Houve um erro ao gerar o PDF. Por favor, tente novamente.');
        }
    };

    return (
        <button
            onClick={handleDownload}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md font-bold hover:bg-indigo-700 transition-colors shadow-sm gap-2"
        >
            <FileDown size={18} /> Baixar Proposta (PDF)
        </button>
    );
};
