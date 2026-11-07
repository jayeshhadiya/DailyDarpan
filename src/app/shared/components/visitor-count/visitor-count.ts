import { Component, PLATFORM_ID, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LangService } from '@i18n/lang.service';

const COUNTED = 'dd-visit-counted';

// "12,345 visits" badge, from /api/visits (a Vercel function). The first page of a browser session
// adds a visit; later pages in the same session only read the total. Shows nothing while loading,
// during prerendering, or when the counter can't be reached (e.g. `ng serve`, offline).
@Component({
  selector: 'ca-visitor-count',
  encapsulation: ViewEncapsulation.None,
  template: `
  @if (label(); as text) {
    <span class="inline-flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-sm ring-1 ring-primary-200 dark:ring-gray-700">
      <span aria-hidden="true">👀</span> {{ text }}
    </span>
  }
  `
})
export class VisitorCount {
  private lang = inject(LangService);
  private visits = signal<number | undefined>(undefined);
  label = computed(() => {
    const visits = this.visits();
    return visits ? this.lang.t().visits(visits.toLocaleString(this.lang.locale())) : '';
  });

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) this.load();
  }

  private async load(): Promise<void> {
    const counted = this.read();
    try {
      const response = await fetch('/api/visits', { method: counted ? 'GET' : 'POST', cache: 'no-store' });
      if (!response.ok) return;
      const { visits } = await response.json();
      if (typeof visits !== 'number') return;
      this.visits.set(visits);
      if (!counted) this.write();
    } catch {
      // No counter available; the badge stays hidden.
    }
  }

  private read(): boolean {
    try { return sessionStorage.getItem(COUNTED) === '1'; } catch { return false; }
  }

  private write(): void {
    try { sessionStorage.setItem(COUNTED, '1'); } catch { /* storage blocked */ }
  }
}
