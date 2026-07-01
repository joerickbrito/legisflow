import { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Scale, Mail, CheckCircle, Loader2 } from 'lucide-react';

export default function ForgotPassword() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await base44.functions.invoke('registrarSolicitacaoSenha', {
        username: username.trim().toLowerCase(),
      });
      setDone(true);
    } catch (err) {
      setError(err?.message || 'Erro ao registrar solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-4">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-white">LegisCam</h1>
          <p className="text-blue-300 text-sm mt-1">Sistema Legislativo Municipal</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          {done ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/20">
                <CheckCircle className="w-7 h-7 text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Solicitação Registrada</h2>
              <p className="text-slate-400 text-sm">
                Sua solicitação de recuperação de senha foi registrada. 
                O administrador da sua Câmara Municipal receberá a notificação 
                e entrará em contato com suas novas credenciais.
              </p>
              <Link to="/login" className="inline-block text-blue-400 hover:text-blue-300 text-sm hover:underline mt-2">
                ← Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">Recuperar Senha</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Informe seu nome de usuário para solicitar a recuperação de senha ao administrador da câmara.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 text-sm">Nome de Usuário</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      type="text"
                      placeholder="seu.usuario"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 h-11 bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-blue-600 hover:bg-blue-500 font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                  ) : (
                    'Solicitar Recuperação de Senha'
                  )}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <Link to="/login" className="text-slate-500 hover:text-blue-400 text-sm transition-colors">
                  ← Voltar ao login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}