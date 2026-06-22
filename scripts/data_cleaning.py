"""
data_cleaning.py

Turns a raw CSV of movies into the data/movies.json file the website reads.

Expected input CSV columns (case-insensitive, flexible order):
    title, year, genre, rating, director, runtime, revenue_million, votes

- `genre` can be a single genre or multiple separated by "|" or ",".
- Missing numeric fields are filled with 0 rather than dropped, so one
  messy row doesn't break the whole dataset.

Usage:
    python scripts/data_cleaning.py raw_movies.csv data/movies.json

If you're pulling data from the OMDb API instead of a CSV (e.g. from a
Letterboxd export of titles + your own ratings), fetch each title with
OMDb first, build the same row shape, then reuse `clean_row()` below.
"""

import csv
import json
import sys


def parse_genre(raw):
    if not raw:
        return []
    sep = "|" if "|" in raw else ","
    return [g.strip() for g in raw.split(sep) if g.strip()]


def safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def safe_int(value, default=0):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def clean_row(row):
    poster = row.get("poster_url", "").strip()
    return {
        "title": row.get("title", "").strip(),
        "year": safe_int(row.get("year")),
        "genre": parse_genre(row.get("genre", "")),
        "rating": safe_float(row.get("rating")),
        "director": row.get("director", "").strip(),
        "runtime": safe_int(row.get("runtime")),
        "revenue_million": safe_float(row.get("revenue_million")),
        "votes": safe_int(row.get("votes")),
        "poster_url": poster if poster else None,
    }


def clean_csv(input_path, output_path):
    with open(input_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        reader.fieldnames = [name.lower().strip() for name in reader.fieldnames]
        rows = [clean_row(row) for row in reader if row.get("title")]

    # Drop exact duplicate titles, keep the first occurrence
    seen = set()
    deduped = []
    for row in rows:
        key = row["title"].lower()
        if key not in seen:
            seen.add(key)
            deduped.append(row)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(deduped, f, indent=2, ensure_ascii=False)

    print(f"Cleaned {len(deduped)} movies -> {output_path}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python data_cleaning.py <input.csv> <output.json>")
        sys.exit(1)
    clean_csv(sys.argv[1], sys.argv[2])
