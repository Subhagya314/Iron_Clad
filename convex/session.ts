import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canAccessCase, normalizeEmail } from "./lib/access";
import { ensureSoloTeamAndDefaultCase } from "./lib/workspace";
import { getSessionDoc } from "./lib/sessionHelpers";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function randomTokenHex(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const signInWithEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalized = normalizeEmail(email);
    if (!normalized.includes("@")) throw new Error("Invalid email");

    const now = Date.now();
    const token = randomTokenHex();

    const { defaultCaseId } = await ensureSoloTeamAndDefaultCase(ctx, normalized);

    await ctx.db.insert("sessions", {
      token,
      email: normalized,
      preferredUploadCaseId: defaultCaseId,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    });

    return { sessionToken: token };
  },
});

export const getSession = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const s = await getSessionDoc(ctx, sessionToken);
    if (!s) return null;
    return {
      email: normalizeEmail(s.email),
      displayName: s.displayName ?? null,
      preferredUploadCaseId: s.preferredUploadCaseId ?? null,
      expiresAt: s.expiresAt,
    };
  },
});

/** Idempotent repair for legacy tokens or orphaned preferences after teardown. */
export const bootstrapPreferredCaseIfNeeded = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const s = await getSessionDoc(ctx, sessionToken);
    if (!s) throw new Error("Unauthorized");

    const owner = normalizeEmail(s.email);

    await ensureSoloTeamAndDefaultCase(ctx, owner);
    let next = s.preferredUploadCaseId;
    let valid = next ? await canAccessCase(ctx, owner, next) : false;
    if (!valid) {
      const { defaultCaseId } = await ensureSoloTeamAndDefaultCase(ctx, owner);
      next = defaultCaseId;
      await ctx.db.patch(s._id, { preferredUploadCaseId: next });
    }

    return { preferredUploadCaseId: next ?? null };
  },
});

export const revokeSession = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const s = await getSessionDoc(ctx, sessionToken);
    if (s) await ctx.db.delete(s._id);
  },
});

export const setDisplayName = mutation({
  args: {
    sessionToken: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, { sessionToken, displayName }) => {
    const session = await getSessionDoc(ctx, sessionToken);
    if (!session) throw new Error("Unauthorized");
    const trimmed = displayName.trim();
    const next = trimmed.length === 0 ? undefined : trimmed.slice(0, 64);
    await ctx.db.patch(session._id, { displayName: next });
    return { ok: true as const };
  },
});

export const setPreferredUploadCase = mutation({
  args: {
    sessionToken: v.string(),
    caseId: v.id("cases"),
  },
  handler: async (ctx, { sessionToken, caseId }) => {
    const session = await getSessionDoc(ctx, sessionToken);
    if (!session) throw new Error("Unauthorized");
    const email = normalizeEmail(session.email);

    const ok = await canAccessCase(ctx, email, caseId);
    if (!ok) throw new Error("Forbidden");

    await ctx.db.patch(session._id, { preferredUploadCaseId: caseId });
    return { ok: true as const };
  },
});
