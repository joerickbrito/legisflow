import { Link } from 'react-router-dom';
import { Scale, Mail } from 'lucide-react';

export default function ResetPassword() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-4">
          <Scale className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-heading font-bold text-white mb-2">Redefinição de Senha</h1>
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl mt-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/20 mb-4">
            <Mail className="w-6 h-6 text-blue-400" />
          </div>
          <p className="text-slate-300 text-sm mb-6">
            A redefinição de senha no LegisCam é feita pelo administrador da sua Câmara Municipal.
            Entre em contato com o administrador do sistema para solicitar uma nova senha temporária.
          </p>
          <Link to="/login" className="inline-block text-blue-400 hover:text-blue-300 text-sm hover:underline">
            ← Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}