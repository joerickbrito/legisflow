// Hook reutilizável de exclusão segura com verificação de vínculo.
//
// Uso numa página:
//   const { pedirExclusao, dialogExclusao } = useExclusaoSegura({ withTenant, onExcluido: load });
//   ...
//   <button onClick={() => pedirExclusao('Materia', m, `Projeto de Lei ${m.numero}`)}>excluir</button>
//   ...
//   {dialogExclusao}
//
// O `tipo` deve ser o nome exato da entidade (ex.: 'Materia', 'NormaJuridica'),
// pois a exclusão é feita genericamente por sislegisEntities[tipo].delete(id) e a
// verificação de vínculos usa o mesmo nome no mapa de DEPENDENCIAS.

import { useState } from 'react';
import { sislegisEntities } from '@/lib/sislegisApi';
import { verificarVinculos } from '@/lib/dependencias';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export function useExclusaoSegura({ withTenant, onExcluido } = {}) {
  const [alvo, setAlvo] = useState(null); // { tipo, registro, titulo }
  const [vinculos, setVinculos] = useState([]);
  const [checando, setChecando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState('');

  async function pedirExclusao(tipo, registro, titulo) {
    if (!registro?.id) return;
    setAlvo({ tipo, registro, titulo });
    setVinculos([]);
    setErro('');
    setChecando(true);
    try {
      const v = await verificarVinculos(tipo, registro.id, withTenant);
      setVinculos(v);
    } catch (e) {
      setErro('Não foi possível verificar os vínculos. Tente novamente.');
    } finally {
      setChecando(false);
    }
  }

  function fechar() {
    setAlvo(null);
    setVinculos([]);
    setErro('');
  }

  async function confirmar() {
    if (!alvo) return;
    setExcluindo(true);
    setErro('');
    try {
      await sislegisEntities[alvo.tipo].delete(alvo.registro.id);
      fechar();
      onExcluido?.();
    } catch (e) {
      setErro(e?.message || 'Erro ao excluir.');
    } finally {
      setExcluindo(false);
    }
  }

  const dialogExclusao = (
    <Dialog open={!!alvo} onOpenChange={(o) => { if (!o) fechar(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            {vinculos.length > 0
              ? <><AlertTriangle size={18} className="text-amber-500" /> Exclusão bloqueada</>
              : 'Excluir registro'}
          </DialogTitle>
        </DialogHeader>

        {checando ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 size={16} className="animate-spin" /> Verificando vínculos...
          </div>
        ) : vinculos.length > 0 ? (
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Não é possível excluir <strong className="text-foreground">{alvo?.titulo}</strong> porque há registros vinculados a ele:
            </p>
            <ul className="space-y-1.5">
              {vinculos.map(v => (
                <li key={v.entity} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                  <span className="text-foreground font-medium">{v.count} {v.label}</span>
                  <span className="text-xs text-muted-foreground">em {v.onde}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Exclua ou desvincule esses registros primeiro (nas telas indicadas) e tente de novo. Ao excluir cada um, a própria tela mostrará os vínculos do próximo nível, se houver.
            </p>
          </div>
        ) : (
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir <strong className="text-foreground">{alvo?.titulo}</strong>? Esta ação não pode ser desfeita.
            </p>
          </div>
        )}

        {erro && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{erro}</p>}

        <DialogFooter>
          {vinculos.length > 0 ? (
            <Button variant="outline" onClick={fechar}>Entendi</Button>
          ) : (
            <>
              <Button variant="outline" onClick={fechar} disabled={excluindo || checando}>Cancelar</Button>
              <Button variant="destructive" onClick={confirmar} disabled={excluindo || checando}>
                {excluindo ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Excluindo...</> : 'Excluir'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { pedirExclusao, dialogExclusao };
}
