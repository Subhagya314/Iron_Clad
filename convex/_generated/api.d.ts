/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as audit from "../audit.js";
import type * as cases from "../cases.js";
import type * as dashboard from "../dashboard.js";
import type * as documents from "../documents.js";
import type * as exemptionCodes from "../exemptionCodes.js";
import type * as exportRedaction from "../exportRedaction.js";
import type * as http from "../http.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_accessibleDocuments from "../lib/accessibleDocuments.js";
import type * as lib_auditLog from "../lib/auditLog.js";
import type * as lib_sessionHelpers from "../lib/sessionHelpers.js";
import type * as lib_workspace from "../lib/workspace.js";
import type * as migrations from "../migrations.js";
import type * as presence from "../presence.js";
import type * as redactions from "../redactions.js";
import type * as session from "../session.js";
import type * as teams from "../teams.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  audit: typeof audit;
  cases: typeof cases;
  dashboard: typeof dashboard;
  documents: typeof documents;
  exemptionCodes: typeof exemptionCodes;
  exportRedaction: typeof exportRedaction;
  http: typeof http;
  "lib/access": typeof lib_access;
  "lib/accessibleDocuments": typeof lib_accessibleDocuments;
  "lib/auditLog": typeof lib_auditLog;
  "lib/sessionHelpers": typeof lib_sessionHelpers;
  "lib/workspace": typeof lib_workspace;
  migrations: typeof migrations;
  presence: typeof presence;
  redactions: typeof redactions;
  session: typeof session;
  teams: typeof teams;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
