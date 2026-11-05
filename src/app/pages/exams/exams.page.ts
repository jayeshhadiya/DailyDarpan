import { Component, ViewEncapsulation, afterNextRender, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { examStatus, examTitle } from '@content/exams';
import { examSummaries } from '@content/exams.generated';
import { MetaService } from '@core/services/meta.service';
import { LangService } from '@i18n/lang.service';
import { TelegramJoin } from '@shared/components/telegram-join/telegram-join';

// Every exam notification at /exams, newest first. Open/closed is worked out in the browser
// (the page is prerendered, so the build date would soon be wrong).
@Component({
  selector: 'exams-page',
  encapsulation: ViewEncapsulation.None,
  imports: [DatePipe, RouterLink, TelegramJoin],
  template: `
  @let t = lang.t();
  @let locale = lang.locale();
  <div class="mx-auto max-w-3xl">
    <header class="flex flex-col items-center gap-3 text-center">
      <span class="rounded-full border border-primary-500 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">{{ t.examsBadge }}</span>
      <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white lg:text-4xl">{{ t.examsTitle }}</h1>
      <p class="max-w-xl text-gray-600 dark:text-gray-400">{{ t.examsIntro }}</p>
    </header>

    @if (exams.length) {
      <ul class="mt-10 flex flex-col gap-4">
        @for (exam of exams; track exam.id) {
          @let status = now() ? examStatus(exam.lastDate, now()!) : undefined;
          <li>
            <a [routerLink]="lang.path('/exams/' + exam.id)" class="flex flex-col gap-2 rounded-xl border border-gray-200 dark:border-gray-800 p-5 transition-colors hover:border-primary-500">
              <span class="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest">
                <span class="text-primary-600 dark:text-primary-400">{{ exam.board }}</span>
                @if (status) {
                  <span [class]="status === 'open' ? 'rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-green-800 dark:text-green-200' : 'rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-gray-600 dark:text-gray-300'">
                    {{ status === 'open' ? t.statusOpen : t.statusClosed }}
                  </span>
                }
              </span>
              <span class="text-lg font-semibold text-gray-900 dark:text-white">{{ examTitle(exam, lang.lang()) }}</span>
              <span class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                @if (exam.totalVacancies) { <span>{{ t.posts(exam.totalVacancies) }}</span> }
                @if (exam.lastDate) { <span>{{ t.lastDateOn((exam.lastDate | date: 'd MMMM y' : 'UTC' : locale) ?? '') }}</span> }
                <span class="text-gray-500">{{ t.publishedOn((exam.published | date: 'd MMM y' : 'UTC' : locale) ?? '') }}</span>
              </span>
            </a>
          </li>
        }
      </ul>
    } @else {
      <p class="mt-10 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-gray-600 dark:text-gray-400">{{ t.examsEmpty }}</p>
    }

    <div class="mt-12">
      <ca-telegram-join variant="card"/>
    </div>
  </div>
  `
})
export class ExamsPage {
  lang = inject(LangService);
  private metaService = inject(MetaService);
  exams = examSummaries;
  examTitle = examTitle;
  examStatus = examStatus;
  // Set once the page runs in the browser.
  now = signal<Date | undefined>(undefined);

  constructor() {
    afterNextRender(() => this.now.set(new Date()));
    effect(() => {
      const t = this.lang.t();
      this.metaService.setMetaTags(
        t.examsTitle,
        t.examsMetaDescription,
        ['exam notification', 'sarkari naukri', 'government jobs', 'ભરતી', 'સરકારી નોકરી', 'gpsc', 'gsssb', 'ojas', 'upsc', 'ssc'],
      );
      this.metaService.setStructuredData([
        this.metaService.breadcrumbs([
          { name: t.navHome, path: '/' },
          { name: t.examsTitle, path: '/exams' },
        ]),
      ]);
    });
  }
}
