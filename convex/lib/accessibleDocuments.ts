import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { normalizeEmail } from "./access";

type Ctx = QueryCtx | MutationCtx;

/** Documents reachable via team membership cases (solo + collab); sorted newest first. */
export async function listAccessibleDocuments(ctx: Ctx, u: string): Promise<Doc<"documents">[]> {
  const user = normalizeEmail(u);
  if (!user.includes("@")) return [];

  const memberships = await ctx.db
    .query("teamMembers")
    .withIndex("by_user", (q) => q.eq("userId", user))
    .collect();

  const caseIds = new Set<string>();
  for (const m of memberships) {
    const casesRows = await ctx.db
      .query("cases")
      .withIndex("by_team", (q) => q.eq("teamId", m.teamId))
      .collect();
    for (const c of casesRows) {
      caseIds.add(c._id as string);
    }
  }

  const merged: Doc<"documents">[] = [];
  for (const cid of caseIds) {
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_case", (q) => q.eq("caseId", cid as Id<"cases">))
      .collect();
    merged.push(...docs);
  }

  const seen = new Set<string>();
  const uniq: Doc<"documents">[] = [];
  for (const d of merged) {
    const id = d._id as string;
    if (seen.has(id)) continue;
    seen.add(id);
    uniq.push(d);
  }

  return uniq.sort((a, b) => b.createdAt - a.createdAt);
}
