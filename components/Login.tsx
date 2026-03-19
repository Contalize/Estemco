import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

/* ─────────────────────────────────────────────
   PROVIDERS
───────────────────────────────────────────── */
const googleProvider = new GoogleAuthProvider();
const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({ prompt: 'select_account' });

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
async function ensureUserProfile(uid: string, email: string, nome: string) {
  const q = query(collection(db, 'invitations'), where('email', '==', email));
  const snap = await getDocs(q);

  let role = 'Engenheiro';
  let tenantId = `tenant_${uid}`;

  if (!snap.empty) {
    const inv = snap.docs[0];
    const invData = inv.data();
    role = invData.role;
    tenantId = invData.tenantId;
    await deleteDoc(inv.ref);
  }

  await setDoc(
    doc(db, 'users', uid),
    { email, role, tenantId, nome, createdAt: new Date().toISOString() },
    { merge: true }
  );
}

/* ─────────────────────────────────────────────
   ICON COMPONENTS
───────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const MicrosoftIcon = () => (
  <svg viewBox="0 0 23 23" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path fill="#f3f3f3" d="M0 0h23v23H0z" />
    <path fill="#f35325" d="M1 1h10v10H1z" />
    <path fill="#81bc06" d="M12 1h10v10H12z" />
    <path fill="#05a6f0" d="M1 12h10v10H1z" />
    <path fill="#ffba08" d="M12 12h10v10H12z" />
  </svg>
);

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.8}>
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export const Login: React.FC = () => {
  // mode: 'login' | 'register' | 'forgot'
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSocial, setLoadingSocial] = useState<'google' | 'microsoft' | null>(null);

  const clearMessages = () => { setError(''); setInfo(''); };

  /* ── Email/Password ── */
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await ensureUserProfile(cred.user.uid, email, email.split('@')[0]);
      }
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/user-not-found': 'Nenhuma conta encontrada com este e-mail.',
        'auth/wrong-password': 'Senha incorreta. Tente novamente.',
        'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
        'auth/weak-password': 'A senha deve ter no mínimo 6 caracteres.',
        'auth/invalid-email': 'Endereço de e-mail inválido.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
      };
      setError(msg[err.code] || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Forgot Password ── */
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setInfo('Link enviado! Verifique sua caixa de entrada (e spam).');
    } catch (err: any) {
      setError('Não foi possível enviar o e-mail. Verifique o endereço.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Social Providers ── */
  const handleSocial = async (provider: 'google' | 'microsoft') => {
    clearMessages();
    setLoadingSocial(provider);
    try {
      const p = provider === 'google' ? googleProvider : microsoftProvider;
      const result = await signInWithPopup(auth, p);
      const { uid, email: em, displayName } = result.user;
      await ensureUserProfile(uid, em || '', displayName || em?.split('@')[0] || 'Usuário');
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Falha ao entrar com ' + (provider === 'google' ? 'Google' : 'Microsoft') + '. Tente novamente.');
      }
    } finally {
      setLoadingSocial(null);
    }
  };

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');

        :root {
          --brand-blue: #0d40a5;
          --brand-blue-dark: #0a3080;
          --brand-blue-light: #1a56d6;
          --brand-orange: #f97316;
          --brand-orange-dark: #ea6c0a;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body, #login-root {
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
        }

        .login-container {
          display: flex;
          min-height: 100vh;
        }

        /* ── LEFT PANEL ── */
        .left-panel {
          flex: 1;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 3rem 2rem;
          position: relative;
        }

        .form-box {
          width: 100%;
          max-width: 420px;
        }

        .brand-mark {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 2.5rem;
        }

        .brand-logo-img {
          height: 44px;
          width: auto;
          object-fit: contain;
        }

        .brand-text h1 {
          font-family: 'Sora', sans-serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.2;
        }

        .brand-text p {
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--brand-blue);
          margin-top: 2px;
        }

        /* ── MODE TABS ── */
        .mode-tabs {
          display: flex;
          background: #e2e8f0;
          border-radius: 10px;
          padding: 4px;
          margin-bottom: 2rem;
          gap: 4px;
        }

        .mode-tab {
          flex: 1;
          padding: 9px 12px;
          border: none;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          color: #64748b;
        }

        .mode-tab.active {
          background: #fff;
          color: #0f172a;
          box-shadow: 0 1px 4px rgba(0,0,0,0.12);
        }

        /* ── HEADING ── */
        .form-heading h2 {
          font-family: 'Sora', sans-serif;
          font-size: 1.65rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.25;
        }

        .form-heading p {
          font-size: 0.875rem;
          color: #64748b;
          margin-top: 6px;
          line-height: 1.5;
        }

        .form-heading { margin-bottom: 1.75rem; }

        /* ── SOCIAL BUTTONS ── */
        .social-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 1.25rem;
        }

        .social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 16px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          background: #fff;
          font-size: 0.82rem;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          transition: all 0.18s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        .social-btn:hover:not(:disabled) {
          border-color: var(--brand-blue);
          background: #f0f5ff;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(13,64,165,0.12);
        }

        .social-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── DIVIDER ── */
        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 1.1rem 0;
          color: #94a3b8;
          font-size: 0.78rem;
          font-weight: 500;
        }

        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        /* ── FORM FIELDS ── */
        .field-group { margin-bottom: 1rem; }

        .field-group label {
          display: block;
          font-size: 0.83rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
        }

        .field-wrap {
          position: relative;
        }

        .field-wrap input {
          width: 100%;
          padding: 11px 16px;
          padding-right: 44px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          background: #fff;
          font-size: 0.9rem;
          color: #0f172a;
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s;
          font-family: 'Inter', sans-serif;
        }

        .field-wrap input:focus {
          border-color: var(--brand-blue);
          box-shadow: 0 0 0 3px rgba(13,64,165,0.1);
        }

        .field-wrap input::placeholder { color: #94a3b8; }

        .toggle-pass {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.15s;
        }

        .toggle-pass:hover { color: #374151; }

        /* ── FORGOT LINK ── */
        .forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-top: -6px;
          margin-bottom: 1rem;
        }

        .link-btn {
          background: none;
          border: none;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--brand-blue);
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: color 0.15s;
        }

        .link-btn:hover { color: var(--brand-blue-light); }

        /* ── SUBMIT BUTTON ── */
        .submit-btn {
          width: 100%;
          padding: 13px;
          background: var(--brand-blue);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 0.92rem;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Sora', sans-serif;
          letter-spacing: 0.02em;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(13,64,165,0.3);
          margin-top: 0.5rem;
        }

        .submit-btn:hover:not(:disabled) {
          background: var(--brand-blue-light);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(13,64,165,0.4);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        /* ── ALERT BOXES ── */
        .alert {
          padding: 11px 14px;
          border-radius: 8px;
          font-size: 0.83rem;
          font-weight: 500;
          margin-bottom: 1rem;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        .alert-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
        }

        .alert-info {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #16a34a;
        }

        /* ── BACK LINK ── */
        .back-row {
          text-align: center;
          margin-top: 1.25rem;
        }

        /* ── FOOTER ── */
        .form-footer {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.75rem;
          color: #94a3b8;
        }

        /* ── SPINNER ── */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        /* ── RIGHT PANEL ── */
        .right-panel {
          width: 48%;
          position: relative;
          overflow: hidden;
          display: none;
        }

        @media (min-width: 1024px) { .right-panel { display: block; } }

        .right-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(145deg, #0a2056 0%, #0d40a5 45%, #1a56d6 100%);
        }

        /* geometric grid overlay */
        .right-grid {
          position: absolute;
          inset: 0;
          opacity: 0.08;
          background-image:
            linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        /* diagonal accent lines */
        .right-diag {
          position: absolute;
          inset: 0;
          opacity: 0.06;
          background-image: repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 40px,
            rgba(255,255,255,0.8) 40px,
            rgba(255,255,255,0.8) 41px
          );
        }

        .right-content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 3rem;
          z-index: 10;
        }

        .right-logo {
          height: 40px;
          filter: brightness(0) invert(1);
          opacity: 0.9;
          object-fit: contain;
          object-position: left;
        }

        .right-middle {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .right-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          backdrop-filter: blur(8px);
          border-radius: 100px;
          padding: 5px 14px;
          font-size: 0.73rem;
          font-weight: 600;
          color: rgba(255,255,255,0.9);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 1.5rem;
          width: fit-content;
        }

        .right-badge-dot {
          width: 7px; height: 7px;
          background: #4ade80;
          border-radius: 50%;
          box-shadow: 0 0 0 3px rgba(74,222,128,0.3);
          animation: pulse-dot 2s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 0 3px rgba(74,222,128,0.3); }
          50% { box-shadow: 0 0 0 6px rgba(74,222,128,0.15); }
        }

        .right-headline {
          font-family: 'Sora', sans-serif;
          font-size: clamp(1.8rem, 3vw, 2.8rem);
          font-weight: 800;
          color: #fff;
          line-height: 1.15;
          margin-bottom: 1.25rem;
          letter-spacing: -0.02em;
        }

        .right-headline span {
          color: var(--brand-orange);
        }

        .right-sub {
          font-size: 1rem;
          color: rgba(255,255,255,0.72);
          line-height: 1.65;
          max-width: 380px;
          margin-bottom: 2.5rem;
        }

        /* feature pills */
        .feature-pills {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .feature-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          padding: 12px 16px;
          backdrop-filter: blur(6px);
          transition: background 0.2s;
        }

        .feature-pill:hover { background: rgba(255,255,255,0.13); }

        .pill-icon {
          width: 36px; height: 36px;
          background: rgba(255,255,255,0.12);
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .pill-text strong {
          display: block;
          font-size: 0.87rem;
          font-weight: 700;
          color: #fff;
        }

        .pill-text span {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.6);
        }

        /* stats bar */
        .stats-bar {
          border-top: 1px solid rgba(255,255,255,0.12);
          padding-top: 1.5rem;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .stat-item { text-align: center; }

        .stat-item strong {
          display: block;
          font-family: 'Sora', sans-serif;
          font-size: 1.6rem;
          font-weight: 800;
          color: #fff;
          line-height: 1;
        }

        .stat-item span {
          display: block;
          font-size: 0.68rem;
          font-weight: 600;
          color: rgba(255,255,255,0.55);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: 4px;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 1023px) {
          .left-panel { padding: 2rem 1.25rem; }
        }
      `}</style>

      <div className="login-container" id="login-root">

        {/* ════════════════════ LEFT: FORM ════════════════════ */}
        <div className="left-panel">
          <div className="form-box">

            {/* Brand */}
            <div className="brand-mark">
              <img
                src="https://www.estemco.com.br/wp-content/uploads/2022/07/logo.png"
                alt="Estemco"
                className="brand-logo-img"
                onError={(e) => {
                  // fallback icon if logo fails
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="brand-text">
                <h1>Estemco CRM</h1>
                <p>Engenharia em Fundações</p>
              </div>
            </div>

            {/* Error / Info */}
            {error && (
              <div className="alert alert-error">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}
            {info && (
              <div className="alert alert-info">
                <span>✓</span>
                <span>{info}</span>
              </div>
            )}

            {/* ── FORGOT PASSWORD MODE ── */}
            {mode === 'forgot' ? (
              <>
                <div className="form-heading">
                  <h2>Recuperar senha</h2>
                  <p>Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
                </div>
                <form onSubmit={handleForgot}>
                  <div className="field-group">
                    <label htmlFor="fp-email">E-mail cadastrado</label>
                    <div className="field-wrap">
                      <input
                        id="fp-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="submit-btn" disabled={isLoading}>
                    {isLoading ? <div className="spinner" /> : 'Enviar link de recuperação'}
                  </button>
                </form>
                <div className="back-row">
                  <button className="link-btn" onClick={() => { clearMessages(); setMode('login'); }}>
                    ← Voltar para o login
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* ── LOGIN / REGISTER TABS ── */}
                <div className="mode-tabs">
                  <button
                    className={`mode-tab${mode === 'login' ? ' active' : ''}`}
                    onClick={() => { clearMessages(); setMode('login'); }}
                    type="button"
                  >
                    Entrar
                  </button>
                  <button
                    className={`mode-tab${mode === 'register' ? ' active' : ''}`}
                    onClick={() => { clearMessages(); setMode('register'); }}
                    type="button"
                  >
                    Criar conta
                  </button>
                </div>

                <div className="form-heading">
                  <h2>{mode === 'login' ? 'Bem-vindo de volta 👋' : 'Crie sua conta'}</h2>
                  <p>
                    {mode === 'login'
                      ? 'Acesse o portal de gestão da Estemco.'
                      : 'Preencha os dados para criar seu acesso ao sistema.'}
                  </p>
                </div>

                {/* Social Buttons */}
                <div className="social-grid">
                  <button
                    type="button"
                    className="social-btn"
                    onClick={() => handleSocial('google')}
                    disabled={loadingSocial !== null}
                  >
                    {loadingSocial === 'google'
                      ? <div className="spinner" style={{ borderTopColor: '#4285F4', borderColor: 'rgba(66,133,244,0.2)' }} />
                      : <GoogleIcon />}
                    Google
                  </button>
                  <button
                    type="button"
                    className="social-btn"
                    onClick={() => handleSocial('microsoft')}
                    disabled={loadingSocial !== null}
                  >
                    {loadingSocial === 'microsoft'
                      ? <div className="spinner" style={{ borderTopColor: '#05a6f0', borderColor: 'rgba(5,166,240,0.2)' }} />
                      : <MicrosoftIcon />}
                    Microsoft
                  </button>
                </div>

                <div className="divider">ou continue com e-mail</div>

                {/* Email/Password Form */}
                <form onSubmit={handleEmailSubmit}>
                  <div className="field-group">
                    <label htmlFor="email">E-mail</label>
                    <div className="field-wrap">
                      <input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="field-group">
                    <label htmlFor="password">Senha</label>
                    <div className="field-wrap">
                      <input
                        id="password"
                        type={showPass ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="toggle-pass"
                        onClick={() => setShowPass(v => !v)}
                        aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        <EyeIcon open={showPass} />
                      </button>
                    </div>
                  </div>

                  {mode === 'login' && (
                    <div className="forgot-row">
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => { clearMessages(); setMode('forgot'); }}
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                  )}

                  <button type="submit" className="submit-btn" disabled={isLoading}>
                    {isLoading
                      ? <div className="spinner" />
                      : mode === 'login' ? 'Entrar no Portal' : 'Criar minha conta'}
                  </button>
                </form>
              </>
            )}

            <div className="form-footer">
              © {new Date().getFullYear()} Estemco Engenharia em Fundações S/S Ltda. &nbsp;·&nbsp; Todos os direitos reservados.
            </div>
          </div>
        </div>

        {/* ════════════════════ RIGHT: BRAND PANEL ════════════════════ */}
        <div className="right-panel">
          <div className="right-bg" />
          <div className="right-grid" />
          <div className="right-diag" />

          <div className="right-content">
            {/* Top logo */}
            <div>
              <img
                src="https://www.estemco.com.br/wp-content/uploads/2022/07/logo.png"
                alt="Estemco"
                className="right-logo"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>

            {/* Middle content */}
            <div className="right-middle">
              <div className="right-badge">
                <div className="right-badge-dot" />
                Sistema Online · Tempo Real
              </div>

              <h3 className="right-headline">
                Gestão completa de<br />
                fundações e <span>obras</span><br />
                em um só lugar.
              </h3>

              <p className="right-sub">
                Propostas, DRE, Boletins de Obra e controle financeiro
                integrados para a equipe da Estemco, de qualquer dispositivo.
              </p>

              <div className="feature-pills">
                <div className="feature-pill">
                  <div className="pill-icon">📋</div>
                  <div className="pill-text">
                    <strong>Propostas em minutos</strong>
                    <span>Geração automática de PDF com modelo Estemco</span>
                  </div>
                </div>
                <div className="feature-pill">
                  <div className="pill-icon">📊</div>
                  <div className="pill-text">
                    <strong>DRE por obra em tempo real</strong>
                    <span>Margem, overbreak e custos atualizados pelo BDO</span>
                  </div>
                </div>
                <div className="feature-pill">
                  <div className="pill-icon">👷</div>
                  <div className="pill-text">
                    <strong>Equipe conectada</strong>
                    <span>Engenheiros registram boletins direto do campo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="stats-bar">
              <div className="stat-item">
                <strong>35+</strong>
                <span>Anos de mercado</span>
              </div>
              <div className="stat-item">
                <strong>100%</strong>
                <span>Dados seguros</span>
              </div>
              <div className="stat-item">
                <strong>24/7</strong>
                <span>Disponibilidade</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};
