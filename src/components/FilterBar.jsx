// Barra de filtros reutilizável: busca + dropdowns de filtro.
//
// Uso:
//   const [search, setSearch] = useState('');
//   const [filtros, setFiltros] = useState({});
//   <FilterBar
//     search={search} onSearch={setSearch} searchPlaceholder="Buscar..."
//     filtros={[
//       { key: 'status', label: 'Status', options: ['Em tramitação', 'Aprovada'] },
//       { key: 'ano', label: 'Ano', options: ['2024', '2025'] },
//     ]}
//     valores={filtros}
//     onChange={(k, v) => setFiltros(f => ({ ...f, [k]: v }))}
//     onLimpar={() => { setSearch(''); setFiltros({}); }}
//   />
//
// O componente é apenas visual; quem aplica o filtro na lista é a página.
// O valor "todos" representa "sem filtro" para aquele campo.

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const TODOS = 'todos';

export default function FilterBar({
  search,
  onSearch,
  searchPlaceholder = 'Buscar...',
  filtros = [],
  valores = {},
  onChange,
  onLimpar,
}) {
  const temFiltroAtivo = !!search || filtros.some(f => valores[f.key] && valores[f.key] !== TODOS);

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder={searchPlaceholder} value={search} onChange={e => onSearch(e.target.value)} />
      </div>

      {filtros.map(f => (
        <Select key={f.key} value={valores[f.key] || TODOS} onValueChange={v => onChange(f.key, v)}>
          <SelectTrigger className="sm:w-auto sm:min-w-[150px]">
            <SelectValue placeholder={f.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>{f.allLabel || `Todos`}</SelectItem>
            {f.options.map(o => (
              <SelectItem key={String(o.value ?? o)} value={String(o.value ?? o)}>
                {o.label ?? o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {temFiltroAtivo && (
        <Button variant="ghost" onClick={onLimpar} className="gap-1 text-muted-foreground">
          <X size={14} /> Limpar
        </Button>
      )}
    </div>
  );
}
