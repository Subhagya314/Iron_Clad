import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { normalizeEmail } from "./access";

type Ctx = QueryCtx | MutationCtx;

export async function getSessionDoc(ctx: Ctx, sessionToken: string): Promise<Doc<"sessions"> | null> {
  const token = sessionToken.trim();
  if (!token) return null;
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!session) return null;
  if (session.expiresAt <= Date.now()) return null;
  return session;
}

export async function requireUserEmail(ctx: Ctx, sessionToken: string): Promise<string> {
  const session = await getSessionDoc(ctx, sessionToken);
  if (!session) throw new Error("Unauthorized");
  return normalizeEmail(session.email);
}
