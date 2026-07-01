// Formatação de datas no padrão brasileiro dd-mm-aaaa.
// As datas no sistema são salvas como ISO ('yyyy-mm-dd' ou timestamp completo).
// Este helper converte para exibição sem problemas de fuso (usa fatia da string
// quando é uma data pura, evitando o "voltou um dia" do new Date em UTC).

export function fmtData(v) {
  if (!v && v !== 0) return '';
  const s = String(v).trim();
  if (!s) return '';

  // Caso ISO puro (yyyy-mm-dd, opcionalmente com hora) — fatia direto.
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  // Já está em dd-mm-aaaa ou dd/mm/aaaa — normaliza para dd-mm-aaaa.
  const br = s.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})/);
  if (br) return `${br[1]}-${br[2]}-${br[3]}`;

  // Fallback: tenta Date.
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  }
  return s;
}

// Data + hora: "dd-mm-aaaa às HH:mm".
export function fmtDataHora(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return fmtData(v);
  const data = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${data} às ${hora}`;
}
