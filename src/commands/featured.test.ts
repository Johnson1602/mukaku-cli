import { Command } from "commander";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MukakuSearchItem } from "../types.js";
import { registerFeaturedCommand } from "./featured.js";

const apiMocks = vi.hoisted(() => ({
  FEATURED_CATEGORIES: {
    MOVIES: "movies",
    TV: "tv",
    RECENT: "recent",
    WEEKLY: "weekly",
    MONTHLY: "monthly",
  } as const,
  fetchRawFeaturedResponse: vi.fn(),
  getFeaturedItems: vi.fn(),
}));

vi.mock("../api/featured.js", () => apiMocks);

const featuredItems: MukakuSearchItem[] = [
  {
    title: "First",
    type: "movie",
    categories: [],
    definitions: [],
  },
  {
    title: "Second",
    type: "tv",
    categories: [],
    definitions: [],
  },
];

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

describe("registerFeaturedCommand", () => {
  it("returns the full normalized list when limit is omitted", async () => {
    apiMocks.getFeaturedItems.mockResolvedValue(featuredItems);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const program = new Command();
    registerFeaturedCommand(program);

    await program.parseAsync([
      "node",
      "mukaku",
      "featured",
      "weekly",
      "--json",
    ]);

    expect(apiMocks.getFeaturedItems).toHaveBeenCalledWith("weekly");
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(featuredItems, null, 2));
  });

  it("routes nested categories and applies limit to normalized JSON", async () => {
    apiMocks.getFeaturedItems.mockResolvedValue(featuredItems);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const program = new Command();
    registerFeaturedCommand(program);

    await program.parseAsync([
      "node",
      "mukaku",
      "featured",
      "recent",
      "--limit",
      "1",
      "--json",
    ]);

    expect(apiMocks.getFeaturedItems).toHaveBeenCalledWith("recent");
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify([featuredItems[0]], null, 2),
    );
  });

  it("rejects local limit with raw output", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const program = new Command();
    registerFeaturedCommand(program);

    await program.parseAsync([
      "node",
      "mukaku",
      "featured",
      "monthly",
      "--limit",
      "1",
      "--raw",
    ]);

    expect(apiMocks.fetchRawFeaturedResponse).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      "Error: --raw cannot be combined with --limit",
    );
    expect(process.exitCode).toBe(1);
  });

  it("prints the untouched raw response", async () => {
    const rawResponse = {
      success: true,
      data: {
        data: [],
      },
    };
    apiMocks.fetchRawFeaturedResponse.mockResolvedValue(rawResponse);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const program = new Command();
    registerFeaturedCommand(program);

    await program.parseAsync([
      "node",
      "mukaku",
      "featured",
      "movies",
      "--raw",
    ]);

    expect(apiMocks.fetchRawFeaturedResponse).toHaveBeenCalledWith("movies");
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(rawResponse, null, 2));
  });
});
