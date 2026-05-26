/**
 * Local patch: normalize SQLite timestamp fields in JSON responses.
 *
 * D1 / SQLite default CURRENT_TIMESTAMP returns "YYYY-MM-DD HH:MM:SS" — a UTC
 * value WITHOUT timezone marker. Browsers and downstream systems often parse
 * such strings as local time, producing a wrong-by-N-hours display.
 *
 * This middleware rewrites those fields to ISO 8601 with explicit "Z" so any
 * client (browser, integration consumer, etc.) interprets them correctly.
 *
 * Why a response middleware vs SQL CAST vs schema change:
 * - One file, covers every API endpoint
 * - No data migration needed
 * - Minimal divergence from upstream — easy future merges
 */

import type { Context, Next } from "hono";

const TIMESTAMP_FIELDS = new Set([
	"created_at",
	"updated_at",
	"received_at",
	"extracted_at",
	"sent_at",
	"deleted_at",
]);

const SQLITE_TS = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/;

function toIsoUtc(s: string): string {
	const iso = s.replace(" ", "T");
	return iso.includes(".") ? `${iso}Z` : `${iso}.000Z`;
}

function normalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(normalize);
	if (value && typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			if (TIMESTAMP_FIELDS.has(k) && typeof v === "string" && SQLITE_TS.test(v)) {
				out[k] = toIsoUtc(v);
			} else if (v && typeof v === "object") {
				out[k] = normalize(v);
			} else {
				out[k] = v;
			}
		}
		return out;
	}
	return value;
}

export async function normalizeTimestampsMiddleware(c: Context, next: Next) {
	await next();
	const ct = c.res.headers.get("content-type") || "";
	if (!ct.includes("application/json")) return;
	try {
		const body = await c.res.clone().json();
		const fixed = normalize(body);
		c.res = new Response(JSON.stringify(fixed), {
			status: c.res.status,
			headers: c.res.headers,
		});
	} catch {
		// not parseable JSON — leave the response untouched
	}
}
