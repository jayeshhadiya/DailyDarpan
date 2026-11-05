import { RenderMode, ServerRoute } from '@angular/ssr';
import { months } from '@content/content';
import { daySummaries } from '@content/content.generated';
import { examSummaries } from '@content/exams.generated';

const monthParams = async () => months.map(month => ({ month: month.key }));
const dayParams = async () => daySummaries.map(day => ({ date: day.date }));
const examParams = async () => examSummaries.map(exam => ({ id: exam.id }));

// Every page is prerendered to plain HTML at build time, one per day, month and exam notification, in both languages.
export const serverRoutes: ServerRoute[] = [
  { path: 'current-affairs/month/:month', renderMode: RenderMode.Prerender, getPrerenderParams: monthParams },
  { path: 'current-affairs/:date', renderMode: RenderMode.Prerender, getPrerenderParams: dayParams },
  { path: 'gu/current-affairs/month/:month', renderMode: RenderMode.Prerender, getPrerenderParams: monthParams },
  { path: 'gu/current-affairs/:date', renderMode: RenderMode.Prerender, getPrerenderParams: dayParams },
  { path: 'exams/:id', renderMode: RenderMode.Prerender, getPrerenderParams: examParams },
  { path: 'gu/exams/:id', renderMode: RenderMode.Prerender, getPrerenderParams: examParams },
  // Includes /404, built as /404/index.html and copied to 404.html, which Vercel serves (with a 404 status) for unknown addresses.
  { path: '**', renderMode: RenderMode.Prerender }
];
