# DailyDarpan

Daily current affairs quiz for India's competitive exams: 10 MCQs a day with answers and explanations,
day-wise pages and monthly PDFs, in English (default, at `/`) and Gujarati (at `/gu`). Built with Angular and Tailwind, prerendered to plain HTML
so it can be hosted free on Vercel.

## Run it

```bash
npm install
npm start          # http://localhost:4200
npm run build      # static site in dist/current-affairs/browser
npm run preview    # serve the built site locally
```

## Add a new day

1. Create a file in `content/days/` named with the date, e.g. `content/days/2026-11-01.json` (copy any day file as a start).
2. Change `date` to the same date and write the questions. `answer` is the index of the right option (0 = first).

   ```json
   {
     "date": "2026-11-01",
     "questions": [
       {
         "category": "Economy",
         "question": "Question text?",
         "options": ["Option A", "Option B", "Option C", "Option D"],
         "answer": 1,
         "explanation": "Short fact shown after answering.",
         "gu": {
           "question": "પ્રશ્ન?",
           "options": ["વિકલ્પ A", "વિકલ્પ B", "વિકલ્પ C", "વિકલ્પ D"],
           "explanation": "જવાબ પછી દેખાતી ટૂંકી સમજૂતી."
         }
       }
     ],
     "sources": [{ "name": "Source name", "url": "https://..." }]
   }
   ```

   `gu` holds the Gujarati text. Keep its options in the same order as the English ones, because `answer`
   is shared. `category` stays in English (it is translated on screen); add new category names (with their Gujarati name) to
   `src/app/i18n/categories.gu.json`. A question without `gu` is shown in English on Gujarati pages,
   with a note.

3. Run `npm run content` to check the file. It reports mistakes such as a wrong `answer` index, a date that
   doesn't match the file name or a `gu` block with a different number of options, and lists days not yet in Gujarati. If `npm start` is already running, restart it to pick up the new day.

The day page, the month page, the home page list, the calendar and `sitemap.xml` all update automatically.

When a month is complete (see Monthly PDFs below), the next `npm start`, `npm run build` or `npm run content` moves its
day files into a folder for that month, e.g. `content/days/2026-10/2026-10-31.json`, so `content/days/` only holds
the running month. Nothing else changes: addresses stay the same. To fix a past day, edit it in its month folder.
Commit the moved files.

Each day's file is added the next morning (on 31 October you add `2026-10-30.json`), so the site calls the
newest day the "latest quiz" rather than "today's quiz".

## Add an exam notification

When a recruitment notification comes out, add it by hand from the official notification PDF:

1. Copy `content/exams/_template.json` to a new file named after the notification, e.g.
   `content/exams/gsssb-food-safety-officer-2026.json`. The file name is the page address
   (`/exams/gsssb-food-safety-officer-2026`); use lowercase letters, digits and dashes, and set `"id"` to the same name.
2. Fill in the basics: `board` (short name shown on the card, e.g. `GSSSB`), `published`, `notificationUrl` (the official PDF) and
   `title`. Dates the site uses are `YYYY-MM-DD`: `published`, `startDate` and `lastDate` (the list shows "Open" until the end of
   `lastDate`, India time, then "Closed"). `advtNo`, `totalVacancies` and `applyUrl` are optional.
3. Fill in whichever sections the notification has; leave out any it doesn't, and that section isn't shown:
   `organization`, `summary`, `posts`, `importantDates`, `education`, `ageLimit`, `ageRelaxation`, `fees`, `salary`,
   `selectionProcess`, `examPattern`, `examNotes`, `syllabus`, `howToApply`. Dates inside `importantDates` are plain text,
   written as they should be read ("20 November 2026, 11:59 pm").
4. `gu` holds the Gujarati text and takes the same sections. A section left out of `gu` is shown in English on Gujarati
   pages, with a note. A translated list (`posts`, `fees`…) must have the same rows in the same order as the English.
5. Run `npm run content` to check the file. It reports mistakes such as a date that doesn't exist, an unknown field, a
   broken link or a Gujarati list with a different number of rows, and lists notifications not yet in Gujarati.

The list page (`/exams`, newest `published` first), the notification's page, the "Exams" menu link and `sitemap.xml` all
update automatically. Every page says to check the official notification before applying. Files starting with `_` are skipped.

## Monthly PDFs

Once a month is complete, the build makes a PDF of all its questions, numbered 1, 2, 3… through the month
(no dates, no explanations), with the answers in an "Answer Key" table on the last page, one in Gujarati and one in English
(`public/pdf/current-affairs-YYYY-MM-gu.pdf` / `-en.pdf`). The "Monthly" page (`/current-affairs/month/YYYY-MM`)
shows one big card per month, such as "October 2026 Current Affairs PDF", with "View PDF" and "Download PDF".
A month counts as complete when its last day is in (October once `2026-10-31.json` is added on 1 November) or
when a later month has started, in case a day was skipped. Until then its card says the PDF will come once the
month ends.

The PDFs are made by `scripts/build-pdfs.mjs` during `npm run content` (so also before `start` and `build`) and are
not committed; a PDF is only rebuilt when its month's files change. Text is set in Hind Vadodara
(`scripts/fonts`, SIL Open Font License) and shaped with HarfBuzz, so Gujarati renders the same as in a browser.

