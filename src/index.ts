import { Command } from "commander";
import packageJson from "../package.json" with { type: "json" };
import { registerFeaturedCommand } from "./commands/featured.js";
import { registerSearchCommand } from "./commands/search.js";
import { registerResourcesCommand } from "./commands/resources.js";

const program = new Command();

program
  .name("mukaku")
  .description("Search Mukaku movie and TV resources")
  .version(packageJson.version);

registerSearchCommand(program);
registerFeaturedCommand(program);
registerResourcesCommand(program);

program.parseAsync();
