#!/usr/bin/env python3
"""
Set all streets in deneigement_current to the "Déneigé" status (etat_deneig = 1).

Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or DATABASE_URL / SUPABASE_DB_URL
for a direct Postgres connection (recommended for large updates).

Usage:
  python set_all_streets_degage.py --dry-run
  python set_all_streets_degage.py
  python set_all_streets_degage.py --no-insert-missing
"""
from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()

# Montreal Info-Neige API code for "Déneigé"
ETAT_DENEIGE = 1
STATUS_DENEIGE = "Déneigé"

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
DATABASE_URL = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")


def run_via_postgres(dry_run: bool, insert_missing: bool) -> None:
    import psycopg2

    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL or SUPABASE_DB_URL is not set")

    with psycopg2.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM deneigement_current")
            current_count = cur.fetchone()[0]

            missing_count = 0
            if insert_missing:
                cur.execute(
                    """
                    SELECT COUNT(*)
                    FROM streets s
                    WHERE NOT EXISTS (
                      SELECT 1
                      FROM deneigement_current d
                      WHERE d.cote_rue_id = s.cote_rue_id
                    )
                    """
                )
                missing_count = cur.fetchone()[0]

            print(f"Rows in deneigement_current: {current_count}")
            if insert_missing:
                print(f"Streets without a current row (will insert): {missing_count}")
            print(f"Target: etat_deneig={ETAT_DENEIGE}, status={STATUS_DENEIGE!r}")

            if dry_run:
                print("\n[DRY RUN] No changes written.")
                return

            cur.execute(
                """
                UPDATE deneigement_current
                SET
                  etat_deneig = %s,
                  status = %s,
                  date_maj = now(),
                  last_seen_at = now()
                """,
                (ETAT_DENEIGE, STATUS_DENEIGE),
            )
            updated = cur.rowcount

            inserted = 0
            if insert_missing:
                cur.execute(
                    """
                    INSERT INTO deneigement_current (
                      cote_rue_id,
                      etat_deneig,
                      status,
                      date_maj,
                      last_seen_at
                    )
                    SELECT
                      s.cote_rue_id,
                      %s,
                      %s,
                      now(),
                      now()
                    FROM streets s
                    WHERE NOT EXISTS (
                      SELECT 1
                      FROM deneigement_current d
                      WHERE d.cote_rue_id = s.cote_rue_id
                    )
                    """,
                    (ETAT_DENEIGE, STATUS_DENEIGE),
                )
                inserted = cur.rowcount

        conn.commit()

    print(f"\nDone. Updated {updated} row(s), inserted {inserted} row(s).")


def run_via_supabase(dry_run: bool, insert_missing: bool) -> None:
    from supabase import create_client

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set "
            "(or use DATABASE_URL for Postgres)"
        )

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    now_iso = datetime.now(timezone.utc).isoformat()

    current = (
        supabase.table("deneigement_current")
        .select("cote_rue_id", count="exact")
        .execute()
    )
    current_count = current.count or 0
    print(f"Rows in deneigement_current: {current_count}")

    missing_count = 0
    missing_ids: list[int] = []
    if insert_missing:
        streets = supabase.table("streets").select("cote_rue_id").execute()
        existing = (
            supabase.table("deneigement_current").select("cote_rue_id").execute()
        )
        existing_ids = {row["cote_rue_id"] for row in (existing.data or [])}
        missing_ids = [
            row["cote_rue_id"]
            for row in (streets.data or [])
            if row["cote_rue_id"] not in existing_ids
        ]
        missing_count = len(missing_ids)
        print(f"Streets without a current row (will insert): {missing_count}")

    print(f"Target: etat_deneig={ETAT_DENEIGE}, status={STATUS_DENEIGE!r}")

    if dry_run:
        print("\n[DRY RUN] No changes written.")
        return

    # Fetch all cote_rue_id values and upsert in batches
    page_size = 1000
    offset = 0
    updated = 0

    while True:
        batch = (
            supabase.table("deneigement_current")
            .select("cote_rue_id")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        rows = batch.data or []
        if not rows:
            break

        payload = [
            {
                "cote_rue_id": row["cote_rue_id"],
                "etat_deneig": ETAT_DENEIGE,
                "status": STATUS_DENEIGE,
                "date_maj": now_iso,
                "last_seen_at": now_iso,
            }
            for row in rows
        ]
        supabase.table("deneigement_current").upsert(
            payload, on_conflict="cote_rue_id"
        ).execute()
        updated += len(payload)
        offset += page_size

    inserted = 0
    if insert_missing and missing_count:
        batch_size = 500
        for i in range(0, len(missing_ids), batch_size):
            chunk = missing_ids[i : i + batch_size]
            payload = [
                {
                    "cote_rue_id": cote_rue_id,
                    "etat_deneig": ETAT_DENEIGE,
                    "status": STATUS_DENEIGE,
                    "date_maj": now_iso,
                    "last_seen_at": now_iso,
                }
                for cote_rue_id in chunk
            ]
            supabase.table("deneigement_current").upsert(
                payload, on_conflict="cote_rue_id"
            ).execute()
            inserted += len(payload)

    print(f"\nDone. Updated {updated} row(s), inserted {inserted} row(s).")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Set all streets to Déneigé (etat_deneig=1) in deneigement_current."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print counts only; do not modify the database.",
    )
    parser.add_argument(
        "--no-insert-missing",
        action="store_true",
        help="Only update existing deneigement_current rows; do not insert for streets without a row.",
    )
    args = parser.parse_args()
    insert_missing = not args.no_insert_missing

    try:
        if DATABASE_URL:
            run_via_postgres(args.dry_run, insert_missing)
        else:
            run_via_supabase(args.dry_run, insert_missing)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
