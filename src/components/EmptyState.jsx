import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function EmptyState({ icon: Icon, title, description, onAdd, addLabel }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-12 text-center">
      {Icon && (
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Icon size={28} className="text-muted-foreground" />
        </div>
      )}
      <h3 className="font-heading font-semibold text-foreground">{title}</h3>
      {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
      {onAdd && (
        <Button onClick={onAdd} variant="outline" className="mt-4 gap-2">
          <Plus size={16} /> {addLabel || 'Adicionar'}
        </Button>
      )}
    </div>
  );
}