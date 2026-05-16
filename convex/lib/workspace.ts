import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export const DEFAULT_CASE_NAME = "Default case";

/** Creates the non-removable matter shell for every team row. Call right after inserting the team (+ owner membership when applicable). */
export async function insertDefaultCaseForTeam(
  ctx: MutationCtx,
  teamId: Id<"teams">,
  createdBy: string,
): Promise<Id<"cases">> {
  const now = Date.now();
  return await ctx.db.insert("cases", {
    teamId,
    name: DEFAULT_CASE_NAME,
    createdBy,
    createdAt: now,
    isDefault: true,
  });
}

/**
 * Exactly one solo team + default case per primary email.
 * Used during sign-in and session repair.
 */
export async function ensureSoloTeamAndDefaultCase(
  ctx: MutationCtx,
  userEmail: string,
): Promise<{ teamId: Id<"teams">; defaultCaseId: Id<"cases"> }> {
  let teamRows = await ctx.db
    .query("teams")
    .withIndex("by_owner_kind", (q) =>
      q.eq("createdBy", userEmail).eq("kind", "solo"),
    )
    .collect();

  const now = Date.now();
  let teamId: Id<"teams">;
  if (teamRows.length > 0) {
    teamId = teamRows[0]!._id;
    if (teamRows.length > 1) {
      // Prefer newest if duplicates exist (repair path).
      teamRows.sort((a, b) => b.createdAt - a.createdAt);
      teamId = teamRows[0]!._id;
    }
  } else {
    teamId = await ctx.db.insert("teams", {
      name: "Personal workspace",
      createdBy: userEmail,
      createdAt: now,
      kind: "solo",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userId: userEmail,
      role: "admin",
      joinedAt: now,
    });
  }

  const defaultCandidates = await ctx.db
    .query("cases")
    .withIndex("by_team_default", (q) =>
      q.eq("teamId", teamId).eq("isDefault", true),
    )
    .collect();

  let defaultCaseId: Id<"cases"> | null = defaultCandidates
    .filter((c) => c.isDefault === true)[0]?._id ?? null;

  if (!defaultCaseId) {
    defaultCaseId = await insertDefaultCaseForTeam(ctx, teamId, userEmail);
  }

  const membership = await ctx.db
    .query("teamMembers")
    .withIndex("by_team_and_user", (q) =>
      q.eq("teamId", teamId).eq("userId", userEmail),
    )
    .unique();
  if (!membership) {
    await ctx.db.insert("teamMembers", {
      teamId,
      userId: userEmail,
      role: "admin",
      joinedAt: Date.now(),
    });
  }

  return { teamId, defaultCaseId };
}

export async function getDefaultCaseIdForTeam(
  ctx: MutationCtx,
  teamId: Id<"teams">,
): Promise<Id<"cases"> | null> {
  const row = await ctx.db
    .query("cases")
    .withIndex("by_team_default", (q) => q.eq("teamId", teamId).eq("isDefault", true))
    .first();
  return row?._id ?? null;
}
