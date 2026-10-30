import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, effect, inject, signal } from '@angular/core';
import { DOCUMENT, NgClass } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { DarkModeService } from '@core/services/dark-mode.service';
import { ThemeService } from '@core/services/theme.service';
import navLinkData from '@data/nav-link.data';
import { LangService } from '@i18n/lang.service';
import { Lang } from '@i18n/strings';
import { moon, paintBucket, sun } from '@icon/icons';
import { Icon } from '@shared/components/icon/icon';
import { Logo } from '@shared/components/logo/logo';
import { ToolbarColor } from '@shared/components/toolbar-color/toolbar-color';

@Component({
  selector: 'navbar',
  imports: [RouterLink, RouterLinkActive, Logo, NgClass, Icon, ToolbarColor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<nav
  class="bg-gray-50/75 dark:bg-gray-900/75 fixed w-full z-[2] top-0 start-0 backdrop-blur-lg rounded">
  <toolbar-color/>
  <div class="max-w-screen-lg flex flex-wrap items-center justify-between mx-auto p-4 border-y border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700">
    <logo class="dark:text-white text-black"/>
    <div class="flex items-center lg:order-2 lg:space-x-0">
      <!-- Language picker: the same page in the other language. Real links, so search engines can follow them. -->
      <div class="mx-1 flex rounded-lg border border-gray-300 dark:border-gray-700 p-0.5 text-xs font-semibold" role="group" [attr.aria-label]="lang.t().langAria">
        @for (option of languages; track option.lang) {
          <a [href]="switchUrl(option.lang)" (click)="switchTo($event, option.lang)" [attr.lang]="option.lang" [attr.hreflang]="option.lang"
            [attr.aria-current]="lang.lang() === option.lang ? 'true' : null" [attr.title]="option.name"
            [class]="lang.lang() === option.lang ? 'rounded-md bg-primary-500 px-2 py-1 text-white' : 'rounded-md px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'">{{ option.short }}</a>
        }
      </div>
      <button (click)="darkMode.toggleDarkMode()" type="button" [attr.aria-label]="darkMode.isDark() ? lang.t().toLight : lang.t().toDark" [class]="iconButton">
        <icon [path]="icon()" [size]="20" iconClass="dark:fill-white fill-black"/>
      </button>
      <!-- Hidden on small phones so the bar fits on one row next to the language picker. -->
      <button (click)="themeColor.toggle()" type="button" [attr.aria-label]="lang.t().themeColor" [attr.aria-expanded]="themeColor.openColor()" [class]="iconButton + ' max-sm:hidden'">
        <icon [path]="paintBucket" [size]="20" iconClass="dark:fill-white fill-black"/>
      </button>
      <button (click)="open.set(!open())" type="button" [attr.aria-label]="open() ? lang.t().closeMenu : lang.t().openMenu" [attr.aria-expanded]="open()"
        class="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-900 rounded-lg lg:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-white dark:hover:bg-gray-700 dark:focus:ring-gray-600">
        <div class="space-y-1.5">
          <div class="w-6 h-0.5 bg-black dark:bg-white transition-all" [ngClass]="{'rotate-45 translate-y-2': open()}"></div>
          <div class="w-6 h-0.5 bg-black dark:bg-white transition-all" [ngClass]="{'opacity-0': open()}"></div>
          <div class="w-6 h-0.5 bg-black dark:bg-white transition-all" [ngClass]="{'-rotate-45 -translate-y-2': open()}"></div>
        </div>
      </button>
    </div>
    <div class="w-full ml-auto lg:w-auto lg:order-1 flex lg:block min-h-96 lg:min-h-0 items-center" [ngClass]="{ 'hidden': !open() }">
      <ul class="text-center w-full flex flex-col p-4 mx-2 lg:p-0 mt-4 font-medium rounded-lg lg:space-x-8 lg:flex-row lg:mt-0">
        @for (link of links; track link.path) {
        <li>
          <a [routerLink]="lang.path(link.path)" routerLinkActive="text-primary dark:text-primary-400"
            [routerLinkActiveOptions]="{exact: link.path === '/'}" (click)="open.set(false)"
            class="block py-4 px-3 rounded hover:text-primary dark:hover:text-primary-400 dark:text-gray-100 lg:p-0">{{ lang.t()[link.label] }}</a>
        </li>
        }
      </ul>
    </div>
  </div>
</nav>`
})
export class Navbar {
  open = signal(false);
  links = navLinkData;
  lang = inject(LangService);
  languages: { lang: Lang; short: string; name: string }[] = [
    { lang: 'gu', short: 'ગુજ', name: 'ગુજરાતી' },
    { lang: 'en', short: 'EN', name: 'English' },
  ];
  private router = inject(Router);
  // Current address, updated after every navigation.
  private url = toSignal(this.router.events.pipe(filter(e => e instanceof NavigationEnd), map(() => this.router.url)), { initialValue: this.router.url });
  paintBucket = paintBucket;
  iconButton = 'mx-1 inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600';
  darkMode = inject(DarkModeService);
  themeColor = inject(ThemeService);
  icon = computed(() => this.darkMode.isDark() ? sun : moon);
  private document = inject(DOCUMENT);

  switchUrl(lang: Lang): string {
    return this.lang.switchUrl(this.url(), lang);
  }

  // Ctrl/Cmd-click still opens a new tab; a plain click navigates inside the app.
  switchTo(event: MouseEvent, lang: Lang): void {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    this.open.set(false);
    this.router.navigateByUrl(this.switchUrl(lang));
  }

  constructor() {
    effect(() => {
      this.document.documentElement.classList.toggle('dark', this.darkMode.isDark());
    });
  }
}
