import { internalMutation } from "./_generated/server";
import { ensureSoloTeamAndDefaultCase } from "./lib/workspace";

/** Backfill caseId on documents created before the teams/cases schema. */
export const migrateLegacyDocuments = internalMutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("documents").collect();
    let patched = 0;
    let skipped = 0;

    for (const doc of docs) {
      if (doc.caseId) continue;
      const owner = doc.createdBy?.trim().toLowerCase();
      if (!owner || !owner.includes("@")) {
        skipped++;
        continue;
      }
      const { defaultCaseId } = await ensureSoloTeamAndDefaultCase(ctx, owner);
      await ctx.db.patch(doc._id, { caseId: defaultCaseId });
      patched++;
    }

    return { patched, skipped, total: docs.length };
  },
});
