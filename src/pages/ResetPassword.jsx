import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, Scale, CheckCircle } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("As senhas não coincidem."); return; }
    if (password.length < 8) { setError("A senha deve ter no mínimo 8 caracteres."); return; }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken, newPassword: password });
      setDone(true);
    } catch (err) {
      setError("Link inválido ou expirado. Solicite uma nova recuperação.");
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
          <h1 className="text-3xl font-heading font-bold text-white">SisLegis</h1>
          <p className="text-blue-300 text-sm mt-1">Sistema Legislativo Municipal</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          {done ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
              <h2 className="text-xl font-semibold text-white">Senha Alterada!</h2>
              <p className="text-slate-400 text-sm">Sua senha foi redefinida com sucesso.</p>
              <Link to="/login">
                <Button className="w-full bg-blue-600 hover:bg-blue-500">Ir para o Login</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">Nova Senha</h2>
                <p className="text-slate-400 text-sm mt-1">Digite e confirme sua nova senha</p>
              </div>
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-slate-300 text-sm">Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input id="password" type="password" placeholder="Mínimo 8 caracteres" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-11 bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm" className="text-slate-300 text-sm">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input id="confirm" type="password" placeholder="Repita a senha" value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="pl-10 h-11 bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400" required />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-500" disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : "Redefinir Senha"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}