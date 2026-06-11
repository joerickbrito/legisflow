import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, Scale, ArrowRight } from 'lucide-react';

export default function TrocarSenha() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        setEmail(user.email);
        sessionStorage.setItem('pendingPasswordResetEmail', user.email);
        await base44.auth.resetPasswordRequest(user.email);
        setSent(true);
      } catch (err) {
        setError('Não foi possível enviar o e-mail de redefinição. Tente novamente.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reenviar = async () => {
    setLoading(true);
    setError('');
    try {
      await base44.auth.resetPasswordRequest(email);
      setSent(true);
    } catch (err) {
      setError('Erro ao reenviar. Tente novamente.');
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
          {loading ? (
            <div className="text-center py-6">
              <Loader2 className="w-8 h-8 text-amber-400 mx-auto animate-spin" />
              <p className="text-slate-300 text-sm mt-4">Preparando sua redefinição de senha...</p>
            </div>
          ) : sent ? (
            <div className="text-center space-y-5">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/20">
                <Mail className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Verifique seu E-mail</h2>
                <p className="text-slate-400 text-sm mt-2">
                  Um link de redefinição de senha foi enviado para{' '}
                  <strong className="text-white">{email}</strong>.
                </p>
                <p className="text-slate-500 text-xs mt-3">
                  Por segurança, você precisa criar uma senha definitiva antes de acessar o sistema.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">{error}</div>
              )}

              <div className="space-y-3 pt-2">
                <Button onClick={reenviar} variant="outline" className="w-full border-amber-500/40 text-amber-300 hover:bg-amber-500/10">
                  Reenviar E-mail
                </Button>
                <Link to="/login">
                  <Button variant="ghost" className="w-full text-slate-400 hover:text-white">
                    Voltar para o Login <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-red-300 text-sm">{error || 'Erro inesperado. Tente novamente.'}</p>
              <Button onClick={reenviar} className="w-full bg-amber-600 hover:bg-amber-500">Tentar Novamente</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}