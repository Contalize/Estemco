import React from 'react';
import { Page, Text, View, Document, StyleSheet, PDFDownloadLink, Image, Font, pdf } from '@react-pdf/renderer';
import { NovaPropostaData } from '../types/propostaForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileDown } from 'lucide-react';
import { calcularPropostaHCM, calcularPropostaESC, calcularPropostaSPT } from '../utils/calculosProposta';
import { ItemProposta, ItemFuroSPT } from '../../types';

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
        color: '#334155',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottom: '1px solid #cbd5e1',
        paddingBottom: 20,
        marginBottom: 20,
    },
    logoContainer: {
        flexDirection: 'column',
    },
    companyName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e1b4b',
    },
    companySub: {
        fontSize: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: '#64748b',
        marginTop: 2,
    },
    headerInfo: {
        textAlign: 'right',
    },
    title: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    meta: {
        fontSize: 9,
        color: '#64748b',
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        backgroundColor: '#f8fafc',
        padding: 6,
        borderLeft: '4px solid #4f46e5',
        marginBottom: 10,
        marginTop: 15,
    },
    grid: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 15,
    },
    column: {
        flex: 1,
    },
    label: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#94a3b8',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    value: {
        fontSize: 10,
        fontWeight: 'semibold',
    },
    table: {
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    tableRow: {
        margin: 'auto',
        flexDirection: 'row',
    },
    tableColHeader: {
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderLeftWidth: 0,
        borderTopWidth: 0,
        backgroundColor: '#f8fafc',
        padding: 5,
        fontWeight: 'bold',
    },
    tableCol: {
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderLeftWidth: 0,
        borderTopWidth: 0,
        padding: 5,
    },
    tableCell: {
        margin: 'auto',
        fontSize: 9,
    },
    footerTable: {
        flexDirection: 'row',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 5,
        fontWeight: 'bold',
    },
    executionBox: {
        backgroundColor: '#f5f7ff',
        padding: 10,
        border: '1px solid #e0e7ff',
        borderRadius: 4,
        marginTop: 10,
    },
    executionText: {
        fontSize: 10,
        color: '#1e1b4b',
        lineHeight: 1.5,
    },
    investmentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 15,
        gap: 10,
    },
    investmentCard: {
        flex: 1,
        padding: 8,
        border: '1px solid #e2e8f0',
        borderRadius: 4,
        textAlign: 'center',
    },
    totalCard: {
        backgroundColor: '#1e1b4b',
        color: '#ffffff',
        borderColor: '#1e1b4b',
    },
    disclaimer: {
        fontSize: 8,
        color: '#94a3b8',
        marginTop: 30,
        paddingTop: 10,
        borderTop: '1px solid #f1f5f9',
    },
    signatureSection: {
        marginTop: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    signatureLine: {
        borderTop: '1px solid #334155',
        width: 200,
        marginTop: 40,
        paddingTop: 5,
        textAlign: 'center',
    },
    signatureInfo: {
        fontSize: 8,
        color: '#64748b',
    },
    clause: {
        fontSize: 8,
        color: '#475569',
        marginBottom: 4,
        lineHeight: 1.4,
    }
});

interface PDFProps {
    data: NovaPropostaData;
}

