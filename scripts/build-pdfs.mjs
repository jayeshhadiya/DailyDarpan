// Monthly compilation PDFs, one per language, for every month that is complete.
// Called by build-content.mjs; writes public/pdf/current-affairs-YYYY-MM-{gu,en}.pdf.
// Text is set in Hind Vadodara (Gujarati and Latin in one font, scripts/fonts, SIL OFL).
// pdfkit's own shaper (fontkit) gets Gujarati wrong, e.g. a dotted circle before every ં,
// so text is shaped with HarfBuzz, the engine browsers use, and pdfkit only places the glyphs.
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as hb from 'harfbuzzjs';
import PDFDocument from 'pdfkit';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fontsDir = join(root, 'scripts/fonts');
const outDir = join(root, 'public/pdf');
const FONTS = { regular: 'HindVadodara-Regular.ttf', bold: 'HindVadodara-Bold.ttf' };

export const pdfName = (month, lang) => `current-affairs-${month}-${lang}.pdf`;

const TEXT = {
  en: {
    title: (label) => `${label} Current Affairs`,
    demo: (from, to, month) => `Demo PDF: this has sample questions from ${from}–${to} ${month} only. Daily current affairs start from 1 November 2026, and full monthly PDFs from November 2026.`,
    question: 'Q',
    answerKey: 'Answer Key',
    keyQuestion: 'Q. No.',
    keyAnswer: 'Answer',
    locale: 'en-US',
  },
  gu: {
    title: (label) => `${label} કરન્ટ અફેર્સ`,
    demo: (from, to, month) => `ડેમો PDF: આમાં ફક્ત ${from}–${to} ${month}ના નમૂના પ્રશ્નો છે. દૈનિક કરન્ટ અફેર્સ 1 નવેમ્બર 2026થી શરૂ થશે અને સંપૂર્ણ માસિક PDF નવેમ્બર 2026થી મળશે.`,
    question: 'પ્રશ્ન ',
    answerKey: 'જવાબ સૂચિ',
    keyQuestion: 'પ્રશ્ન',
    keyAnswer: 'જવાબ',
    locale: 'gu-IN',
  },
};

const COLORS = { text: '#111827', muted: '#6b7280', border: '#e5e7eb', answer: '#15803d', head: '#f3f4f6', noteText: '#78350f', noteFill: '#fffbeb', noteBorder: '#fcd34d' };

// Registers a font and makes pdfkit lay out its text with HarfBuzz instead of fontkit.
function registerShapedFont(doc, name, file) {
  doc.registerFont(name, file);
  doc.font(name);
  const fontkitFont = doc._font.font;
  const hbFont = new hb.Font(new hb.Face(new hb.Blob(readFileSync(file))));
  fontkitFont.layout = (text) => {
    const buffer = new hb.Buffer();
    buffer.addText(text);
    buffer.guessSegmentProperties();
    hb.shape(hbFont, buffer);
    const infos = buffer.getGlyphInfos();
    const positions = buffer.getGlyphPositions();
    // The first glyph of each cluster carries the cluster's characters, so the PDF text can be copied and searched.
    const clusterEnd = (i) => infos.slice(i).find(info => info.cluster !== infos[i].cluster)?.cluster ?? text.length;
    const glyphs = infos.map((info, i) => {
      const first = i === 0 || infos[i - 1].cluster !== info.cluster;
      const codePoints = first ? [...text.slice(info.cluster, clusterEnd(i))].map(c => c.codePointAt(0)) : [];
      return fontkitFont.getGlyph(info.codepoint, codePoints);
    });
    return {
      glyphs,
      positions: positions.map(p => ({ xAdvance: p.xAdvance, yAdvance: p.yAdvance, xOffset: p.xOffset, yOffset: p.yOffset })),
      advanceWidth: positions.reduce((sum, p) => sum + p.xAdvance, 0),
    };
  };
}

function write(doc, text, { bold = false, size = 11, color = COLORS.text, gap = 4, indent = 0, width, y, ...options } = {}) {
  width ??= doc.page.width - doc.page.margins.left - doc.page.margins.right - indent;
  doc.font(bold ? 'bold' : 'regular').fontSize(size).fillColor(color)
    .text(text, doc.page.margins.left + indent, y, { width, lineGap: 1.5, ...options });
  doc.moveDown(gap / size);
}

