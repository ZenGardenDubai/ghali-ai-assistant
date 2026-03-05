#!/usr/bin/env python3
"""
Ghali CEO Pulse Report
======================
Prints a quick-read summary of key business metrics.

Data sources:
  - Total users: Convex /admin/stats (golden source — reads directly from the users table)
  - Message & feature activity: PostHog query API

Required environment variables:
  CONVEX_SITE_URL        — e.g. https://amiable-hound-193.convex.site
  INTERNAL_API_SECRET    — shared bearer token for Convex admin endpoints
  POSTHOG_API_KEY        — personal/project API key (used for query API)
  POSTHOG_PROJECT_ID     — numeric PostHog project ID

Usage:
  python scripts/ghali-report.py [--period today|yesterday|7d|30d]
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

import requests


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

CONVEX_SITE_URL = os.environ.get("CONVEX_SITE_URL", "").rstrip("/")
INTERNAL_API_SECRET = os.environ.get("INTERNAL_API_SECRET", "")
POSTHOG_API_KEY = os.environ.get("POSTHOG_API_KEY", "")
POSTHOG_PROJECT_ID = os.environ.get("POSTHOG_PROJECT_ID", "")
POSTHOG_HOST = "https://us.posthog.com"

VALID_PERIODS = {"today", "yesterday", "7d", "30d"}

PERIOD_LABELS = {
    "today": "Today",
    "yesterday": "Yesterday",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
}


# ---------------------------------------------------------------------------
# Data fetchers
# ---------------------------------------------------------------------------

def fetch_convex_stats(period: str) -> dict:
    """Fetch platform stats from Convex /admin/stats (authoritative user count)."""
    if not CONVEX_SITE_URL or not INTERNAL_API_SECRET:
        print("ERROR: CONVEX_SITE_URL and INTERNAL_API_SECRET must be set.", file=sys.stderr)
        sys.exit(1)

    url = f"{CONVEX_SITE_URL}/admin/stats"
    resp = requests.post(
        url,
        json={"period": period},
        headers={"Authorization": f"Bearer {INTERNAL_API_SECRET}"},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def posthog_query(query: str) -> list[dict]:
    """Run a HogQL query against PostHog and return rows."""
    if not POSTHOG_API_KEY or not POSTHOG_PROJECT_ID:
        return []

    url = f"{POSTHOG_HOST}/api/projects/{POSTHOG_PROJECT_ID}/query/"
    resp = requests.post(
        url,
        json={"query": {"kind": "HogQLQuery", "query": query}},
        headers={
            "Authorization": f"Bearer {POSTHOG_API_KEY}",
            "Content-Type": "application/json",
        },
        timeout=30,
    )
    if resp.status_code != 200:
        return []
    data = resp.json()
    return data.get("results", [])


def fetch_posthog_metrics(period: str) -> dict:
    """Fetch message volume and feature metrics from PostHog."""
    period_filter = {
        "today": "today",
        "yesterday": "yesterday",
        "7d": "-7d",
        "30d": "-30d",
    }[period]

    # Messages sent (credit_used = paid AI messages)
    messages_rows = posthog_query(
        f"SELECT count() FROM events "
        f"WHERE event = 'credit_used' AND timestamp >= '{period_filter}'"
    )
    messages = messages_rows[0][0] if messages_rows else "n/a"

    # Active users (distinct senders this period)
    active_rows = posthog_query(
        f"SELECT count(distinct person_id) FROM events "
        f"WHERE event = 'credit_used' AND timestamp >= '{period_filter}'"
    )
    active = active_rows[0][0] if active_rows else "n/a"

    # Image generations
    image_rows = posthog_query(
        f"SELECT count() FROM events "
        f"WHERE event = 'image_generated' AND properties.success = true "
        f"AND timestamp >= '{period_filter}'"
    )
    images = image_rows[0][0] if image_rows else "n/a"

    # Pro Write completions
    prowrite_rows = posthog_query(
        f"SELECT count() FROM events "
        f"WHERE event = 'feature_used' AND properties.feature = 'prowrite' "
        f"AND timestamp >= '{period_filter}'"
    )
    prowrite = prowrite_rows[0][0] if prowrite_rows else "n/a"

    return {
        "messages": messages,
        "active_users": active,
        "images_generated": images,
        "prowrite_completions": prowrite,
    }


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

def print_report(period: str) -> None:
    now = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    label = PERIOD_LABELS[period]

    print(f"\n{'='*50}")
    print(f"  Ghali CEO Pulse — {label}")
    print(f"  Generated: {now}")
    print(f"{'='*50}\n")

    # Convex is golden source for user counts
    convex = fetch_convex_stats(period)
    total_users = convex.get("totalUsers", "n/a")
    new_users = convex.get("newUsers", "n/a")
    active_users_convex = convex.get("activeUsers", "n/a")
    pro_users = convex.get("proUsers", "n/a")
    basic_users = convex.get("basicUsers", "n/a")

    print("### Users (Convex — source of truth)")
    print(f"  Total users       : {total_users}")
    print(f"  New ({label:12s}): {new_users}")
    print(f"  Active ({label:10s}): {active_users_convex}")
    print(f"  Pro / Basic       : {pro_users} / {basic_users}")

    # PostHog for activity metrics
    ph = fetch_posthog_metrics(period)
    print(f"\n### Activity (PostHog — {label})")
    print(f"  Messages sent     : {ph['messages']}")
    print(f"  Active users      : {ph['active_users']}")
    print(f"  Images generated  : {ph['images_generated']}")
    print(f"  ProWrite runs     : {ph['prowrite_completions']}")

    print(f"\n{'='*50}\n")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Ghali CEO Pulse report")
    parser.add_argument(
        "--period",
        choices=list(VALID_PERIODS),
        default="today",
        help="Reporting period (default: today)",
    )
    args = parser.parse_args()
    print_report(args.period)


if __name__ == "__main__":
    main()
