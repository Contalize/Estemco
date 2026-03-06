import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Card, Input, Button, Label } from './ui';
import { Building2, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        
        // Check if there is an invitation for this email
        const q = query(collection(db, 'invitations'), where('email', '==', email));
        const querySnapshot = await getDocs(q);
        
        let role = 'Administrador';
        let tenantId = `tenant_${userCred.user.uid}`;
        let nome = email.split('@')[0];

        if (!querySnapshot.empty) {
          const inviteDoc = querySnapshot.docs[0];
          const inviteData = inviteDoc.data();
          role = inviteData.role;
          tenantId = inviteData.tenantId;
          
          // Delete the invitation after use
          await deleteDoc(inviteDoc.ref);
        }

        // Create user profile in Firestore
        await setDoc(doc(db, 'users', userCred.user.uid), {
          email,
          role,
          tenantId,
          nome,
          createdByUserId: userCred.user.uid,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao autenticar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <Card className="w-full max-w-md p-8 shadow-xl border-slate-200">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-slate-900 p-4 rounded-2xl mb-4 shadow-md">
            <Building2 className="text-white" size={36} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Estemco CRM</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isLogin ? 'Faça login para acessar o sistema' : 'Crie sua conta de acesso'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Email</Label>
            <Input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              placeholder="seu@email.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Senha</Label>
            <Input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full mt-2" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? 'Entrar' : 'Criar Conta')}
          </Button>
        </form>

        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          <button 
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }} 
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            {isLogin ? 'Não tem conta? Registe-se aqui' : 'Já tem conta? Faça login'}
          </button>
        </div>
      </Card>
    </div>
  );
};
