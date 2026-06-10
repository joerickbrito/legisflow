import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, FileText, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Componente reutilizável de upload de arquivo.
 * Faz upload via base44.integrations.Core.UploadFile e chama onUploaded(url) com a URL pública.
 * A URL é armazenada no campo arquivo_url do registro — segregação por tenant é garantida
 * pois cada registro já carrega o tenant_id do criador.
 *
 * Props:
 *   value      - URL atual do arquivo (string)
 *   onUploaded - callback(url: string) chamado após upload bem-sucedido
 *   accept     - tipos aceitos, default ".pdf,.doc,.docx"
 *   label      - label do campo
 */
export default function FileUpload({ value, onUploaded, accept = '.pdf,.doc,.docx', label = 'Arquivo' }) {
  const [uploading, setUploading] = useState(false);

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onUploaded(file_url);
    setUploading(false);
    // reset input so same file can be re-selected
    e.target.value = '';
  }

  function clear(e) {
    e.preventDefault();
    onUploaded('');
  }

  const fileName = value ? decodeURIComponent(value.split('/').pop().split('?')[0]) : null;

  return (
    <div>
      {label && <label className="text-sm font-medium mb-1.5 block">{label}</label>}
      {value ? (
        <div className="flex items-center gap-2 p-2.5 border border-border rounded-lg bg-muted/30">
          <FileText size={16} className="text-primary flex-shrink-0" />
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1 flex-1 min-w-0 truncate"
          >
            <span className="truncate">{fileName || 'Ver arquivo'}</span>
            <ExternalLink size={11} className="flex-shrink-0" />
          </a>
          <button
            onClick={clear}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
            title="Remover arquivo"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label className={cn(
          "flex items-center gap-2 px-4 py-2.5 border border-dashed border-border rounded-lg cursor-pointer",
          "text-sm text-muted-foreground hover:bg-muted/40 hover:border-primary/40 transition-colors",
          uploading && "opacity-60 pointer-events-none"
        )}>
          <Upload size={15} className={uploading ? "animate-bounce" : ""} />
          {uploading ? 'Enviando...' : 'Selecionar arquivo (PDF, DOC...)'}
          <input type="file" accept={accept} onChange={handleChange} className="hidden" disabled={uploading} />
        </label>
      )}
    </div>
  );
}