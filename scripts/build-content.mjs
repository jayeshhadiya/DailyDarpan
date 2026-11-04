// Reads every day in content/days (new days in content/days/YYYY-MM-DD.json, finished months in
// content/days/YYYY-MM/), checks it for mistakes, and generates:
//   src/app/content/content.generated.ts  list of days + one lazy loader per day
//   public/sitemap.xml (Gujarati pages at /…, English at /en/…) and public/robots.txt
//   public/pdf/*.pdf  the monthly compilation PDFs of every complete month (see build-pdfs.mjs)
//   public/og/*.jpg and public/icons/*.png  link preview images and app icons (see build-images.mjs)
// Once a month is complete, its day files are moved into their month folder (content/days/2026-10/).
// Runs automatically before `npm start` and `npm run build`; run `npm run content` to check new files.
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildShareImages } from './build-images.mjs';
import { buildMonthPdfs } from './build-pdfs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const daysDir = join(root, 'content/days');
const site = JSON.parse(readFileSync(join(root, 'src/app/data/site.json'), 'utf8'));
const siteUrl = site.url.replace(/\/$/, '');

// Day files, as paths inside content/days: new days at the top, finished months in YYYY-MM folders.
const dayFiles = readdirSync(daysDir).flatMap((name) => {
  if (name.endsWith('.json')) return [name];
  if (/^\d{4}-\d{2}$/.test(name) && statSync(join(daysDir, name)).isDirectory()) {
    return readdirSync(join(daysDir, name)).filter((file) => file.endsWith('.json')).map((file) => `${name}/${file}`);
  }
  return [];
});

// YYYY-MM-DD of a day that exists. Date.parse accepts 2026-02-30 (it rolls over to 2 March),
// so the date must come back unchanged from a round trip.
const isRealDate = (date) => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const time = new Date(`${date}T00:00:00Z`);
  return !isNaN(time.getTime()) && time.toISOString().slice(0, 10) === date;
};

const errors = [];
// Where each date's file is, to catch the same day twice and to build the loaders.
const fileOf = {};
const days = dayFiles
  .map((path) => {
    const file = path.split('/').pop();
    const folder = path.includes('/') ? path.split('/')[0] : null;
    const fail = (message) => errors.push(`content/days/${path}: ${message}`);
    let day;
    try {
      day = JSON.parse(readFileSync(join(daysDir, path), 'utf8'));
    } catch (error) {
      fail(`not valid JSON (${error.message})`);
      return null;
    }
    if (!day || typeof day !== 'object' || Array.isArray(day)) {
      fail('must be an object with "date" and "questions"');
      return null;
    }
    if (`${day.date}.json` !== file) fail(`"date" must match the file name (got "${day.date}")`);
    if (folder && !file.startsWith(`${folder}-`)) fail(`is in the ${folder} folder but is not a day of that month`);
    if (fileOf[day.date]) fail(`the same day is also in content/days/${fileOf[day.date]}`);
    fileOf[day.date] = path;
    // Date.parse accepts days that don't exist (2026-02-30), so the date must survive a round trip.
    if (!isRealDate(day.date)) fail('"date" must be a real YYYY-MM-DD date');
    if (!Array.isArray(day.questions) || !day.questions.length) fail('needs at least one question');
    (day.questions ?? []).forEach((q, i) => {
      const at = `question ${i + 1}`;
      if (!q.question?.trim()) fail(`${at} has no "question" text`);
      // Options are lettered A–F on the site and in the PDFs.
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) fail(`${at} needs 2 to 6 options`);
      else if (new Set(q.options).size !== q.options.length) fail(`${at} has the same option twice`);
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= (q.options?.length ?? 0)) {
        fail(`${at} "answer" must be the index of the right option (0 = first)`);
      }
      // Optional Gujarati text: same options, in the same order, so "answer" works for both.
      if (q.gu !== undefined) {
        if (!q.gu.question?.trim()) fail(`${at} "gu" has no "question" text`);
        if (!Array.isArray(q.gu.options) || q.gu.options.length !== q.options?.length) fail(`${at} "gu" must have the same number of options as the English`);
        else if (new Set(q.gu.options).size !== q.gu.options.length) fail(`${at} "gu" has the same option twice`);
      }
    });
    return day;
  })
  .filter(Boolean)
  .sort((a, b) => b.date.localeCompare(a.date));

