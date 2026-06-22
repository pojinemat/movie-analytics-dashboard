# Movie Analytics Dashboard & Recommendation Platform

A static, fully client-side movie analytics dashboard with search and a
rule-based recommendation engine. No backend, no build step — open it in a
browser or publish it with GitHub Pages and anyone can use it immediately.
pojiifilms.pages.dev

**Live demo:** 

## What's inside

- **Dashboard** — genre popularity, rating distribution, releases over time,
  and rating-vs-revenue, all charted client-side with Chart.js from
  `data/movies.json`.
- **Search** — instant title search over the dataset.
- **Recommender** — filter by genre, year, and minimum rating; simple
  `Array.filter` logic, no ML required.
- **Power BI slot** — an optional section to embed a published-to-web Power BI
  report alongside the JS dashboard, if you want both.

## Run it locally
run:
' $env:OMDB_API_KEY="your own OMDB API key here" '
in the powershell to use OMDB API.

run:
'python scripts/letterboxd_to_dataset.py ratings.csv data/movies.json'
to fetch data/films from ratings.csv to integrate into movies.json
Because the page loads `data/movies.json` with `fetch()`, some browsers (Chrome
in particular) block that over a plain `file://` path. Use a tiny local server
instead of double-clicking `index.html`:

```bash
# from the project folder
python -m http.server 8000
# then open http://localhost:8000
```

## Publish it on GitHub Pages (so anyone can visit it)

1. Push this folder to a GitHub repository.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`,
   branch `main`, folder `/ (root)`.
4. Save. GitHub gives you a live URL, typically:
   `https://<your-username>.github.io/<repo-name>/`
5. Paste that URL into this README and your resume.

No server, database, or API key is required for visitors — everything runs in
their browser.

## Using your own data

Replace `data/movies.json` with your own dataset in the same shape:

```json
{
  "title": "Inception",
  "year": 2010,
  "genre": ["Sci-Fi", "Action", "Thriller"],
  "rating": 8.8,
  "director": "Christopher Nolan",
  "runtime": 148,
  "revenue_million": 836,
  "votes": 2400000
}
```

### Option A: you already have a clean CSV
If your CSV already has `title, year, genre, rating, director, runtime,
revenue_million, votes` columns, run:

```bash
python scripts/data_cleaning.py raw_movies.csv data/movies.json
```

See `scripts/data_cleaning.py` for the expected CSV columns.

### Option B: you have a Letterboxd export (recommended if you rate on Letterboxd)
Letterboxd's export (Profile -> Settings -> Data export) only gives you
`title, year, your rating` -- no genre, director, or box office. Use
`scripts/letterboxd_to_dataset.py` to enrich each title via the OMDb API:

```bash
export OMDB_API_KEY=your_key_here
python scripts/letterboxd_to_dataset.py ratings.csv data/movies.json
```

This will take a while for ~944 movies on OMDb's free tier (1,000
requests/day), but it caches every successful lookup in
`scripts/.omdb_cache.json`, so if it gets interrupted you can just re-run it
and it'll pick up where it left off without re-spending your quota. Titles
OMDb can't match (ambiguous names, year mismatches) get printed at the end
instead of silently dropped, so you can fix and retry those individually.

Letterboxd star ratings (0.5-5.0) get converted to the dashboard's 0-10 scale
automatically (`stars * 2`).

**Note:** Publish to web makes the report's underlying data public to anyone
with the link. That's fine for a public movie dataset like this one — don't
use it for anything sensitive.

## Project structure

```
movie-analytics-dashboard/
├── index.html              # entry point — open this, or deploy as-is to Pages
├── style.css
├── script.js                # search, charts, recommender logic
├── data/
│   └── movies.json          # sample dataset, swap in your own
├── scripts/
│   └── data_cleaning.py      # CSV -> movies.json
├── dashboard/                # optional: drop your .pbix source file here
└── README.md
```

## Tech stack

HTML / CSS / JavaScript, Chart.js (via CDN), Python for offline data cleaning,
optional Power BI for a deeper-dive report.
