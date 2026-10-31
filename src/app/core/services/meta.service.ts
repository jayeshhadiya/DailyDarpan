import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, MetaDefinition, Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import site from '@data/site.json';
import { LangService } from '@i18n/lang.service';
import { Lang } from '@i18n/strings';

@Injectable({
  providedIn: 'root'
})
export class MetaService {
  private meta = inject(Meta);
  private router = inject(Router);
  private title = inject(Title);
  private document = inject(DOCUMENT);
  private lang = inject(LangService);

  // This page's address in a language, without query string or fragment, so every page has one canonical address.
  private url(lang: Lang): string {
    return site.url.replace(/\/$/, '') + this.lang.switchUrl(this.router.url.split(/[?#]/)[0], lang);
  }

  // `image` is the link preview picture made by scripts/build-images.mjs, e.g. '/og/2026-10-31-gu.jpg';
  // pages without their own get the general one.
  setMetaTags(title: string, description: string, keywords: string[] = [], image = `/og/site-${this.lang.lang()}.jpg`): void {
    const fullTitle = `${title} | ${site.name}`;
    const url = this.url(this.lang.lang());
    const imageUrl = site.url.replace(/\/$/, '') + image;
    this.title.setTitle(fullTitle);
    // updateTag replaces the previous page's tag instead of adding a duplicate.
    const tags: MetaDefinition[] = [
      {name: 'description', content: description},
      {name: 'keywords', content: keywords.join(', ')},
      {property: 'og:title', content: fullTitle},
      {property: 'og:description', content: description},
      {property: 'og:url', content: url},
      {property: 'og:locale', content: this.lang.lang() === 'gu' ? 'gu_IN' : 'en_IN'},
      {property: 'og:type', content: 'website'},
      {property: 'og:site_name', content: site.name},
      {property: 'og:image', content: imageUrl},
      {property: 'og:image:width', content: '1200'},
      {property: 'og:image:height', content: '630'},
      {property: 'og:image:alt', content: title},
      {name: 'twitter:card', content: 'summary_large_image'},
      {name: 'twitter:title', content: fullTitle},
      {name: 'twitter:description', content: description},
      {name: 'twitter:image', content: imageUrl},
    ];
    tags.forEach(tag => this.meta.updateTag(tag, tag.property ? `property='${tag.property}'` : `name='${tag.name}'`));
    this.setLink('canonical', url);
    // Tell search engines this page exists in both languages; Gujarati is the default.
    this.setLink('alternate', this.url('gu'), 'gu');
    this.setLink('alternate', this.url('en'), 'en');
    this.setLink('alternate', this.url('gu'), 'x-default');
  }

  private setLink(rel: string, href: string, hreflang?: string): void {
    const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
    let link: HTMLLinkElement | null = this.document.head.querySelector(selector);
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', rel);
      if (hreflang) link.setAttribute('hreflang', hreflang);
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}
