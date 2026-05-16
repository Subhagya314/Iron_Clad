import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const create = mutation({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const createdBy = normalizeEmail(args.userEmail);
    if (!createdBy.includes("@")) {
      throw new Error("Invalid email");
    }
    const now = Date.now();
    return await ctx.db.insert("documents", {
      storageId: args.storageId,
      name: args.name,
      createdBy,
      createdAt: now,
    });
  },
});

export const get = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    return await ctx.db.get(documentId);
  },
});

export const generateUploadUrl = mutation({
  args: { userEmail: v.string() },
  handler: async (ctx, args) => {
    const e = normalizeEmail(args.userEmail);
    if (!e.includes("@")) {
      throw new Error("Invalid email");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});
