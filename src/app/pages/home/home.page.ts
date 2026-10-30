import { Component, ViewEncapsulation, effect, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { latestDay, months } from '@content/content';
import { daySummaries } from '@content/content.generated';
import { MetaService } from '@core/services/meta.service';
import { LangService } from '@i18n/lang.service';
import { DatePicker } from '@shared/components/date-picker/date-picker';
import { DemoNotice } from '@shared/components/demo-notice/demo-notice';
import { TelegramJoin } from '@shared/components/telegram-join/telegram-join';

// Home page: what the site is, today's quiz and the day-wise archive.
@Component({
  selector: 'home-page',
  encapsulation: ViewEncapsulation.None,
  imports: [DatePipe, RouterLink, DatePicker, DemoNotice, TelegramJoin],
  template: `
  @let t = lang.t();
  @let locale = lang.locale();
  <div class="mx-auto max-w-3xl">
    <ca-demo-notice/>
    <header class="flex flex-col items-center gap-4 text-center">
      <span class="rounded-full border border-primary-500 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">{{ t.updatedDaily }}</span>
      <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl lg:text-5xl">{{ t.heroTitle }}</h1>
      <p class="max-w-xl text-gray-600 dark:text-gray-400">{{ t.heroText }}</p>
      @if (latest; as day) {
        <div class="flex flex-wrap justify-center gap-3">
          <a [routerLink]="lang.path('/current-affairs/' + day.date)" class="rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-600">
            {{ t.startToday }} · {{ day.date | date: 'd MMM' : undefined : locale }}
          </a>
          <ca-date-picker [dates]="dates"/>
          <ca-telegram-join/>
        </div>
      }
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ t.stats(days.length, totalQuestions) }}</p>
    </header>

    <section class="mt-16">
      <h2 class="text-center text-2xl font-bold text-gray-900 dark:text-white">{{ t.whyTitle }}</h2>
      <p class="mx-auto mt-2 max-w-xl text-center text-gray-600 dark:text-gray-400">{{ t.whyText }}</p>
      <div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        @for (reason of t.reasons; track $index; let i = $index) {
          <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <p class="flex items-center gap-3 font-semibold text-gray-900 dark:text-white">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">{{ i + 1 }}</span>
              {{ reason.title }}
            </p>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">{{ reason.text }}</p>
          </div>
        }
      </div>
    </section>

    <section class="mt-16 rounded-xl bg-primary-50 dark:bg-gray-800/60 p-6 text-center sm:p-8">
      <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ t.usefulFor }}</h2>
      <div class="mt-4 flex flex-wrap justify-center gap-2">
        @for (exam of t.exams; track exam) {
          <span class="rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1 text-sm text-gray-700 dark:text-gray-200">{{ exam }}</span>
        }
      </div>
    </section>

    <section class="mt-16">
      <h2 class="text-center text-2xl font-bold text-gray-900 dark:text-white">{{ t.howTitle }}</h2>
      <ol class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        @for (step of t.steps; track $index; let i = $index) {
          <li class="rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <p class="text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">{{ t.stepLabel(i + 1) }}</p>
            <p class="mt-1 font-semibold text-gray-900 dark:text-white">{{ step.title }}</p>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ step.text }}</p>
          </li>
        }
      </ol>
    </section>

    <div class="mt-16">
      <ca-telegram-join variant="card"/>
    </div>

    <section id="days" class="mt-16">
      <div class="flex flex-col items-center gap-3">
        <h2 class="text-center text-2xl font-bold text-gray-900 dark:text-white">{{ t.daywiseTitle }}</h2>
        <ca-date-picker [dates]="dates" [label]="t.pickFromCalendar"/>
      </div>
      @for (month of months; track month.key) {
        @let label = lang.monthLabel(month.key);
        <div class="mt-8 mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 class="text-sm font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">{{ label }}</h3>
          <a [routerLink]="lang.path('/current-affairs/month/' + month.key)" class="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">{{ t.allMonthQuestions(label) }} →</a>
        </div>
        <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          @for (day of month.days; track day.date) {
            <li>
              <a [routerLink]="lang.path('/current-affairs/' + day.date)"
                class="group flex h-full items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-800 p-4 transition-colors hover:border-primary-500">
                <span class="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-500 text-white">
                  <span class="text-xl font-bold leading-none">{{ day.date | date: 'd' : undefined : locale }}</span>
                  <span class="text-xs uppercase">{{ day.date | date: 'MMM' : undefined : locale }}</span>
                </span>
                <span class="min-w-0 flex-1">
                  <span class="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    {{ day.date | date: 'EEEE' : undefined : locale }}
                    @if (day === latest) { <span class="rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-green-300">{{ t.latest }}</span> }
                  </span>
                  <span class="mt-0.5 block truncate text-sm text-gray-600 dark:text-gray-400">{{ t.cardSubtitle(day.count, topics(day.categories)) }}</span>
                </span>
                <span class="text-primary-600 dark:text-primary-400 transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
              </a>
            </li>
          }
        </ul>
      }
    </section>

    <p class="mt-12 text-center text-xs text-gray-500 dark:text-gray-400">
      {{ t.homeFootnote }}
      <a [routerLink]="lang.path('/about')" fragment="contact" class="underline hover:text-primary-600">{{ t.letUsKnow }}</a>.
    </p>
  </div>
  `
})
export class HomePage {
  lang = inject(LangService);
  // Newest first.
  days = daySummaries;
  latest = latestDay;
  dates = this.days.map(day => day.date);
  totalQuestions = this.days.reduce((sum, day) => sum + day.count, 0);
  // Days grouped by month, so the list stays readable as it grows.
  months = months;

  constructor() {
    const meta = inject(MetaService);
    effect(() => {
      const t = this.lang.t();
      meta.setMetaTags(t.homeMetaTitle, t.homeMetaDescription,
        ['current affairs', 'કરન્ટ અફેર્સ', 'daily current affairs', 'gujarati current affairs', 'current affairs quiz', 'gk', 'upsc', 'gpsc', 'ssc', 'bank exams']);
    });
  }

  // The day's three main categories, for the card subtitle.
  topics(categories: string[]): string {
    return categories.slice(0, 3).map(name => this.lang.category(name)).join(', ');
  }
}
