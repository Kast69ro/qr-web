/** Заглушка на время загрузки: серый блок с мягкой пульсацией (без неё при reduced motion). */
export function Skeleton({ className = '', style }) {
  return <span aria-hidden="true" className={`skeleton block rounded-md bg-key ${className}`} style={style} />;
}

/** Обёртка для группы заглушек: скринридер слышит «Загрузка», а не пустоту. */
export function SkeletonGroup({ children, className = '', label = 'Загрузка' }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      {children}
    </div>
  );
}
