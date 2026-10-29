// navigator.clipboard só existe em contexto seguro (HTTPS ou localhost). Ao abrir o app por
// http://IP-da-rede ele não está disponível, então há um plano B com execCommand.
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* cai no plano B */
  }

  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

// Evita que o Excel interprete um texto como fórmula (=, +, -, @)
const safeCell = (v: string) => (/^[=+\-@]/.test(v) ? `'${v}` : v);
const quote = (v: string) => `"${safeCell(v).replace(/"/g, '""')}"`;

// CSV com ";" e BOM: abre direto no Excel em português
export function toCsv(rows: string[][]): string {
  return '﻿' + rows.map((r) => r.map(quote).join(';')).join('\r\n');
}

export function downloadFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
