# Blog posts

## Adding a new post

1. **Copy the template**
   ```bash
   cp blog-posts/TEMPLATE.html blog-posts/blog024.html
   ```
   Use the next number in sequence (`blog024`, `blog025`, …). Lower numbers = older posts.

2. **Edit the meta tags** in `<head>` (the build script reads these):
   - `wa:blog-title` — post title
   - `wa:blog-date` — ISO date (`2026-05-01`) for sorting
   - `wa:blog-thumb` — optional card image, e.g. `blog-posts/images/blog024/thumb.png`

3. **Update the visible title and date line** to match (title in `<h1>`, date in the “Back to blog” line).

4. **Write your content** inside `<article class="blog-post-body page-prose">`.

5. **Add images** under `blog-posts/images/blog024/` and reference them as:
   ```html
   <img src="../blog-posts/images/blog024/01.png" alt="…" />
   ```

6. **Link to other posts** with relative filenames only: `href="blog022.html"`.

7. **Rebuild the indexes** (see below), then commit and push.

## Automatic index updates

After you add or change a `blogNNN.html` file, run:

```bash
node scripts/build-blog-index.mjs
```

This regenerates:

- `blog.html` — all posts, newest first
- `index.html` — 3 latest posts on the homepage
- `blog-posts/manifest.json` — machine-readable list

If you push to GitHub, the **Build blog index** workflow runs this for you and commits the updated files (no manual step needed).

## Importing from Squarespace (one-off)

To re-pull posts from westlakeanalytics.com:

```bash
node scripts/import-blog-posts.mjs
```

Then use `build-blog-index.mjs` for day-to-day updates.
