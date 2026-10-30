import { Component, ViewEncapsulation, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import site from '@data/site.json';
import { LangService } from '@i18n/lang.service';

// Brand mark: a "?" badge in the theme color plus the site name.
@Component({
  selector: 'logo',
  imports: [RouterLink],
  encapsulation: ViewEncapsulation.None,
  template: `
  <a [routerLink]="lang.path('/')" class="group flex items-center gap-2 font-bold tracking-tight" [attr.aria-label]="name">
    <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-lg text-white" aria-hidden="true">?</span>
    <span class="text-lg group-hover:text-primary-600 dark:group-hover:text-primary-400">{{ name }}</span>
  </a>
`
})
export class Logo {
  name = site.name;
  lang = inject(LangService);
}
