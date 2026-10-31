import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import { CurrentAffairsDay, CurrentAffairsMonth, CurrentAffairsQuestion } from '@content/content.schema';
import { dayLoaders, daySummaries, monthPdfs } from '@content/content.generated';
import site from '@data/site.json';
import { LangService } from '@i18n/lang.service';
import { Lang } from '@i18n/strings';

// Every month that has questions, newest first.
export const months: CurrentAffairsMonth[] = daySummaries.reduce<CurrentAffairsMonth[]>((list, day) => {
  const key = day.date.slice(0, 7);
  const month = list.find(m => m.key === key);
  month ? month.days.push(day) : list.push({ key, days: [day] });
  return list;
}, []);

// The newest day. Each day's questions go up the next morning, so on 31 October this is 30 October.
export const latestDay = daySummaries[0];

// Address of the newest quiz ("latest quiz"), or the home page while there is none.
export const latestQuizPath = latestDay ? `/current-affairs/${latestDay.date}` : '/';

// Address of a complete month's compilation PDF in `lang` (built by scripts/build-pdfs.mjs),
// or undefined while the month is still running.
export function monthPdfPath(month: string, lang: Lang): string | undefined {
  return monthPdfs.includes(month) ? `/pdf/current-affairs-${month}-${lang}.pdf` : undefined;
}

// Months before site.launchDate only have a few sample days; their PDFs and cards say so.
export function isDemoMonth(month: string): boolean {
  return month < site.launchDate.slice(0, 7);
}

// A question in the language being shown; `category` stays the English name.
export interface QuestionView {
  question: string;
  options: string[];
  explanation?: string;
  category?: string;
  answer: number;
}

// Picks the Gujarati text when there is one, otherwise the English.
export function localizeQuestion(q: CurrentAffairsQuestion, lang: Lang): QuestionView {
  const text = lang === 'gu' && q.gu ? q.gu : q;
  return { question: text.question, options: text.options, explanation: text.explanation, category: q.category, answer: q.answer };
}

// True when every question of the day can be shown in `lang`.
export function isTranslated(day: CurrentAffairsDay, lang: Lang): boolean {
  return lang === 'en' || day.questions.every(q => q.gu);
}

// Unknown dates and months show the 404 page (in the same language) but keep the address the visitor typed.
const notFound = () => new RedirectCommand(inject(Router).parseUrl(inject(LangService).path('/404')), { skipLocationChange: true });

// Route resolvers: the router waits for these on the server and in the browser, so prerendered
// pages already contain their content and hydration sees the same.
export const dayResolver: ResolveFn<CurrentAffairsDay | RedirectCommand> = async route => {
  const load = dayLoaders[route.paramMap.get('date') ?? ''];
  return load ? load() : notFound();
};

// The month page shows PDF cards only, so it needs the month, not its questions.
export const monthResolver: ResolveFn<CurrentAffairsMonth | RedirectCommand> = route =>
  months.find(m => m.key === route.paramMap.get('month')) ?? notFound();
