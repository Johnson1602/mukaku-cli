import { Command } from "commander";
import packageJson from "../package.json" with { type: "json" };
import { registerSearchCommand } from "./commands/search.js";
import { registerResourcesCommand } from "./commands/resources.js";

const program = new Command();

program
  .name("mukaku")
  .description("Search Mukaku movie and TV resources")
  .version(packageJson.version);

registerSearchCommand(program);
registerResourcesCommand(program);

program.parseAsync();
