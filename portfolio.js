(function () {
  // Edit this list to change the portfolio. `url` is where a click takes you (opens in a new tab).
  // Blank hexagons fill the gaps automatically.
  var works = [
    {
      title: "Crown Paints",
      image: "Portfolio/Crown Paints.png",
      detail: "An interactive visual of Crown Paints colours",
      url: "https://westlakeanalytics.github.io/CrownPaints/",
    },
    {
      title: "The Road to London",
      image: "Portfolio/The Road to London.png",
      detail: "Tracking my training journey for the London Marathon",
      url: "https://public.tableau.com/app/profile/westlake.cjw/viz/MarathonTrainingViz/TheRoadtoLondon",
    },
    {
      title: "People of the Bible",
      image: "Portfolio/People of the Bible.png",
      detail: "Who is mentioned the most in each book of the Bible?",
      url: "https://public.tableau.com/app/profile/westlake.cjw/viz/PeopleoftheBible_17701322730040/PeopleoftheBible",
    },
    {
      title: "2024 | A Year in Review",
      image: "Portfolio/2024 in review.png",
      detail: "A visual recap of one of the craziest years of my life",
      url: "https://public.tableau.com/app/profile/westlake.cjw/viz/2024InReview/2024AYearinReview",
    },
    {
      title: "Love for Food, Hunger for Change",
      image: "Portfolio/Love for food.png",
      detail: "A passion project exploring food and global hunger",
      url: "https://public.tableau.com/app/profile/westlake.cjw/viz/LoveForFoodHungerForChange/LoveForFoodHungerForChange",
    },
    {
      title: "The IMDb Explorer",
      image: "Portfolio/IMDb Explorer.png",
      detail: "The dashboard that won Iron Viz 2024",
      url: "https://public.tableau.com/app/profile/westlake.cjw/viz/TheIMDbExplorer/TheIMDbExplorer",
    },
    {
      title: "2025 Six Nations | Too Close to Call",
      image: "Portfolio/Too close to call.png",
      detail: "The closest we come to a business dashboard",
      url: "https://public.tableau.com/app/profile/westlake.cjw/viz/2025SixNationsTooCloseToCall/TooCloseToCall",
    },
    {
      title: "Flavour of Scotland",
      image: "Portfolio/Whisky.png",
      detail: "Celebrating 150 visualisations on Tableau Public",
      url: "https://public.tableau.com/app/profile/westlake.cjw/viz/WhiskyViz/FlavourofScotland",
    },
    {
      title: "Corporate Calm, Parental Pandemonium",
      image: "Portfolio/Spotify.png",
      detail: "How becoming a parent changed my Spotify listening data",
      url: "https://public.tableau.com/app/profile/westlake.cjw/viz/Spotify_17709143957170/CorporateCalmParentalPandemonium",
    },
    {
      title: "Champions of the Champions League",
      image: "Portfolio/Champions League.png",
      detail: "Data art exploring the Champions of the Champions League",
      url: "https://public.tableau.com/app/profile/westlake.cjw/viz/ChampionsoftheChampionsLeague/ChampionsoftheChampionsLeague",
    },
    // To add more: { title, image, detail, url }. Use { placeholder: true } for a "Coming soon" tile.
  ];

  var grid = document.getElementById("hex-grid");
  if (!grid) return;

  var GAP_RATIO = 0.09; // gap between work tiles, as a fraction of tile width
  var tiles = works.map(function (work) {
    if (work.placeholder) {
      // Same hexagon and navy border as a real tile, but not a link and it doesn't flip.
      var ph = document.createElement("span");
      ph.className = "hex hex--placeholder";
      ph.setAttribute("role", "listitem");
      ph.setAttribute("aria-label", "Coming soon");
      var phFlip = document.createElement("span");
      phFlip.className = "hex__flip";
      var phFace = document.createElement("span");
      phFace.className = "hex__face hex__face--front";
      var phInner = document.createElement("span");
      phInner.className = "hex__placeholder";
      phInner.textContent = "Coming soon";
      phFace.appendChild(phInner);
      phFlip.appendChild(phFace);
      ph.appendChild(phFlip);
      grid.appendChild(ph);
      return ph;
    }

    var a = document.createElement("a");
    a.className = "hex";
    a.href = work.url;
    a.setAttribute("role", "listitem");
    a.setAttribute("aria-label", work.title);
    if (/^https?:/.test(work.url)) {
      a.target = "_blank";
      a.rel = "noopener";
    }

    var flip = document.createElement("span");
    flip.className = "hex__flip";

    var front = document.createElement("span");
    front.className = "hex__face hex__face--front";
    var img = document.createElement("img");
    img.src = work.image;
    img.alt = "";
    if (work.position) img.style.objectPosition = work.position;
    img.loading = "lazy";
    img.decoding = "async";
    front.appendChild(img);

    var back = document.createElement("span");
    back.className = "hex__face hex__face--back";
    var title = document.createElement("span");
    title.className = "hex__title";
    title.textContent = work.title;
    var detail = document.createElement("span");
    detail.className = "hex__detail";
    detail.textContent = work.detail;
    var cta = document.createElement("span");
    cta.className = "hex__cta";
    cta.textContent = "View work";
    back.append(title, detail, cta);

    flip.append(front, back);
    a.appendChild(flip);
    grid.appendChild(a);
    return a;
  });

  var blanks = [];
  var main = document.getElementById("main");
  var bg = document.createElement("div");
  bg.className = "hex-bg";
  bg.setAttribute("aria-hidden", "true");
  main.insertBefore(bg, main.firstChild);

  // Slot rows for the cluster of work tiles, widest row in the middle (a hexagon-shaped patch of honeycomb).
  var PROFILES = [
    [4],
    [3, 4],
    [2, 3, 2],
    [3, 4, 3],
    [2, 3, 2, 3],
    [2, 3, 4, 3, 2],
    [3, 4, 5, 4, 3],
    [4, 5, 6, 7, 6, 5, 4],
  ];

  // Layout: the work tiles form one tight honeycomb cluster, sized as large as fits the visible page.
  // Smaller, faint hexagons tile the whole page behind it.
  function layout() {
    var width = grid.clientWidth;
    var rect = grid.getBoundingClientRect();
    var pageW = main.clientWidth;

    // On narrow screens avoid 4-across (too small) by using a taller cluster, which scrolls instead.
    var profile = PROFILES.filter(function (p) {
      var capacity = p.reduce(function (a, b) {
        return a + b;
      });
      return capacity >= tiles.length && (pageW >= 600 || Math.max.apply(null, p) <= 3);
    })[0] || PROFILES[PROFILES.length - 1];
    var rowCount = profile.length;
    var maxPerRow = Math.max.apply(null, profile);

    // Space under the page title down to the bottom of the window.
    var availH = window.innerHeight - (rect.top + window.scrollY) - 16;
    // The gap between tiles scales with tile size, so every dimension is a multiple of the tile width and
    // we can solve directly for the largest width that fits both the page width and the visible height.
    var gapRatio = GAP_RATIO;
    var rowFactor = 1.1547 * (0.75 * (rowCount - 1) + 1) + 0.866 * gapRatio * (rowCount - 1);
    // Width is the content column, the same edges as the header's logo and nav pills.
    var fitW = width / (maxPerRow + gapRatio * (maxPerRow - 1));
    var fitH = (availH - 24) / rowFactor;
    var w = Math.max(Math.min(fitW, fitH), 90);
    var gap = w * gapRatio;
    var h = w * 1.1547;
    var step = w + gap;
    var rowStep = h * 0.75 + gap * 0.866;
    var clusterH = (rowCount - 1) * rowStep + h;

    // Small filler hexagons.
    var sw = Math.min(Math.max(w / 3.4, 34), 80);
    var sh = sw * 1.1547;
    var sGap = 4;
    var sStep = sw + sGap;
    var sRowStep = sh * 0.75 + sGap * 0.866;
    var pad = 12;
    var stageH = Math.max(availH, clusterH + 2 * pad);

    var cx = width / 2;
    // Sit the cluster at the top of the stage, just under the intro text, not centred in spare height.
    var cy = pad + clusterH / 2;

    blanks.forEach(function (b) {
      b.remove();
    });
    blanks = [];

    // Work slots: take the cells nearest the centre, then hand them out in reading order.
    var slots = [];
    profile.forEach(function (count, ri) {
      for (var k = 0; k < count; k++) {
        var sx = cx + (k - (count - 1) / 2) * step;
        var sy = cy + (ri - (rowCount - 1) / 2) * rowStep;
        slots.push({ x: sx, y: sy, d: Math.hypot(sx - cx, (sy - cy) * 1.15) });
      }
    });
    slots.sort(function (a, b) {
      return a.d - b.d;
    });
    slots = slots.slice(0, tiles.length).sort(function (a, b) {
      return Math.abs(a.y - b.y) > 1 ? a.y - b.y : a.x - b.x;
    });

    grid.style.setProperty("--hex-w", w + "px");
    grid.style.height = stageH + "px";
    tiles.forEach(function (tile, i) {
      tile.style.width = w + "px";
      tile.style.height = h + "px";
      tile.style.left = slots[i].x - w / 2 + "px";
      tile.style.top = slots[i].y - h / 2 + "px";
    });

    // Fillers cover the whole page: they live in a background layer behind the content and the work
    // tiles sit on top. Coordinates are relative to that layer (the page's main area).
    var mainRect = main.getBoundingClientRect();
    var bx = cx + (rect.left - mainRect.left);
    var firstCol = Math.floor(-bx / sStep) - 1;
    var lastCol = Math.ceil((mainRect.width - bx) / sStep) + 1;
    var rowsS = Math.ceil(mainRect.height / sRowStep) + 1;
    for (var r = 0; r <= rowsS; r++) {
      var yc = r * sRowStep;
      var shift = (r % 2) * (sStep / 2);
      for (var c = firstCol; c <= lastCol; c++) {
        var xc = bx + c * sStep + shift;
        if (xc + sw / 2 < 0 || xc - sw / 2 > mainRect.width) continue;
        var el = document.createElement("span");
        el.className = "hex hex--blank";
        el.setAttribute("aria-hidden", "true");
        // Deterministic pseudo-random strength so the pattern is stable across resizes.
        el.style.setProperty("--blank-alpha", (0.03 + ((((r * 7 + c) % 11) + 11) % 11) * 0.005).toFixed(3));
        el.appendChild(document.createElement("span")).className = "hex__face hex__face--blank";
        el.style.width = sw + "px";
        el.style.height = sh + "px";
        el.style.left = xc - sw / 2 + "px";
        el.style.top = yc - sh / 2 + "px";
        bg.appendChild(el);
        blanks.push(el);
      }
    }
  }

  layout();
  window.addEventListener("resize", layout);
  // The title and intro text shift once web fonts load, which moves the top of the grid.
  window.addEventListener("load", layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

  // Touch devices have no hover: first tap flips the tile, second tap follows the link.
  if (window.matchMedia("(hover: none)").matches) {
    tiles.forEach(function (tile) {
      if (tile.tagName !== "A") return;
      tile.addEventListener("click", function (ev) {
        if (!tile.classList.contains("is-flipped")) {
          ev.preventDefault();
          tiles.forEach(function (t) {
            t.classList.toggle("is-flipped", t === tile);
          });
        }
      });
    });
  }
})();
