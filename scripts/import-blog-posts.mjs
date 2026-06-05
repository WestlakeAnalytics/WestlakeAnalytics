import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "blog-posts");
const IMAGES_DIR = path.join(POSTS_DIR, "images");
const BASE = "https://www.westlakeanalytics.com";

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function parseArchivePosts(html) {
  const articles = [...html.matchAll(/<article class="blog-basic-grid--container entry blog-item">([\s\S]*?)<\/article>/g)];
  return articles
    .map((m) => {
      const block = m[1];
      const href = block.match(/href="(\/blog\/[^"?]+)"/)?.[1];
      const title = block
        .match(/<h1 class="blog-title">[\s\S]*?<a[^>]*>\s*([\s\S]*?)\s*<\/a>/)?.[1]
        ?.replace(/\s+/g, " ")
        .trim();
      const dateStr = block.match(/<time class="blog-date"[^>]*>([^<]+)<\/time>/)?.[1];
      const thumb = block.match(/data-src="([^"]+)"/)?.[1] || block.match(/\bsrc="([^"]+)"/)?.[1];
      return { href, title, dateStr, thumb };
    })
    .filter((p) => p.href && p.title);
}

function parseUkDate(dateStr) {
  const [d, m, y] = dateStr.split("/").map(Number);
  return new Date(y, m - 1, d);
}

async function getAllArchivePosts() {
  let url = `${BASE}/blog`;
  const all = [];
  for (let page = 0; page < 20; page++) {
    const html = await fetchText(url);
    all.push(...parseArchivePosts(html));
    const next = html.match(/href="(\/blog\?offset=[^"]+)" rel="next"/);
    if (!next) break;
    url = `${BASE}${next[1]}`;
  }
  const byHref = new Map();
  for (const post of all) byHref.set(post.href, post);
  return [...byHref.values()].sort((a, b) => parseUkDate(a.dateStr) - parseUkDate(b.dateStr));
}

function extractPostBody(html) {
  const title =
    html.match(/<h1 class="entry-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, "").trim() ||
    html.match(/<meta property="og:title" content="([^"]+)"/)?.[1]?.replace(/\s*—\s*Westlake Analytics\s*$/, "").trim();

  const startIdx = html.indexOf('class="blog-item-content e-content"');
  if (startIdx === -1) return { title, bodyHtml: "" };

  const slice = html.slice(startIdx);
  const endIdx = (() => {
    const markers = ['class="blog-item-injection"', 'id="itemPagination"', '<footer class="sections"'];
    let end = slice.length;
    for (const marker of markers) {
      const i = slice.indexOf(marker);
      if (i !== -1 && i < end) end = i;
    }
    return end;
  })();

  const chunk = slice.slice(0, endIdx);
  const elements = [];

  for (const m of chunk.matchAll(/<div class="sqs-html-content" data-sqsp-text-block-content>([\s\S]*?)<\/div>/g)) {
    const content = m[1].trim();
    if (!content || /Chris Westlake \| Edinburgh, UK/.test(content)) continue;
    elements.push({ type: "html", index: m.index, content });
  }

  const seenImages = new Set();
  for (const m of chunk.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const src = tag.match(/\bdata-src="([^"]+)"/)?.[1] || tag.match(/\bsrc="([^"]+)"/)?.[1];
    if (!src || src.includes("Frame+18.png") || seenImages.has(src)) continue;
    seenImages.add(src);
    const alt = tag.match(/\balt="([^"]*)"/)?.[1] || "";
    const width = tag.match(/\bwidth="(\d+)"/)?.[1] || "";
    const height = tag.match(/\bheight="(\d+)"/)?.[1] || "";
    elements.push({ type: "img", index: m.index, src, alt, width, height });
  }

  elements.sort((a, b) => a.index - b.index);

  const bodyHtml = elements
    .map((el) => {
      if (el.type === "html") return el.content;
      const attrs = [
        `src="${el.src}"`,
        el.alt ? `alt="${el.alt.replace(/"/g, "&quot;")}"` : 'alt=""',
        el.width ? `width="${el.width}"` : "",
        el.height ? `height="${el.height}"` : "",
        'loading="lazy"',
        'decoding="async"',
      ]
        .filter(Boolean)
        .join(" ");
      return `<figure class="blog-post-figure"><img ${attrs} /></figure>`;
    })
    .join("\n");

  return { title, bodyHtml };
}

