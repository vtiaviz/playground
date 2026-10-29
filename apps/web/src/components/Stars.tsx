// Seletor de 1 a 5 estrelas (ou só exibição, se `onChange` não for passado)
export default function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <div className="stars" role={onChange ? 'radiogroup' : 'img'} aria-label={`Nota ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
            className={n <= value ? 'star on' : 'star'}
            onClick={() => onChange(n)}
          >
            ★
          </button>
        ) : (
          <span key={n} className={n <= value ? 'star on' : 'star'} aria-hidden="true">
            ★
          </span>
        ),
      )}
    </div>
  );
}
