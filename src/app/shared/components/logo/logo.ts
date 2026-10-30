import { Component, ViewEncapsulation, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import site from '@data/site.json';
import { LangService } from '@i18n/lang.service';

// Brand mark (a hand mirror, "darpan", with a tick) plus the site name. The badge follows the
// chosen theme color; public/favicon.svg is the same drawing in the default color.
@Component({
  selector: 'logo',
  imports: [RouterLink],
  encapsulation: ViewEncapsulation.None,
  template: `
  <a [routerLink]="lang.path('/')" class="group flex items-center gap-2 font-bold tracking-tight" [attr.aria-label]="name">
    <svg class="h-8 w-8 shrink-0 text-primary-500 transition-transform group-hover:-rotate-6" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="currentColor"/>
      <ellipse cx="16" cy="12.6" rx="7.6" ry="8.4" fill="#fff" fill-opacity=".22" stroke="#fff" stroke-width="2.4"/>
      <path d="M14.2 21.4h3.6l-.5 2h-2.6z" fill="#fff"/>
      <path d="M16 23.2v5.3" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>
      <path d="m12.4 12.9 2.5 2.5 4.8-5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="text-lg">Daily<span class="text-primary-600 dark:text-primary-400">Darpan</span></span>
  </a>
`
})
export class Logo {
  name = site.name;
  lang = inject(LangService);
}
