import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import { CurrentAffairsDay, CurrentAffairsMonth, CurrentAffairsQuestion } from '@content/content.schema';
import { dayLoaders, daySummaries } from '@content/content.generated';
import { LangService } from '@i18n/lang.service';
import { Lang } from '@i18n/strings';

// Every month that has questions, newest first.
export const months: CurrentAffairsMonth[] = daySummaries.reduce<CurrentAffairsMonth[]>((list, day) => {
  const key = day.date.slice(0, 7);
  const month = list.find(m => m.key === key);
  month ? month.days.push(day) : list.push({ key, days: [day] });
  return list;
}, []);

export const latestDay = daySummaries[0];

// Address of the newest quiz ("today's quiz"), or the home page while there is none.
export const latestQuizPath = latestDay ? `/current-affairs/${latestDay.date}` : '/';

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
// pages already contain the questions and hydration sees the same content.
export const dayResolver: ResolveFn<CurrentAffairsDay | RedirectCommand> = async route => {
  const load = dayLoaders[route.paramMap.get('date') ?? ''];
  return load ? load() : notFound();
};

export const monthResolver: ResolveFn<CurrentAffairsDay[] | RedirectCommand> = async route => {
  const month = months.find(m => m.key === route.paramMap.get('month'));
  // Read top to bottom like a magazine: 1st of the month first.
  return month ? Promise.all([...month.days].reverse().map(day => dayLoaders[day.date]())) : notFound();
};
