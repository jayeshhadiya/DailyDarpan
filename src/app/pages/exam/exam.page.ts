import { Component, ViewEncapsulation, afterNextRender, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe, formatDate } from '@angular/common';
import { RouterLink } from '@angular/router';
import { latestQuizPath } from '@content/content';
import { examStatus, isExamTranslated, localizeExam } from '@content/exams';
import { ExamNotification } from '@content/exams.schema';
import { MetaService } from '@core/services/meta.service';
import site from '@data/site.json';
import { LangService } from '@i18n/lang.service';
import { ShareButtons } from '@shared/components/share-buttons/share-buttons';
import { TelegramJoin } from '@shared/components/telegram-join/telegram-join';

// One exam notification at /exams/<id>, from content/exams/<id>.json (via examResolver).
// Each section is shown only when the file has it.
@Component({
  selector: 'exam-page',
  encapsulation: ViewEncapsulation.None,
  imports: [DatePipe, RouterLink, ShareButtons, TelegramJoin],
  template: `
  @let t = lang.t();
  @let locale = lang.locale();
  @let e = exam();
  @let x = text();
  <div class="mx-auto max-w-3xl">
    <a [routerLink]="lang.path('/exams')" class="mb-6 inline-block text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">{{ t.allExams }}</a>
    <header class="flex flex-col gap-3 border-b border-gray-200 dark:border-gray-800 pb-8">
      <span class="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest">
        <span class="text-primary-600 dark:text-primary-400">{{ e.board }}</span>
        @if (status(); as s) {
          <span [class]="s === 'open' ? 'rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-green-800 dark:text-green-200' : 'rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-gray-600 dark:text-gray-300'">
            {{ s === 'open' ? t.statusOpen : t.statusClosed }}
          </span>
        }
      </span>
      <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white lg:text-4xl">{{ x.title }}</h1>
      @if (x.organization) { <p class="font-medium text-gray-700 dark:text-gray-300">{{ x.organization }}</p> }
      @if (x.summary) { <p class="text-gray-600 dark:text-gray-400">{{ x.summary }}</p> }
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ t.publishedOn((e.published | date: 'd MMMM y' : 'UTC' : locale) ?? '') }}</p>
    </header>

    @if (!translated()) {
      <p class="mt-6 rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3 text-center text-sm text-gray-600 dark:text-gray-300" role="note">{{ t.examNotTranslated }}</p>
    }

    <dl class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      @if (e.advtNo) { <div [class]="fact"><dt [class]="factLabel">{{ t.advtNo }}</dt><dd [class]="factValue">{{ e.advtNo }}</dd></div> }
      @if (e.totalVacancies) { <div [class]="fact"><dt [class]="factLabel">{{ t.totalPosts }}</dt><dd [class]="factValue">{{ e.totalVacancies }}</dd></div> }
      @if (e.startDate) { <div [class]="fact"><dt [class]="factLabel">{{ t.applyFrom }}</dt><dd [class]="factValue">{{ e.startDate | date: 'd MMM y' : 'UTC' : locale }}</dd></div> }
      @if (e.lastDate) { <div [class]="fact"><dt [class]="factLabel">{{ t.applyBy }}</dt><dd [class]="factValue">{{ e.lastDate | date: 'd MMM y' : 'UTC' : locale }}</dd></div> }
    </dl>

    <div class="mt-6 flex flex-wrap gap-3">
      <a [href]="e.notificationUrl" target="_blank" rel="noopener" class="rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-600">{{ t.officialNotification }}</a>
      @if (e.applyUrl) {
        <a [href]="e.applyUrl" target="_blank" rel="noopener" class="rounded-lg border border-primary-500 px-5 py-2.5 text-sm font-medium text-primary-700 dark:text-primary-300 hover:bg-primary-500 hover:text-white">{{ t.applyOnline }}</a>
      }
    </div>
    <div class="mt-6">
      <ca-share content="exam" [text]="t.shareExamText(x.title, pageUrl())" [url]="pageUrl()"/>
    </div>

    @if (x.posts?.length) {
      <section [class]="section">
        <h2 [class]="heading">{{ t.postsTitle }}</h2>
        <div [class]="tableWrap"><table [class]="table">
          <thead><tr><th [class]="th">{{ t.postCol }}</th>@if (has(x.posts, 'vacancies')) {<th [class]="th">{{ t.vacanciesCol }}</th>}@if (has(x.posts, 'payScale')) {<th [class]="th">{{ t.payCol }}</th>}</tr></thead>
          <tbody>
            @for (p of x.posts; track $index) {
              <tr><td [class]="td + ' font-medium text-gray-900 dark:text-white'">{{ p.name }}</td>@if (has(x.posts, 'vacancies')) {<td [class]="td">{{ p.vacancies }}</td>}@if (has(x.posts, 'payScale')) {<td [class]="td">{{ p.payScale }}</td>}</tr>
            }
          </tbody>
        </table></div>
      </section>
    }

    @if (x.importantDates?.length) {
      <section [class]="section">
        <h2 [class]="heading">{{ t.datesTitle }}</h2>
        <div [class]="tableWrap"><table [class]="table">
          <thead><tr><th [class]="th">{{ t.eventCol }}</th><th [class]="th">{{ t.dateCol }}</th></tr></thead>
          <tbody>
            @for (d of x.importantDates; track $index) { <tr><td [class]="td">{{ d.event }}</td><td [class]="td + ' font-medium text-gray-900 dark:text-white'">{{ d.date }}</td></tr> }
          </tbody>
        </table></div>
      </section>
    }

    @if (x.education?.length || x.ageLimit || x.ageRelaxation?.length) {
      <section [class]="section">
        <h2 [class]="heading">{{ t.eligibilityTitle }}</h2>
        @if (x.education?.length) {
          <h3 [class]="subheading">{{ t.educationTitle }}</h3>
          <ul [class]="bullets">@for (item of x.education; track $index) { <li>{{ item }}</li> }</ul>
        }
        @if (x.ageLimit) {
          <h3 [class]="subheading">{{ t.ageLimitTitle }}</h3>
          <p [class]="body">{{ x.ageLimit }}</p>
        }
        @if (x.ageRelaxation?.length) {
          <h3 [class]="subheading">{{ t.ageRelaxationTitle }}</h3>
          <div [class]="tableWrap"><table [class]="table">
            <thead><tr><th [class]="th">{{ t.categoryCol }}</th><th [class]="th">{{ t.relaxationCol }}</th></tr></thead>
            <tbody>@for (r of x.ageRelaxation; track $index) { <tr><td [class]="td">{{ r.category }}</td><td [class]="td">{{ r.relaxation }}</td></tr> }</tbody>
          </table></div>
        }
      </section>
    }

    @if (x.fees?.length) {
      <section [class]="section">
        <h2 [class]="heading">{{ t.feesTitle }}</h2>
        <div [class]="tableWrap"><table [class]="table">
          <thead><tr><th [class]="th">{{ t.categoryCol }}</th><th [class]="th">{{ t.feeCol }}</th></tr></thead>
          <tbody>@for (f of x.fees; track $index) { <tr><td [class]="td">{{ f.category }}</td><td [class]="td + ' font-medium text-gray-900 dark:text-white'">{{ f.amount }}</td></tr> }</tbody>
        </table></div>
      </section>
    }

    @if (x.salary) {
      <section [class]="section">
        <h2 [class]="heading">{{ t.salaryTitle }}</h2>
        <p [class]="body">{{ x.salary }}</p>
      </section>
    }

    @if (x.selectionProcess?.length) {
      <section [class]="section">
        <h2 [class]="heading">{{ t.selectionTitle }}</h2>
        <ol class="mt-3 flex flex-col gap-2">
          @for (step of x.selectionProcess; track $index; let i = $index) {
            <li class="flex items-start gap-3 text-gray-700 dark:text-gray-300">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">{{ i + 1 }}</span>{{ step }}
            </li>
          }
        </ol>
      </section>
    }

    @if (x.examPattern?.length || x.examNotes?.length) {
      <section [class]="section">
        <h2 [class]="heading">{{ t.patternTitle }}</h2>
        @if (x.examPattern?.length) {
          <div [class]="tableWrap"><table [class]="table">
            <thead><tr>
              <th [class]="th">{{ t.paperCol }}</th>
              @if (has(x.examPattern, 'subjects')) { <th [class]="th">{{ t.subjectsCol }}</th> }
              @if (has(x.examPattern, 'questions')) { <th [class]="th">{{ t.questionsCol }}</th> }
              @if (has(x.examPattern, 'marks')) { <th [class]="th">{{ t.marksCol }}</th> }
              @if (has(x.examPattern, 'duration')) { <th [class]="th">{{ t.durationCol }}</th> }
            </tr></thead>
            <tbody>
              @for (p of x.examPattern; track $index) {
                <tr>
                  <td [class]="td + ' font-medium text-gray-900 dark:text-white'">{{ p.paper }}</td>
                  @if (has(x.examPattern, 'subjects')) { <td [class]="td">{{ p.subjects }}</td> }
                  @if (has(x.examPattern, 'questions')) { <td [class]="td">{{ p.questions }}</td> }
                  @if (has(x.examPattern, 'marks')) { <td [class]="td">{{ p.marks }}</td> }
                  @if (has(x.examPattern, 'duration')) { <td [class]="td">{{ p.duration }}</td> }
                </tr>
              }
            </tbody>
          </table></div>
        }
        @if (x.examNotes?.length) {
          <ul [class]="bullets">@for (note of x.examNotes; track $index) { <li>{{ note }}</li> }</ul>
        }
      </section>
    }

    @if (x.syllabus?.length) {
      <section [class]="section">
        <h2 [class]="heading">{{ t.syllabusTitle }}</h2>
        <dl class="mt-3 flex flex-col gap-3">
          @for (s of x.syllabus; track $index) {
            <div class="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
              <dt class="font-semibold text-gray-900 dark:text-white">{{ s.topic }}</dt>
              @if (s.details) { <dd class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ s.details }}</dd> }
            </div>
          }
        </dl>
      </section>
    }

    @if (x.howToApply?.length) {
      <section [class]="section">
        <h2 [class]="heading">{{ t.howToApplyTitle }}</h2>
        <ol class="mt-3 list-decimal space-y-2 ps-5 text-gray-700 dark:text-gray-300">@for (step of x.howToApply; track $index) { <li>{{ step }}</li> }</ol>
      </section>
    }

    <p class="mt-10 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-900 dark:text-amber-100" role="note">{{ t.examCheckOfficial }}</p>

    <div class="mt-10 flex flex-col items-center gap-3 rounded-xl bg-primary-50 dark:bg-gray-800/60 p-6 text-center">
      <p class="font-semibold text-gray-900 dark:text-white">{{ t.examPrepTitle }}</p>
      <p class="max-w-md text-sm text-gray-600 dark:text-gray-400">{{ t.examPrepText }}</p>
      <a [routerLink]="lang.path(quizPath)" class="rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-600">{{ t.startToday }}</a>
    </div>

    <div class="mt-10">
      <ca-telegram-join variant="card"/>
    </div>
  </div>
  `
})
export class ExamPage {
  lang = inject(LangService);
  private metaService = inject(MetaService);
  exam = input.required<ExamNotification>();
  text = computed(() => localizeExam(this.exam(), this.lang.lang()));
  translated = computed(() => isExamTranslated(this.exam(), this.lang.lang()));
  pageUrl = computed(() => site.url.replace(/\/$/, '') + this.lang.path(`/exams/${this.exam().id}`));
  quizPath = latestQuizPath;
  // Set once the page runs in the browser, so open/closed is never the build date's answer.
  private now = signal<Date | undefined>(undefined);
  status = computed(() => { const now = this.now(); return now ? examStatus(this.exam().lastDate, now) : undefined; });

