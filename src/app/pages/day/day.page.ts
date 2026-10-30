import { Component, ViewEncapsulation, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe, formatDate } from '@angular/common';
import { RouterLink } from '@angular/router';
import { isTranslated, localizeQuestion } from '@content/content';
import { daySummaries } from '@content/content.generated';
import { CurrentAffairsDay } from '@content/content.schema';
import { MetaService } from '@core/services/meta.service';
import site from '@data/site.json';
import { LangService } from '@i18n/lang.service';
import { DatePicker } from '@shared/components/date-picker/date-picker';
import { DemoNotice } from '@shared/components/demo-notice/demo-notice';
import { TelegramJoin } from '@shared/components/telegram-join/telegram-join';

// One day's quiz at /current-affairs/YYYY-MM-DD. The questions come from dayResolver;
// an unknown date shows the 404 page.
@Component({
  selector: 'day-page',
  encapsulation: ViewEncapsulation.None,
  imports: [DatePipe, RouterLink, DatePicker, DemoNotice, TelegramJoin],
  template: `
  @let t = lang.t();
  @let locale = lang.locale();
  <div class="mx-auto max-w-2xl">
    <a [routerLink]="lang.path('/')" fragment="days" class="mb-6 inline-block text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">{{ t.allDays }}</a>
    <ca-demo-notice/>
    <header class="flex flex-col items-center gap-3 border-b border-gray-200 dark:border-gray-800 pb-8 text-center">
      <span class="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-500 text-2xl font-bold text-white" aria-hidden="true">?</span>
      <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white lg:text-4xl">{{ t.dayTitle }}</h1>
      @if (day(); as d) {
        <p class="text-lg font-medium text-primary-600 dark:text-primary-400">{{ d.date | date: 'EEEE, d MMMM y' : undefined : locale }}</p>
      }
      <p class="max-w-md text-gray-600 dark:text-gray-400">{{ t.tapOption }}</p>
    </header>

    @if (!translated()) {
      <p class="mt-6 rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3 text-center text-sm text-gray-600 dark:text-gray-300" role="note">{{ t.notTranslated }}</p>
    }

    <div class="mt-6 flex justify-center">
      <ca-date-picker [dates]="dates" [selected]="day().date" [label]="t.chooseAnotherDay"/>
    </div>

    @if (days.length > 1) {
      <nav class="flex gap-2 overflow-x-auto border-b border-gray-200 dark:border-gray-800 py-3" [attr.aria-label]="t.chooseDay">
        @for (d of days; track d.date) {
          <a [routerLink]="lang.path('/current-affairs/' + d.date)" [class]="dayClass(d.date === day().date)"
            [attr.aria-current]="d.date === day().date ? 'date' : null">{{ d.date | date: 'd MMM' : undefined : locale }}</a>
        }
      </nav>
    }

    @if (day(); as d) {
      <div class="sticky top-20 z-[1] mt-6 flex items-center justify-between gap-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur px-4 py-3">
        <p class="text-sm text-gray-700 dark:text-gray-300" aria-live="polite">
          {{ t.score }} <span class="font-bold text-gray-900 dark:text-white">{{ score() }}</span> / {{ d.questions.length }}
          <span class="text-gray-500 dark:text-gray-400"> · {{ t.answered(answeredCount()) }}</span>
        </p>
        <div class="flex gap-2">
          <button type="button" (click)="revealAll()" [class]="smallButton">{{ t.showAnswers }}</button>
          <button type="button" (click)="reset()" [class]="smallButton">{{ t.reset }}</button>
        </div>
      </div>

      <ol class="mt-6 flex flex-col gap-6">
        @for (q of questions(); track $index; let i = $index) {
        <li class="rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
            <span class="text-gray-500 dark:text-gray-400">{{ t.questionLabel }}{{ i + 1 }}</span>
            @if (q.category) { <span class="text-primary-600 dark:text-primary-400">· {{ lang.category(q.category) }}</span> }
          </div>
          <p class="font-semibold text-gray-900 dark:text-white">{{ q.question }}</p>
          <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            @for (option of q.options; track option; let o = $index) {
              <button type="button" (click)="choose(i, o)" [disabled]="isDone(i)" [class]="optionClass(i, o)">
                <span class="me-2 font-semibold">{{ letters[o] }}.</span>{{ option }}
              </button>
            }
          </div>
          @if (isDone(i)) {
            <div class="mt-4 rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3 text-sm" role="status">
              <p class="font-semibold" [class]="resultClass(i)">{{ resultText(i) }}</p>
              @if (q.explanation) { <p class="mt-1 text-gray-600 dark:text-gray-300">{{ q.explanation }}</p> }
            </div>
          }
        </li>
        }
      </ol>

      @if (finished()) {
        <div class="mt-8 flex flex-col items-center gap-3 rounded-xl border-2 border-primary-500 p-6 text-center" role="status">
          <p class="text-3xl font-bold text-gray-900 dark:text-white">{{ score() }} / {{ d.questions.length }}</p>
          <p class="font-semibold text-primary-600 dark:text-primary-400">{{ verdict() }}</p>
          @if (telegramUrl) {
            <p class="max-w-sm text-sm text-gray-600 dark:text-gray-400">{{ t.telegramPrompt }}</p>
            <ca-telegram-join/>
          }
        </div>
      }

      <div class="mt-10 flex flex-col items-center gap-4 rounded-xl bg-primary-50 dark:bg-gray-800/60 p-6 text-center">
        <p class="font-semibold text-gray-900 dark:text-white">{{ t.revising }}</p>
        <div class="flex flex-wrap justify-center gap-3">
          <a [routerLink]="lang.path('/current-affairs/month/' + d.date.slice(0, 7))" class="rounded-lg border border-primary-500 px-5 py-2.5 text-sm font-medium text-primary-700 dark:text-primary-300 hover:bg-primary-500 hover:text-white">
            {{ t.allMonthQuestions(lang.monthLabel(d.date.slice(0, 7))) }}
          </a>
          <ca-telegram-join/>
        </div>
      </div>

      @if (d.sources?.length) {
        <p class="mt-8 text-xs text-gray-500 dark:text-gray-400">
          {{ t.sources }}
          @for (s of d.sources; track s.url; let last = $last) {
            <a [href]="s.url" target="_blank" rel="noopener" class="underline hover:text-primary-600">{{ s.name }}</a>@if (!last) {, }
          }
        </p>
      }
    }
  </div>
  `
})
export class DayPage {
  // Oldest first, so the day chips read left to right.
  days = [...daySummaries].reverse();
  dates = daySummaries.map(day => day.date);
  letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  lang = inject(LangService);
  smallButton = 'rounded-full border border-gray-300 dark:border-gray-700 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400';
  private metaService = inject(MetaService);
  day = input.required<CurrentAffairsDay>();
  // The questions in the language being shown (English where a Gujarati text is missing).
  questions = computed(() => this.day().questions.map(q => localizeQuestion(q, this.lang.lang())));
  translated = computed(() => isTranslated(this.day(), this.lang.lang()));
  // Chosen option per question, keyed by "date:index" so each day keeps its own answers.
  private chosen = signal<Record<string, number>>({});
  private revealed = signal<Record<string, boolean>>({});
  // Every question answered by the student (not just revealed with "Show answers").
  finished = computed(() => this.answeredCount() === this.day().questions.length);
  verdict = computed(() => {
    const share = this.score() / this.day().questions.length;
    const t = this.lang.t();
    return share >= 0.8 ? t.verdictHigh : share >= 0.5 ? t.verdictMid : t.verdictLow;
  });
  telegramUrl = site.telegramUrl;
  answeredCount = computed(() => this.day().questions.filter((_, i) => this.choice(i) !== undefined).length);
  score = computed(() => this.day().questions.filter((q, i) => this.choice(i) === q.answer).length);

