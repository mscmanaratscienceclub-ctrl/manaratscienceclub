import { NextResponse, type NextRequest } from "next/server";

import { DbTimeoutError } from "@/db/query";
import { getServerSession } from "@/lib/auth/get-session";
import { adminSourceById } from "@/lib/admin/filters";
import {
  isSnapshotSource,
  type SnapshotProbe,
  type SnapshotSource,
} from "@/lib/admin/snapshot";
import {
  attendanceDeltaSince,
  getAttendanceSnapshot,
  getSmsSnapshot,
  getStemfestSnapshot,
  probeAttendanceSnapshot,
  probeSmsSnapshot,
  probeStemfestSnapshot,
  smsDeltaSince,
  stemfestDeltaSince,
} from "@/lib/actions/registrations";

/**
 * Where a browser fills its admin cache.
 *
 * One endpoint, three answers, chosen by the query string:
 *
 *   GET /api/admin/snapshot/stemfest            the whole list, figures included
 *   GET /api/admin/snapshot/stemfest?probe=1    count + cursors only — cheap enough
 *                                               to poll once a minute
 *   GET /api/admin/snapshot/stemfest?since=…    only the rows filed after that cursor
 *
 * `stemfest`, `sms` and `attendance` share the path; `snapshotReads` below is what
 * each one answers with.
 *
 * A route handler rather than a server action because the client has to be able to
 * tell the three apart by *status*: 401 means the session died and the cache must be
 * dropped, 404 means the URL is wrong, 504 means the pooler timed out and the poll
 * should simply try again next minute. A server action collapses all of that into a
 * thrown error, and the difference between "sign in again" and "wifi hiccup" is the
 * whole point of the panel working on a bad connection (`obsidian/meta/decisions-log.md`,
 * ADR-0044).
 *
 * The payload is participants' names, schools, email addresses, phone numbers and
 * transaction IDs — the attendance sheet's is only a name, an ID, a class and a tick
 * — so it is `no-store` at every layer and stamped with the admin whose session
 * produced it: a fest laptop is shared, and one browser's IndexedDB must not hand the
 * next admin someone else's list.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = "no-store, must-revalidate";

function refuse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function json(body: unknown) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": NO_STORE },
  });
}

/**
 * The three reads each cached table answers with, keyed by source id.
 *
 * A map rather than a chain of ternaries: with two tables `a ? b : c` read fine, and
 * with three it would have to nest — which is exactly where a source ends up
 * answering with another source's rows. Adding a cached table is now one entry here
 * and nothing else in this file.
 */
const snapshotReads: Record<
  SnapshotSource,
  {
    probe: () => Promise<SnapshotProbe>;
    full: () => Promise<unknown>;
    delta: (since: Date) => Promise<unknown>;
  }
> = {
  stemfest: {
    probe: probeStemfestSnapshot,
    full: getStemfestSnapshot,
    delta: stemfestDeltaSince,
  },
  sms: {
    probe: probeSmsSnapshot,
    full: getSmsSnapshot,
    delta: smsDeltaSince,
  },
  attendance: {
    probe: probeAttendanceSnapshot,
    full: getAttendanceSnapshot,
    delta: attendanceDeltaSince,
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string }> },
) {
  const session = await getServerSession();
  if (!session) return refuse("Sign in again to load this list.", 401);

  // The same "an admin, and only an admin" check `requireAdmin` makes in the action
  // layer. Both are kept: this one so the browser gets a 401 it can act on by
  // dropping its cache, that one so the query can never run for anyone else.
  const role = (session.user as { role?: string }).role ?? "member";
  if (role !== "admin") return refuse("This list is for admins.", 403);

  const { kind } = await params;
  // `adminSourceById` first so an unknown table is a 404 in the panel's own
  // vocabulary, then `isSnapshotSource` so a table that exists but keeps no cache
  // is told apart from one that does not exist at all.
  const source = adminSourceById(kind);
  if (!source) return refuse("That is not a list this panel knows.", 404);

  const cached: SnapshotSource | null = isSnapshotSource(source.id)
    ? source.id
    : null;
  if (!cached) return refuse(`${source.label} is not kept in the browser.`, 404);

  const searchParams = request.nextUrl.searchParams;
  const reads = snapshotReads[cached];

  try {
    if (searchParams.has("probe")) {
      return json(await reads.probe());
    }

    const since = searchParams.get("since");
    if (since !== null) {
      const cursor = new Date(since);
      // A delta from an unparseable cursor would be a full list with no rows, or
      // worse, one that silently starts at the epoch — refuse instead.
      if (Number.isNaN(cursor.getTime())) {
        return refuse("That cursor is not a date this endpoint can read.", 400);
      }

      return json(await reads.delta(cursor));
    }

    return json(await reads.full());
  } catch (error) {
    // A timed-out pooler is a bad-connection answer, not a bug: the client polls
    // again on its own, so it only needs to know that this attempt is worth
    // repeating rather than reporting.
    if (error instanceof DbTimeoutError) {
      console.error(`[admin snapshot ${cached}: timeout]`, error.message);
      return refuse("The database took too long. Try again.", 504);
    }

    console.error(`[admin snapshot ${cached}: failed]`, error);
    return refuse("That list could not be read.", 500);
  }
}
