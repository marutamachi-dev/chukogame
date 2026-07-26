import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { classifyGameGenre, OTHER_GENRE } from "../src/lib/genre-classifier.js";

const masterPath = resolve(import.meta.dirname, "../src/data/game-master.json");
const games = JSON.parse(await readFile(masterPath, "utf8"));
const updated = games.map((game) => ({ ...game, genre: classifyGameGenre(game.title) }));
const otherTitles = updated.filter((game) => game.genre === OTHER_GENRE).map((game) => game.title);

await writeFile(masterPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
console.log(`[genre] total=${updated.length} other=${otherTitles.length}`);
console.log(`[genre] other candidates=${JSON.stringify(otherTitles)}`);
