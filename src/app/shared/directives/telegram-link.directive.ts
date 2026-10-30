import { Directive, HostListener, PLATFORM_ID, inject } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import site from '@data/site.json';

// Put on an <a href="https://t.me/…"> so phones open the channel straight in the Telegram app
// instead of the t.me web page. The href stays a normal link for desktop, search engines and no-JS.
//   Android: an intent link; Chrome opens the app, or the t.me page when Telegram isn't installed.
//   iPhone/iPad: the tg:// link, then the t.me page if we are still here (app not installed).
@Directive({
  selector: 'a[telegramLink]',
})
export class TelegramLink {
  private document = inject(DOCUMENT);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  // "DailyDarpan" from "https://t.me/DailyDarpan".
  private username = site.telegramUrl.split('/').pop() ?? '';

  @HostListener('click', ['$event'])
  open(event: MouseEvent): void {
    // Leave Ctrl/Cmd/Shift-clicks and middle clicks to the browser.
    if (!this.isBrowser || !this.username || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);
    // iPadOS reports itself as a Mac, so also check for touch.
    const isIos = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    if (!isAndroid && !isIos) return;

    event.preventDefault();
    const webUrl = site.telegramUrl;
    if (isAndroid) {
      location.href = `intent://resolve?domain=${this.username}#Intent;scheme=tg;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
      return;
    }
    // If Telegram opens, the page is hidden; if it is still visible after a moment, the app isn't installed.
    location.href = `tg://resolve?domain=${this.username}`;
    setTimeout(() => {
      if (this.document.visibilityState === 'visible') location.href = webUrl;
    }, 1500);
  }
}
