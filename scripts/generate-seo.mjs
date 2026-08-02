import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { games } from "../src/data/catalog.js";
import { catalogUpdatedAt } from "../src/data/generated-catalog.js";
import archivedGames from "../data/game-archives.json" with { type: "json" };

const origin = "https://chukogame.vercel.app";
const distDir = join(process.cwd(), "dist");
const template = await readFile(join(distDir, "index.html"), "utf8");
const updated = new Date(catalogUpdatedAt).toISOString().slice(0, 10);
const platformFor = (game) => game?.platform || "Nintendo Switch";
const supportedPlatforms = "Nintendo Switch 2 / Nintendo Switch";

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const descriptionFor = (game) => game
  ? `${game.title}の中古販売価格と買取価格の目安を比較。${platformFor(game)}国内パッケージ版の実質プレイ費用を確認できます。`
  : "Nintendo Switch 2 / Nintendo Switch中古ソフトの買う目安と売る目安を比較。実質プレイ費用が分かる中古ゲーム価格比較サイトです。";

function metadata({ path, title, description, schema, image }) {
  const canonical = `${origin}${path}`;
  const socialImage = image ? `${origin}${image}` : `${origin}/package-images/mariokart8dx.png`;
  return [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:locale" content="ja_JP" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="中古ゲーム価格ナビ" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${socialImage}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`,
  ].join("\n    ");
}

function staticGameContent(game) {
  const purchases = [...(game.purchase || [])].sort((a, b) => a.price - b.price).slice(0, 3);
  const sales = [...(game.sale || [])].sort((a, b) => b.price - a.price).slice(0, 3);
  const rows = (items, label) => items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item.name)}: ${Number(item.price).toLocaleString("ja-JP")}円</li>`).join("")}</ul>` : `<p>現在確認できる${label}価格がありません。</p>`;
  return `<article><h1>${escapeHtml(game.title)}の中古価格・買取価格比較</h1><p>${platformFor(game)} 国内パッケージ版 / JAN: ${escapeHtml(game.jan)}</p><h2>買う先を比較する</h2>${rows(purchases, "販売")}<h2>売る先を比較する</h2>${rows(sales, "買取")}<h2>価格の掲載基準</h2><p>買う目安は送料込み・通常中古品として確認できる販売価格です。売る目安は確認できる参考買取価格です。相場推移は複数販売先の販売価格の中央値を基準にします。</p></article>`;
}
function pageHtml({ path, title, description, schema, image, body = "" }) {
  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace("<!-- seo:head -->", metadata({ path, title, description, schema, image }))
    .replace("<div id=\"root\"></div>", `<div id=\"root\">${body}</div>`);
}

const siteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "中古ゲーム価格ナビ",
  url: origin,
  inLanguage: "ja-JP",
  potentialAction: {
    "@type": "SearchAction",
    target: `${origin}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const archivePages = archivedGames.filter((game) => !games.some((active) => active.id === game.id)).map((game) => ({
  path: `/games/${game.id}`, title: `${game.title} | 更新対象外アーカイブ | 中古ゲーム価格ナビ`,
  description: `${game.title}は現在、日次価格更新の対象外です。最終更新対象日: ${game.archivedAt}。`,
  schema: { "@context": "https://schema.org", "@type": "VideoGame", name: game.title, sku: game.jan, gamePlatform: "Nintendo Switch", inLanguage: "ja-JP" },
}));
const pages = [
  { path: "/", title: "中古ゲーム価格ナビ | Switch 2 / Switch中古ソフトの価格比較", description: descriptionFor(), schema: siteSchema },
  { path: "/ranking", title: "実質プレイ費用が安いSwitch 2 / Switchソフトランキング | 中古ゲーム価格ナビ", description: `実質プレイ費用が安い${supportedPlatforms}中古ソフトのランキング。買う目安と売る目安の差額を比較できます。`, schema: { "@context": "https://schema.org", "@type": "CollectionPage", name: "実質プレイ費用が安いSwitch 2 / Switchソフトランキング", url: `${origin}/ranking`, inLanguage: "ja-JP" } },
  { path: "/genres", title: "ジャンルから探す | 中古ゲーム価格ナビ", description: `${supportedPlatforms}中古ソフトをジャンル別に探し、中古価格を比較できます。`, schema: { "@context": "https://schema.org", "@type": "CollectionPage", name: "ジャンルから探す", url: `${origin}/genres`, inLanguage: "ja-JP" } },
  ...games.map((game) => ({
    path: `/games/${game.id}`,
    title: `${game.title}の中古価格・買取価格比較 | 中古ゲーム価格ナビ`,
    description: descriptionFor(game),
    body: staticGameContent(game),
    image: `/package-images/${game.id === "zelda-totk" || game.id === "minecraft" || game.id === "momotetsu" || game.id === "smash" ? `${game.id}${game.id === "minecraft" || game.id === "momotetsu" || game.id === "smash" ? ".jpg" : ".jpg"}` : `${game.id}.png`}`,
    schema: { "@context": "https://schema.org", "@type": "VideoGame", name: game.title, sku: game.jan, gamePlatform: platformFor(game), genre: game.genre, inLanguage: "ja-JP" },
  })),
];

for (const page of [...pages, ...archivePages]) {
  const relative = page.path === "/" ? "index.html" : join(page.path.slice(1), "index.html");
  const output = join(distDir, relative);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, pageHtml(page), "utf8");
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((page) => `  <url><loc>${origin}${page.path}</loc><lastmod>${updated}</lastmod><changefreq>daily</changefreq><priority>${page.path === "/" ? "1.0" : page.path === "/ranking" ? "0.9" : "0.8"}</priority></url>`).join("\n")}\n</urlset>\n`;
await writeFile(join(distDir, "sitemap.xml"), sitemap, "utf8");
