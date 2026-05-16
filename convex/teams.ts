import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { normalizeEmail } from "./lib/access";
import { ensureSoloTeamAndDefaultCase, insertDefaultCaseForTeam } from "./lib/workspace";
import { getSessionDoc, requireUserEmail } from "./lib/sessionHelpers";

type Ctx = QueryCtx | MutationCtx;

async function requireTeamAdmin(ctx: Ctx, teamId: Id<"teams">, userEmail: string) {
  const m = await ctx.db
    .query("teamMembers")
    .withIndex("by_team_and_user", (q) => q.eq("teamId", teamId).eq("userId", userEmail))
    .unique();
  if (!m || m.role !== "admin") {
    throw new Error("Forbidden");
  }
  return m;
}

/** Collaborative team creation; includes default matter + creator as admin. */
export const createCollaborative = mutation({
  args: { name: v.string(), sessionToken: v.string() },
  handler: async (ctx, args) => {
    const userEmail = await requireUserEmail(ctx, args.sessionToken);
    const name = args.name.trim();
    if (!name) throw new Error("Name required");
    const now = Date.now();
    const teamId = await ctx.db.insert("teams", {
      name,
      createdBy: userEmail,
      createdAt: now,
      kind: "collab",
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userId: userEmail,
      role: "admin",
      joinedAt: now,
    });
    await insertDefaultCaseForTeam(ctx, teamId, userEmail);
    return teamId;
  },
});

export type TeamCaseRow = {
  team: Doc<"teams">;
  role: "admin" | "member";
  cases: { case: Doc<"cases"> }[];
};

export const listTeamsWithCases = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const u = await requireUserEmail(ctx, sessionToken);

    const rows = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", u))
      .collect();

    const out: TeamCaseRow[] = [];

    for (const row of rows) {
      const team = await ctx.db.get(row.teamId);
      if (!team) continue;
      let caseDocs = await ctx.db
        .query("cases")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect();

      caseDocs.sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
        return String(a.name).localeCompare(String(b.name));
      });

      out.push({
        team,
        role: row.role,
        cases: caseDocs.map((c) => ({ case: c })),
      });
    }

    out.sort((a, b) => {
      if (a.team.kind !== b.team.kind) return a.team.kind === "solo" ? -1 : 1;
      return b.team.createdAt - a.team.createdAt;
    });

    return out;
  },
});

export const listMembers = query({
  args: { teamId: v.id("teams"), sessionToken: v.string() },
  handler: async (ctx, { teamId, sessionToken }) => {
    const u = await requireUserEmail(ctx, sessionToken);

    const myMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) => q.eq("teamId", teamId).eq("userId", u))
      .unique();
    if (!myMembership) throw new Error("Forbidden");

    return await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();
  },
});

export const addMember = mutation({
  args: {
    teamId: v.id("teams"),
    targetEmail: v.string(),
    sessionToken: v.string(),
  },
  handler: async (ctx, { teamId, targetEmail, sessionToken }) => {
    const adminEmail = await requireUserEmail(ctx, sessionToken);
    const target = normalizeEmail(targetEmail);
    if (!target.includes("@")) {
      throw new Error("Invalid email");
    }
    await requireTeamAdmin(ctx, teamId, adminEmail);

    const team = await ctx.db.get(teamId);
    if (team?.kind === "solo") {
      throw new Error("Personal workspace membership cannot change");
    }

    const existing = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) => q.eq("teamId", teamId).eq("userId", target))
      .unique();
    if (existing) return existing._id;

    return await ctx.db.insert("teamMembers", {
      teamId,
      userId: target,
      role: "member",
      joinedAt: Date.now(),
    });
  },
});

export const removeMember = mutation({
  args: {
    teamId: v.id("teams"),
    targetEmail: v.string(),
    sessionToken: v.string(),
  },
  handler: async (ctx, { teamId, targetEmail, sessionToken }) => {
    const actor = await requireUserEmail(ctx, sessionToken);
    const target = normalizeEmail(targetEmail);
    if (!target.includes("@")) {
      throw new Error("Invalid email");
    }

    const team = await ctx.db.get(teamId);
    if (team?.kind === "solo") {
      throw new Error("Cannot leave personal workspace via roster");
    }

    const targetRow = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) => q.eq("teamId", teamId).eq("userId", target))
      .unique();
    if (!targetRow) return;

    if (actor !== target) {
      await requireTeamAdmin(ctx, teamId, actor);
    }

    if (targetRow.role === "admin") {
      const admins = await ctx.db
        .query("teamMembers")
        .withIndex("by_team", (q) => q.eq("teamId", teamId))
        .collect();
      const adminCount = admins.filter((m) => m.role === "admin").length;
      if (adminCount <= 1) {
        throw new Error("Cannot remove the last admin");
      }
    }

    await ctx.db.delete(targetRow._id);
  },
});

async function purgeTeamContents(ctx: MutationCtx, teamId: Id<"teams">): Promise<void> {
  const caseRows = await ctx.db
    .query("cases")
    .withIndex("by_team", (q) => q.eq("teamId", teamId))
    .collect();

  for (const c of caseRows) {
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_case", (q) => q.eq("caseId", c._id))
      .collect();

    for (const doc of docs) {
      const boxes = await ctx.db
        .query("redactionBoxes")
        .withIndex("by_document", (q) => q.eq("documentId", doc._id))
        .collect();
      for (const b of boxes) {
        await ctx.db.delete(b._id);
      }
      const peers = await ctx.db
        .query("presencePeers")
        .withIndex("by_document_lastSeen", (q) => q.eq("documentId", doc._id))
        .collect();
      for (const p of peers) {
        await ctx.db.delete(p._id);
      }
      await ctx.storage.delete(doc.storageId);
      await ctx.db.delete(doc._id);
    }

    await ctx.db.delete(c._id);
  }

  const members = await ctx.db
    .query("teamMembers")
    .withIndex("by_team", (q) => q.eq("teamId", teamId))
    .collect();
  for (const m of members) {
    await ctx.db.delete(m._id);
  }

  await ctx.db.delete(teamId);
}

/** Admin-only destructive reset for collaborative teams only. */
export const deleteCollaborativeTeam = mutation({
  args: {
    teamId: v.id("teams"),
    sessionToken: v.string(),
  },
  handler: async (ctx, { teamId, sessionToken }) => {
    const adminEmail = await requireUserEmail(ctx, sessionToken);
    await requireTeamAdmin(ctx, teamId, adminEmail);

    const team = await ctx.db.get(teamId);
    if (!team) return;
    if (team.kind === "solo") {
      throw new Error("Cannot delete personal workspace");
    }

    const session = await getSessionDoc(ctx, sessionToken);

    await purgeTeamContents(ctx, teamId);

    // Clear dangling session preference pointing at orphaned cases deleted above.
    if (session?.preferredUploadCaseId) {
      const still = await ctx.db.get(session.preferredUploadCaseId);
      if (!still) {
        const { defaultCaseId } = await ensureSoloTeamAndDefaultCase(ctx, adminEmail);
        await ctx.db.patch(session._id, {
          preferredUploadCaseId: defaultCaseId,
        });
      }
    }
  },
});
