import { Component, DOCUMENT, ElementRef, HostListener, ViewEncapsulation, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LangService } from '@i18n/lang.service';

interface Cell { date: string; day: number; }

// "Choose a day" button with a calendar pop-up. Only days that have questions can be picked;
// choosing one opens /current-affairs/YYYY-MM-DD in the current language. Dates are plain YYYY-MM-DD strings,
// so all the maths is done in UTC to avoid time zone shifts.
@Component({
  selector: 'ca-date-picker',
  encapsulation: ViewEncapsulation.None,
  template: `
  <div class="relative inline-block">
    <button #toggleButton type="button" (click)="toggle()" [attr.aria-expanded]="open()" aria-haspopup="dialog" [class]="buttonClass()">
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>
      </svg>
      {{ label() ?? lang.t().chooseDay }}
    </button>
    @if (open()) {
      <!-- Phones: a sheet at the bottom of the screen over a dimmed page, so it never runs off the edge.
           From sm up: a pop-up under the button. -->
      <div class="fixed inset-0 z-[60] bg-black/40 sm:hidden" (click)="open.set(false)" aria-hidden="true"></div>
      <div role="dialog" [attr.aria-label]="lang.t().chooseDate"
        class="fixed inset-x-0 bottom-0 z-[60] rounded-t-2xl border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-left shadow-xl
          sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-full sm:z-20 sm:mt-2 sm:w-72 sm:-translate-x-1/2 sm:rounded-xl sm:border sm:pb-4">
        <div class="mx-auto mb-3 flex max-w-sm items-center justify-between gap-2 sm:hidden">
          <p class="text-base font-semibold text-gray-900 dark:text-white">{{ lang.t().chooseDate }}</p>
          <button type="button" (click)="open.set(false)" [attr.aria-label]="lang.t().closeCalendar" [class]="navClass">✕</button>
        </div>
        <div class="mx-auto max-w-sm sm:max-w-none">
        <div class="mb-3 flex items-center justify-between">
          <button type="button" (click)="shiftMonth(-1)" [disabled]="!canGoBack()" [attr.aria-label]="lang.t().prevMonth" [class]="navClass">‹</button>
          <p class="text-sm font-semibold text-gray-900 dark:text-white" aria-live="polite">{{ monthLabel() }}</p>
          <button type="button" (click)="shiftMonth(1)" [disabled]="!canGoForward()" [attr.aria-label]="lang.t().nextMonth" [class]="navClass">›</button>
        </div>
        <div class="grid grid-cols-7 gap-1 text-center">
          @for (weekday of lang.t().weekdays; track weekday) {
            <span class="py-1 text-xs font-medium text-gray-500 dark:text-gray-400">{{ weekday }}</span>
          }
          @for (cell of cells(); track $index) {
            @if (cell) {
              <button type="button" (click)="pick(cell.date)" [disabled]="!available().has(cell.date)" [class]="dayClass(cell.date)"
                [attr.aria-label]="cell.date + (available().has(cell.date) ? '' : ', ' + lang.t().noQuestions)"
                [attr.aria-current]="cell.date === selected() ? 'date' : null">{{ cell.day }}</button>
            } @else {
              <span></span>
            }
          }
        </div>
        <p class="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span class="inline-block h-2.5 w-2.5 rounded-full bg-primary-500"></span> {{ lang.t().daysWithQuestions }}
        </p>
        </div>
      </div>
    }
  </div>
  `
})
export class DatePicker {
  // All dates that have questions (YYYY-MM-DD).
  dates = input.required<string[]>();
  // The date being viewed, if any.
  selected = input<string | undefined>();
  // Button text; "Choose a day" in the current language when not given.
  label = input<string>();
  variant = input<'primary' | 'outline'>('outline');

  private router = inject(Router);
  lang = inject(LangService);
  private host = inject(ElementRef<HTMLElement>);
  private document = inject(DOCUMENT);
  private toggleButton = viewChild.required<ElementRef<HTMLButtonElement>>('toggleButton');
  navClass = 'flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent';
  open = signal(false);
  // First day of the month on show, as "YYYY-MM".
  month = signal('');

  constructor() {
    // On phones the calendar is a bottom sheet over the page: stop the page behind it from scrolling.
    effect(onCleanup => {
      const view = this.document.defaultView;
      if (!this.open() || !view?.matchMedia('(max-width: 639px)').matches) return;
      const body = this.document.body;
      const previous = body.style.overflow;
      body.style.overflow = 'hidden';
      onCleanup(() => body.style.overflow = previous);
    });
  }

  available = computed(() => new Set(this.dates()));
  private sorted = computed(() => [...this.dates()].sort());
  canGoBack = computed(() => this.month() > (this.sorted()[0] ?? '').slice(0, 7));
  canGoForward = computed(() => this.month() < (this.sorted().at(-1) ?? '').slice(0, 7));
  monthLabel = computed(() => this.lang.monthLabel(this.month()));
  // Blank cells first so the 1st lands on its weekday (weeks start on Monday).
  cells = computed<(Cell | null)[]>(() => {
    const [year, month] = this.month().split('-').map(Number);
    const offset = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
    const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const days = Array.from({ length }, (_, i) => ({ date: `${this.month()}-${String(i + 1).padStart(2, '0')}`, day: i + 1 }));
    return [...Array(offset).fill(null), ...days];
  });

  toggle(): void {
    if (!this.open()) {
      // Start on the selected day's month, or the newest month with questions.
      this.month.set((this.selected() ?? this.sorted().at(-1) ?? new Date().toISOString()).slice(0, 7));
    }
    this.open.update(open => !open);
  }

  shiftMonth(step: number): void {
    const [year, month] = this.month().split('-').map(Number);
    this.month.set(new Date(Date.UTC(year, month - 1 + step, 1)).toISOString().slice(0, 7));
  }

  pick(date: string): void {
    this.open.set(false);
    this.router.navigateByUrl(this.lang.path(`/current-affairs/${date}`));
  }

  buttonClass(): string {
    return 'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors '
      + (this.variant() === 'primary'
        ? 'bg-primary-500 text-white hover:bg-primary-600'
        : 'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-primary-500');
  }

  dayClass(date: string): string {
    // Taller cells on phones, for thumbs.
    const base = 'h-11 w-full rounded-lg text-sm sm:h-9 ';
    if (date === this.selected()) return base + 'bg-primary-500 font-bold text-white ring-2 ring-primary-300';
    if (this.available().has(date)) return base + 'bg-primary-100 dark:bg-primary-900 font-semibold text-primary-800 dark:text-primary-200 hover:bg-primary-500 hover:text-white';
    return base + 'text-gray-400 dark:text-gray-600 cursor-not-allowed';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.open()) return;
    this.open.set(false);
    // Give keyboard users their place back.
    this.toggleButton().nativeElement.focus();
  }
}
