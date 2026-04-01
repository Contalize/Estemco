// src/services/medicaoPdfService.tsx
// Gera o PDF do Contrato de Medição usando @react-pdf/renderer

import React from 'react';
import { Page, Text, View, Document, StyleSheet, pdf } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Medicao } from '../../types';
import { DadosEmpresa } from '../hooks/useEmpresa';

// ── Formatadores ─────────────────────────────────────────────────────────────
const formatCurrency = (valor: number | undefined | null) => {
    if (!valor && valor !== 0) return 'R$ 0,00';
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor); }
    catch { return 'R$ 0,00'; }
};

const safeDate = (dateStr: any, fmt: string): string => {
    if (!dateStr) return '—';
    try {
        const d = dateStr?.toDate ? dateStr.toDate() : new Date(dateStr);
        if (isNaN(d.getTime())) return '—';
        return format(d, fmt, { locale: ptBR });
    } catch { return '—'; }
};

// ── Itens de medição ─────────────────────────────────────────────────────────
export interface ItemMedicao {
    descricao: string;
    unidade: string;
    quantidade: number;
    precoUnitario: number;
    total: number;
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    page: {
        paddingTop: 30,
        paddingBottom: 60,
        paddingHorizontal: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
        color: '#1e293b',
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    companyTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1e1b4b' },
    companyContact: { fontSize: 7, color: '#64748b', marginTop: 4, lineHeight: 1.4 },
    metaText: { fontSize: 8, color: '#64748b', marginTop: 2, textAlign: 'right' },
    titleBar: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'center',
        color: '#ffffff',
        backgroundColor: '#1e1b4b',
        padding: 6,
        marginTop: 8,
        marginBottom: 16,
    },
    sectionHeader: {
        fontSize: 10,
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
    section: { marginBottom: 15 },
    row: { flexDirection: 'row', marginBottom: 4 },
    label: { fontFamily: 'Helvetica-Bold', width: 110, fontSize: 9, color: '#475569' },
    value: { flex: 1, fontSize: 9 },
    table: {
        width: '100%',
        marginTop: 6,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: '#e2e8f0',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomStyle: 'solid',
        borderBottomColor: '#e2e8f0',
        minHeight: 26,
        alignItems: 'center',
    },
    tableHeader: { backgroundColor: '#1e1b4b' },
    tableCol: { padding: 5, flex: 1 },
    tableCellHeader: { fontSize: 9, color: '#ffffff', fontFamily: 'Helvetica-Bold' },
    tableCell: { fontSize: 9, color: '#1e293b' },
    textCenter: { textAlign: 'center' },
    textRight: { textAlign: 'right' },
    totalBox: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 8,
        gap: 8,
    },
    totalCard: {
        backgroundColor: '#f0fdf4',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: '#86efac',
        borderRadius: 4,
        padding: 8,
        alignItems: 'flex-end',
    },
    totalLabel: { fontSize: 7, color: '#166534', textTransform: 'uppercase', letterSpacing: 1 },
    totalValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#059669', marginTop: 2 },
    signatureContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 50 },
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
    separator: {
        borderBottomWidth: 1,
        borderBottomStyle: 'solid',
        borderBottomColor: '#e2e8f0',
        marginVertical: 8,
    },
    observacoesBox: {
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: '#e2e8f0',
        borderRadius: 4,
        padding: 10,
        marginTop: 4,
        minHeight: 50,
    },
    observacoesText: { fontSize: 8, color: '#475569', lineHeight: 1.4 },
    statusBadge: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: '#0369a1',
        backgroundColor: '#e0f2fe',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 7,
        color: '#94a3b8',
    },
});

// ── Documento PDF ────────────────────────────────────────────────────────────
interface MedicaoPDFProps {
    medicao: Medicao;
    itens?: ItemMedicao[];
    empresa?: DadosEmpresa;
    obraEndereco?: string;
    propostaNumero?: string;
}