// Options side by side in two columns when they are all short, one per line otherwise.
const OPTION_SIZE = 10.5;
const optionLabels = (options) => options.map((option, o) => `${'ABCDEF'[o]}. ${option}`);
function twoColumns(doc, labels, column) {
  doc.font('regular').fontSize(OPTION_SIZE);
  return labels.every(label => doc.widthOfString(label) <= column - 8);
}

function writeOptions(doc, options, width) {
  const column = (width - 20) / 2;
  const labels = optionLabels(options);
  if (!twoColumns(doc, labels, column)) {
    labels.forEach(label => write(doc, label, { size: OPTION_SIZE, indent: 10, gap: 1 }));
    return;
  }
  for (let o = 0; o < labels.length; o += 2) {
    const top = doc.y;
    write(doc, labels[o], { size: OPTION_SIZE, indent: 10, width: column, gap: 1 });
    const left = doc.y;
    if (labels[o + 1]) write(doc, labels[o + 1], { size: OPTION_SIZE, indent: 20 + column, width: column, y: top, gap: 1 });
    doc.y = Math.max(left, doc.y);
  }
}

// Height a question will take (a little generous), to start a new page instead of splitting it.
function questionHeight(doc, q, width) {
  const height = (text, size, bold = false, w = width) => doc.font(bold ? 'bold' : 'regular').fontSize(size).heightOfString(text, { width: w, lineGap: 1.5 });
  const labels = optionLabels(q.options);
  const column = (width - 20) / 2;
  const options = twoColumns(doc, labels, column)
    ? Math.ceil(labels.length / 2) * (height('A', OPTION_SIZE) + 1)
    : labels.reduce((sum, label) => sum + height(label, OPTION_SIZE, false, width - 10) + 1, 0);
  return 30 + height(q.question, 11.5, true) + options;
}

// The answers as a table at the end: five question/answer pairs per row, header repeated on each page.
function writeAnswerKey(doc, answers, t, width, bottom) {
  const GROUPS = 5;
  const rowHeight = 22;
  const groupWidth = width / GROUPS;
  const left = doc.page.margins.left;
  const cell = (text, x, y, w, { bold = false, color = COLORS.text, fill } = {}) => {
    if (fill) doc.rect(x, y, w, rowHeight).fill(fill);
    doc.rect(x, y, w, rowHeight).lineWidth(0.6).strokeColor('#d1d5db').stroke();
    doc.font(bold ? 'bold' : 'regular').fontSize(10).fillColor(color)
      .text(text, x, y + 5, { width: w, align: 'center', lineBreak: false });
  };
  const header = () => {
    const y = doc.y;
    for (let g = 0; g < GROUPS; g++) {
      cell(t.keyQuestion, left + g * groupWidth, y, groupWidth / 2, { bold: true, fill: COLORS.head });
      cell(t.keyAnswer, left + g * groupWidth + groupWidth / 2, y, groupWidth / 2, { bold: true, fill: COLORS.head });
    }
    doc.y = y + rowHeight;
  };

  doc.addPage();
  write(doc, t.answerKey, { bold: true, size: 18, gap: 10, align: 'center' });
  header();
  for (let i = 0; i < answers.length; i += GROUPS) {
    if (doc.y + rowHeight > bottom()) {
      doc.addPage();
      header();
    }
    const y = doc.y;
    for (let g = 0; g < GROUPS; g++) {
      const n = i + g;
      const x = left + g * groupWidth;
      cell(n < answers.length ? String(n + 1) : '', x, y, groupWidth / 2, { color: COLORS.muted });
      cell(n < answers.length ? 'ABCDEF'[answers[n]] : '', x + groupWidth / 2, y, groupWidth / 2, { bold: true, color: COLORS.answer });
    }
    doc.y = y + rowHeight;
  }
}

