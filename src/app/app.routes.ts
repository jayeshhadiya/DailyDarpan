import { Routes } from '@angular/router';
import { dayResolver, monthResolver } from '@content/content';
import { langResolver } from '@i18n/lang.service';

// The same pages in each language: Gujarati at /…, English at /en/….
const pages: Routes = [
  {
    path: '',
    loadComponent: () => import('@pages/home/home.page').then(m => m.HomePage)
  },
  {
    // Same addresses as the old portfolio section, so links shared before the move keep working.
    path: 'current-affairs', redirectTo: '', pathMatch: 'full'
  },
  {
    path: 'current-affairs/month/:month',
    resolve: { selected: monthResolver },
    loadComponent: () => import('@pages/month/month.page').then(m => m.MonthPage)
  },
  {
    path: 'current-affairs/:date',
    resolve: { day: dayResolver },
    loadComponent: () => import('@pages/day/day.page').then(m => m.DayPage)
  },
  {
    path: 'about',
    loadComponent: () => import('@pages/about/about.page').then(m => m.AboutPage)
  },
  {
    path: 'privacy',
    loadComponent: () => import('@pages/privacy/privacy.page').then(m => m.PrivacyPage)
  },
  {
    path: '404',
    loadComponent: () => import('@pages/error/error.page').then(m => m.ErrorPage)
  },
  {
    path: '**',
    loadComponent: () => import('@pages/error/error.page').then(m => m.ErrorPage)
  },
];

export const routes: Routes = [
  { path: 'en', resolve: { lang: langResolver('en') }, children: pages },
  { path: '', resolve: { lang: langResolver('gu') }, children: pages },
];
