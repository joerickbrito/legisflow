import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Loader2, Scale, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    try {
      await base44.functions.invoke('registrarSolicitacaoSenha', { username: username.trim() });
    } catch {
      // Ignorar erros — sempre mostrar mensagem genérica
    }
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-4">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-white">SisLegis</h1>
          <p className="text-blue-300 text-sm mt-1">Sistema Legislativo Municipal</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-blue-400 mx-auto" />
              <h2 className="text-xl font-semibold text-white">Recuperação de Senha</h2>
              <p className="text-slate-400 text-sm">
                Se este usuário existir, um administrador poderá redefinir sua senha. Contate o administrador da sua câmara.
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full border-white/20 text-slate-300 hover:bg-white/10">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">Recuperar Senha</h2>
                <p className="text-slate-400 text-sm mt-1">Informe seu nome de usuário para continuar</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-slate-300 text-sm">Nome de Usuário</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="seu.usuario"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 h-11 bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-500" disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verificando...</> : "Verificar"}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <Link to="/login" className="text-sm text-blue-400 hover:text-blue-300 hover:underline flex items-center justify-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Voltar ao login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}