  constructor() {
    effect(() => {
      const day = this.day();
      const t = this.lang.t();
      const label = formatDate(day.date, 'd MMMM y', this.lang.locale());
      this.metaService.setMetaTags(
        t.dayMetaTitle(label),
        t.dayMetaDescription(label, day.questions.length),
        ['current affairs', 'કરન્ટ અફેર્સ', `current affairs ${formatDate(day.date, 'd MMMM y', 'en-US')}`, `કરન્ટ અફેર્સ ${label}`, 'daily quiz', 'gk', 'upsc', 'gpsc', 'ssc']
      );
    });
  }

  private key(index: number): string {
    return `${this.day().date}:${index}`;
  }

  choice(index: number): number | undefined {
    return this.chosen()[this.key(index)];
  }

  isDone(index: number): boolean {
    return this.choice(index) !== undefined || !!this.revealed()[this.key(index)];
  }

  choose(index: number, option: number): void {
    if (this.isDone(index)) return;
    this.chosen.update(map => ({ ...map, [this.key(index)]: option }));
  }

  revealAll(): void {
    const keys = this.day().questions.map((_, i) => this.key(i));
    this.revealed.update(map => ({ ...map, ...Object.fromEntries(keys.map(k => [k, true])) }));
  }

  reset(): void {
    const prefix = `${this.day().date}:`;
    const without = <T>(map: Record<string, T>) => Object.fromEntries(Object.entries(map).filter(([k]) => !k.startsWith(prefix)));
    this.chosen.update(without);
    this.revealed.update(without);
  }

  resultText(index: number): string {
    const q = this.questions()[index];
    const t = this.lang.t();
    const correct = `${this.letters[q.answer]}. ${q.options[q.answer]}`;
    const picked = this.choice(index);
    if (picked === undefined) return t.answerIs(correct);
    return picked === q.answer ? t.correct : t.notQuite(correct);
  }

  resultClass(index: number): string {
    const picked = this.choice(index);
    if (picked === undefined) return 'text-gray-900 dark:text-white';
    return picked === this.day().questions[index].answer ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400';
  }

  optionClass(index: number, option: number): string {
    const base = 'w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ';
    if (!this.isDone(index)) {
      return base + 'border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-gray-800';
    }
    if (option === this.day().questions[index].answer) {
      return base + 'border-green-600 bg-green-50 text-green-900 dark:bg-green-900/30 dark:text-green-200';
    }
    if (option === this.choice(index)) {
      return base + 'border-red-600 bg-red-50 text-red-900 dark:bg-red-900/30 dark:text-red-200';
    }
    return base + 'border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500';
  }

  dayClass(active: boolean): string {
    return 'shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors '
      + (active
        ? 'bg-primary-500 border-primary-500 text-white'
        : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-primary-500');
  }
}