function render({ month, label, days, lang, categories, site, file }) {
  const t = TEXT[lang];
  const doc = new PDFDocument({ size: 'A4', margins: { top: 48, bottom: 60, left: 50, right: 50 }, bufferPages: true, lang,
    info: { Title: t.title(label), Author: site.name, Subject: site.tagline } });
  registerShapedFont(doc, 'regular', join(fontsDir, FONTS.regular));
  registerShapedFont(doc, 'bold', join(fontsDir, FONTS.bold));
  const done = new Promise((resolve, reject) => {
    const stream = doc.pipe(createWriteStream(file));
    stream.on('finish', resolve).on('error', reject);
  });
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const bottom = () => doc.page.height - doc.page.margins.bottom;
  const address = site.url.replace(/^https?:\/\//, '');

  // Title block, centred on the first page.
  write(doc, site.name, { bold: true, size: 14, color: site.mainColor, gap: 2, align: 'center' });
  write(doc, t.title(label), { bold: true, size: 24, gap: 4, align: 'center' });
  write(doc, address, { size: 10, color: site.mainColor, link: site.url, gap: 12, align: 'center' });

  // Months before the launch date only have a few sample days, so say so in a yellow box.
  if (month < site.launchDate.slice(0, 7)) {
    const day = (date) => Number(date.slice(8));
    const monthName = new Date(`${month}-01`).toLocaleDateString(t.locale, { month: 'long', timeZone: 'UTC' });
    const note = t.demo(day(days[0].date), day(days.at(-1).date), monthName);
    const padding = 10;
    doc.font('bold').fontSize(10.5);
    const height = doc.heightOfString(note, { width: width - 2 * padding, lineGap: 1.5 }) + 2 * padding;
    doc.roundedRect(doc.page.margins.left, doc.y, width, height, 6).fillAndStroke(COLORS.noteFill, COLORS.noteBorder);
    write(doc, note, { bold: true, size: 10.5, color: COLORS.noteText, indent: padding, width: width - 2 * padding, y: doc.y + padding, gap: 0, align: 'center' });
    doc.y += padding + 14;
  }

  // One list for the whole month, numbered 1, 2, 3… without day headings; answers only in the key at the end.
  const questions = days.flatMap(day => day.questions);
  questions.forEach((source, i) => {
    const q = lang === 'gu' && source.gu ? { ...source, ...source.gu } : source;
    if (doc.y + questionHeight(doc, q, width) > bottom()) doc.addPage();
    const category = q.category ? ` · ${lang === 'gu' ? categories[q.category] ?? q.category : q.category}` : '';
    write(doc, `${t.question}${i + 1}${category}`, { bold: true, size: 9, color: COLORS.muted, gap: 2 });
    write(doc, q.question, { bold: true, size: 11.5, gap: 4 });
    writeOptions(doc, q.options, width);
    doc.moveDown(0.4);
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + width, doc.y).lineWidth(0.5).strokeColor(COLORS.border).stroke();
    doc.moveDown(0.6);
  });
  writeAnswerKey(doc, questions.map(q => q.answer), t, width, bottom);

  // Footer on every page, linking to the site; the bottom margin is lifted so writing there doesn't add a page.
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const margin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font('regular').fontSize(9).fillColor(site.mainColor)
      .text(`${site.name} · ${address} · ${i + 1} / ${range.count}`, doc.page.margins.left, doc.page.height - 40, { width, align: 'center', lineBreak: false, link: site.url });
    doc.page.margins.bottom = margin;
  }
  doc.end();
  return done;
}

// `months`: [{ key, label: { gu, en }, days (1st first), files (their source paths) }].
// A PDF is rebuilt only when it is older than its month's files, this script, the fonts, site.json or the category names.
export async function buildMonthPdfs(months, { categories, site }) {
  mkdirSync(outDir, { recursive: true });
  const wanted = new Set(months.flatMap(m => ['gu', 'en'].map(lang => pdfName(m.key, lang))));
  readdirSync(outDir).filter(name => !wanted.has(name)).forEach(name => rmSync(join(outDir, name)));
  const inputs = [fileURLToPath(import.meta.url), ...Object.values(FONTS).map(f => join(fontsDir, f)),
    join(root, 'src/app/data/site.json'), join(root, 'src/app/i18n/categories.gu.json')];
  const toolTime = Math.max(...inputs.map(f => statSync(f).mtimeMs));
  let built = 0;
  for (const month of months) {
    const sourceTime = Math.max(toolTime, ...month.files.map(f => statSync(f).mtimeMs));
    for (const lang of ['gu', 'en']) {
      const file = join(outDir, pdfName(month.key, lang));
      if (existsSync(file) && statSync(file).mtimeMs > sourceTime) continue;
      await render({ month: month.key, label: month.label[lang], days: month.days, lang, categories, site, file });
      built++;
    }
  }
  return built;
}
