import { Command } from "commander";
import {
  FEATURED_CATEGORIES,
  fetchRawFeaturedResponse,
  getFeaturedItems,
  type FeaturedCategory,
} from "../api/featured.js";
import { parsePositiveInteger } from "../options.js";
import { printSearchResults } from "../output.js";

interface FeaturedOptions {
  limit?: number;
  json?: boolean;
  raw?: boolean;
}

interface FeaturedCommandDefinition {
  category: FeaturedCategory;
  description: string;
}

const FEATURED_COMMANDS: FeaturedCommandDefinition[] = [
  {
    category: FEATURED_CATEGORIES.MOVIES,
    description: "List featured movies",
  },
  {
    category: FEATURED_CATEGORIES.TV,
    description: "List featured TV shows",
  },
  {
    category: FEATURED_CATEGORIES.RECENT,
    description: "List recently popular movies and TV shows",
  },
  {
    category: FEATURED_CATEGORIES.WEEKLY,
    description: "List weekly popular movies and TV shows",
  },
  {
    category: FEATURED_CATEGORIES.MONTHLY,
    description: "List monthly popular movies and TV shows",
  },
];

function assertValidRawOptions(options: FeaturedOptions): void {
  const rawModifiers = [
    options.json ? "--json" : undefined,
    options.limit ? "--limit" : undefined,
  ].filter(Boolean);

  if (options.raw && rawModifiers.length > 0) {
    throw new Error(`--raw cannot be combined with ${rawModifiers.join(", ")}`);
  }
}

async function runFeaturedCommand(
  category: FeaturedCategory,
  options: FeaturedOptions,
): Promise<void> {
  try {
    assertValidRawOptions(options);

    if (options.raw) {
      const rawResponse = await fetchRawFeaturedResponse(category);
      console.log(JSON.stringify(rawResponse, null, 2));
      return;
    }

    const response = await getFeaturedItems(category);
    const results = options.limit ? response.slice(0, options.limit) : response;

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    printSearchResults(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  }
}

export function registerFeaturedCommand(program: Command): void {
  const featuredCommand = program
    .command("featured")
    .description("List Mukaku homepage selections and popularity lists");

  for (const definition of FEATURED_COMMANDS) {
    featuredCommand
      .command(definition.category)
      .description(definition.description)
      .option(
        "--limit <number>",
        "maximum number of results to print",
        parsePositiveInteger,
      )
      .option("--json", "print normalized JSON")
      .option("--raw", "print raw Mukaku API response")
      .action((options: FeaturedOptions) =>
        runFeaturedCommand(definition.category, options),
      );
  }
}