function slugFromHref(href) {
  return href.replace(/^\/blog\//, "");
}

async function downloadImage(url, destPath) {
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  const cleanUrl = url.startsWith("//") ? `https:${url}` : url.split("?")[0];
  const res = await fetch(cleanUrl);
  if (!res.ok) throw new Error(`Image HTTP ${res.status}: ${cleanUrl}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buf);
}

function extFromUrl(url) {
  try {
    const ext = path.extname(new URL(url.split("?")[0]).pathname);
    return ext || ".png";
  } catch {
    return ".png";
  }
}

async function localizeImages(html, postId) {
  const seen = new Map();
  let index = 0;

  const replaced = html.replace(/https?:\/\/[^"'>\s]+/g, (url) => {
    if (!url.includes("squarespace-cdn.com") && !url.includes("static1.squarespace.com")) return url;
    const clean = url.split("?")[0];
    if (!seen.has(clean)) {
      index += 1;
      const fileName = `${String(index).padStart(2, "0")}${extFromUrl(clean)}`;
      seen.set(clean, `../blog-posts/images/${postId}/${fileName}`);
    }
    return seen.get(clean);
  });

  for (const [remote, localRel] of seen.entries()) {
    const dest = path.join(ROOT, localRel.replace(/^\.\.\//, "").split("/").join(path.sep));
    try {
      await downloadImage(remote, dest);
    } catch (err) {
      console.warn("  image failed:", remote, err.message);
    }
  }

  return replaced;
}

function fixLinks(html, slugToId) {
  return html
    .replace(/href="https:\/\/www\.westlakeanalytics\.com\/blog\/([^"?#]+)"/g, (_, slug) => {
      const id = slugToId.get(slug);
      return id ? `href="${id}.html"` : `href="https://www.westlakeanalytics.com/blog/${slug}"`;
    })
    .replace(/href="\/blog\/([^"?#]+)"/g, (_, slug) => {
      const id = slugToId.get(slug);
      return id ? `href="${id}.html"` : `href="https://www.westlakeanalytics.com/blog/${slug}"`;
    })
    .replace(/href="\/([^"]+)"/g, 'href="https://www.westlakeanalytics.com/$1"');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPostHtml({ title, dateStr, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en-GB" class="page-sub">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} · Westlake Analytics</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&family=Poppins:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="../styles.css" />
  </head>
  <body class="page-sub">
    <header class="site-banner" id="site-banner" aria-label="Site">
      <div class="site-banner__inner">
        <div class="site-banner__center">
          <a class="logo-title" href="../index.html">
            <img class="logo-title__mark" src="../WestlakeAnalytics%20Logo.svg" alt="" width="48" height="48" decoding="async" draggable="false" aria-hidden="true" />
            <span class="logo-title__text">Westlake Analytics</span>
          </a>
        </div>
        <nav class="site-banner__nav" aria-label="Primary">
          <ul>
            <li><a class="nav-pill nav-pill--current" href="../blog.html" aria-current="page">Blog</a></li>
            <li><a class="nav-pill" href="../viz-help.html">1-1 Viz Help</a></li>
            <li><a class="nav-pill" href="../about.html">About</a></li>
            <li><a class="nav-pill" href="../contact.html">Contact</a></li>
          </ul>
        </nav>
      </div>
    </header>
    <div class="page-shell">
      <main class="page-main" id="main">
        <div class="page-main__inner">
          <p class="blog-post-meta"><a href="../blog.html">← Back to blog</a> · ${escapeHtml(dateStr)}</p>
          <h1 class="section-display-title">${escapeHtml(title)}</h1>
          <article class="blog-post-body page-prose">${bodyHtml}</article>
        </div>
      </main>
      <footer class="site-footer" id="site-footer">
        <div class="site-footer__inner">
          <a class="site-footer__logo" href="../index.html" aria-label="Westlake Analytics home">
            <img class="site-footer__logo-mark" src="../WestlakeAnalytics%20Logo.svg" alt="" width="112" height="112" decoding="async" draggable="false" aria-hidden="true" />
          </a>
          <p class="site-footer__text">Chris Westlake | Edinburgh, UK</p>
        </div>
      </footer>
    </div>
  </body>
</html>
`;
}

function buildBlogIndexHtml(postsNewestFirst) {
  const cards = postsNewestFirst
    .map((post) => {
      const thumb = post.thumbLocal || post.thumb || "";
      return `              <article class="blog-highlight-card" role="listitem">
                <a class="blog-highlight-card__media" href="blog-posts/${post.id}.html" tabindex="-1" aria-hidden="true">
                  <img src="${thumb}" width="750" height="750" alt="" loading="lazy" decoding="async" />
                </a>
                <h2 class="blog-highlight-card__title">
                  <a href="blog-posts/${post.id}.html">${escapeHtml(post.title)}</a>
                </h2>
                <a class="blog-highlight-card__cta" href="blog-posts/${post.id}.html">Read more</a>
              </article>`;
    })
    .join("\n");

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

async function main() {
  await fs.mkdir(POSTS_DIR, { recursive: true });
  await fs.mkdir(IMAGES_DIR, { recursive: true });

  console.log("Fetching blog archive…");
  const archivePosts = await getAllArchivePosts();
  console.log(`Found ${archivePosts.length} posts`);

  const rawPosts = [];
  for (const post of archivePosts) {
    const url = `${BASE}${post.href}`;
    console.log(`Fetching ${post.title}…`);
    const html = await fetchText(url);
    const extracted = extractPostBody(html);
    rawPosts.push({
      slug: slugFromHref(post.href),
      title: extracted.title || post.title,
      dateStr: post.dateStr,
      thumb: post.thumb,
      sourceUrl: url,
      bodyHtml: extracted.bodyHtml,
    });
  }

  const slugToId = new Map();
  rawPosts.forEach((post, i) => {
    slugToId.set(post.slug, `blog${String(i + 1).padStart(3, "0")}`);
  });

  const manifest = [];

  for (let i = 0; i < rawPosts.length; i++) {
    const post = rawPosts[i];
    const id = slugToId.get(post.slug);
    console.log(`Writing ${id} — ${post.title}`);

    let bodyHtml = await localizeImages(post.bodyHtml, id);
    bodyHtml = fixLinks(bodyHtml, slugToId);

    await fs.writeFile(path.join(POSTS_DIR, `${id}.html`), buildPostHtml({ title: post.title, dateStr: post.dateStr, bodyHtml }), "utf8");

    let thumbLocal = "";
    if (post.thumb) {
      const thumbFile = `thumb${extFromUrl(post.thumb)}`;
      thumbLocal = `blog-posts/images/${id}/${thumbFile}`;
      try {
        await downloadImage(post.thumb, path.join(POSTS_DIR, "images", id, thumbFile));
      } catch (err) {
        console.warn("  thumb failed:", err.message);
        thumbLocal = post.thumb;
      }
    }

    manifest.push({
      id,
      slug: post.slug,
      title: post.title,
      date: post.dateStr,
      sourceUrl: post.sourceUrl,
      file: `blog-posts/${id}.html`,
      thumbLocal,
    });
  }

  await fs.writeFile(path.join(POSTS_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  console.log("Running build-blog-index…");
  const { execSync } = await import("node:child_process");
  execSync("node scripts/build-blog-index.mjs", { cwd: ROOT, stdio: "inherit" });

  console.log(`Done. ${manifest.length} posts in blog-posts/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
