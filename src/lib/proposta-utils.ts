import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function montarTituloProposta(dados: {
  numero: string;
  tipo: string;
  cliente: string;
  cidade: string;
  uf: string;
  data: Date | string;
}) {
  const dataObj = typeof dados.data === 'string' ? new Date(dados.data) : dados.data;
  const dataFormatada = format(dataObj, 'dd/MM/yyyy', { locale: ptBR });
  return `Proposta ${dados.numero}-${dados.tipo} · ${dados.cliente} · ${dados.cidade}/${dados.uf} · ${dataFormatada}`;
}
