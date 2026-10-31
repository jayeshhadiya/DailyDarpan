import { Component, DestroyRef, PLATFORM_ID, ViewEncapsulation, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { QuestionView, isTranslated, localizeQuestion, months } from '@content/content';
import { CurrentAffairsDay } from '@content/content.schema';
import { AnalyticsService } from '@core/services/analytics.service';
import { MetaService } from '@core/services/meta.service';
import { LangService } from '@i18n/lang.service';
import { DemoNotice } from '@shared/components/demo-notice/demo-notice';
import { TelegramJoin } from '@shared/components/telegram-join/telegram-join';

// All of one month's questions on one page at /current-affairs/month/YYYY-MM, for monthly revision.
// The questions come from monthResolver. Answers are in the page so search engines can read them;
// "Hide answers" turns it into practice. Long months are split into pages (?page=N).

// Questions per page by screen size (Tailwind md and lg breakpoints): short pages on phones,
// more on bigger screens where a question takes less height.
const PAGE_SIZES = { mobile: 10, tablet: 15, desktop: 20 };
const TABLET_QUERY = '(min-width: 768px)';
const DESKTOP_QUERY = '(min-width: 1024px)';

interface Item { date: string; number: number; question: QuestionView; }

@Component({
  selector: 'month-page',
  encapsulation: ViewEncapsulation.None,
  imports: [DatePipe, RouterLink, DemoNotice, TelegramJoin],
  template: `
  @let t = lang.t();
  @let locale = lang.locale();
  <div class="mx-auto max-w-3xl">
    <a [routerLink]="lang.path('/')" fragment="days" class="mb-6 inline-block text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">{{ t.allDays }}</a>
    <ca-demo-notice/>
    @if (month(); as m) {
      @let label = lang.monthLabel(m.key);
      <header class="flex flex-col items-center gap-3 border-b border-gray-200 dark:border-gray-800 pb-8 text-center">
        <span class="rounded-full border border-primary-500 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">{{ t.monthlyCompilation }}</span>
        <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white lg:text-4xl">{{ t.monthTitle(label) }}</h1>
        <p class="max-w-xl text-gray-600 dark:text-gray-400">{{ t.monthIntro(total(), m.days.length, label) }}</p>
        @if (!translated()) {
          <p class="max-w-xl rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3 text-sm text-gray-600 dark:text-gray-300" role="note">{{ t.notTranslated }}</p>
        }
        <ca-telegram-join/>
      </header>

      <div id="questions" class="sticky top-20 z-[1] mt-6 flex flex-col gap-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur px-4 py-3 sm:flex-row sm:items-center">
        <div class="flex flex-1 gap-2 overflow-x-auto" role="group" [attr.aria-label]="t.filterAria">
          @for (c of categories(); track c.name) {
            <button type="button" (click)="chooseCategory(c.name)" [attr.aria-pressed]="category() === c.name" [class]="chipClass(category() === c.name)">
              {{ c.name === 'All' ? t.allCategories : lang.category(c.name) }} <span class="opacity-70">{{ c.count }}</span>
            </button>
          }
        </div>
        <div class="flex shrink-0 items-center justify-between gap-3">
          <p class="text-xs text-gray-500 dark:text-gray-400" aria-live="polite">{{ rangeText() }}</p>
          <button type="button" (click)="showAnswers.set(!showAnswers())" [attr.aria-pressed]="!showAnswers()"
            class="shrink-0 rounded-full border border-gray-300 dark:border-gray-700 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400">
            {{ showAnswers() ? t.hideAnswers : t.showAnswers }}
          </button>
        </div>
      </div>

      @for (group of groups(); track group.date) {
        <section class="mt-10" [class]="prerenderClass(group.start)">
          <div class="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ group.date | date: 'EEEE, d MMMM' : undefined : locale }}</h2>
            <a [routerLink]="lang.path('/current-affairs/' + group.date)" class="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">{{ t.takeAsQuiz }}</a>
          </div>
          <ol class="flex flex-col gap-4">
            @for (item of group.items; track item.number; let i = $index) {
              @let q = item.question;
              <li class="rounded-xl border border-gray-200 dark:border-gray-800 p-5" [class]="prerenderClass(group.start + i)">
                <p class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
                  <span class="text-gray-500 dark:text-gray-400">{{ t.questionLabel }}{{ item.number }}</span>
                  @if (q.category) { <span class="text-primary-600 dark:text-primary-400">· {{ lang.category(q.category) }}</span> }
                </p>
                <p class="font-semibold text-gray-900 dark:text-white">{{ q.question }}</p>
                <ul class="mt-3 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
                  @for (option of q.options; track option; let o = $index) {
                    <li [class]="optionClass(q, o)"><span class="me-2 font-semibold">{{ letters[o] }}.</span>{{ option }}</li>
                  }
                </ul>
                @if (showAnswers() && q.explanation) {
                  <p class="mt-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3 text-sm text-gray-600 dark:text-gray-300">{{ q.explanation }}</p>
                }
              </li>
            }
          </ol>
        </section>
      }

      @if (pageCount() > 1) {
        <nav class="mt-10 flex items-center justify-center gap-1.5 sm:gap-2" [attr.aria-label]="t.pagesAria">
          <a [routerLink]="[]" [queryParams]="{ page: page() - 1 }" fragment="questions" [class]="pageLinkClass(false)"
            [class.pointer-events-none]="page() === 1" [class.opacity-40]="page() === 1"
            [attr.aria-disabled]="page() === 1" [attr.tabindex]="page() === 1 ? -1 : null" [attr.aria-label]="t.previousPage">←<span class="hidden sm:inline ms-1">{{ t.previous }}</span></a>
          @for (n of pages(); track $index) {
            @if (n === null) {
              <span class="px-1 text-gray-400" aria-hidden="true">…</span>
            } @else {
              <a [routerLink]="[]" [queryParams]="{ page: n }" fragment="questions" [class]="pageLinkClass(n === page())"
                [attr.aria-current]="n === page() ? 'page' : null" [attr.aria-label]="t.pageN(n)">{{ n }}</a>
            }
          }
          <a [routerLink]="[]" [queryParams]="{ page: page() + 1 }" fragment="questions" [class]="pageLinkClass(false)"
            [class.pointer-events-none]="page() === pageCount()" [class.opacity-40]="page() === pageCount()"
            [attr.aria-disabled]="page() === pageCount()" [attr.tabindex]="page() === pageCount() ? -1 : null" [attr.aria-label]="t.nextPage"><span class="hidden sm:inline me-1">{{ t.next }}</span>→</a>
        </nav>
      }

      <div class="mt-12">
        <ca-telegram-join variant="card"/>
      </div>

      <nav class="mt-10 flex justify-between gap-4 border-t border-gray-200 dark:border-gray-800 pt-6 text-sm font-medium" [attr.aria-label]="t.otherMonths">
        @if (older(); as o) {
          <a [routerLink]="lang.path('/current-affairs/month/' + o.key)" class="text-primary-600 dark:text-primary-400 hover:underline">← {{ lang.monthLabel(o.key) }}</a>
        } @else { <span></span> }
        @if (newer(); as n) {
          <a [routerLink]="lang.path('/current-affairs/month/' + n.key)" class="text-primary-600 dark:text-primary-400 hover:underline">{{ lang.monthLabel(n.key) }} →</a>
        }
      </nav>
    }
  </div>
  `
})
export class MonthPage {
  letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  lang = inject(LangService);
  private metaService = inject(MetaService);
  private router = inject(Router);
  private analytics = inject(AnalyticsService);
  private queryParams = toSignal(inject(ActivatedRoute).queryParamMap);
  // 1st of the month first.
  days = input.required<CurrentAffairsDay[]>();
  private index = computed(() => months.findIndex(m => m.key === this.days()[0].date.slice(0, 7)));
  month = computed(() => months[this.index()]);
  // Months are newest first, so the older month is the next one in the list.
  older = computed(() => months[this.index() + 1]);
  newer = computed(() => months[this.index() - 1]);
  total = computed(() => this.days().reduce((sum, day) => sum + day.questions.length, 0));
  category = signal('All');
  showAnswers = signal(true);
  // "All" first, then each category by how many questions it has.
  categories = computed(() => {
    const counts = new Map<string, number>();
    this.days().flatMap(day => day.questions).forEach(q => q.category && counts.set(q.category, (counts.get(q.category) ?? 0) + 1));
    return [{ name: 'All', count: this.total() }, ...[...counts].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))];
  });
  translated = computed(() => this.days().every(day => isTranslated(day, this.lang.lang())));
  // Every question of the month in order and in the language shown, keeping its number within its day (Q1–Q10).
  private items = computed<Item[]>(() => this.days().flatMap(day =>
    day.questions.map((question, i) => ({ date: day.date, number: i + 1, question: localizeQuestion(question, this.lang.lang()) }))));
  private filtered = computed(() => this.category() === 'All'
    ? this.items()
    : this.items().filter(item => item.question.category === this.category()));

  // Unknown until the browser can measure the screen; prerendering uses the desktop size.
  private measured = signal(false);
  pageSize = signal(PAGE_SIZES.desktop);
  pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));
  // ?page=N from the address, kept within range (a resize or filter can reduce the number of pages).
  page = computed(() => Math.min(this.pageCount(), Math.max(1, Number(this.queryParams()?.get('page')) || 1)));
  private pageStart = computed(() => (this.page() - 1) * this.pageSize());
  // This page's questions grouped under their day; `start` is the first question's position on the page.
  groups = computed(() => this.filtered()
    .slice(this.pageStart(), this.pageStart() + this.pageSize())
    .reduce<{ date: string; start: number; items: Item[] }[]>((groups, item, i) => {
      const last = groups.at(-1);
      last?.date === item.date ? last.items.push(item) : groups.push({ date: item.date, start: i, items: [item] });
      return groups;
    }, []));
  rangeText = computed(() => {
    const total = this.filtered().length;
    const end = Math.min(total, this.pageStart() + this.pageSize());
    const t = this.lang.t();
    return this.pageCount() > 1 ? t.range(this.pageStart() + 1, end, total) : t.questionCount(total);
  });
  // Page numbers with gaps (null) so a long month stays one row on a phone: 1 … 4 5 6 … 30.
  pages = computed(() => {
    const count = this.pageCount();
    const current = this.page();
    const shown = [...new Set([1, current - 1, current, current + 1, count])].filter(n => n >= 1 && n <= count).sort((a, b) => a - b);
    return shown.flatMap((n, i) => i && n - shown[i - 1] > 1 ? [null, n] : [n]);
  });

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const tablet = matchMedia(TABLET_QUERY);
      const desktop = matchMedia(DESKTOP_QUERY);
      const update = () => this.pageSize.set(desktop.matches ? PAGE_SIZES.desktop : tablet.matches ? PAGE_SIZES.tablet : PAGE_SIZES.mobile);
      update();
      this.measured.set(true);
      tablet.addEventListener('change', update);
      desktop.addEventListener('change', update);
      inject(DestroyRef).onDestroy(() => {
        tablet.removeEventListener('change', update);
        desktop.removeEventListener('change', update);
      });
    }
    effect(() => {
      const month = this.month();
      this.category.set('All');
      const t = this.lang.t();
      const label = this.lang.monthLabel(month.key);
      this.metaService.setMetaTags(
        t.monthTitle(label),
        t.monthMetaDescription(label, this.total()),
        ['current affairs', 'કરન્ટ અફેર્સ', `${label} current affairs`, 'monthly current affairs', 'માસિક કરન્ટ અફેર્સ', 'gk', 'upsc', 'gpsc', 'ssc']
      );
    });
  }

  // A new category starts again from page 1.
  chooseCategory(name: string): void {
    this.category.set(name);
    this.analytics.event('month_filter', { category: name, month: this.month().key });
    this.router.navigate([], { queryParams: { page: null }, queryParamsHandling: 'merge', fragment: 'questions' });
  }

  // The prerendered page shows the desktop count, so hide the extra questions with CSS on
  // smaller screens until the app takes over; this avoids a layout jump on load.
  prerenderClass(index: number): string {
    if (this.measured()) return '';
    if (index >= PAGE_SIZES.tablet) return 'hidden lg:block';
    if (index >= PAGE_SIZES.mobile) return 'hidden md:block';
    return '';
  }

  pageLinkClass(active: boolean): string {
    return 'inline-flex items-center justify-center min-w-10 h-10 px-3 rounded-lg border text-sm font-medium transition-colors '
      + (active
        ? 'bg-primary-500 border-primary-500 text-white'
        : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-primary-500');
  }

  optionClass(q: QuestionView, option: number): string {
    return 'rounded-lg border px-3 py-2 ' + (this.showAnswers() && option === q.answer
      ? 'border-green-600 bg-green-50 font-medium text-green-900 dark:bg-green-900/30 dark:text-green-200'
      : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300');
  }

  chipClass(active: boolean): string {
    return 'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors '
      + (active
        ? 'bg-primary-500 border-primary-500 text-white'
        : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-primary-500');
  }
}
