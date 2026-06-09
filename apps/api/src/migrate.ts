import { createRuntime } from "./runtime.js";

const runtime = createRuntime();
console.log(`SQLite migrated: ${runtime.paths.sqlitePath}`);
runtime.database.close();

