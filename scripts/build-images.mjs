// Link preview images (1200×630, shown by WhatsApp, Telegram, Facebook and X when a page is shared) and the app icons.
// Called by build-content.mjs; writes
//   public/og/site-{gu,en}.jpg            home, about and other pages
//   public/og/YYYY-MM-DD-{gu,en}.jpg      each day's quiz
//   public/og/month-YYYY-MM-{gu,en}.jpg   each month's PDF page
//   public/icons/*.png                    home screen icons for the installed app (manifest.webmanifest)
// Text is set in Hind Vadodara (scripts/fonts); the canvas shapes Gujarati with HarfBuzz, like a browser.
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GlobalFonts, createCanvas, loadImage } from '@napi-rs/canvas';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fontsDir = join(root, 'scripts/fonts');
const ogDir = join(root, 'public/og');
const iconDir = join(root, 'public/icons');
const logoFile = join(root, 'public/favicon.svg');
const FONT = 'Hind Vadodara';
GlobalFonts.registerFromPath(join(fontsDir, 'HindVadodara-Regular.ttf'), FONT);
GlobalFonts.registerFromPath(join(fontsDir, 'HindVadodara-Bold.ttf'), FONT);

const WIDTH = 1200;
const HEIGHT = 630;
const PAD = 72;

const TEXT = {
  en: {
    locale: 'en-US',
    quiz: 'Current Affairs Quiz',
    questions: (n) => `${n} questions`,
    play: 'Take the quiz →',
    siteKicker: 'UPSC · GPSC · SSC · Banking · Railways',
    siteTitle: 'Daily Current Affairs',
    siteText: '10 questions every day, with answers and explanations',
    monthKicker: 'Monthly compilation',
    monthText: (n) => `Current Affairs PDF · ${n} questions · answer key`,
    download: 'Free PDF →',
  },
  gu: {
    locale: 'gu-IN',
    quiz: 'કરન્ટ અફેર્સ ક્વિઝ',
    questions: (n) => `${n} પ્રશ્નો`,
    play: 'ક્વિઝ રમો →',
    siteKicker: 'GPSC · GSSSB · UPSC · SSC · બેંકિંગ',
    siteTitle: 'દૈનિક કરન્ટ અફેર્સ',
    siteText: 'રોજ 10 પ્રશ્નો, જવાબ અને સમજૂતી સાથે',
    monthKicker: 'માસિક સંકલન',
    monthText: (n) => `કરન્ટ અફેર્સ PDF · ${n} પ્રશ્નો · જવાબ સૂચિ`,
    download: 'મફત PDF →',
  },
};

const font = (size, bold = false) => `${bold ? 'bold ' : ''}${size}px "${FONT}"`;

// The largest size up to `size` at which `text` fits in `width`.
function fit(ctx, text, size, width, bold) {
  for (; size > 20; size -= 2) {
    ctx.font = font(size, bold);
    if (ctx.measureText(text).width <= width) break;
  }
  return size;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// Shared layout: brand row, kicker, big title, a row of pills, then the address and a call-to-action badge.
async function card({ site, kicker, title, pills, action, logo }) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, site.mainColor);
  gradient.addColorStop(1, '#1e3a8a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // Large faded logo on the right, decoration only.
  ctx.globalAlpha = 0.1;
  ctx.drawImage(logo, WIDTH - 400, 90, 470, 470);
  ctx.globalAlpha = 1;

  ctx.drawImage(logo, PAD, PAD - 8, 64, 64);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.font = font(40, true);
  ctx.fillText(site.name, PAD + 84, PAD + 26);

  const width = WIDTH - PAD * 2;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = font(fit(ctx, kicker, 40, width), false);
  ctx.fillText(kicker, PAD, 222);
  ctx.fillStyle = '#ffffff';
  ctx.font = font(fit(ctx, title, 104, width, true), true);
  ctx.fillText(title, PAD, 360);

  let x = PAD;
  ctx.font = font(30, false);
  ctx.textBaseline = 'middle';
  for (const pill of pills) {
    const w = ctx.measureText(pill).width + 40;
    if (x + w > WIDTH - PAD) break;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, x, 410, w, 56, 28);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(pill, x + 20, 440);
    x += w + 14;
  }

  ctx.font = font(32, true);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(new URL(site.url).host, PAD, HEIGHT - PAD + 4);
  ctx.font = font(34, true);
  const w = ctx.measureText(action).width + 56;
  ctx.fillStyle = '#fbbf24';
  roundRect(ctx, WIDTH - PAD - w, HEIGHT - PAD - 34, w, 72, 36);
  ctx.fill();
  ctx.fillStyle = '#1f2937';
  ctx.fillText(action, WIDTH - PAD - w + 28, HEIGHT - PAD + 4);
  return canvas.encode('jpeg', 88);
}

