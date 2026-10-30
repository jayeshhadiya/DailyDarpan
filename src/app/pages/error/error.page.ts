import { Component, OnDestroy, ViewEncapsulation, effect, inject } from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import navLinkData from '@data/nav-link.data';
import site from '@data/site.json';
import { LangService } from '@i18n/lang.service';

@Component({
  selector: 'error-page',
  template: `
  @let t = lang.t();
  <section class="flex flex-col items-center text-center py-10 sm:py-20 dark:text-white text-gray-900">
    <p class="font-extrabold leading-none tracking-tight text-8xl sm:text-9xl bg-gradient-to-br from-primary-400 to-primary-800 bg-clip-text text-transparent select-none"
      aria-hidden="true">404</p>
    <h1 class="mt-6 font-semibold text-2xl sm:text-4xl tracking-tight">{{ t.notFoundTitle }}</h1>
    <p class="mt-4 max-w-md text-base sm:text-lg text-gray-600 dark:text-gray-300">{{ t.notFoundText }}</p>
    @if (path) {
      <p class="mt-3 max-w-full truncate rounded-md bg-gray-100 dark:bg-gray-800 px-3 py-1 font-mono text-sm text-gray-600 dark:text-gray-300">{{ path }}</p>
    }
    <a [routerLink]="lang.path('/')" class="mt-8 rounded-lg bg-primary-500 hover:bg-primary-600 px-6 py-2.5 font-medium text-white transition-colors">{{ t.goToday }}</a>
    <nav class="mt-14 w-full max-w-md border-t border-gray-200 dark:border-gray-700 pt-8" aria-label="Popular pages">
      <p class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t.tryThese }}</p>
      <ul class="mt-4 flex flex-wrap justify-center gap-2">
        @for (link of links; track link.path) {
          <li>
            <a [routerLink]="lang.path(link.path)"
              class="block rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-primary-500 hover:text-white dark:hover:bg-primary-500 px-4 py-1.5 text-sm transition-colors">
              {{ t[link.label] }}
            </a>
          </li>
        }
      </ul>
    </nav>
  </section>
  `,
  imports: [RouterLink],
  encapsulation: ViewEncapsulation.None,
})
export class ErrorPage implements OnDestroy {
  private meta = inject(Meta);
  lang = inject(LangService);
  links = navLinkData.filter(link => link.path !== '/');
  // The address the visitor asked for; hidden on the prerendered /404 page itself.
  path = [inject(Location).path()].find(path => path && path !== '/404');
  constructor() {
    const title = inject(Title);
    effect(() => title.setTitle(`${this.lang.t().notFoundTitle} | ${site.name}`));
    // Keep search engines from indexing missing pages.
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
  }
  ngOnDestroy(): void {
    this.meta.removeTag("name='robots'");
  }
}
