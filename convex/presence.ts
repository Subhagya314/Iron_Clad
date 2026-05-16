import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const PRESENCE_STALE_MS = 60_000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const heartbeat = mutation({
  args: {
    userEmail: v.string(),
    displayName: v.optional(v.string()),
    color: v.optional(v.string()),
    documentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const userId = normalizeEmail(args.userEmail);
    if (!userId.includes("@")) {
      throw new Error("Invalid email");
    }
    const now = Date.now();
    const existing = await ctx.db
      .query("presencePeers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName: args.displayName ?? existing.displayName,
        color: args.color ?? existing.color,
        documentId: args.documentId ?? existing.documentId,
        lastSeen: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("presencePeers", {
      userId,
      displayName: args.displayName,
      color: args.color,
      documentId: args.documentId,
      lastSeen: now,
    });
  },
});

export const leaveDocument = mutation({
  args: { userEmail: v.string() },
  handler: async (ctx, { userEmail }) => {
    const userId = normalizeEmail(userEmail);
    const existing = await ctx.db
      .query("presencePeers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { documentId: undefined, lastSeen: Date.now() });
    }
  },
});

export const listPresentInDocument = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const now = Date.now();
    const rows = await ctx.db
      .query("presencePeers")
      .withIndex("by_document_lastSeen", (q) => q.eq("documentId", documentId))
      .collect();
    return rows.filter((u) => now - u.lastSeen < PRESENCE_STALE_MS);
  },
});
