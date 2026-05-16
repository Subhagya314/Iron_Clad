import { v } from "convex/values";
import { resolveExemptionForBox } from "./exemptionCodes";
import { mutation, query } from "./_generated/server";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const listByDocument = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    return await ctx.db
      .query("redactionBoxes")
      .withIndex("by_document", (q) => q.eq("documentId", documentId))
      .collect();
  },
});

export const createBox = mutation({
  args: {
    documentId: v.id("documents"),
    pageNumber: v.number(),
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
    status: v.union(v.literal("draft"), v.literal("locked")),
    userEmail: v.string(),
    exemptionCodeId: v.optional(v.id("exemptionCodes")),
  },
  handler: async (ctx, args) => {
    const userId = normalizeEmail(args.userEmail);
    if (!userId.includes("@")) {
      throw new Error("Invalid email");
    }
    const now = Date.now();
    const exemption = args.exemptionCodeId
      ? await resolveExemptionForBox(ctx, args.exemptionCodeId)
      : {};

    return await ctx.db.insert("redactionBoxes", {
      documentId: args.documentId,
      pageNumber: args.pageNumber,
      x: args.x,
      y: args.y,
      width: args.width,
      height: args.height,
      status: args.status,
      userId,
      updatedAt: now,
      ...exemption,
    });
  },
});

export const updateBox = mutation({
  args: {
    boxId: v.id("redactionBoxes"),
    userEmail: v.string(),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    status: v.optional(v.union(v.literal("draft"), v.literal("locked"))),
    exemptionCodeId: v.optional(v.id("exemptionCodes")),
    clearExemption: v.optional(v.literal(true)),
  },
  handler: async (ctx, { boxId, userEmail, exemptionCodeId, clearExemption, ...patch }) => {
    if (clearExemption && exemptionCodeId !== undefined) {
      throw new Error("Cannot set exemptionCodeId and clearExemption together");
    }

    const userId = normalizeEmail(userEmail);
    const box = await ctx.db.get(boxId);
    if (!box || box.userId !== userId) {
      throw new Error("Forbidden");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (patch.x !== undefined) updates.x = patch.x;
    if (patch.y !== undefined) updates.y = patch.y;
    if (patch.width !== undefined) updates.width = patch.width;
    if (patch.height !== undefined) updates.height = patch.height;
    if (patch.status !== undefined) updates.status = patch.status;

    if (clearExemption) {
      updates.exemptionCodeId = undefined;
      updates.exemptionShortCodeSnapshot = undefined;
      updates.exemptionTitleSnapshot = undefined;
    } else if (exemptionCodeId !== undefined) {
      const exemption = await resolveExemptionForBox(ctx, exemptionCodeId);
      Object.assign(updates, exemption);
    }

    await ctx.db.patch(boxId, updates);
  },
});

export const deleteBox = mutation({
  args: { boxId: v.id("redactionBoxes"), userEmail: v.string() },
  handler: async (ctx, { boxId, userEmail }) => {
    const userId = normalizeEmail(userEmail);
    const box = await ctx.db.get(boxId);
    if (!box || box.userId !== userId) {
      throw new Error("Forbidden");
    }
    await ctx.db.delete(boxId);
  },
});
