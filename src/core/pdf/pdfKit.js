import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import regularUrl from '../../assets/fonts/Montserrat-Regular.ttf?url';
import mediumUrl from '../../assets/fonts/Montserrat-Medium.ttf?url';
import semiBoldUrl from '../../assets/fonts/Montserrat-SemiBold.ttf?url';
import boldUrl from '../../assets/fonts/Montserrat-Bold.ttf?url';

/**
 * Светлая палитра приложения — документы всегда светлые,
 * в какой бы теме ни было приложение.
 */
export const pdfColors = Object.freeze({
  background: '#F4F4F2',
  surface: '#FFFFFF',
  border: '#E7E7E2',
  borderList: '#E2E2DE',
  textPrimary: '#16181A',
  textSecondary: '#6B7075',
  textTertiary: '#9AA0A6',
  successDot: '#0E8F6F',
  cancelDot: '#C9403A',
  refundDot: '#5A6FB5',
});

let fontBytes = null;

/** Файлы Montserrat — тот же шрифт, что в интерфейсе. Читаются один раз. */
function loadFontBytes() {
  fontBytes ??= Promise.all(
    [regularUrl, mediumUrl, semiBoldUrl, boldUrl].map((u) =>
      fetch(u).then((r) => {
        if (!r.ok) throw new Error('font');
        return r.arrayBuffer();
      }),
    ),
  ).catch((e) => {
    fontBytes = null;
    throw e;
  });
  return fontBytes;
}

/** Новый документ с начертаниями Montserrat. В файл попадают только использованные глифы. */
export async function createPdf({ title, creator }) {
  const [regular, medium, semiBold, bold] = await loadFontBytes();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(title);
  doc.setCreator(creator);
  doc.setProducer(creator);
  const f = {
    regular: await doc.embedFont(regular, { subset: true }),
    medium: await doc.embedFont(medium, { subset: true }),
    semiBold: await doc.embedFont(semiBold, { subset: true }),
    bold: await doc.embedFont(bold, { subset: true }),
  };
  return { doc, f };
}

export function color(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Высота строки текста (как у pdf/Flutter: ascender − descender). */
export const lineHeight = (font, size) => font.heightAtSize(size);

/** Перенос по словам в пределах `maxWidth`; слишком длинное слово режется. */
export function wrap(text, font, size, maxWidth) {
  const width = (s) => font.widthOfTextAtSize(s, size);
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (width(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (width(word) <= maxWidth) {
        line = word;
        continue;
      }
      let part = '';
      for (const ch of word) {
        if (width(part + ch) > maxWidth && part) {
          lines.push(part);
          part = ch;
        } else {
          part += ch;
        }
      }
      line = part;
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Рисование в координатах «сверху вниз» (как в вёрстке), а не от нижнего
 * края страницы, как принято в PDF.
 */
export class Canvas {
  constructor(page) {
    this.page = page;
    this.height = page.getHeight();
  }

  /** Текст, `top` — верх строки. */
  text(str, { x, top, font, size, hex, maxWidth = null, align = 'left' }) {
    const ascent = font.heightAtSize(size, { descender: false });
    const lh = lineHeight(font, size);
    const lines = maxWidth == null ? [String(str)] : wrap(str, font, size, maxWidth);
    lines.forEach((line, i) => {
      let dx = x;
      if (align !== 'left' && maxWidth != null) {
        const w = font.widthOfTextAtSize(line, size);
        dx = align === 'right' ? x + maxWidth - w : x + (maxWidth - w) / 2;
      }
      this.page.drawText(line, {
        x: dx,
        y: this.height - (top + i * lh + ascent),
        size,
        font,
        color: color(hex),
      });
    });
    return lines.length * lh;
  }

  roundRect({ x, top, w, h, r, fill = null, stroke = null, strokeWidth = 1 }) {
    const path =
      `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} ` +
      `H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
    // Обводка по центру линии — сдвигаем внутрь, как Border.all во Flutter.
    const inset = stroke ? strokeWidth / 2 : 0;
    this.page.drawSvgPath(
      inset
        ? `M ${r} ${inset} H ${w - r} A ${r - inset} ${r - inset} 0 0 1 ${w - inset} ${r} V ${h - r} A ${r - inset} ${r - inset} 0 0 1 ${w - r} ${h - inset} H ${r} A ${r - inset} ${r - inset} 0 0 1 ${inset} ${h - r} V ${r} A ${r - inset} ${r - inset} 0 0 1 ${r} ${inset} Z`
        : path,
      {
        x,
        y: this.height - top,
        color: fill ? color(fill) : undefined,
        borderColor: stroke ? color(stroke) : undefined,
        borderWidth: stroke ? strokeWidth : 0,
      },
    );
  }

  rect({ x, top, w, h, fill }) {
    this.page.drawRectangle({ x, y: this.height - top - h, width: w, height: h, color: color(fill) });
  }

  circle({ cx, cy, r, fill }) {
    this.page.drawCircle({ x: cx, y: this.height - cy, size: r, color: color(fill) });
  }

  hline({ x1, x2, y, hex, thickness }) {
    this.page.drawLine({
      start: { x: x1, y: this.height - y },
      end: { x: x2, y: this.height - y },
      thickness,
      color: color(hex),
    });
  }
}
