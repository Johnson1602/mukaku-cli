import { Command } from "commander";
import { registerSearchCommand } from "./commands/search.js";

const program = new Command();

program
  .name("mukaku")
  .description("Search Mukaku movie and TV resources")
  .version("0.1.0");

registerSearchCommand(program);

program.parseAsync();