## Sharing, progress and the app

- **Share:** each quiz and the Monthly page have a "Share:" row (the Monthly one shares that month's PDF page), and the score box has one with a "can you beat me?"
  message and the score once the last question is answered. The buttons are Telegram, WhatsApp, X, LinkedIn, the
  phone's own share menu (only where the browser has one) and Copy link (`src/app/shared/components/share-buttons`).
- **Link previews:** `scripts/build-images.mjs` draws a 1200×630 picture for every day, every month and the
  rest of the site, in both languages (`public/og/`, not committed). WhatsApp, Telegram, Facebook and X show it when
  a link is shared. A picture is only redrawn when its day changes.
- **Progress and streaks:** answers, scores and the days a quiz was finished are saved in the visitor's browser
  (`ProgressService`, localStorage), so a reload keeps the answers. The home page shows "🔥 N-day streak" and a
  ✓ score on finished days. Nothing is sent anywhere.
- **Offline:** the service worker `public/sw.js` keeps pages a visitor has opened working without internet; others
  show `public/offline.html`. `public/manifest.webmanifest` gives the site its name and icons when someone adds it to
  their home screen from the browser menu. If you change how `sw.js` saves files, change its `VERSION` so phones drop
  the old copies. Icons are drawn from `public/favicon.svg` into `public/icons/`.

## Search engines

- Every page is prerendered HTML with a canonical link, Gujarati/English alternates and a link preview, and is listed
  in `sitemap.xml`.
- Previous/next day links follow each quiz, so search engines (and visitors) move from day to day.
- `MetaService.setStructuredData()` adds schema.org data (JSON-LD): the site and publisher on every page,
  breadcrumbs on day and month pages, and each day's questions as a `Quiz` with the right answer and explanation.
  Check a page with Google's Rich Results Test (search.google.com/test/rich-results).

## Settings

`src/app/data/site.json` holds the site name, tagline, address (`url`, used for the sitemap and canonical links),
default theme color, `telegramUrl`, `gaMeasurementId` and `launchDate` (the first day of regular uploads: months before it
only have sample days, so their PDF and their card on the Monthly page carry a yellow "Demo PDF" note). The "Join on Telegram" buttons stay hidden until `telegramUrl` is set.

Google Analytics 4 (`src/app/core/services/analytics.service.ts`) loads only on the live site, not on localhost or during
the build. Besides page views it records `quiz_complete` (score), `share` (which button; quiz or score),
`telegram_join` (which button) and `language_switch`. If you change what is recorded, update the Privacy page text in `src/app/i18n/strings.ts`.

All UI text (buttons, headings, messages) in both languages is in `src/app/i18n/strings.ts`.

## How it fits together

| Path | What it is |
|---|---|
| `content/days/` | One file per day: the only place questions live. Finished months sit in `YYYY-MM/` folders |
| `content/exams/` | One file per exam notification (`_template.json` to copy from) |
| `scripts/build-content.mjs` | Checks the content and generates the day index, `public/sitemap.xml` and `public/robots.txt` (runs before `start` and `build`) |
| `scripts/build-exams.mjs` | Checks the exam notifications and generates their index (called by `build-content.mjs`) |
| `scripts/build-pdfs.mjs` | Makes the monthly compilation PDFs in `public/pdf` (called by `build-content.mjs`) |
| `scripts/build-images.mjs` | Draws the link preview pictures in `public/og` and the app icons (called by `build-content.mjs`) |
| `src/app/content/` | Question types, month grouping and route resolvers; `content.generated.ts` and `exams.generated.ts` are generated, don't edit them |
| `src/app/i18n/` | UI text in Gujarati and English, and `LangService` (current language, `/gu` links, month names) |
| `src/app/pages/` | Home, day quiz, month compilation, exam notifications, about and 404 pages |
| `src/app/app.routes.server.ts` | Which pages are prerendered (every day, month and exam notification) |

Each day's questions are a separate small file that the browser downloads only when that day or month is opened,
so the site stays fast as the archive grows.

Addresses: `/current-affairs/YYYY-MM-DD` for a day, `/current-affairs/month/YYYY-MM` for a month, `/exams/<id>` for an exam notification, with `/gu` in
front for Gujarati. Each page links to its other-language version (hreflang) so search engines index both.
The un-prefixed addresses match the old portfolio section, so links shared before the move keep working once they redirect here.

## Deploy to Vercel (free)

The site is on Vercel at https://dailydarpan.online. `vercel.json` holds the build settings (build command
`npm run build`, output `dist/current-affairs/browser`), so nothing needs setting in the Vercel dashboard. Every push
to the main branch deploys automatically.

- Unknown addresses get the 404 page with a real 404 status (`/gu/…` gets the Gujarati one); the rules are in `routes` in `vercel.json`.
- `www.dailydarpan.online` redirects to `dailydarpan.online` (set under Project → Domains). Keep it that way: the
  canonical links and sitemap use `url` from `src/app/data/site.json`, which has no `www`.
- DNS is at Hostinger: an `A` record for `@` and a `CNAME` for `www`, with the values Vercel shows under Domains.
- In Google Search Console, add `https://dailydarpan.online` and submit `/sitemap.xml`.