if (errors.length) {
  console.error(`Content has ${errors.length} problem(s):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}

// Main categories of a day, most common first, for the archive cards and filters.
const categories = (day) => {
  const counts = {};
  day.questions.forEach((q) => q.category && (counts[q.category] = (counts[q.category] ?? 0) + 1));
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
};

const summaries = days.map((day) => ({ date: day.date, count: day.questions.length, categories: categories(day) }));
const months = [...new Set(days.map((day) => day.date.slice(0, 7)))];

// A day's questions are uploaded the next morning (31 October's on 1 November), so a month is complete
// once its last calendar day is in, or once a later month has started (in case a day was skipped).
const lastDayOf = (month) => new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).toISOString().slice(0, 10);
const completeMonths = months.filter((month) => days.some((day) => day.date === lastDayOf(month) || day.date.slice(0, 7) > month));

// Move the day files of complete months into their month folder, so content/days only holds the running month.
// Not on Vercel or other CI, where the checkout is thrown away after the build.
const archived = [];
if (!process.env.CI && !process.env.VERCEL) {
  for (const day of days) {
    const month = day.date.slice(0, 7);
    if (!completeMonths.includes(month) || fileOf[day.date].includes('/')) continue;
    const target = `${month}/${day.date}.json`;
    mkdirSync(join(daysDir, month), { recursive: true });
    if (existsSync(join(daysDir, target))) continue;
    renameSync(join(daysDir, fileOf[day.date]), join(daysDir, target));
    fileOf[day.date] = target;
    archived.push(day.date);
  }
}

const generated = `// Generated by scripts/build-content.mjs from content/days. Do not edit by hand.
import { CurrentAffairsDay, DaySummary } from '@content/content.schema';

// Newest first.
export const daySummaries: DaySummary[] = ${JSON.stringify(summaries, null, 2)};

// Each day is its own small file, downloaded only when that day (or its month) is opened.
export const dayLoaders: Record<string, () => Promise<CurrentAffairsDay>> = {
${days.map((day) => `  '${day.date}': () => import('../../../content/days/${fileOf[day.date]}').then(m => m.default as CurrentAffairsDay),`).join('\n')}
};

// Complete months (YYYY-MM) that have compilation PDFs in public/pdf.
export const monthPdfs: string[] = ${JSON.stringify(completeMonths)};
`;
mkdirSync(join(root, 'src/app/content'), { recursive: true });
writeFileSync(join(root, 'src/app/content/content.generated.ts'), generated);

const guPages = [
  { path: '/', lastmod: days[0]?.date },
  { path: '/about' },
  { path: '/privacy' },
  ...days.map((day) => ({ path: `/current-affairs/${day.date}`, lastmod: day.date })),
  // days is newest first, so the first match is the month's latest day.
  ...months.map((month) => ({ path: `/current-affairs/month/${month}`, lastmod: days.find((day) => day.date.startsWith(month)).date })),
];
// Every page in Gujarati (the default) and in English under /en.
const pages = [...guPages, ...guPages.map((page) => ({ ...page, path: page.path === '/' ? '/en' : `/en${page.path}` }))];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((page) => `  <url><loc>${siteUrl}${page.path}</loc>${page.lastmod ? `<lastmod>${page.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
writeFileSync(join(root, 'public/sitemap.xml'), sitemap);
writeFileSync(join(root, 'public/robots.txt'), robots);

const monthLabel = (month, locale) => new Date(`${month}-01`).toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
const categoryNames = JSON.parse(readFileSync(join(root, 'src/app/i18n/categories.gu.json'), 'utf8'));
const imagesBuilt = await buildShareImages(
  summaries.map((day) => ({ ...day, file: join(daysDir, fileOf[day.date]) })),
  months.map((month) => {
    const monthDays = summaries.filter((day) => day.date.startsWith(month));
    return {
      key: month,
      label: { gu: monthLabel(month, 'gu-IN'), en: monthLabel(month, 'en-US') },
      total: monthDays.reduce((sum, day) => sum + day.count, 0),
      files: monthDays.map((day) => join(daysDir, fileOf[day.date])),
    };
  }),
  { site, categories: categoryNames },
);
const built = await buildMonthPdfs(completeMonths.map((month) => {
  const monthDays = days.filter((day) => day.date.startsWith(month)).reverse();
  return {
    key: month,
    label: { gu: monthLabel(month, 'gu-IN'), en: monthLabel(month, 'en-US') },
    days: monthDays,
    files: monthDays.map((day) => join(daysDir, fileOf[day.date])),
  };
}), { site, categories: categoryNames });

const untranslated = days.filter((day) => day.questions.some((q) => !q.gu)).map((day) => day.date);
console.log(`Content OK: ${days.length} days, ${summaries.reduce((sum, day) => sum + day.count, 0)} questions, ${months.length} months`);
if (archived.length) console.log(`Moved ${archived.length} day file(s) into their month folder: ${[...new Set(archived.map((date) => `content/days/${date.slice(0, 7)}/`))].join(', ')}`);
console.log(`Monthly PDFs: ${completeMonths.length ? `${completeMonths.join(', ')} (${built} rebuilt)` : 'none yet (no month is complete)'}`);
console.log(`Share images: ${imagesBuilt} drawn`);
if (untranslated.length) console.log(`Not fully in Gujarati yet (shown in English on Gujarati pages): ${untranslated.join(', ')}`);
