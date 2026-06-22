"""
letterboxd_to_dataset.py

Converts a Letterboxd "ratings.csv" export into the data/movies.json shape
the dashboard reads, enriching each title with genre/director/runtime/
revenue/votes from the OMDb API.

Letterboxd export columns (from your Profile -> Settings -> Data export):
    Date, Name, Year, Letterboxd URI, Rating

Letterboxd ratings are 0.5-5.0 stars; this script converts them to a 0-10
scale (rating * 2) to match the dashboard's existing fields.

Requirements:
    pip install requests

Usage:
    export OMDB_API_KEY=your_key_here
    python scripts/letterboxd_to_dataset.py ratings.csv data/movies.json

Notes:
- OMDb's free tier is rate-limited (1,000 requests/day). This script caches
  every successful lookup in scripts/.omdb_cache.json, so re-running the
  script (e.g. after it gets interrupted) won't re-spend your quota on
  titles it already fetched.
- Titles OMDb can't find are skipped and printed at the end, not silently
  dropped, so you can fix them by hand (e.g. ambiguous titles, foreign
  titles, re-releases).
- OMDb's BoxOffice field is often "N/A", especially for older, foreign, or
  niche films -- those rows just get revenue_million: 0, which is fine,
  the dashboard already handles that.
"""

import csv
import json
import os
import sys
import time
import requests

CACHE_PATH = os.path.join(os.path.dirname(__file__), ".omdb_cache.json")
OMDB_URL = "http://www.omdbapi.com/"


def load_cache():
    if os.path.exists(CACHE_PATH):
        with open(CACHE_PATH, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cache(cache):
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)


def parse_money(value):
    """Turns OMDb's '$28,341,469' or 'N/A' into a float in millions."""
    if not value or value == "N/A":
        return 0.0
    digits = "".join(c for c in value if c.isdigit())
    return round(int(digits) / 1_000_000, 2) if digits else 0.0


def parse_runtime(value):
    if not value or value == "N/A":
        return 0
    digits = "".join(c for c in value if c.isdigit())
    return int(digits) if digits else 0


def parse_votes(value):
    if not value or value == "N/A":
        return 0
    return int(value.replace(",", ""))


def fetch_omdb(title, year, api_key, cache):
    key = f"{title.lower()}::{year}"
    if key in cache:
        return cache[key]

    params = {"apikey": api_key, "t": title, "y": year, "type": "movie"}
    resp = requests.get(OMDB_URL, params=params, timeout=10)
    data = resp.json()

    if data.get("Response") != "True":
        cache[key] = None
        return None

    record = {
        "title": data.get("Title", title),
        "year": int(data["Year"][:4]) if data.get("Year") else year,
        "genre": [g.strip() for g in data.get("Genre", "").split(",") if g.strip()],
        "director": data.get("Director", "Unknown"),
        "runtime": parse_runtime(data.get("Runtime")),
        "revenue_million": parse_money(data.get("BoxOffice")),
        "votes": parse_votes(data.get("imdbVotes")),
        "poster_url": data.get("Poster") if data.get("Poster") not in (None, "N/A") else None,
    }
    cache[key] = record
    return record


def convert(input_csv, output_json, api_key):
    cache = load_cache()
    results = []
    misses = []

    with open(input_csv, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"Found {len(rows)} rated movies in {input_csv}. Fetching details from OMDb...")

    for i, row in enumerate(rows, 1):
        title = row.get("Name", "").strip()
        year = row.get("Year", "").strip()
        stars = row.get("Rating", "").strip()

        if not title or not stars:
            continue

        omdb = fetch_omdb(title, year, api_key, cache)

        if omdb is None:
            misses.append(f"{title} ({year})")
        else:
            results.append({
                **omdb,
                "rating": round(float(stars) * 2, 1),  # 0-5 stars -> 0-10 scale
            })

        if i % 25 == 0:
            print(f"  ...{i}/{len(rows)} processed")
            save_cache(cache)  # checkpoint periodically
            time.sleep(0.2)    # be polite to the free API tier

    save_cache(cache)

    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\nDone. Wrote {len(results)} movies -> {output_json}")
    if misses:
        print(f"\n{len(misses)} titles couldn't be matched on OMDb and were skipped:")
        for m in misses:
            print(f"  - {m}")
        print("\nThese are usually ambiguous titles or year mismatches -- "
              "you can retry them individually or edit the CSV and re-run.")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python letterboxd_to_dataset.py <ratings.csv> <output.json>")
        sys.exit(1)

    api_key = os.environ.get("OMDB_API_KEY")
    if not api_key:
        print("Set your OMDb API key first: export OMDB_API_KEY=your_key_here")
        sys.exit(1)

    convert(sys.argv[1], sys.argv[2], api_key)
