import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function isTeamMember(
  ctx: Ctx,
  userEmail: string,
  teamId: Id<"teams">,
): Promise<boolean> {
  const email = normalizeEmail(userEmail);
  const row = await ctx.db
    .query("teamMembers")
    .withIndex("by_team_and_user", (q) => q.eq("teamId", teamId).eq("userId", email))
    .unique();
  return row !== null;
}

async function getTeamIdForCase(
  ctx: Ctx,
  caseId: Id<"cases">,
): Promise<Id<"teams"> | null> {
  const c = await ctx.db.get(caseId);
  return c?.teamId ?? null;
}

/** Caller must have trimmed session; returns false if unknown case. */
export async function canAccessCase(ctx: Ctx, userEmail: string, caseId: Id<"cases">): Promise<boolean> {
  const email = normalizeEmail(userEmail);
  const teamId = await getTeamIdForCase(ctx, caseId);
  if (!teamId) return false;
  return await isTeamMember(ctx, email, teamId);
}

export async function canAccessDocument(
  ctx: Ctx,
  userEmail: string,
  document: Doc<"documents"> | null,
): Promise<boolean> {
  if (!document) return false;
  return await canAccessCase(ctx, userEmail, document.caseId);
}

export async function requireDocumentAccess(
  ctx: Ctx,
  userEmail: string,
  documentId: Id<"documents">,
): Promise<Doc<"documents">> {
  const doc = await ctx.db.get(documentId);
  if (!doc) throw new Error("Not found");
  if (!(await canAccessDocument(ctx, userEmail, doc))) {
    throw new Error("Forbidden");
  }
  return doc;
}
