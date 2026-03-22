import { formatarData } from './formatDate';

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

export function formatShortDate(dateStr: string | Date): string {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return String(dateStr);
        return date.toISOString().split('T')[0];
    } catch {
        return String(dateStr);
    }
}

export function montarTituloProposta(proposta: any, cliente: any): string {
    const numero = proposta?.numero || proposta?.id || 'NOVA';
    const tipo = proposta?.tipo || 'HCM';
    const clienteNome = cliente?.nomeRazaoSocial || cliente?.clienteNome || proposta?.clienteNome || 'Cliente não identificado';
    
    let cidadeUF = 'Local não informado';
    const local = cliente?.enderecoObra || proposta?.enderecoObra;
    if (local?.cidade && local?.estado) {
        cidadeUF = `${local.cidade}/${local.estado}`;
    } else if (local?.cidade) {
        cidadeUF = local.cidade;
    }

    const dataOriginal = proposta?.dataEmissao || proposta?.criadoEm || new Date();
    const dataFormatada = formatarData(dataOriginal, 'curto');

    return `Proposta ${numero}-${tipo} · ${clienteNome} · ${cidadeUF} · ${dataFormatada}`;
}

export function montarNomeArquivoProposta(proposta: any, cliente: any): string {
    const numero = proposta?.numero || proposta?.id || 'NOVA';
    const tipo = proposta?.tipo || 'HCM';
    const clienteNome = (cliente?.nomeRazaoSocial || cliente?.clienteNome || proposta?.clienteNome || 'Cliente').toUpperCase();
    
    // Fallback if city or state is missing
    const local = cliente?.enderecoObra || proposta?.enderecoObra;
    let localString = '';
    if (local?.cidade && local?.estado) {
        localString = ` - ${local.cidade}-${local.estado}`.toUpperCase();
    } else if (local?.cidade) {
        localString = ` - ${local.cidade}`.toUpperCase();
    } else if (local?.estado) {
        localString = ` - ${local.estado}`.toUpperCase();
    }

    // ORÇ. [NUMERO_PROPOSTA]-[TIPO] - [NOME_CLIENTE] - [CIDADE]-[UF].pdf
    const baseName = `ORÇ. ${numero}-${tipo} - ${clienteNome}${localString}`;
    
    // Replace characters that are invalid in file names, but keep spaces and hyphens
    const safeName = baseName.replace(/[<>:"/\\|?*]/g, '').trim();
    
    return `${safeName}.pdf`;
}
