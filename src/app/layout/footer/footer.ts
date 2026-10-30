import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import site from '@data/site.json';
import { LangService } from '@i18n/lang.service';
import { Logo } from '@shared/components/logo/logo';

@Component({
  selector: 'foot-note',
  imports: [Logo, RouterLink],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <footer class="border-t border-neutral-200 dark:border-neutral-700 max-w-screen-lg mx-auto px-4 py-6">
    <div class="flex flex-col gap-4 text-gray-900 dark:text-white sm:flex-row sm:items-center sm:justify-between">
      <div>
        <logo/>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ lang.t().tagline }}</p>
      </div>
      <nav class="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400" aria-label="Footer">
        <a [routerLink]="lang.path('/about')" class="hover:text-primary-600 dark:hover:text-primary-400">{{ lang.t().navAbout }}</a>
        @if (site.telegramUrl) {
          <a [href]="site.telegramUrl" target="_blank" rel="noopener" class="hover:text-primary-600 dark:hover:text-primary-400">{{ lang.t().telegram }}</a>
        }
        <span>© {{ year }} {{ site.name }}</span>
      </nav>
    </div>
  </footer>
  `,
})
export class Footer {
  lang = inject(LangService);
  site = site;
  year = new Date().getFullYear();
}
