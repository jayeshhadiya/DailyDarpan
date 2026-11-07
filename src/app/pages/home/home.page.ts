import { Component, ViewEncapsulation, computed, effect, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { latestDay, localizeQuestion, months, questionId } from '@content/content';
import { daySummaries } from '@content/content.generated';
import { CurrentAffairsDay } from '@content/content.schema';
import { MetaService } from '@core/services/meta.service';
import { ProgressService } from '@core/services/progress.service';
import { LangService } from '@i18n/lang.service';
import { DatePicker } from '@shared/components/date-picker/date-picker';
import { TelegramJoin } from '@shared/components/telegram-join/telegram-join';
import { VisitorCount } from '@shared/components/visitor-count/visitor-count';

// Home page: a hero with the newest day's first question to try right away, what the site is,
// and the day-wise archive.
@Component({
  selector: 'home-page',
  encapsulation: ViewEncapsulation.None,
  imports: [DatePipe, RouterLink, DatePicker, TelegramJoin, VisitorCount],
  template: `
  @let t = lang.t();
  @let locale = lang.locale();
  <div class="mx-auto max-w-5xl">
    <!-- Hero: headline and buttons, with today's first question beside them. -->
    <!-- Only the blob layer clips; clipping the whole header would cut off the "Choose a day" pop-up on desktop. -->
    <header class="relative rounded-3xl bg-gradient-to-br from-primary-50 via-white to-amber-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-900 px-5 py-10 ring-1 ring-primary-100 dark:ring-gray-800 sm:px-10 lg:py-14">
      <div class="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden="true">
        <div class="home-blob -left-20 -top-24 bg-primary-300/50 dark:bg-primary-700/30"></div>
        <div class="home-blob -bottom-28 -right-16 bg-amber-200/60 dark:bg-amber-700/20 [animation-delay:-4s]"></div>
      </div>

      <div class="relative grid items-center gap-10 lg:grid-cols-2">
        <div class="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
          <div class="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            <span class="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-gray-800/80 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary-700 dark:text-primary-300 shadow-sm ring-1 ring-primary-200 dark:ring-gray-700">
              <span class="relative flex h-2 w-2" aria-hidden="true">
                <span class="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 motion-safe:animate-ping"></span>
                <span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
              </span>
              {{ t.updatedDaily }}
            </span>
            <ca-visitor-count/>
          </div>
          <h1 class="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            {{ t.heroLead }}
            <span class="home-highlight bg-gradient-to-r from-primary-500 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">{{ t.heroHighlight }}</span>
          </h1>
          <p class="max-w-xl text-gray-600 dark:text-gray-300">{{ t.heroText }}</p>
          @if (latest; as day) {
            <div class="flex flex-wrap justify-center gap-3 lg:justify-start">
              <a [routerLink]="lang.path('/current-affairs/' + day.date)"
                class="group inline-flex items-center gap-2 rounded-xl bg-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition hover:-translate-y-0.5 hover:bg-primary-600">
                {{ t.startToday }} · {{ day.date | date: 'd MMM' : undefined : locale }}
                <span class="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
              </a>
              <ca-date-picker [dates]="dates"/>
              <ca-telegram-join/>
            </div>
          }
          <!-- This visitor's own progress, saved in their browser; appears after the first finished quiz. -->
          @if (progress.finishedCount(); as finished) {
            <p class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full bg-amber-100/80 dark:bg-amber-900/30 px-4 py-1.5 text-sm text-amber-900 dark:text-amber-100">
              @if (progress.streak(); as streak) {
                <span class="font-semibold">{{ t.streak(streak) }}</span>
                @if (!progress.playedToday()) { <span>{{ t.streakPending }}</span> }
              }
              <span>{{ t.quizzesFinished(finished) }}</span>
            </p>
          }
        </div>

        <!-- Teaser: the newest day's first question, answerable here; the answer carries over to the quiz page. -->
        @if (teaserQuestion(); as q) {
          <div class="relative">
            <div class="absolute -inset-2 rotate-2 rounded-3xl bg-gradient-to-br from-primary-400 to-amber-400 opacity-30 blur-sm dark:opacity-20" aria-hidden="true"></div>
            <div class="relative rounded-2xl bg-white dark:bg-gray-900 p-5 shadow-xl ring-1 ring-gray-200 dark:ring-gray-700 sm:p-6">
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-bold text-gray-900 dark:text-white">✨ {{ t.tryNow }}</p>
                <span class="shrink-0 rounded-full bg-green-100 dark:bg-green-900/40 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:text-green-300">{{ teaser()!.date | date: 'd MMM' : undefined : locale }}</span>
              </div>
              @if (q.category) {
                <p class="mt-4 text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">{{ t.questionLabel }}1 · {{ lang.category(q.category) }}</p>
              }
              <p class="mt-1 font-semibold text-gray-900 dark:text-white">{{ q.question }}</p>
              <div class="mt-4 grid gap-2">
                @for (option of q.options; track option; let o = $index) {
                  <button type="button" (click)="choose(o)" [disabled]="picked() !== undefined" [class]="optionClass(o)">
                    <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-bold">{{ letters[o] }}</span>
                    <span>{{ option }}</span>
                  </button>
                }
              </div>
              @if (picked() !== undefined) {
                <div class="mt-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 text-sm" role="status">
                  <p class="font-semibold" [class]="picked() === q.answer ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'">
                    {{ picked() === q.answer ? t.teaserCorrect : t.notQuite(letters[q.answer] + '. ' + q.options[q.answer]) }}
                  </p>
                  @if (q.explanation) { <p class="mt-1 line-clamp-3 text-gray-600 dark:text-gray-300">{{ q.explanation }}</p> }
                </div>
                <a [routerLink]="lang.path('/current-affairs/' + teaser()!.date)"
                  class="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gray-900 dark:bg-white px-5 py-3 text-sm font-semibold text-white dark:text-gray-900 transition hover:opacity-90">
                  {{ t.teaserMore(teaser()!.questions.length - 1) }} →
                </a>
              }
            </div>
          </div>
        }
      </div>
    </header>

    <!-- Numbers at a glance. -->
    <section class="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      @for (label of t.statTiles; track $index; let i = $index) {
        <div class="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 text-center transition hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-md">
          <p class="text-3xl font-extrabold text-primary-600 dark:text-primary-400">{{ statValues[i] }}</p>
          <p class="mt-1 text-xs font-medium text-gray-600 dark:text-gray-400">{{ label }}</p>
        </div>
      }
    </section>

    <!-- Exams, scrolling sideways. -->
    <section class="mt-10" [attr.aria-label]="t.usefulFor">
      <p class="text-center text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">{{ t.examsStrip }}</p>
      <div class="home-marquee mt-3 overflow-hidden">
        <div class="home-marquee-track flex w-max gap-3">
          @for (copy of [0, 1]; track copy) {
            @for (exam of t.exams; track exam) {
              <span class="whitespace-nowrap rounded-full border border-primary-200 dark:border-gray-700 bg-primary-50 dark:bg-gray-800 px-4 py-1.5 text-sm font-medium text-primary-800 dark:text-gray-200"
                [attr.aria-hidden]="copy === 1 ? 'true' : null">🎯 {{ exam }}</span>
            }
          }
        </div>
      </div>
    </section>

    <section class="mt-16">
      <h2 class="text-center text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{{ t.whyTitle }}</h2>
      <p class="mx-auto mt-2 max-w-xl text-center text-gray-600 dark:text-gray-400">{{ t.whyText }}</p>
      <div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        @for (reason of t.reasons; track $index; let i = $index) {
          <div class="group rounded-2xl border border-gray-200 dark:border-gray-800 p-5 transition hover:-translate-y-1 hover:border-primary-400 hover:shadow-lg">
            <span class="flex h-11 w-11 items-center justify-center rounded-xl text-2xl transition-transform group-hover:scale-110" [class]="iconTints[i % iconTints.length]" aria-hidden="true">{{ reasonIcons[i] }}</span>
            <p class="mt-3 font-semibold text-gray-900 dark:text-white">{{ reason.title }}</p>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ reason.text }}</p>
          </div>
        }
      </div>
    </section>

    <section class="mt-16">
      <h2 class="text-center text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{{ t.howTitle }}</h2>
      <div class="relative mt-8">
      <div class="absolute left-[16%] right-[16%] top-12 hidden h-0.5 bg-gradient-to-r from-primary-300 via-fuchsia-300 to-amber-300 sm:block" aria-hidden="true"></div>
      <ol class="relative grid grid-cols-1 gap-4 sm:grid-cols-3">
        @for (step of t.steps; track $index; let i = $index) {
          <li class="relative flex flex-col items-center rounded-2xl p-5 text-center">
            <span class="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-fuchsia-500 text-xl font-bold text-white shadow-lg ring-4 ring-white dark:ring-gray-900">{{ i + 1 }}</span>
            <p class="mt-3 text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">{{ t.stepLabel(i + 1) }}</p>
            <p class="mt-1 font-semibold text-gray-900 dark:text-white">{{ step.title }}</p>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ step.text }}</p>
          </li>
        }
      </ol>
      </div>
    </section>

    <div class="mt-16">
      <ca-telegram-join variant="card"/>
    </div>

    <section id="days" class="mt-16">
      <div class="flex flex-col items-center gap-3 text-center">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{{ t.daywiseTitle }}</h2>
        <p class="max-w-md text-sm text-gray-600 dark:text-gray-400">{{ t.archiveText }}</p>
        <ca-date-picker [dates]="dates" [label]="t.pickFromCalendar"/>
      </div>
      @for (month of months; track month.key) {
        @let label = lang.monthLabel(month.key);
        <div class="mt-8 mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 class="text-sm font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">{{ label }}</h3>
          <a [routerLink]="lang.path('/current-affairs/month/' + month.key)" class="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">{{ t.pdfCardTitle(label) }} →</a>
        </div>
        <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          @for (day of month.days; track day.date) {
            @let result = progress.results()[day.date];
            <li>
              <a [routerLink]="lang.path('/current-affairs/' + day.date)"
                class="group flex h-full items-center gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                [class]="day === latest ? 'border-primary-400 bg-primary-50/60 dark:border-primary-700 dark:bg-gray-800/60' : 'border-gray-200 dark:border-gray-800 hover:border-primary-400'">
                <span class="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-sm">
                  <span class="text-xl font-bold leading-none">{{ day.date | date: 'd' : undefined : locale }}</span>
                  <span class="text-xs uppercase">{{ day.date | date: 'MMM' : undefined : locale }}</span>
                </span>
                <span class="min-w-0 flex-1">
                  <span class="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    {{ day.date | date: 'EEEE' : undefined : locale }}
                    @if (day === latest) { <span class="rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-green-300">{{ t.latest }}</span> }
                  </span>
                  <span class="mt-0.5 block truncate text-sm text-gray-600 dark:text-gray-400">{{ t.cardSubtitle(day.count, topics(day.categories)) }}</span>
                  @if (result) {
                    <span class="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400">✓ {{ t.savedScore(result.score, result.total) }}</span>
                  }
                </span>
                @if (result) {
                  <!-- Score ring for a finished day. -->
                  <svg viewBox="0 0 36 36" class="h-11 w-11 shrink-0 -rotate-90" aria-hidden="true">
                    <circle cx="18" cy="18" r="15" fill="none" stroke-width="4" class="stroke-gray-200 dark:stroke-gray-700"/>
                    <circle cx="18" cy="18" r="15" fill="none" stroke-width="4" stroke-linecap="round" class="stroke-green-500"
                      [attr.stroke-dasharray]="ring(result.score, result.total) + ' 94.25'"/>
                  </svg>
                } @else {
                  <span class="text-primary-600 dark:text-primary-400 transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
                }
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
  `,
  styles: `
    .home-blob { position: absolute; height: 18rem; width: 18rem; border-radius: 9999px; filter: blur(48px); animation: home-float 10s ease-in-out infinite; }
    @keyframes home-float { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(24px, 16px) scale(1.08); } }
    .home-highlight { background-size: 200% auto; animation: home-shine 6s linear infinite; }
    @keyframes home-shine { to { background-position: 200% center; } }
    .home-marquee { mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent); }
    .home-marquee-track { animation: home-scroll 30s linear infinite; }
    .home-marquee:hover .home-marquee-track { animation-play-state: paused; }
    @keyframes home-scroll { to { transform: translateX(calc(-50% - 0.375rem)); } }
    @media (prefers-reduced-motion: reduce) {
      .home-blob, .home-highlight, .home-marquee-track { animation: none; }
      .home-marquee-track { flex-wrap: wrap; justify-content: center; width: auto; }
      .home-marquee-track > [aria-hidden] { display: none; }
      .home-marquee { mask-image: none; }
    }
  `
})
export class HomePage {
  lang = inject(LangService);
  // Saved scores and streak (this browser only).
  progress = inject(ProgressService);
  // The newest day, from latestDayResolver; its first question is the hero teaser.
  teaser = input<CurrentAffairsDay>();
  // Newest first.
  days = daySummaries;
  latest = latestDay;
  dates = this.days.map(day => day.date);
  totalQuestions = this.days.reduce((sum, day) => sum + day.count, 0);
  // Values for the stat tiles, in the order of t.statTiles.
  statValues = ['10', `${this.totalQuestions}+`, '5', '₹0'];
  // Days grouped by month, so the list stays readable as it grows.
  months = months;
  letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  // One per entry of t.reasons.
  reasonIcons = ['📅', '🎯', '📝', '💡', '⚡', '🔗', '🗂️', '🆓'];
  iconTints = [
    'bg-primary-100 dark:bg-primary-900/40', 'bg-amber-100 dark:bg-amber-900/40', 'bg-green-100 dark:bg-green-900/40', 'bg-fuchsia-100 dark:bg-fuchsia-900/40',
  ];

  teaserQuestion = computed(() => {
    const q = this.teaser()?.questions[0];
    return q ? localizeQuestion(q, this.lang.lang()) : undefined;
  });
  // Saved under the same id as on the quiz page, so the answer is already there when the student continues.
  private teaserId = computed(() => {
    const q = this.teaser()?.questions[0];
    return q ? questionId(q) : '';
  });
  picked = computed(() => {
    const day = this.teaser();
    return day ? this.progress.answer(day.date, this.teaserId()) : undefined;
  });

  constructor() {
    const meta = inject(MetaService);
    effect(() => {
      const t = this.lang.t();
      meta.setMetaTags(t.homeMetaTitle, t.homeMetaDescription,
        ['current affairs', 'કરન્ટ અફેર્સ', 'daily current affairs', 'gujarati current affairs', 'current affairs quiz', 'gk', 'upsc', 'gpsc', 'ssc', 'bank exams']);
    });
  }

  choose(option: number): void {
    const day = this.teaser();
    if (!day || this.picked() !== undefined) return;
    this.progress.setAnswer(day.date, this.teaserId(), option);
  }

  optionClass(option: number): string {
    const base = 'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ';
    const picked = this.picked();
    const answer = this.teaserQuestion()?.answer;
    if (picked === undefined) {
      return base + 'border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:-translate-y-0.5 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-gray-800';
    }
    if (option === answer) return base + 'border-green-600 bg-green-50 text-green-900 dark:bg-green-900/30 dark:text-green-200';
    if (option === picked) return base + 'border-red-600 bg-red-50 text-red-900 dark:bg-red-900/30 dark:text-red-200';
    return base + 'border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500';
  }

  // Length of the filled part of a score ring (circumference 2π·15 ≈ 94.25).
  ring(score: number, total: number): number {
    return total ? (score / total) * 94.25 : 0;
  }

  // The day's three main categories, for the card subtitle.
  topics(categories: string[]): string {
    return categories.slice(0, 3).map(name => this.lang.category(name)).join(', ');
  }
}
