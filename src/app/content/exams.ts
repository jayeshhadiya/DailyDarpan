import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import { examLoaders } from '@content/exams.generated';
import { ExamNotification, ExamSummary, ExamText } from '@content/exams.schema';
import { LangService } from '@i18n/lang.service';
import { Lang } from '@i18n/strings';

// The text of a notification in `lang`: each Gujarati section where there is one, otherwise the English.
export function localizeExam(exam: ExamNotification, lang: Lang): ExamText {
  return lang === 'gu' && exam.gu ? { ...exam, ...exam.gu } as ExamText : exam;
}

// True when every section of the notification can be shown in `lang`.
export function isExamTranslated(exam: ExamNotification, lang: Lang): boolean {
  if (lang === 'en') return true;
  const sections = Object.keys(exam).filter(key => !['id', 'board', 'advtNo', 'published', 'startDate', 'lastDate', 'totalVacancies', 'notificationUrl', 'applyUrl', 'gu'].includes(key));
  return !!exam.gu && sections.every(key => key in exam.gu!);
}

export function examTitle(exam: ExamSummary, lang: Lang): string {
  return lang === 'gu' && exam.titleGu ? exam.titleGu : exam.title;
}

// "Open" until the end of the last date (India time), "closed" after; undefined without a last date.
export function examStatus(lastDate: string | undefined, now: Date): 'open' | 'closed' | undefined {
  if (!lastDate) return undefined;
  return now.getTime() <= new Date(`${lastDate}T23:59:59+05:30`).getTime() ? 'open' : 'closed';
}

// Unknown notifications show the 404 page (in the same language) but keep the address the visitor typed.
export const examResolver: ResolveFn<ExamNotification | RedirectCommand> = async route => {
  const load = examLoaders[route.paramMap.get('id') ?? ''];
  return load ? load() : new RedirectCommand(inject(Router).parseUrl(inject(LangService).path('/404')), { skipLocationChange: true });
};
