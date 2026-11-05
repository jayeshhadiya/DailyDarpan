// Called by build-content.mjs. Reads content/exams/*.json (files starting with "_", like the
// _template.json, are skipped), checks them, and writes src/app/content/exams.generated.ts:
// the list of notifications plus one lazy loader each, so a notification's details are only
// downloaded when its page is opened. Returns the summaries, or the problems found.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Sections that are a piece of text, a list of text, or a list of rows with these fields
// (the first field of each row is required). Must match ExamText in src/app/content/exams.schema.ts.
const TEXT = ['title', 'organization', 'summary', 'ageLimit', 'salary'];
const LISTS = ['education', 'selectionProcess', 'examNotes', 'howToApply'];
const ROWS = {
  posts: ['name', 'vacancies', 'payScale'],
  importantDates: ['event', 'date'],
  ageRelaxation: ['category', 'relaxation'],
  fees: ['category', 'amount'],
  examPattern: ['paper', 'subjects', 'questions', 'marks', 'duration'],
  syllabus: ['topic', 'details'],
};
const SHARED = ['id', 'board', 'advtNo', 'published', 'startDate', 'lastDate', 'totalVacancies', 'notificationUrl', 'applyUrl', 'gu'];

const isRealDate = (date) => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const time = new Date(`${date}T00:00:00Z`);
  return !isNaN(time.getTime()) && time.toISOString().slice(0, 10) === date;
};
const isUrl = (value) => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
};
const isText = (value) => typeof value === 'string' && value.trim() !== '';

// Checks the text sections of `text` (the English at the top level, or the "gu" block).
// `english` is given when checking "gu", so its lists can be held to the same length.
function checkText(text, fail, where, english) {
  for (const key of Object.keys(text)) {
    if (![...TEXT, ...LISTS, ...Object.keys(ROWS)].includes(key) && !(where === '' && SHARED.includes(key))) {
      fail(`${where}unknown field "${key}"`);
    }
  }
  for (const key of TEXT) {
    if (text[key] !== undefined && !isText(text[key])) fail(`${where}"${key}" must be text`);
  }
  for (const key of LISTS) {
    if (text[key] === undefined) continue;
    if (!Array.isArray(text[key]) || !text[key].length || !text[key].every(isText)) fail(`${where}"${key}" must be a list of text`);
  }
  for (const [key, fields] of Object.entries(ROWS)) {
    const rows = text[key];
    if (rows === undefined) continue;
    if (!Array.isArray(rows) || !rows.length) { fail(`${where}"${key}" must be a list with at least one row`); continue; }
    rows.forEach((row, i) => {
      const at = `${where}"${key}" row ${i + 1}`;
      if (!row || typeof row !== 'object' || Array.isArray(row)) return fail(`${at} must be an object`);
      if (!isText(row[fields[0]])) fail(`${at} needs "${fields[0]}"`);
      for (const field of Object.keys(row)) {
        if (!fields.includes(field)) fail(`${at} has unknown field "${field}" (allowed: ${fields.join(', ')})`);
        else if (typeof row[field] !== 'string') fail(`${at} "${field}" must be text ("" to leave it blank)`);
      }
    });
    // A translated list replaces the English one, so it must hold the same rows in the same order.
    if (english && Array.isArray(english[key]) && english[key].length !== rows.length) {
      fail(`${where}"${key}" has ${rows.length} rows but the English has ${english[key].length}`);
    }
  }
}

export function buildExams(root) {
  const dir = join(root, 'content/exams');
  const files = existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith('.json') && !name.startsWith('_')) : [];
  const errors = [];
  const exams = files.map((file) => {
    const fail = (message) => errors.push(`content/exams/${file}: ${message}`);
    let exam;
    try {
      exam = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    } catch (error) {
      fail(`not valid JSON (${error.message})`);
      return null;
    }
    if (!exam || typeof exam !== 'object' || Array.isArray(exam)) {
      fail('must be an object');
      return null;
    }
    if (`${exam.id}.json` !== file) fail(`"id" must match the file name (got "${exam.id}")`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(exam.id ?? '')) fail('"id" must be lowercase letters, digits and dashes, e.g. "gsssb-food-safety-officer-2026"');
    if (!isText(exam.title)) fail('needs a "title"');
    if (!isText(exam.board)) fail('needs a "board", the short name of the recruiting body, e.g. "GSSSB"');
    if (exam.advtNo !== undefined && !isText(exam.advtNo)) fail('"advtNo" must be text');
    if (!isRealDate(exam.published)) fail('"published" must be a real YYYY-MM-DD date');
    for (const key of ['startDate', 'lastDate']) {
      if (exam[key] !== undefined && !isRealDate(exam[key])) fail(`"${key}" must be a real YYYY-MM-DD date`);
    }
    if (isRealDate(exam.startDate) && isRealDate(exam.lastDate) && exam.startDate > exam.lastDate) fail('"startDate" is after "lastDate"');
    if (exam.totalVacancies !== undefined && !(Number.isInteger(exam.totalVacancies) && exam.totalVacancies > 0)) {
      fail('"totalVacancies" must be a whole number above 0 (leave it out if not known)');
    }
    if (!isUrl(exam.notificationUrl)) fail('"notificationUrl" must be the link to the official notification');
    if (exam.applyUrl !== undefined && !isUrl(exam.applyUrl)) fail('"applyUrl" must be a link');
    checkText(exam, fail, '');
    if (exam.gu !== undefined) {
      if (!exam.gu || typeof exam.gu !== 'object' || Array.isArray(exam.gu)) fail('"gu" must be an object');
      else checkText(exam.gu, fail, '"gu" ', exam);
    }
    return { exam, file };
  }).filter(Boolean).sort((a, b) => b.exam.published.localeCompare(a.exam.published) || a.exam.id.localeCompare(b.exam.id));

  if (errors.length) return { errors, summaries: [] };

  const summaries = exams.map(({ exam }) => ({
    id: exam.id,
    board: exam.board,
    published: exam.published,
    ...(exam.lastDate ? { lastDate: exam.lastDate } : {}),
    ...(exam.totalVacancies ? { totalVacancies: exam.totalVacancies } : {}),
    title: exam.title,
    ...(exam.gu?.title ? { titleGu: exam.gu.title } : {}),
  }));
  const generated = `// Generated by scripts/build-exams.mjs from content/exams. Do not edit by hand.
import { ExamNotification, ExamSummary } from '@content/exams.schema';

// Newest first.
export const examSummaries: ExamSummary[] = ${JSON.stringify(summaries, null, 2)};

// Each notification is its own small file, downloaded only when its page is opened.
export const examLoaders: Record<string, () => Promise<ExamNotification>> = {
${exams.map(({ exam, file }) => `  '${exam.id}': () => import('../../../content/exams/${file}').then(m => m.default as ExamNotification),`).join('\n')}
};
`;
  writeFileSync(join(root, 'src/app/content/exams.generated.ts'), generated);
  return { errors, summaries, untranslated: exams.filter(({ exam }) => !exam.gu).map(({ exam }) => exam.id) };
}
