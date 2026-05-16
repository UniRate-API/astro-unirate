// Copy .astro components into a top-level /components dir so they can be
// imported directly via the package's "./components/*" exports map. tsc
// doesn't process .astro files; this is the simplest possible shipping path.

import { cp, mkdir, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

// .astro components live outside the tsc include set — copy them verbatim.
const compSrc = join(root, "src", "components");
const compDst = join(root, "components");
await mkdir(compDst, { recursive: true });
for (const entry of await readdir(compSrc, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".astro")) {
    await cp(join(compSrc, entry.name), join(compDst, entry.name));
    console.log(`copied ${entry.name}`);
  }
}

// The ambient `virtual:unirate` declaration is inlined in runtime/index.ts
// so it carries into the emitted .d.ts (tsc strips /// <reference path>
// directives). No extra copy step needed.
