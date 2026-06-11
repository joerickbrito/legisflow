import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { trocarSenha, getSessionUser } from '@/lib/sislegisApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Scale, Lock, Eye, EyeOff } from 'lucide-react';

export default function TrocarSenha() {
  const { authMode, refreshUser } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showAtual, setShowAtual] = useState(false);
  const [showNova, setShowNova] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (novaSenha.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setError('As senhas não conferem.');
      return;
    }
    if (senhaAtual === novaSenha) {
      setError('A nova senha deve ser diferente da senha atual.');
      return;
    }

    setLoading(true);
    try {
      if (authMode === 'sislegis') {
        // Autenticação SisLegis
        const sessionUser = getSessionUser();
        await trocarSenha(sessionUser.username, senhaAtual, novaSenha);
      } else {
        // Autenticação Base44 (legado)
        const user = await base44.auth.me();
        await base44.auth.changePassword({
          userId: user.id,
          currentPassword: senhaAtual,
          newPassword: novaSenha
        });
        await base44.functions.invoke('limparSenhaTemporaria', { email: user.email });
      }
      setSuccess(true);
      refreshUser?.();
      setTimeout(() => { window.location.href = '/'; }, 1500);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || '';
      if (msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('password') || msg.toLowerCase().includes('incorreta')) {
        setError('Senha atual incorreta.');
      } else {
        setError('Erro ao alterar senha. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRedefinirPorEmail = async () => {
    if (authMode === 'sislegis') {
      setError('Entre em contato com o administrador master para redefinir sua senha.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await base44.auth.me();
      await base44.auth.resetPasswordRequest(user.email);
      setSuccess(true);
    } catch (err) {
      setError('Não foi possível enviar o e-mail de redefinição.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 shadow-lg mb-4">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-white">SisLegis</h1>
          <p className="text-blue-300 text-sm mt-1">Sistema Legislativo Municipal</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          {success ? (
            <div className="text-center space-y-5">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/20">
                <Lock className="w-7 h-7 text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Senha alterada com sucesso!</h2>
                <p className="text-slate-400 text-sm mt-2">
                  Sua conta foi ativada. Você será redirecionado...
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 mb-3">
                  <Lock className="w-6 h-6 text-amber-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Primeiro Acesso</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Por segurança, defina uma nova senha antes de continuar.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm mb-4">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Senha Atual</label>
                  <div className="relative">
                    <Input
                      type={showAtual ? 'text' : 'password'}
                      value={senhaAtual}
                      onChange={e => setSenhaAtual(e.target.value)}
                      placeholder="Senha temporária fornecida"
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 pr-10"
                      required
                    />
                    <button type="button" onClick={() => setShowAtual(!showAtual)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                      {showAtual ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Nova Senha</label>
                  <div className="relative">
                    <Input
                      type={showNova ? 'text' : 'password'}
                      value={novaSenha}
                      onChange={e => setNovaSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 pr-10"
                      required
                    />
                    <button type="button" onClick={() => setShowNova(!showNova)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                      {showNova ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Confirmar Nova Senha</label>
                  <Input
                    type="password"
                    value={confirmarSenha}
                    onChange={e => setConfirmarSenha(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-500"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Alterar Senha e Acessar
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={handleRedefinirPorEmail}
                  disabled={loading}
                  className="text-xs text-slate-500 hover:text-amber-400 transition-colors"
                >
                  Não sabe a senha atual? Redefinir por e-mail
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}