const MedicaoDocument: React.FC<MedicaoPDFProps> = ({ medicao, itens = [], empresa, obraEndereco, propostaNumero }) => {
    const dataEmissao = safeDate(medicao.dataEmissao, "dd 'de' MMMM 'de' yyyy");
    const dataVencimento = safeDate(medicao.dataVencimento, "dd/MM/yyyy");
    const numeroFormatado = `MED-${String(medicao.numero).padStart(4, '0')}`;

    const totalCalculado = itens.length > 0
        ? itens.reduce((acc, item) => acc + (item.total || 0), 0)
        : medicao.valorMedido;

    const statusLabel: Record<string, string> = {
        'Pendente': 'PENDENTE',
        'Enviada ao Cliente': 'ENVIADA AO CLIENTE',
        'Aprovada': 'APROVADA',
        'Paga': 'PAGA',
    };

    return (
        <Document title={`Medição ${numeroFormatado} — ${medicao.clienteNome}`}>
            <Page size="A4" style={styles.page}>
                {/* CABEÇALHO */}
                <View style={styles.headerRow} fixed>
                    <View>
                        <Text style={styles.companyTitle}>{empresa?.razaoSocial || 'ESTEMCO - ENGENHARIA EM FUNDAÇÕES'}</Text>
                        <Text style={styles.companyContact}>
                            {empresa?.endereco || 'Rod. Capitão Barduíno, Km 131 - Margem da SP 008 - Socorro/SP'}{"\n"}
                            Tel: {empresa?.telefone || '(19) 3895-2630'} | {empresa?.email || 'contato@estemco.com.br'}{"\n"}
                            CNPJ: {empresa?.cnpj || '57.486.102/0001-86'}
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.metaText}>Nº {numeroFormatado}</Text>
                        <Text style={styles.metaText}>Emitida em: {safeDate(medicao.dataEmissao, 'dd/MM/yyyy')}</Text>
                        <Text style={[styles.statusBadge, { marginTop: 4 }]}>{statusLabel[medicao.status] || medicao.status}</Text>
                    </View>
                </View>

                <Text style={styles.titleBar}>CONTRATO DE MEDIÇÃO DE SERVIÇOS</Text>

                {/* IDENTIFICAÇÃO */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>I. Identificação</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>CLIENTE:</Text>
                        <Text style={styles.value}>{medicao.clienteNome || '—'}</Text>
                    </View>
                    {obraEndereco && (
                        <View style={styles.row}>
                            <Text style={styles.label}>LOCAL DA OBRA:</Text>
                            <Text style={styles.value}>{obraEndereco}</Text>
                        </View>
                    )}
                    {propostaNumero && (
                        <View style={styles.row}>
                            <Text style={styles.label}>PROPOSTA REF.:</Text>
                            <Text style={styles.value}>{propostaNumero}</Text>
                        </View>
                    )}
                    <View style={styles.row}>
                        <Text style={styles.label}>DATA DE EMISSÃO:</Text>
                        <Text style={styles.value}>{dataEmissao}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>VENCIMENTO:</Text>
                        <Text style={styles.value}>{dataVencimento}</Text>
                    </View>
                    {medicao.nfNumero && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Nº NOTA FISCAL:</Text>
                            <Text style={styles.value}>{medicao.nfNumero}</Text>
                        </View>
                    )}
                </View>

                {/* SERVIÇOS MEDIDOS */}
                <View style={styles.section} wrap={false}>
                    <Text style={styles.sectionHeader}>II. Serviços Medidos</Text>
                    {itens.length > 0 ? (
                        <>
                            <View style={styles.table}>
                                <View style={[styles.tableRow, styles.tableHeader]}>
                                    <View style={[styles.tableCol, { width: '40%' }]}>
                                        <Text style={styles.tableCellHeader}>DESCRIÇÃO DO SERVIÇO</Text>
                                    </View>
                                    <View style={[styles.tableCol, { width: '10%' }]}>
                                        <Text style={[styles.tableCellHeader, styles.textCenter]}>UNID.</Text>
                                    </View>
                                    <View style={[styles.tableCol, { width: '15%' }]}>
                                        <Text style={[styles.tableCellHeader, styles.textCenter]}>QTDE.</Text>
                                    </View>
                                    <View style={[styles.tableCol, { width: '17%' }]}>
                                        <Text style={[styles.tableCellHeader, styles.textRight]}>PREÇO UNIT.</Text>
                                    </View>
                                    <View style={[styles.tableCol, { width: '18%' }]}>
                                        <Text style={[styles.tableCellHeader, styles.textRight]}>TOTAL</Text>
                                    </View>
                                </View>
                                {itens.map((item, i) => (
                                    <View key={i} style={styles.tableRow}>
                                        <View style={[styles.tableCol, { width: '40%' }]}>
                                            <Text style={styles.tableCell}>{item.descricao}</Text>
                                        </View>
                                        <View style={[styles.tableCol, { width: '10%' }]}>
                                            <Text style={[styles.tableCell, styles.textCenter]}>{item.unidade}</Text>
                                        </View>
                                        <View style={[styles.tableCol, { width: '15%' }]}>
                                            <Text style={[styles.tableCell, styles.textCenter]}>
                                                {item.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </Text>
                                        </View>
                                        <View style={[styles.tableCol, { width: '17%' }]}>
                                            <Text style={[styles.tableCell, styles.textRight]}>{formatCurrency(item.precoUnitario)}</Text>
                                        </View>
                                        <View style={[styles.tableCol, { width: '18%' }]}>
                                            <Text style={[styles.tableCell, styles.textRight]}>{formatCurrency(item.total)}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </>
                    ) : (
                        <View style={{ padding: 10, backgroundColor: '#f8fafc', borderRadius: 4 }}>
                            <Text style={{ fontSize: 9, color: '#64748b', textAlign: 'center' }}>
                                Valor global conforme execução registrada.
                            </Text>
                        </View>
                    )}

                    {/* Total */}
                    <View style={styles.totalBox}>
                        <View style={styles.totalCard}>
                            <Text style={styles.totalLabel}>Valor Total da Medição</Text>
                            <Text style={styles.totalValue}>{formatCurrency(totalCalculado)}</Text>
                        </View>
                    </View>
                </View>

                {/* OBSERVAÇÕES */}
                {medicao.observacoes && (
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>III. Observações</Text>
                        <View style={styles.observacoesBox}>
                            <Text style={styles.observacoesText}>{medicao.observacoes}</Text>
                        </View>
                    </View>
                )}

                {/* ASSINATURAS */}
                <View style={styles.signatureContainer} wrap={false}>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>{empresa?.razaoSocial || 'ESTEMCO ENGENHARIA EM FUNDAÇÕES'}</Text>
                        <Text style={styles.signatureSub}>CNPJ: {empresa?.cnpj || '57.486.102/0001-86'}</Text>
                        <Text style={styles.signatureSub}>DATA: ____/____/________</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>{medicao.clienteNome}</Text>
                        <Text style={styles.signatureSub}>RESPONSÁVEL / ASSINATURA</Text>
                        <Text style={styles.signatureSub}>DATA: ____/____/________</Text>
                    </View>
                </View>

                {/* RODAPÉ */}
                <Text
                    style={styles.footer}
                    render={({ pageNumber, totalPages }) =>
                        `Página ${pageNumber} de ${totalPages} | ${empresa?.razaoSocial || 'Estemco Engenharia'} | CNPJ ${empresa?.cnpj || '57.486.102/0001-86'}`
                    }
                    fixed
                />
            </Page>
        </Document>
    );
};

// ── Exportações ──────────────────────────────────────────────────────────────
export const generateMedicaoBlob = async (
    medicao: Medicao,
    itens?: ItemMedicao[],
    empresa?: DadosEmpresa,
    obraEndereco?: string,
    propostaNumero?: string,
): Promise<Blob> => {
    return await pdf(
        <MedicaoDocument
            medicao={medicao}
            itens={itens}
            empresa={empresa}
            obraEndereco={obraEndereco}
            propostaNumero={propostaNumero}
        />
    ).toBlob();
};

export const downloadMedicaoBlob = (blob: Blob, numero: number, clienteNome: string) => {
    const filename = `Medicao_${String(numero).padStart(4, '0')}_${(clienteNome || 'Cliente').replace(/\s+/g, '_')}.pdf`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
