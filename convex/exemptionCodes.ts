import { v } from "convex/values";
import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

type MutationCtx = GenericMutationCtx<DataModel>;

export async function resolveExemptionForBox(
  ctx: MutationCtx,
  exemptionCodeId: Id<"exemptionCodes">,
) {
  const code = await ctx.db.get(exemptionCodeId);
  if (!code) {
    throw new Error("Exemption code not found");
  }
  if (!code.isActive) {
    throw new Error("Exemption code is archived");
  }
  return {
    exemptionCodeId,
    exemptionShortCodeSnapshot: code.shortCode,
    exemptionTitleSnapshot: code.title,
  };
}

export const list = query({
  args: { includeInactive: v.optional(v.boolean()) },
  handler: async (ctx, { includeInactive }) => {
    const rows = includeInactive
      ? await ctx.db.query("exemptionCodes").collect()
      : await ctx.db
          .query("exemptionCodes")
          .withIndex("by_active_sort", (q) => q.eq("isActive", true))
          .collect();
    return rows.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const create = mutation({
  args: {
    shortCode: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("exemptionCodes").collect();
    const maxSort =
      existing.length === 0
        ? 0
        : Math.max(...existing.map((c) => c.sortOrder));
    return await ctx.db.insert("exemptionCodes", {
      shortCode: args.shortCode,
      title: args.title,
      description: args.description,
      category: args.category,
      sortOrder: args.sortOrder ?? maxSort + 1,
      isActive: true,
    });
  },
});

export const update = mutation({
  args: {
    codeId: v.id("exemptionCodes"),
    shortCode: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { codeId, ...patch }) => {
    const updates: Record<string, unknown> = {};
    if (patch.shortCode !== undefined) updates.shortCode = patch.shortCode;
    if (patch.title !== undefined) updates.title = patch.title;
    if (patch.description !== undefined) updates.description = patch.description;
    if (patch.category !== undefined) updates.category = patch.category;
    if (patch.sortOrder !== undefined) updates.sortOrder = patch.sortOrder;
    if (patch.isActive !== undefined) updates.isActive = patch.isActive;
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(codeId, updates);
    }
  },
});

export const archive = mutation({
  args: { codeId: v.id("exemptionCodes") },
  handler: async (ctx, { codeId }) => {
    await ctx.db.patch(codeId, { isActive: false });
  },
});

/** One-time seed of common FOIA-style codes for QA. */
export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("exemptionCodes").first();
    if (existing) {
      return { seeded: false, reason: "already_has_codes" as const };
    }
    const defaults = [
      {
        shortCode: "(b)(1)",
        title: "National defense / foreign policy",
        category: "FOIA",
        sortOrder: 1,
      },
      {
        shortCode: "(b)(5)",
        title: "Deliberative process / attorney work product",
        category: "FOIA",
        sortOrder: 2,
      },
      {
        shortCode: "(b)(6)",
        title: "Personal privacy",
        category: "FOIA",
        sortOrder: 3,
      },
      {
        shortCode: "(b)(7)(C)",
        title: "Law enforcement — personal privacy",
        category: "FOIA",
        sortOrder: 4,
      },
      {
        shortCode: "A-C Priv",
        title: "Attorney-client privilege",
        category: "privilege",
        sortOrder: 5,
      },
    ];
    for (const row of defaults) {
      await ctx.db.insert("exemptionCodes", {
        ...row,
        isActive: true,
      });
    }
    return { seeded: true, count: defaults.length };
  },
});
