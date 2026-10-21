// Builds the static site into _site/.
//   node scripts/build.mjs
// No dependencies. Page text lives in src/pages/*.html, photos in data/photos.json,
// and the shared header/footer in src/layout.html.

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "_site");
const SITE_URL = "https://www.aeroani.com/";
rmSync(OUT, { recursive: true, force: true });

const data = JSON.parse(readFileSync(join(ROOT, "data/photos.json"), "utf8"));
const layout = readFileSync(join(ROOT, "src/layout.html"), "utf8");
const locations = data.locations;
const bySlug = Object.fromEntries(locations.map((l) => [l.slug, l]));

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------- image URLs ----------
// Before the photos are copied into images/, they load from the Squarespace CDN.
// After the "Copy photos into repo" workflow runs, selfHosted is true and they load locally.
function imgUrl(loc, path, size, root) {
  const file = path.split("/").pop().replace(/\.jpe?g$/i, "");
  if (data.selfHosted) {
    return `${root}images/${loc.slug}/${file}${size === "thumb" ? "-thumb" : ""}.jpg`;
  }
  return `${data.cdnPrefix}${path}?format=${size === "thumb" ? "750w" : "2500w"}`;
}
const absUrl = (u) => (u.startsWith("http") ? u : SITE_URL + u.replace(/^(\.\.\/)+/, ""));
const pick = (ref) => {
  const loc = bySlug[ref.location];
  return { loc, path: loc.photos[ref.photo ?? 0] };
};
const alt = (loc, n) => `${loc.name} aviation photograph ${n + 1} by Ani Kumar`;

// ---------- shared pieces ----------
const NAV = [
  ["Photography", "photography/"],
  ["Engineering", "engineering/"],
  ["About", "about/"],
  ["Contact", "contact/"],
];

function render({ title, description, content, root, current, ogImage }) {
  const nav = NAV.map(
    ([label, href]) =>
      `        <a href="${root}${href}"${current === href ? ' aria-current="page"' : ""}>${label}</a>`
  ).join("\n");
  const hero = pick(data.hero);
  return layout
    .replaceAll("{{title}}", esc(title))
    .replaceAll("{{description}}", esc(description))
    .replaceAll("{{ogImage}}", esc(absUrl(ogImage || imgUrl(hero.loc, hero.path, "full", ""))))
    .replaceAll("{{nav}}", nav)
    .replaceAll("{{content}}", content)
    .replaceAll("{{year}}", String(new Date().getFullYear()))
    .replaceAll("{{root}}", root);
}

