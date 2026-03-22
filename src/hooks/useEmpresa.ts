import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

export interface DadosEmpresa {
  razaoSocial: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  whatsapp?: string;
  email: string;
  logoUrl?: string;
}

export function useEmpresa() {
  const { profile } = useAuth();
  const [empresa, setEmpresa] = useState<DadosEmpresa | null>(null);

  useEffect(() => {
    if (!profile?.tenantId) return;
    const ref = doc(db, 'empresas', profile.tenantId);
    getDoc(ref).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setEmpresa({
          razaoSocial: d.razaoSocial || d.nomeEmpresa || 'Empresa',
          cnpj: d.cnpj || d.cnpjEmpresa || '',
          endereco: d.endereco || '',
          telefone: d.telefone || '',
          whatsapp: d.whatsapp || '',
          email: d.email || d.emailContato || '',
          logoUrl: d.logoUrl || '',
        });
      }
    });
  }, [profile?.tenantId]);

  return { empresa };
}
