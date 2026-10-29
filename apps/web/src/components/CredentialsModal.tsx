import { useState } from 'react';
import type { Credential } from '../types';
import { copyText, downloadFile, toCsv } from '../lib/clipboard';
import Modal from './Modal';

interface Props {
  title: string;
  credentials: Credential[];
  teamName: string;
  onClose: () => void;
}

export default function CredentialsModal({ title, credentials, teamName, onClose }: Props) {
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);

  // Colar em planilha: colunas separadas por Tab
  const tsv = [['Nome', 'Login', 'Senha temporária'], ...credentials.map((c) => [c.name, c.login, c.password])]
    .map((r) => r.join('\t'))
    .join('\n');

  const onCopy = async () => {
    setCopied((await copyText(tsv)) ? 'ok' : 'fail');
  };

  const onDownload = () => {
    const rows = [['Nome', 'Login', 'Senha temporária'], ...credentials.map((c) => [c.name, c.login, c.password])];
    const safeName = teamName.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'turma';
    downloadFile(`credenciais-${safeName}.csv`, toCsv(rows));
  };

  return (
    <Modal title={title} onClose={onClose} wide>
      <p className="alert warn">
        Anote ou copie agora: por segurança, estas senhas <strong>não ficam guardadas</strong> e não aparecem
        de novo. Se perder, use "Nova senha" na lista de alunos. No primeiro acesso, cada aluno será obrigado
        a criar a própria senha.
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Login</th>
              <th>Senha temporária</th>
            </tr>
          </thead>
          <tbody>
            {credentials.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>
                  <code>{c.login}</code>
                </td>
                <td>
                  <code>{c.password}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="actions">
        <button type="button" onClick={onCopy}>
          Copiar tudo
        </button>
        <button type="button" className="secondary" onClick={onDownload}>
          Baixar CSV
        </button>
        <span className="hint" aria-live="polite">
          {copied === 'ok' && 'Copiado!'}
          {copied === 'fail' && 'Não foi possível copiar automaticamente. Selecione o texto abaixo e copie.'}
        </span>
      </div>

      {copied === 'fail' && <textarea readOnly rows={6} value={tsv} onFocus={(e) => e.currentTarget.select()} />}
    </Modal>
  );
}
