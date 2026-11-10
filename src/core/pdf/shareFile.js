/**
 * Отдаёт PDF чека или отчёта: на телефоне — в системное окно «Поделиться»
 * (Web Share API), на компьютере или без поддержки — скачиванием файла.
 * `fileName` — без расширения.
 */
export async function sharePdf(bytes, fileName) {
  const name = `${fileName}.pdf`;
  const blob = new Blob([bytes], { type: 'application/pdf' });

  if (canSharePdf()) {
    const file = new File([blob], name, { type: 'application/pdf' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (e) {
        // Закрыли окно «Поделиться» — это не ошибка.
        if (e?.name === 'AbortError') return;
        // NotAllowedError (истёк жест пользователя) и пр. — скачиваем.
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Файл с данными платежей не держим в памяти дольше нужного.
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/**
 * Откроет ли `sharePdf` окно «Поделиться» (телефон с Web Share API).
 * Иначе файл скачается — поэтому по ней выбираем подпись кнопки.
 */
export function canSharePdf() {
  const touch = window.matchMedia?.('(pointer: coarse)').matches;
  if (!touch || typeof File === 'undefined' || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [new File([], 'check.pdf', { type: 'application/pdf' })] });
  } catch {
    return false;
  }
}
