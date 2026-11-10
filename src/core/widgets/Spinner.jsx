/** Аналог CircularProgressIndicator: дуга цвета акцента. */
export function Spinner({ size = 36, stroke = 4, className = 'text-accent' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ animation: 'spin 0.9s linear infinite' }}
      role="progressbar"
      aria-busy="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${c * 0.7} ${c}`}
      />
    </svg>
  );
}
