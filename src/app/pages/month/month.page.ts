import { Component, ViewEncapsulation, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { isDemoMonth, monthPdfPath, months } from '@content/content';
import { CurrentAffairsMonth } from '@content/content.schema';
import { MetaService } from '@core/services/meta.service';
import site from '@data/site.json';
import { LangService } from '@i18n/lang.service';
import { ShareButtons } from '@shared/components/share-buttons/share-buttons';
import { TelegramJoin } from '@shared/components/telegram-join/telegram-join';

// Monthly PDFs at /current-affairs/month/YYYY-MM: one big card per month, newest first, with the
// month in the address highlighted. A month's card gets View and Download once the month is complete
// and scripts/build-pdfs.mjs has made its PDF; the questions themselves are on the day pages.
@Component({
  selector: 'month-page',
  encapsulation: ViewEncapsulation.None,
  imports: [RouterLink, ShareButtons, TelegramJoin],
  template: `
  @let t = lang.t();
  <div class="mx-auto max-w-3xl">
    <a [routerLink]="lang.path('/')" fragment="days" class="mb-6 inline-block text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">{{ t.allDays }}</a>
    <header class="flex flex-col items-center gap-3 text-center">
      <span class="rounded-full border border-primary-500 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">{{ t.monthlyCompilation }}</span>
      <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white lg:text-4xl">{{ t.monthlyPdfsTitle }}</h1>
      <p class="max-w-xl text-gray-600 dark:text-gray-400">{{ t.monthlyPdfsIntro }}</p>
    </header>
    <div class="mt-6">
      <ca-share content="month" [text]="t.shareMonthText(lang.monthLabel(selected().key), selectedTotal(), pageUrl())" [url]="pageUrl()"/>
    </div>

    <ul class="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
      @for (m of cards(); track m.key) {
        @let label = lang.monthLabel(m.key);
        <li [id]="'pdf-' + m.key" [attr.aria-current]="m.key === selected().key ? 'page' : null"
          class="flex aspect-square flex-col items-center justify-center gap-4 rounded-2xl border-2 p-6 text-center"
          [class]="m.key === selected().key ? 'border-primary-500 bg-primary-50 dark:bg-gray-800/60' : 'border-gray-200 dark:border-gray-800'">
          <span class="relative flex h-28 w-24 items-end justify-center rounded-xl pb-3 text-white shadow-md"
            [class]="m.pdf ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-700'" aria-hidden="true">
            <svg class="absolute left-1/2 top-4 h-12 w-12 -translate-x-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>
            </svg>
            <span class="text-lg font-extrabold tracking-wider">PDF</span>
          </span>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ t.pdfCardTitle(label) }}</h2>
          @if (m.demo; as d) {
            <p role="note" class="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
              <span class="font-semibold">{{ t.demoPdf }}</span> {{ t.demoPdfText(d.from, d.to, d.month) }}
            </p>
          }
          @if (m.pdf; as file) {
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ t.questionCount(m.total) }}</p>
            <div class="flex flex-wrap justify-center gap-3" role="group" [attr.aria-label]="t.pdfAria(label)">
              <a [href]="file" target="_blank" rel="noopener" class="rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-600">{{ t.viewPdf }}</a>
              <a [href]="file" [attr.download]="'DailyDarpan-' + m.key + '-' + lang.lang() + '.pdf'"
                class="rounded-lg border border-primary-500 px-5 py-2.5 text-sm font-medium text-primary-700 dark:text-primary-300 hover:bg-primary-500 hover:text-white">{{ t.downloadPdf }}</a>
            </div>
          } @else {
            <p class="max-w-xs text-sm text-gray-500 dark:text-gray-400">{{ t.pdfAfterMonth }}</p>
          }
        </li>
      }
    </ul>

    <div class="mt-12">
      <ca-telegram-join variant="card"/>
    </div>
  </div>
  `
})
export class MonthPage {
  lang = inject(LangService);
  private metaService = inject(MetaService);
  // The month in the address (from monthResolver).
  selected = input.required<CurrentAffairsMonth>();
  selectedTotal = computed(() => this.selected().days.reduce((sum, day) => sum + day.count, 0));
  // This page's full address, for sharing.
  pageUrl = computed(() => site.url.replace(/\/$/, '') + this.lang.path(`/current-affairs/month/${this.selected().key}`));
  // Every month, newest first, with its question count and PDF (in the language shown) if ready.
  cards = computed(() => months.map(m => ({
    key: m.key,
    total: m.days.reduce((sum, day) => sum + day.count, 0),
    pdf: monthPdfPath(m.key, this.lang.lang()),
    // Days are newest first, so the sample runs from the last one to the first.
    demo: isDemoMonth(m.key) ? {
      from: Number(m.days.at(-1)!.date.slice(8)),
      to: Number(m.days[0].date.slice(8)),
      month: new Date(`${m.key}-01`).toLocaleDateString(this.lang.lang() === 'gu' ? 'gu-IN' : 'en-US', { month: 'long', timeZone: 'UTC' }),
    } : undefined,
  })));

  constructor() {
    effect(() => {
      const month = this.selected();
      const t = this.lang.t();
      const label = this.lang.monthLabel(month.key);
      this.metaService.setMetaTags(
        t.pdfCardTitle(label),
        t.monthMetaDescription(label, month.days.reduce((sum, day) => sum + day.count, 0)),
        ['current affairs', 'કરન્ટ અફેર્સ', `${label} current affairs pdf`, 'monthly current affairs pdf', 'માસિક કરન્ટ અફેર્સ PDF', 'gk', 'upsc', 'gpsc', 'ssc'],
        `/og/month-${month.key}-${this.lang.lang()}.jpg`
      );
      this.metaService.setStructuredData([
        this.metaService.breadcrumbs([
          { name: t.navHome, path: '/' },
          { name: t.pdfCardTitle(label), path: `/current-affairs/month/${month.key}` },
        ]),
      ]);
    });
  }
}
