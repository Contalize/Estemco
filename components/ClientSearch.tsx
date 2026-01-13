import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Cliente } from '../types';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, orderBy, where, limit } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';

interface ClientSearchProps {
    onSelect: (client: Cliente) => void;
}

export const ClientSearch: React.FC<ClientSearchProps> = ({ onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showResults, setShowResults] = useState(false);

    // Debounce Logic
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // React Query for Caching & State Management
    const { data: results = [], isLoading } = useQuery({
        queryKey: ['clients', debouncedSearch],
        queryFn: async () => {
            // STRATEGY: Fetch recent clients and filter client-side for best UX on small datasets
            // This avoids Firestore case-sensitivity and "startWith" limitations
            const q = query(collection(db, 'clients'), limit(100));
            const querySnapshot = await getDocs(q);
            const allClients = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cliente));

            if (!debouncedSearch) return allClients.slice(0, 5); // Show 5 recents if empty

            const term = (debouncedSearch || '').toLowerCase();
            return allClients.filter(c =>
                (c.razaoSocial || '').toLowerCase().includes(term) ||
                (c.nomeFantasia || '').toLowerCase().includes(term) ||
                (c.documento || '').includes(term) ||
                (c.cnpj || '').includes(term)
            );
        },
        staleTime: 1000 * 60 * 5,
    });

    useEffect(() => {
        if ((debouncedSearch || '').length >= 2) {
            setShowResults(true);
        } else {
            setShowResults(false);
        }
    }, [debouncedSearch]);

    return (
        <div className="relative w-full">
            <div className="relative">
                <Search className={`absolute left-3 top-2.5 ${isLoading ? 'text-blue-400 animate-pulse' : 'text-slate-400'}`} size={18} />
                <input
                    className="w-full pl-10 p-2 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="Buscar Cliente (Nome, CPF/CNPJ)..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onFocus={() => { if ((results?.length || 0) > 0) setShowResults(true); }}
                />
            </div>

            {showResults && (results?.length || 0) > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto z-50">
                    {results.map(c => (
                        <button
                            key={c.id}
                            onClick={() => {
                                onSelect(c);
                                setSearchTerm('');
                                setShowResults(false);
                            }}
                            className="w-full text-left p-3 hover:bg-blue-50 border-b last:border-0 transition-colors"
                        >
                            <p className="font-bold text-sm text-slate-800">{c.razaoSocial || 'Sem Nome'}</p>
                            <div className="flex justify-between items-center mt-1">
                                <p className="text-xs text-slate-500 font-mono">{c.documento || c.cnpj || 'S/ Doc'}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-medium bg-slate-100 px-1 rounded">
                                    {(c.endereco?.cidade || '')} - {(c.endereco?.bairro || '')}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {(debouncedSearch || '').length > 1 && (results?.length || 0) === 0 && !isLoading && showResults && (
                <div className="mt-2 text-xs text-slate-400 text-center">Nenhum cliente encontrado.</div>
            )}
        </div>
    );
};
