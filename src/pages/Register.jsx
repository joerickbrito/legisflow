import { Link } from "react-router-dom";
import { Scale } from "lucide-react";

// Cadastro público desabilitado — usuários são criados apenas por administradores.
export default function Register() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-4">
          <Scale className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-heading font-bold text-white mb-2">Acesso Restrito</h1>
        <p className="text-slate-400 text-sm mb-6">
          O cadastro de usuários é realizado exclusivamente pelos administradores da Câmara Municipal.
          Entre em contato com o administrador do sistema para obter acesso.
        </p>
        <Link to="/login" className="text-blue-400 hover:text-blue-300 text-sm hover:underline">
          ← Voltar ao login
        </Link>
      </div>
    </div>
  );
}