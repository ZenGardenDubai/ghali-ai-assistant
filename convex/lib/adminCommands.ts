/**
 * Admin command parsing and handling.
 * Pattern: parse command → verify admin → route → template response.
 *
 * These are plain async functions called within generateResponse (not Convex actions).
 */

import { TEMPLATES } from "../templates";
import { fillTemplate } from "./utils";
import { renderSystemMessage } from "./systemCommands";

export interface ParsedAdminCommand {
  command: string;
  args: string;
}

/**
 * Parse an admin command into { command, args }.
 * Assumes the message has already been validated with isAdminCommand().
 */
export function parseAdminCommand(message: string): ParsedAdminCommand {
  const trimmed = message.trim();
  // Remove "admin " prefix (case-insensitive)
  const rest = trimmed.slice(6).trim();
  const spaceIndex = rest.indexOf(" ");

  if (spaceIndex === -1) {
    return { command: rest.toLowerCase(), args: "" };
  }

  return {
    command: rest.slice(0, spaceIndex).toLowerCase(),
    args: rest.slice(spaceIndex + 1).trim(),
  };
}

export interface AdminCommandResult {
  response: string;
  pendingAction?: "admin_broadcast";
  pendingPayload?: string;
}

/**
 * Handle an admin command. Returns result or null if unrecognized.
 * Caller must verify user.isAdmin before calling this.
 *
 * Uses `any` for ctx and internal types because this plain function is called
 * within a Convex action and the exact generic types are unwieldy to replicate.
 */
export async function handleAdminCommand(
  message: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  internal: any,
  userMessage: string
): Promise<AdminCommandResult | null> {
  const { command, args } = parseAdminCommand(message);

  switch (command) {
    case "stats": {
      const stats = (await ctx.runQuery(internal.admin.getStats, {})) as {
        totalUsers: number;
        activeToday: number;
        activeWeek: number;
        activeMonth: number;
        newToday: number;
        proUsers: number;
      };
      return {
        response: await renderSystemMessage(
          "admin_stats",
          {
            totalUsers: stats.totalUsers,
            activeToday: stats.activeToday,
            activeWeek: stats.activeWeek,
            activeMonth: stats.activeMonth,
            newToday: stats.newToday,
            proUsers: stats.proUsers,
          },
          userMessage
        ),
      };
    }

    case "search": {
      if (!args) {
        return {
          response: fillTemplate(TEMPLATES.admin_search_not_found.template, {
            phone: "(no phone provided)",
          }),
        };
      }
      const user = (await ctx.runQuery(internal.admin.searchUser, {
        phone: args,
      })) as {
        phone: string;
        name?: string;
        tier: string;
        credits: number;
        language: string;
        timezone: string;
        isAdmin: boolean;
        createdAt: number;
        lastMessageAt?: number;
      } | null;

      if (!user) {
        return {
          response: await renderSystemMessage(
            "admin_search_not_found",
            { phone: args },
            userMessage
          ),
        };
      }

      return {
        response: await renderSystemMessage(
          "admin_search_result",
          {
            phone: user.phone,
            name: user.name || "Not set",
            tier: user.tier,
            credits: user.credits,
            language: user.language,
            timezone: user.timezone,
            isAdmin: user.isAdmin ? "Yes" : "No",
            createdAt: new Date(user.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            lastActive: user.lastMessageAt
              ? new Date(user.lastMessageAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Never",
          },
          userMessage
        ),
      };
    }

    case "grant": {
      if (!args) {
        return {
          response: "Usage: admin grant +971... pro | admin grant +971... credits 100",
        };
      }

      const parts = args.split(/\s+/);
      const phone = parts[0];
      const grantType = parts[1]?.toLowerCase();

      if (grantType === "pro") {
        const result = (await ctx.runMutation(internal.admin.grantPro, {
          phone,
        })) as { success: boolean; reason?: string };

        if (!result.success) {
          return {
            response: await renderSystemMessage(
              "admin_search_not_found",
              { phone },
              userMessage
            ),
          };
        }

        return {
          response: await renderSystemMessage(
            "admin_grant_done",
            { phone, action: "Upgraded to Pro", details: "600 credits granted" },
            userMessage
          ),
        };
      }

      if (grantType === "credits") {
        const amount = parseInt(parts[2], 10);
        if (isNaN(amount) || amount <= 0) {
          return { response: "Invalid credit amount. Usage: admin grant +971... credits 100" };
        }

        const result = (await ctx.runMutation(internal.admin.grantCredits, {
          phone,
          amount,
        })) as { success: boolean; reason?: string; newBalance: number };

        if (!result.success) {
          return {
            response: await renderSystemMessage(
              "admin_search_not_found",
              { phone },
              userMessage
            ),
          };
        }

        return {
          response: await renderSystemMessage(
            "admin_grant_done",
            {
              phone,
              action: `Added ${amount} credits`,
              details: `New balance: ${result.newBalance}`,
            },
            userMessage
          ),
        };
      }

      return {
        response: "Unknown grant type. Usage: admin grant +971... pro | admin grant +971... credits 100",
      };
    }

    case "broadcast": {
      if (!args) {
        return { response: "Usage: admin broadcast Your message here" };
      }

      const activeCount = (await ctx.runQuery(
        internal.admin.getActiveUserCount,
        {}
      )) as number;

      return {
        response: await renderSystemMessage(
          "admin_broadcast_confirm",
          { message: args, activeCount },
          userMessage
        ),
        pendingAction: "admin_broadcast",
        pendingPayload: args,
      };
    }

    case "help":
      return {
        response: await renderSystemMessage("admin_help", {}, userMessage),
      };

    default:
      return {
        response: await renderSystemMessage("admin_help", {}, userMessage),
      };
  }
}
