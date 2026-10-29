import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QuestionCard from './QuestionCard';
import type { Question } from '../lib/quiz';

afterEach(cleanup);

const question: Question = {
  text: 'Qual a função do método `Array.prototype.map()`?',
  options: ['Filtrar', 'Transformar cada elemento', 'Adicionar ao final', 'Remover o primeiro'],
  correct: 1,
};

const options = () => Array.from(document.querySelectorAll<HTMLButtonElement>('.qz-option'));
const press = (key: string, init: object = {}) => fireEvent.keyDown(window, { key, ...init });

describe('QuestionCard', () => {
  it('mostra o enunciado, o código formatado e as alternativas com letras', () => {
    render(<QuestionCard question={question} selected={null} onAnswer={() => {}} />);
    expect(document.querySelector('.qz-question code')!.textContent).toBe('Array.prototype.map()');
    expect(options()).toHaveLength(4);
    expect(options().map((o) => o.querySelector('.qz-letter')!.textContent)).toEqual(['A', 'B', 'C', 'D']);
    expect(document.querySelector('.qz-feedback')!.textContent).toBe('');
  });

  it('clicar numa alternativa responde com o índice dela', () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={question} selected={null} onAnswer={onAnswer} />);
    fireEvent.click(options()[2]);
    expect(onAnswer).toHaveBeenCalledWith(2);
  });

  it('atalhos de teclado: A–F e 1–6 escolhem; o resto é ignorado', () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={question} selected={null} onAnswer={onAnswer} />);

    press('b');
    press('D');
    press('3');
    expect(onAnswer.mock.calls.map((c) => c[0])).toEqual([1, 3, 2]);

    onAnswer.mockClear();
    press('e'); // só há 4 alternativas
    press('5');
    press('x');
    press('Enter');
    press('b', { ctrlKey: true });
    press('b', { metaKey: true });
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('ignora o teclado quando o foco está num campo de texto', () => {
    const onAnswer = vi.fn();
    render(
      <>
        <input aria-label="campo" />
        <QuestionCard question={question} selected={null} onAnswer={onAnswer} />
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText('campo'), { key: 'a' });
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('resposta errada: marca a escolhida em vermelho, revela a certa em verde e trava tudo', () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={question} selected={0} onAnswer={onAnswer} />);

    const [a, b, c, d] = options();
    expect(a.classList.contains('is-wrong')).toBe(true);
    expect(b.classList.contains('is-correct')).toBe(true);
    expect(c.classList.contains('is-dim') && d.classList.contains('is-dim')).toBe(true);
    expect(options().every((o) => o.disabled)).toBe(true);
    expect([a, b].map((o) => o.querySelector('.qz-letter')!.textContent)).toEqual(['✗', '✓']);
    expect(screen.getByText('Errou. A resposta certa é B.')).toBeTruthy();

    press('c'); // depois de responder, o teclado não faz mais nada
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('resposta certa: só a escolhida fica verde', () => {
    render(<QuestionCard question={question} selected={1} onAnswer={() => {}} />);
    expect(options().map((o) => o.className.replace('qz-option', '').trim())).toEqual([
      'is-dim', 'is-correct', 'is-dim', 'is-dim',
    ]);
    expect(screen.getByText('Acertou!')).toBeTruthy();
    expect(document.querySelectorAll('.qz-option.is-wrong')).toHaveLength(0);
  });

  it('leitores de tela ouvem a letra e o resultado de cada alternativa', () => {
    render(<QuestionCard question={question} selected={0} onAnswer={() => {}} />);
    expect(options()[0].textContent).toContain('A) ');
    expect(options()[0].textContent).toContain('sua resposta, errada');
    expect(options()[1].textContent).toContain('resposta certa');
  });

  it('HTML digitado pelo autor aparece como texto, não é interpretado', () => {
    const evil: Question = {
      text: 'Pergunta <img src=x onerror=alert(1)>',
      options: ['<b>negrito</b>', 'ok'],
      correct: 1,
    };
    const { container } = render(<QuestionCard question={evil} selected={null} onAnswer={() => {}} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(container.textContent).toContain('<b>negrito</b>');
  });

  it('bloco de código do enunciado vira <pre><code> com a indentação preservada', () => {
    const q: Question = {
      text: 'O que imprime?\n```js\nitens.forEach((n) => {\n  console.log(n);\n});\n```',
      options: ['tudo', 'nada'],
      correct: 0,
    };
    render(<QuestionCard question={q} selected={null} onAnswer={() => {}} />);
    const pre = document.querySelector('.qz-question pre.qz-pre')!;
    expect(pre.textContent).toBe('itens.forEach((n) => {\n  console.log(n);\n});');
    expect(pre.querySelector('code')).not.toBeNull();
    expect(document.querySelector('.qz-question')!.textContent).toContain('O que imprime?');
    expect(document.querySelector('.qz-question')!.textContent).not.toContain('```');
  });

  it('enunciado com várias linhas preserva as quebras', () => {
    const q: Question = { text: 'Leia:\nconst x = 1;\nQual o valor?', options: ['1', '2'], correct: 0 };
    render(<QuestionCard question={q} selected={null} onAnswer={() => {}} />);
    expect(document.querySelector('.qz-question')!.textContent).toBe('Leia:\nconst x = 1;\nQual o valor?');
  });
});