const PropostaDocument: React.FC<PDFProps> = ({ data }) => {
    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return 'A combinar';
        try {
            return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    let calc: any = { linhasDetalhadas: [], valorTotal: 0, valorMobilizacao: 0, valorART: 0, valorImposto: 0 };
    if (data.tipo === 'HCM') calc = calcularPropostaHCM(data.itens as ItemProposta[], data.mobilizacao, data.faturamentoMinimo, data.incluirART, data.valorART, data.emiteNotaFiscal, data.percentualImposto);
    if (data.tipo === 'ESC') calc = calcularPropostaESC(data.itens as ItemProposta[], data.mobilizacao, data.modalidadeESC, data.precoFechadoESC, data.metrosDiariosESC, data.precoExcedenteESC, data.faturamentoMinimo, data.incluirART, data.valorART, data.emiteNotaFiscal, data.percentualImposto);
    if (data.tipo === 'SPT') calc = calcularPropostaSPT(data.itens as ItemFuroSPT[], data.mobilizacao, data.incluirART, data.valorART, data.emiteNotaFiscal, data.percentualImposto);

    const totalMetros = data.itens.reduce((acc, item) => acc + (item.totalMetros || item.profundidade || 0), 0);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Text style={styles.companyName}>ESTEMCO</Text>
                        <Text style={styles.companySub}>Engenharia de Fundações</Text>
                        <Text style={{ fontSize: 7, marginTop: 10, color: '#94a3b8' }}>Rod. Capitão Barduíno, Km 131 - Socorro/SP</Text>
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.title}>PROPOSTA DE PRESTAÇÃO DE SERVIÇO</Text>
                        <Text style={styles.meta}>Nº {data.tipo || '---'}-{format(new Date(), 'yyyyMMdd')}</Text>
                        <Text style={styles.meta}>Data de emissão: {format(new Date(), 'dd/MM/yyyy')}</Text>
                        <Text style={styles.meta}>Validade: {data.validadeProposta} dias</Text>
                    </View>
                </View>

                {/* Identification */}
                <View style={styles.grid}>
                    <View style={styles.column}>
                        <Text style={styles.label}>Cliente / Contratante</Text>
                        <Text style={styles.value}>{data.clienteNome || '---'}</Text>
                    </View>
                    <View style={styles.column}>
                        <Text style={styles.label}>Local da Obra</Text>
                        <Text style={styles.value}>{data.enderecoObra.logradouro}, {data.enderecoObra.numero}</Text>
                        <Text style={[styles.value, { color: '#64748b', fontSize: 9 }]}>{data.enderecoObra.bairro} - {data.enderecoObra.cidade}/{data.enderecoObra.estado}</Text>
                    </View>
                </View>

                {/* Technical Specs */}
                <Text style={styles.sectionTitle}>Especificações Técnicas</Text>
                <View style={styles.table}>
                    <View style={styles.tableRow}>
                        <View style={[styles.tableColHeader, { width: '40%' }]}><Text style={styles.tableCell}>Descrição</Text></View>
                        <View style={[styles.tableColHeader, { width: '15%' }]}><Text style={styles.tableCell}>Ø (mm)</Text></View>
                        <View style={[styles.tableColHeader, { width: '15%' }]}><Text style={styles.tableCell}>Qtd</Text></View>
                        <View style={[styles.tableColHeader, { width: '15%' }]}><Text style={styles.tableCell}>Comp. (m)</Text></View>
                        <View style={[styles.tableColHeader, { width: '15%' }]}><Text style={styles.tableCell}>Total (m)</Text></View>
                    </View>
                    {data.itens.map((item, i) => (
                        <View style={styles.tableRow} key={i}>
                            <View style={[styles.tableCol, { width: '40%' }]}><Text style={styles.tableCell}>{item.descricao || (data.tipo === 'SPT' ? `Furo ${item.numeroFuro}` : 'Item de Serviço')}</Text></View>
                            <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{item.diametro || '---'}</Text></View>
                            <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{item.quantidadeEstacas || item.quantidade || 1}</Text></View>
                            <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{item.comprimentoUnitario || item.profundidade || 0}</Text></View>
                            <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{item.totalMetros || item.profundidade || 0}m</Text></View>
                        </View>
                    ))}
                    <View style={styles.footerTable}>
                        <Text style={{ width: '85%', textAlign: 'right', paddingRight: 10, fontSize: 8 }}>METRAGEM TOTAL ESTIMADA:</Text>
                        <Text style={{ width: '15%', textAlign: 'left' }}>{totalMetros}m</Text>
                    </View>
                </View>

                {/* Execution Clause */}
                <View style={styles.executionBox}>
                    <Text style={[styles.label, { color: '#4f46e5' }]}>Prazos de Execução</Text>
                    <Text style={styles.executionText}>
                        Levando em conta o quantitativo acima, o prazo de execução será de {data.diasExecucao || 0} dias úteis. 
                        O início das atividades está previsto para o dia {formatDate(data.dataPrevistaInicio)}.
                        {data.textoPrazoExecucao ? `\nObs: ${data.textoPrazoExecucao}` : ''}
                    </Text>
                </View>

                {/* Investment */}
                <Text style={styles.sectionTitle}>Investimento e Condições</Text>
                <View style={styles.investmentRow}>
                    <View style={styles.investmentCard}>
                        <Text style={styles.label}>Mobilização</Text>
                        <Text style={styles.value}>R$ {data.mobilizacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                    </View>
                    {data.incluirART && (
                        <View style={styles.investmentCard}>
                            <Text style={styles.label}>Taxa ART</Text>
                            <Text style={styles.value}>R$ {data.valorART.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                        </View>
                    )}
                    {data.emiteNotaFiscal && (
                        <View style={styles.investmentCard}>
                            <Text style={styles.label}>Impostos ({data.percentualImposto}%)</Text>
                            <Text style={[styles.value, { color: '#dc2626' }]}>R$ {calc.valorImposto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                        </View>
                    )}
                    <View style={[styles.investmentCard, styles.totalCard]}>
                        <Text style={[styles.label, { color: '#ffffff', opacity: 0.8 }]}>Valor Total Final</Text>
                        <Text style={[styles.value, { fontSize: 12 }]}>R$ {calc.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                    </View>
                </View>

                <View style={{ marginTop: 10 }}>
                    <Text style={styles.label}>Formas de Pagamento:</Text>
                    {data.condicoesPagamento.map((cp, i) => (
                        <Text key={i} style={{ fontSize: 8, marginTop: 2 }}>
                            • {cp.descricao}: {cp.percentual}% (R$ {((cp.percentual/100)*calc.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) — {cp.prazo} via {cp.formaPagamento.toUpperCase()}
                        </Text>
                    ))}
                </View>

                {/* Standard Responsibilities & Clauses */}
                <Text style={styles.sectionTitle}>Cláusulas e Responsabilidades</Text>
                <View style={{ padding: 5 }}>
                    {data.incluirART && (
                        <Text style={styles.clause}>• ART: A responsabilidade técnica será comprovada mediante recolhimento de ART junto ao CREA, inclusa no valor.</Text>
                    )}
                    {data.emiteNotaFiscal ? (
                        <Text style={styles.clause}>• FATURAMENTO: Inclusa a emissão de Nota Fiscal com incidência de {data.percentualImposto}% de impostos.</Text>
                    ) : (
                        <Text style={styles.clause}>• IMPOSTOS: Valores sem Nota Fiscal. Caso necessária, será acrescida a carga tributária correspondente.</Text>
                    )}
                    <Text style={styles.clause}>• CONTRATANTE: Garantir acesso, pontos de energia/água, locação dos eixos e remoção de solo excedente.</Text>
                    <Text style={styles.clause}>• CONTRATADA: Fornecer equipamento, mão de obra qualificada e supervisão técnica.</Text>
                </View>

                {/* Acceptance */}
                <View style={styles.signatureSection}>
                    <View>
                        <Text style={styles.signatureLine}>Estemco Engenharia</Text>
                        <Text style={styles.signatureInfo}>CNPJ: 00.000.000/0000-00</Text>
                    </View>
                    <View>
                        <Text style={styles.signatureLine}>{data.clienteNome || 'Assinatura do Cliente'}</Text>
                        <Text style={styles.signatureInfo}>Aceite em: ____/____/________</Text>
                    </View>
                </View>

                <View style={styles.disclaimer}>
                    <Text>Observações: {data.observacoes || 'Sem observações adicionais.'}</Text>
                    <Text style={{ marginTop: 5 }}>Documento gerado eletronicamente pelo Sistema Estemco.</Text>
                </View>
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
    const filename = `ORC_${data.tipo || 'PROPOSTA'}_${data.clienteNome.replace(/\s+/g, '_')}.pdf`;

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
