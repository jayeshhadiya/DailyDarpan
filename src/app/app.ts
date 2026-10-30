import { Component, ElementRef, ViewEncapsulation, effect, inject } from '@angular/core';
import { DOCUMENT, ViewportScroller } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '@core/services/theme.service';
import { Footer } from '@layout/footer/footer';
import { Navbar } from '@layout/navbar/navbar';
import { ScrollToTop } from '@shared/components/scroll-to-top/scroll-to-top';
import { TelegramFloat } from '@shared/components/telegram-float/telegram-float';

@Component({
  selector: 'app',
  template: `
  <navbar/>
  <main class="max-w-screen-lg mx-auto px-4 md:px-10 my-28 overflow-x-hidden min-h-screen">
    <router-outlet/>
    <scroll-to-top/>
    <telegram-float/>
  </main>
  <foot-note/>
  `,
  imports: [Footer, RouterOutlet, Navbar, ScrollToTop, TelegramFloat],
  encapsulation: ViewEncapsulation.None,
})
export class App {
  private elementRef = inject(ElementRef);
  private theme = inject(ThemeService);
  private document = inject(DOCUMENT);

  constructor() {
    // Links to #anchors stop below the fixed navbar instead of behind it.
    inject(ViewportScroller).setOffset(() => [0, (this.document.querySelector('nav')?.offsetHeight ?? 0) + 16]);
    effect(() => {
      this.elementRef.nativeElement.style.setProperty('--primary-color', this.theme.getColor());
      // The early color from index.html is no longer needed (and would override later changes).
      this.document.getElementById('theme-color-preload')?.remove();
    });
  }
}