const loadLogo = (size) => loadImage(Buffer.from(readFileSync(logoFile, 'utf8').replace('<svg ', `<svg width="${size}" height="${size}" `)));

// Home screen icons. The maskable one fills the whole square, because phones cut it to their own shape.
async function buildIcons() {
  mkdirSync(iconDir, { recursive: true });
  const sourceTime = Math.max(statSync(logoFile).mtimeMs, statSync(fileURLToPath(import.meta.url)).mtimeMs);
  const icons = [
    { name: 'icon-192.png', size: 192, inset: 0 },
    { name: 'icon-512.png', size: 512, inset: 0 },
    { name: 'icon-maskable-512.png', size: 512, inset: 0.18 },
  ];
  for (const { name, size, inset } of icons) {
    const file = join(iconDir, name);
    if (existsSync(file) && statSync(file).mtimeMs > sourceTime) continue;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const logo = await loadLogo(size);
    if (inset) {
      ctx.fillStyle = '#3867d6';
      ctx.fillRect(0, 0, size, size);
    }
    const margin = size * inset;
    ctx.drawImage(logo, margin, margin, size - margin * 2, size - margin * 2);
    writeFileSync(file, await canvas.encode('png'));
  }
}

const dayLabel = (date, locale) => {
  const d = new Date(`${date}T00:00:00Z`);
  const part = (options) => d.toLocaleDateString(locale, { ...options, timeZone: 'UTC' });
  return { date: `${d.getUTCDate()} ${part({ month: 'long' })} ${d.getUTCFullYear()}`, weekday: part({ weekday: 'long' }) };
};

export const ogName = {
  site: (lang) => `site-${lang}.jpg`,
  day: (date, lang) => `${date}-${lang}.jpg`,
  month: (month, lang) => `month-${month}-${lang}.jpg`,
};

// `days`: [{ date, count, categories, file }]; `months`: [{ key, label: { gu, en }, total, files }].
// An image is only redrawn when it is older than its sources, this script, the fonts, the logo or site.json.
export async function buildShareImages(days, months, { site, categories }) {
  await buildIcons();
  mkdirSync(ogDir, { recursive: true });
  const jobs = ['gu', 'en'].flatMap((lang) => [
    { name: ogName.site(lang), lang, files: [], draw: (t) => ({ kicker: t.siteKicker, title: t.siteTitle, pills: [t.siteText], action: t.play }) },
    ...days.map((day) => ({
      name: ogName.day(day.date, lang), lang, files: [day.file],
      draw: (t) => {
        const { date, weekday } = dayLabel(day.date, t.locale);
        const topics = day.categories.slice(0, 3).map((c) => (lang === 'gu' ? categories[c] ?? c : c));
        return { kicker: `${t.quiz} · ${weekday}`, title: date, pills: [t.questions(day.count), ...topics], action: t.play };
      },
    })),
    ...months.map((month) => ({
      name: ogName.month(month.key, lang), lang, files: month.files,
      draw: (t) => ({ kicker: t.monthKicker, title: month.label[lang], pills: [t.monthText(month.total)], action: t.download }),
    })),
  ]);

  const wanted = new Set(jobs.map((job) => job.name));
  readdirSync(ogDir).filter((name) => !wanted.has(name)).forEach((name) => rmSync(join(ogDir, name)));
  const inputs = [fileURLToPath(import.meta.url), logoFile, join(fontsDir, 'HindVadodara-Regular.ttf'), join(fontsDir, 'HindVadodara-Bold.ttf'),
    join(root, 'src/app/data/site.json'), join(root, 'src/app/i18n/categories.gu.json')];
  const toolTime = Math.max(...inputs.map((f) => statSync(f).mtimeMs));
  const logo = await loadLogo(512);
  let built = 0;
  for (const job of jobs) {
    const file = join(ogDir, job.name);
    const sourceTime = Math.max(toolTime, ...job.files.map((f) => statSync(f).mtimeMs));
    if (existsSync(file) && statSync(file).mtimeMs > sourceTime) continue;
    writeFileSync(file, await card({ site, logo, ...job.draw(TEXT[job.lang]) }));
    built++;
  }
  return built;
}