function write(relPath, html) {
  const file = join(OUT, relPath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

function locationCards(root) {
  const cards = locations
    .map((loc) => {
      const cover = loc.photos[loc.cover ?? 0];
      const n = loc.photos.length;
      return `      <a class="loc-card" href="${root}photography/${loc.slug}/">
        <img src="${imgUrl(loc, cover, "thumb", root)}" alt="${esc(alt(loc, loc.cover ?? 0))}" loading="lazy">
        <div class="meta">
          <h3>${esc(loc.name)}</h3>
          <div class="sub">${esc(loc.region)} · ${n} photo${n === 1 ? "" : "s"}</div>
        </div>
      </a>`;
    })
    .join("\n");
  return `<div class="loc-grid">\n${cards}\n    </div>`;
}

function featuredGrid(root) {
  const cells = data.featured
    .map((ref) => {
      const { loc, path } = pick(ref);
      return `      <a class="loc-card" href="${root}photography/${loc.slug}/" style="aspect-ratio:1">
        <img src="${imgUrl(loc, path, "thumb", root)}" alt="${esc(alt(loc, ref.photo ?? 0))}" loading="lazy">
        <div class="meta"><div class="sub">${esc(loc.name)}</div></div>
      </a>`;
    })
    .join("\n");
  return `<div class="loc-grid">\n${cells}\n    </div>`;
}

// ---------- hand-written pages ----------
// Each file in src/pages starts with a comment holding its title and description:
// <!--
// title: About — AeroAni
// description: ...
// -->
const PAGES = [
  ["home.html", "index.html", "", ""],
  ["about.html", "about/index.html", "../", "about/"],
  ["engineering.html", "engineering/index.html", "../", "engineering/"],
  ["contact.html", "contact/index.html", "../", "contact/"],
];

for (const [src, out, root, current] of PAGES) {
  let body = readFileSync(join(ROOT, "src/pages", src), "utf8");
  const meta = {};
  body = body.replace(/^<!--([\s\S]*?)-->\s*/, (_, block) => {
    for (const line of block.split("\n")) {
      const m = line.match(/^\s*(\w+):\s*(.+)$/);
      if (m) meta[m[1]] = m[2].trim();
    }
    return "";
  });
  const hero = pick(data.hero);
  body = body
    .replaceAll("{{heroImage}}", imgUrl(hero.loc, hero.path, "full", root))
    .replaceAll("{{locationCards}}", locationCards(root))
    .replaceAll("{{featured}}", featuredGrid(root));
  write(out, render({ title: meta.title, description: meta.description, content: body, root, current }));
}

// ---------- photography index ----------
{
  const root = "../";
  const total = locations.reduce((s, l) => s + l.photos.length, 0);
  const content = `    <section class="wrap page-head">
      <h1 class="page-title">Photography</h1>
      <p class="page-sub">I have been doing aviation photography for a few years now. I mainly planespot around the Bay Area airports, but occasionally take pictures on my trips to other states and countries. Follow my Instagram for my latest edits.</p>
      <div class="btn-row" style="margin-top:24px">
        <a class="btn primary" href="https://www.instagram.com/aero.ani/" target="_blank" rel="noopener">Follow on Instagram</a>
      </div>
      <p class="page-sub" style="font-size:15px">${total} photos · ${locations.length} locations</p>
    </section>
    <section class="wrap" style="padding-bottom: clamp(56px, 9vw, 112px)">
    ${locationCards(root)}
    </section>`;
  write(
    "photography/index.html",
    render({
      title: "Photography — AeroAni",
      description: `Aviation photography by Ani Kumar from ${locations.length} locations.`,
      content,
      root,
      current: "photography/",
    })
  );
}

// ---------- one page per location ----------
locations.forEach((loc, idx) => {
  const root = "../../";
  const prev = locations[(idx - 1 + locations.length) % locations.length];
  const next = locations[(idx + 1) % locations.length];
  const tiles = loc.photos
    .map(
      (p, n) => `      <button type="button" data-full="${imgUrl(loc, p, "full", root)}" aria-label="Open photo ${n + 1} of ${loc.photos.length}">
        <img src="${imgUrl(loc, p, "thumb", root)}" alt="${esc(alt(loc, n))}" loading="${n < 6 ? "eager" : "lazy"}">
      </button>`
    )
    .join("\n");
  const content = `    <section class="wrap page-head">
      <a class="back-link" href="${root}photography/">← All locations</a>
      <h1 class="page-title">${esc(loc.name)}</h1>
      <p class="page-sub">${esc(loc.region)} · ${loc.photos.length} photo${loc.photos.length === 1 ? "" : "s"}</p>
    </section>
    <section class="wrap">
      <div class="gallery">
${tiles}
      </div>
      <nav class="pager" aria-label="More locations">
        <a href="${root}photography/${prev.slug}/">← Previous<strong>${esc(prev.name)}</strong></a>
        <a class="next" href="${root}photography/${next.slug}/">Next →<strong>${esc(next.name)}</strong></a>
      </nav>
    </section>`;
  write(
    `photography/${loc.slug}/index.html`,
    render({
      title: `${loc.name} — AeroAni`,
      description: `Aviation photographs from ${loc.name} by Ani Kumar.`,
      content,
      root,
      current: "photography/",
      ogImage: imgUrl(loc, loc.photos[0], "full", root),
    })
  );
});

// ---------- 404 ----------
write(
  "404.html",
  render({
    title: "Not found — AeroAni",
    description: "Page not found.",
    root: "/",
    content: `    <section class="wrap page-head" style="min-height:50vh">
      <h1 class="page-title">Off the runway.</h1>
      <p class="page-sub">That page doesn't exist. <a href="/">Head back home</a> or browse the <a href="/photography/">photography</a>.</p>
    </section>`,
  })
);

// ---------- static files ----------
cpSync(join(ROOT, "assets"), join(OUT, "assets"), { recursive: true });
if (existsSync(join(ROOT, "images"))) cpSync(join(ROOT, "images"), join(OUT, "images"), { recursive: true });
for (const f of ["CNAME", ".nojekyll"]) {
  if (existsSync(join(ROOT, f))) cpSync(join(ROOT, f), join(OUT, f));
}

console.log(`Built ${PAGES.length + 2 + locations.length} pages into _site/ (photos: ${data.selfHosted ? "self-hosted" : "Squarespace CDN"})`);
