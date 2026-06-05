/**
 * Scans blog-posts/blog*.html and regenerates:
 *   - blog-posts/manifest.json
 *   - blog.html (full archive)
 *   - index.html homepage highlights (3 newest posts)
 *
 * Run after adding a post:  node scripts/build-blog-index.mjs
 * Or push to GitHub — the workflow runs this automatically.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "blog-posts");

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function metaContent(html, name) {
  const re = new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"`, "i");
  return html.match(re)?.[1]?.trim() || "";
}

function parseUkDate(dateStr) {
  const parts = dateStr.trim().split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

function parseIsoDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatUk(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function normalizeThumb(thumb, postId) {
  if (!thumb) return "";
  let t = thumb.replace(/^\.\.\//, "");
  if (t.startsWith("blog-posts/")) return t;
  if (t.startsWith("images/")) return `blog-posts/${t}`;
  return `blog-posts/images/${postId}/${path.basename(t)}`;
}

async function resolveThumb(postId, html) {
  const fromMeta = metaContent(html, "wa:blog-thumb");
  if (fromMeta) return normalizeThumb(fromMeta, postId);

  for (const ext of [".png", ".webp", ".jpg", ".jpeg", ".jfif", ".gif"]) {
    const filePath = path.join(POSTS_DIR, "images", postId, `thumb${ext}`);
    try {
      await fs.access(filePath);
      return `blog-posts/images/${postId}/thumb${ext}`;
    } catch {
      /* try next extension */
    }
  }

  const figure = html.match(/<figure class="blog-post-figure">\s*<img[^>]+src="([^"]+)"/)?.[1];
  if (figure) return normalizeThumb(figure, postId);

  return "";
}

async function parsePostFile(filePath) {
  const filename = path.basename(filePath);
  const id = filename.replace(/\.html$/, "");
  const html = await fs.readFile(filePath, "utf8");

  const title =
    metaContent(html, "wa:blog-title") ||
    html.match(/<h1 class="section-display-title">([\s\S]*?)<\/h1>/)?.[1]?.trim() ||
    html.match(/<title>([^·<]+)/)?.[1]?.trim() ||
    id;

  const dateFromMeta = parseIsoDate(metaContent(html, "wa:blog-date"));
  const dateFromLine = parseUkDate(
    html.match(/class="blog-post-meta"[^>]*>[\s\S]*?·\s*([^<]+)/)?.[1] || "",
  );
  const date = dateFromMeta || dateFromLine || new Date(0);

  const dateDisplay =
    metaContent(html, "wa:blog-date-display") ||
    html.match(/class="blog-post-meta"[^>]*>[\s\S]*?·\s*([^<]+)/)?.[1]?.trim() ||
    formatUk(date);

  const thumb = await resolveThumb(id, html);

  return {
    id,
    title,
    date: date.toISOString(),
    dateDisplay,
    file: `blog-posts/${filename}`,
    thumb,
  };
}

async function loadPosts() {
  const entries = await fs.readdir(POSTS_DIR);
  const files = entries
    .filter((name) => /^blog\d+\.html$/i.test(name))
    .map((name) => path.join(POSTS_DIR, name));

  const posts = await Promise.all(files.map(parsePostFile));
  posts.sort((a, b) => new Date(a.date) - new Date(b.date));
  return posts;
}

function buildHighlightCard(post) {
  const href = post.file;
  const thumb = post.thumb || "";
  return `                  <article class="blog-highlight-card" role="listitem">
                    <a
                      class="blog-highlight-card__media"
                      href="${href}"
                      tabindex="-1"
                      aria-hidden="true"
                    >
                      <img
                        src="${thumb}"
                        width="750"
                        height="750"
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    </a>
                    <h2 class="blog-highlight-card__title">
                      <a href="${href}">${escapeHtml(post.title)}</a>
                    </h2>
                    <a class="blog-highlight-card__cta" href="${href}">Read more</a>
                  </article>`;
}

function buildBlogIndexHtml(postsNewestFirst) {
  const cards = postsNewestFirst.map(buildHighlightCard).join("\n");

  return `<!DOCTYPE html>
<html lang="en-GB" class="page-sub">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Blog · Westlake Analytics</title>
    <meta name="description" content="Writing from Westlake Analytics — Tableau, data visualisation craft, and storytelling." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&family=Poppins:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body class="page-sub">
    <header class="site-banner" id="site-banner" aria-label="Site">
      <div class="site-banner__inner">
        <div class="site-banner__center">
          <a class="logo-title" href="index.html">
            <img class="logo-title__mark" src="WestlakeAnalytics%20Logo.svg" alt="" width="48" height="48" decoding="async" draggable="false" aria-hidden="true" />
            <span class="logo-title__text">Westlake Analytics</span>
          </a>
        </div>
        <nav class="site-banner__nav" aria-label="Primary">
          <ul>
            <li><a class="nav-pill nav-pill--current" href="blog.html" aria-current="page">Blog</a></li>
            <li><a class="nav-pill" href="viz-help.html">1-1 Viz Help</a></li>
            <li><a class="nav-pill" href="about.html">About</a></li>
            <li><a class="nav-pill" href="contact.html">Contact</a></li>
          </ul>
        </nav>
      </div>
    </header>
    <div class="page-shell">
      <main class="page-main" id="main">
        <div class="page-main__inner">
          <h1 class="section-display-title">Blog</h1>
          <div class="blog-highlights-layout">
            <div class="blog-highlights" role="list">
${cards}
            </div>
          </div>
        </div>
      </main>
      <footer class="site-footer" id="site-footer">
        <div class="site-footer__inner">
          <a class="site-footer__logo" href="index.html" aria-label="Westlake Analytics home">
            <img class="site-footer__logo-mark" src="WestlakeAnalytics%20Logo.svg" alt="" width="112" height="112" decoding="async" draggable="false" aria-hidden="true" />
          </a>
          <p class="site-footer__text">Chris Westlake | Edinburgh, UK</p>
        </div>
      </footer>
    </div>
  </body>
</html>
`;
}

async function patchIndexHighlights(posts) {
  const indexPath = path.join(ROOT, "index.html");
  let html = await fs.readFile(indexPath, "utf8");

  const newest = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
  const cards = newest.map(buildHighlightCard).join("\n");

  const start = "<!-- BLOG-HIGHLIGHTS:START -->";
  const end = "<!-- BLOG-HIGHLIGHTS:END -->";
  const startIdx = html.indexOf(start);
  const endIdx = html.indexOf(end);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error("index.html is missing BLOG-HIGHLIGHTS markers — run setup or add them manually.");
  }

  const before = html.slice(0, startIdx + start.length);
  const after = html.slice(endIdx);
  html = `${before}\n${cards}\n                ${after}`;

  await fs.writeFile(indexPath, html, "utf8");
}

async function main() {
  const posts = await loadPosts();
  if (!posts.length) {
    console.warn("No blog posts found (blog-posts/blogNNN.html).");
    return;
  }

  const newestFirst = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));

  await fs.writeFile(path.join(POSTS_DIR, "manifest.json"), JSON.stringify(posts, null, 2), "utf8");
  await fs.writeFile(path.join(ROOT, "blog.html"), buildBlogIndexHtml(newestFirst), "utf8");
  await patchIndexHighlights(posts);

  console.log(`Built index for ${posts.length} posts.`);
  console.log(`  Latest: ${newestFirst.slice(0, 3).map((p) => p.id).join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
