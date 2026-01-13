import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export function Login({ onLogin }: { onLogin: (user: any) => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Login com Email/Senha
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            onLogin(userCredential.user);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential') setError('E-mail ou senha incorretos.');
            else if (err.code === 'auth/too-many-requests') setError('Muitas tentativas. Aguarde um momento.');
            else setError('Erro ao conectar. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    // Login com Google
    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        const provider = new GoogleAuthProvider();

        try {
            const result = await signInWithPopup(auth, provider);
            onLogin(result.user);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/popup-closed-by-user') setError('Login cancelado.');
            else setError('Erro ao conectar com Google.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-50">

            {/* LADO ESQUERDO - BRANDING */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center">
                <div
                    className="absolute inset-0 z-0 opacity-40"
                    style={{
                        backgroundImage: "url('https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=2070&auto=format&fit=crop')",
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'grayscale(100%)'
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-900/40 z-10" />

                <div className="relative z-20 text-center px-12">
                    <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/20">
                        <span className="text-4xl font-extrabold text-white">E</span>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">ESTEMCO ERP</h1>
                    <p className="text-slate-300 text-lg leading-relaxed max-w-md mx-auto">
                        Plataforma de Gestão Integrada para Engenharia de Fundações.
                    </p>
                </div>
            </div>

            {/* LADO DIREITO - FORMULÁRIO */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
                <div className="max-w-md w-full animate-in slide-in-from-right-10 duration-700">

                    <div className="text-center lg:text-left mb-8">
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">Acesso Restrito</h2>
                        <p className="text-slate-500">Entre com suas credenciais corporativas.</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r flex items-center gap-3 mb-6 animate-in fade-in">
                            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                            <span className="text-sm text-red-700 font-medium">{error}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Botão Google */}
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm"
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                            Entrar com Google
                        </button>

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-slate-200"></div>
                            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">Ou via E-mail</span>
                            <div className="flex-grow border-t border-slate-200"></div>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">E-mail</label>
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-800 font-medium"
                                        placeholder="nome@estemco.com.br"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Senha</label>
                                    <a href="#" className="text-xs text-blue-600 hover:underline">Esqueceu?</a>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-800 font-medium"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading ? <Loader2 size={20} className="animate-spin" /> : <>Acessar Painel <ArrowRight size={20} /></>}
                            </button>
                        </form>
                    </div>

                    <p className="mt-8 text-center text-xs text-slate-400">
                        &copy; 2025 Estemco Engenharia. Acesso monitorado.
                    </p>
                </div>
            </div>
        </div>
    );
}
