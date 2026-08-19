import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { Logo } from '../Logo';

interface AdminLoginProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onCancel }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor, informe seu e-mail e senha.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.token) {
        sessionStorage.setItem('admin_auth_token', data.token);
        onSuccess();
      } else {
        setErrorMessage(data.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    } catch (err) {
      setErrorMessage('Erro de conexão com o servidor. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#30143D] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-white/10 space-y-6">
        
        {/* Topo com Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <Logo variant="dark" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-[#69318A] text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Acesso Restrito ao Lojista</span>
          </div>
          <h2 className="text-xl font-bold text-[#28242A] font-['DM_Sans']">
            Painel Administrativo
          </h2>
          <p className="text-xs text-[#726C74]">
            Informe suas credenciais para gerenciar os pedidos em tempo real.
          </p>
        </div>

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 text-center font-medium">
            {errorMessage}
          </div>
        )}

        {/* Formulário de Login Seguro */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#726C74] mb-1.5">
              E-mail Administrativo
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#726C74] absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#FCFAF7] border border-[#ECE8F0] focus:border-[#69318A] rounded-xl text-xs sm:text-sm outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#726C74] mb-1.5">
              Senha de Acesso
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#726C74] absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#FCFAF7] border border-[#ECE8F0] focus:border-[#69318A] rounded-xl text-xs sm:text-sm outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-[#69318A] hover:bg-[#572185] active:scale-[0.99] disabled:opacity-60 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>Entrar no Painel</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-[#726C74] hover:text-[#28242A] transition-colors cursor-pointer"
          >
            Voltar para o site da loja
          </button>
        </div>

      </div>
    </div>
  );
};
