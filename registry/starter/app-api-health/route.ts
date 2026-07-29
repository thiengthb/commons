import { NextResponse } from 'next/server';

/**
 * Liveness for the container HEALTHCHECK, CI and scripts/rebuild-and-verify.sh.
 *
 * Deliberately does NOT touch the database: this answers "is the process serving?", and a DB hiccup
 * must not make the orchestrator kill a healthy app. Add a separate /api/ready for deep readiness
 * (a `SELECT 1`) when something actually needs to distinguish the two.
 *
 * It stays OPEN — never put this endpoint behind auth, or nothing can check it.
 */
export function GET(): NextResponse {
  return NextResponse.json({ ok: true });
}
