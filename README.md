# DailyDarpan

Daily current affairs quiz for India's competitive exams: 10 MCQs a day with answers and explanations,
day-wise pages and monthly compilations, in Gujarati (default, at `/`) and English (at `/en`). Built with Angular and Tailwind, prerendered to plain HTML
so it can be hosted free on Cloudflare Pages.

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
   is shared. `category` stays in English (it is translated on screen); add new category names to
   `categories` in `src/app/i18n/strings.ts`. A question without `gu` is shown in English on Gujarati pages,
   with a note.

3. Run `npm run content` to check the file. It reports mistakes such as a wrong `answer` index, a date that
   doesn't match the file name or a `gu` block with a different number of options, and lists days not yet in Gujarati. If `npm start` is already running, restart it to pick up the new day.

The day page, the month page, the home page list, the calendar and `sitemap.xml` all update automatically.

## Settings

`src/app/data/site.json` holds the site name, tagline, address (`url`, used for the sitemap and canonical links),
default theme color and `telegramUrl`. The "Join on Telegram" buttons stay hidden until `telegramUrl` is set.

All UI text (buttons, headings, messages) in both languages is in `src/app/i18n/strings.ts`.

The yellow "demo" notice is `src/app/shared/components/demo-notice/demo-notice.ts`; delete it and its
`<ca-demo-notice/>` tags once real daily uploads start.

## How it fits together

| Path | What it is |
|---|---|
| `content/days/*.json` | One file per day: the only place questions live |
| `scripts/build-content.mjs` | Checks the content and generates the day index, `public/sitemap.xml` and `public/robots.txt` (runs before `start` and `build`) |
| `src/app/content/` | Question types, month grouping and route resolvers; `content.generated.ts` is generated, don't edit it |
| `src/app/i18n/` | UI text in Gujarati and English, and `LangService` (current language, `/en` links, month names) |
| `src/app/pages/` | Home, day quiz, month compilation, about and 404 pages |
| `src/app/app.routes.server.ts` | Which pages are prerendered (every day and month) |

Each day's questions are a separate small file that the browser downloads only when that day or month is opened,
so the site stays fast as the archive grows.

Addresses: `/current-affairs/YYYY-MM-DD` for a day, `/current-affairs/month/YYYY-MM` for a month, with `/en` in
front for English. Each page links to its other-language version (hreflang) so search engines index both.
The Gujarati addresses match the old portfolio section, so links shared before the move keep working once they redirect here.

## Deploy to Cloudflare Pages (free)

1. Push this folder to a GitHub repository.
2. In Cloudflare: Workers & Pages → Create → Pages → connect the repository.
3. Build command: `npm run build`. Build output directory: `dist/current-affairs/browser`.
4. Set `url` in `src/app/data/site.json` to the final address (your `*.pages.dev` address or your own domain).
5. After the first deploy, add the site to Google Search Console and submit `/sitemap.xml`.

Every push to the main branch deploys automatically. Unknown addresses get the built `404.html` with a real 404 status.
