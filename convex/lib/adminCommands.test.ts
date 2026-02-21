import { describe, it, expect } from "vitest";
import { parseAdminCommand } from "./adminCommands";

describe("parseAdminCommand", () => {
  it("parses 'admin stats'", () => {
    expect(parseAdminCommand("admin stats")).toEqual({
      command: "stats",
      args: "",
    });
  });

  it("parses 'admin help'", () => {
    expect(parseAdminCommand("admin help")).toEqual({
      command: "help",
      args: "",
    });
  });

  it("parses 'admin search +971501234567'", () => {
    expect(parseAdminCommand("admin search +971501234567")).toEqual({
      command: "search",
      args: "+971501234567",
    });
  });

  it("parses 'admin grant +971501234567 pro'", () => {
    expect(parseAdminCommand("admin grant +971501234567 pro")).toEqual({
      command: "grant",
      args: "+971501234567 pro",
    });
  });

  it("parses 'admin grant +971501234567 credits 100'", () => {
    expect(parseAdminCommand("admin grant +971501234567 credits 100")).toEqual({
      command: "grant",
      args: "+971501234567 credits 100",
    });
  });

  it("parses 'admin broadcast Hello everyone!'", () => {
    expect(parseAdminCommand("admin broadcast Hello everyone!")).toEqual({
      command: "broadcast",
      args: "Hello everyone!",
    });
  });

  it("is case-insensitive for the prefix and command", () => {
    expect(parseAdminCommand("Admin Stats")).toEqual({
      command: "stats",
      args: "",
    });
    expect(parseAdminCommand("ADMIN SEARCH +971501234567")).toEqual({
      command: "search",
      args: "+971501234567",
    });
  });

  it("trims whitespace", () => {
    expect(parseAdminCommand("  admin  stats  ")).toEqual({
      command: "stats",
      args: "",
    });
  });

  it("preserves case in args", () => {
    expect(parseAdminCommand("admin broadcast Hello World!")).toEqual({
      command: "broadcast",
      args: "Hello World!",
    });
  });
});