  section = 'mt-10';
  heading = 'text-xl font-bold text-gray-900 dark:text-white';
  subheading = 'mt-5 font-semibold text-gray-900 dark:text-white';
  body = 'mt-2 text-gray-700 dark:text-gray-300';
  bullets = 'mt-2 list-disc space-y-1 ps-5 text-gray-700 dark:text-gray-300';
  tableWrap = 'mt-3 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800';
  table = 'w-full text-left text-sm';
  th = 'bg-gray-50 dark:bg-gray-800/60 px-4 py-2 font-semibold text-gray-700 dark:text-gray-200';
  td = 'border-t border-gray-200 dark:border-gray-800 px-4 py-2 align-top text-gray-700 dark:text-gray-300';
  fact = 'rounded-lg border border-gray-200 dark:border-gray-800 p-3';
  factLabel = 'text-xs text-gray-500 dark:text-gray-400';
  factValue = 'mt-0.5 font-semibold text-gray-900 dark:text-white';

  // Whether any row fills in `field`, so empty columns are left out.
  has(rows: object[] | undefined, field: string): boolean {
    return !!rows?.some(row => (row as Record<string, unknown>)[field]);
  }

  constructor() {
    afterNextRender(() => this.now.set(new Date()));
    effect(() => {
      const exam = this.exam();
      const text = this.text();
      const t = this.lang.t();
      const lastDate = exam.lastDate ? t.lastDateOn(formatDate(exam.lastDate, 'd MMMM y', this.lang.locale(), 'UTC')) : '';
      this.metaService.setMetaTags(
        text.title,
        t.examMetaDescription(text.title, exam.totalVacancies ? t.posts(exam.totalVacancies) : '', lastDate),
        [exam.board, `${exam.board} recruitment`, `${exam.board} ભરતી`, 'exam notification', 'eligibility', 'syllabus', 'ભરતી', 'સરકારી નોકરી'],
      );
      this.metaService.setStructuredData([
        this.metaService.breadcrumbs([
          { name: t.navHome, path: '/' },
          { name: t.examsTitle, path: '/exams' },
          { name: text.title, path: `/exams/${exam.id}` },
        ]),
      ]);
    });
  }
}
