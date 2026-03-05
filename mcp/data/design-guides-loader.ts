/**
 * Design Guide Loader — Auto-discovers .md guide files at startup.
 *
 * Reads all `.md` files from the `guides/` directory and builds a lookup map.
 * File names become topic slugs (e.g., `landing-page.md` → `"landing-page"`).
 *
 * To add a new guide, just drop a `.md` file into `mcp/data/guides/`.
 * No code changes required — it auto-appears in the enum and tool description.
 *
 * @module data/design-guides-loader
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GUIDES_DIR = path.join(__dirname, "guides");

/** Auto-loaded map: topic slug → markdown content */
export const DESIGN_GUIDES: Record<string, string> = {};

for (const file of fs.readdirSync(GUIDES_DIR)) {
    if (!file.endsWith(".md")) continue;
    const topic = file.replace(/\.md$/, "");
    DESIGN_GUIDES[topic] = fs.readFileSync(path.join(GUIDES_DIR, file), "utf-8");
}
