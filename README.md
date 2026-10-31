# DailyDarpan

Daily current affairs quiz for India's competitive exams: 10 MCQs a day with answers and explanations,
day-wise pages and monthly PDFs, in Gujarati (default, at `/`) and English (at `/en`). Built with Angular and Tailwind, prerendered to plain HTML
so it can be hosted free on Vercel.

## Run it

```bash
npm install
npm start          # http://localhost:4200
npm run build      # static site in dist/current-affairs/browser
npm run preview    # serve the built site locally
```

## Add a new day

1. Copy any file in `content/days/` and name it with the date, e.g. `content/days/2026-11-01.json`.
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

Each day's file is added the next morning (on 31 October you add `2026-10-30.json`), so the site calls the
newest day the "latest quiz" rather than "today's quiz".

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

## Settings

`src/app/data/site.json` holds the site name, tagline, address (`url`, used for the sitemap and canonical links),
default theme color, `telegramUrl`, `gaMeasurementId` and `launchDate` (the first day of regular uploads: months before it
only have sample days, so their PDF and their card on the Monthly page carry a yellow "Demo PDF" note). The "Join on Telegram" buttons stay hidden until `telegramUrl` is set.

Google Analytics 4 (`src/app/core/services/analytics.service.ts`) loads only on the live site, not on localhost or during
the build. Besides page views it records `quiz_complete` (score), `telegram_join` (which button) and
`language_switch`. If you change what is recorded, update the Privacy page text in `src/app/i18n/strings.ts`.

All UI text (buttons, headings, messages) in both languages is in `src/app/i18n/strings.ts`.

## How it fits together

| Path | What it is |
|---|---|
| `content/days/*.json` | One file per day: the only place questions live |
| `scripts/build-content.mjs` | Checks the content and generates the day index, `public/sitemap.xml` and `public/robots.txt` (runs before `start` and `build`) |
| `scripts/build-pdfs.mjs` | Makes the monthly compilation PDFs in `public/pdf` (called by `build-content.mjs`) |
| `src/app/content/` | Question types, month grouping and route resolvers; `content.generated.ts` is generated, don't edit it |
| `src/app/i18n/` | UI text in Gujarati and English, and `LangService` (current language, `/en` links, month names) |
| `src/app/pages/` | Home, day quiz, month compilation, about and 404 pages |
| `src/app/app.routes.server.ts` | Which pages are prerendered (every day and month) |

Each day's questions are a separate small file that the browser downloads only when that day or month is opened,
so the site stays fast as the archive grows.

Addresses: `/current-affairs/YYYY-MM-DD` for a day, `/current-affairs/month/YYYY-MM` for a month, with `/en` in
front for English. Each page links to its other-language version (hreflang) so search engines index both.
The Gujarati addresses match the old portfolio section, so links shared before the move keep working once they redirect here.

## Deploy to Vercel (free)

The site is on Vercel at https://dailydarpan.online. `vercel.json` holds the build settings (build command
`npm run build`, output `dist/current-affairs/browser`), so nothing needs setting in the Vercel dashboard. Every push
to the main branch deploys automatically.

- Unknown addresses get the built `404.html` with a real 404 status.
- `www.dailydarpan.online` redirects to `dailydarpan.online` (set under Project → Domains). Keep it that way: the
  canonical links and sitemap use `url` from `src/app/data/site.json`, which has no `www`.
- DNS is at Hostinger: an `A` record for `@` and a `CNAME` for `www`, with the values Vercel shows under Domains.
- In Google Search Console, add `https://dailydarpan.online` and submit `/sitemap.xml`.
