import { Timestamp } from 'firebase/firestore';

export function formatarData(data: any, formato: 'curto' | 'longo' | 'datetime' = 'curto'): string {
    if (!data) return '—';

    let date: Date;

    if (data?.toDate && typeof data.toDate === 'function') {
        // Timestamp do Firestore
        date = data.toDate();
    } else if (data instanceof Date) {
        date = data;
    } else if (typeof data === 'string' || typeof data === 'number') {
        date = new Date(data);
    } else {
        return 'Data inválida';
    }

    if (isNaN(date.getTime())) return 'Data inválida';

    const opts: Intl.DateTimeFormatOptions = formato === 'longo'
        ? { day: '2-digit', month: 'long', year: 'numeric' }
        : formato === 'datetime'
            ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
            : { day: '2-digit', month: '2-digit', year: 'numeric' };

    return date.toLocaleDateString('pt-BR', opts);
}
