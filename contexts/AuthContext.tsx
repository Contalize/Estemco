import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type UserRole = 'Administrador' | 'Comercial' | 'Engenheiro';

export interface UserProfile {
  role: UserRole;
  tenantId: string;
  nome?: string;
  nomeEmpresa?: string;
  cnpjEmpresa?: string;
  permissoes?: any; // To avoid circular deep type issues right here, though pulling from types.ts is better
}

export const defaultPermissions = {
  Administrador: {
    dashboard: { ver: true },
    orcamento: { ver: true, criar: true, editar: true, aprovar: true },
    clientes: { ver: true, criar: true, editar: true, excluir: true },
    obras: { ver: true, editar: true, mudarStatus: true },
    boletim: { ver: true, criar: true, editar: true },
    dre: { ver: true },
    financeiro: { ver: true, lancar: true },
    calendario: { ver: true },
    equipe: { ver: true, gerenciar: true },
    configuracoes: { ver: true, editar: true },
  },
  Comercial: {
    dashboard: { ver: true },
    orcamento: { ver: true, criar: true, editar: true, aprovar: false },
    clientes: { ver: true, criar: true, editar: true, excluir: false },
    obras: { ver: true, editar: false, mudarStatus: false },
    boletim: { ver: false, criar: false, editar: false },
    dre: { ver: false },
    financeiro: { ver: false, lancar: false },
    calendario: { ver: true },
    equipe: { ver: false, gerenciar: false },
    configuracoes: { ver: false, editar: false },
  },
  Engenheiro: {
    dashboard: { ver: true },
    orcamento: { ver: false, criar: false, editar: false, aprovar: false },
    clientes: { ver: false, criar: false, editar: false, excluir: false },
    obras: { ver: true, editar: true, mudarStatus: false },
    boletim: { ver: true, criar: true, editar: false },
    dre: { ver: false },
    financeiro: { ver: false, lancar: false },
    calendario: { ver: true },
    equipe: { ver: false, gerenciar: false },
    configuracoes: { ver: false, editar: false },
  }
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            // Inject default permissions if the user doesn't have the new mapping
            if (!data.permissoes) {
              data.permissoes = defaultPermissions[data.role];
            }
            setProfile(data);
          } else {
            // Fallback: If user doc is missing, we MUST create it so firestore.rules 
            // (which rely on getTenantId()) don't reject everything.
            import('firebase/firestore').then(({ setDoc }) => {
              const defaultProfile: UserProfile = {
                role: 'Engenheiro',
                tenantId: `tenant_${currentUser.uid}`,
                nome: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuário',
                permissoes: defaultPermissions['Engenheiro']
              };
              setDoc(docRef, defaultProfile).then(() => {
                setProfile(defaultProfile);
              }).catch(err => {
                console.error("Failed to automatically create missing user document:", err);
                setProfile(defaultProfile); // Still set it in memory
              });
            });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, profile, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
