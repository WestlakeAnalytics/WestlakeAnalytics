(function () {
  var container = document.getElementById("hero-backdrop-logos");
  if (!container) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MIN_LOGOS = 3;
  var MAX_LOGOS = 8;
  var RAIN_DURATION_S = 7;
  var active = [];

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function desiredCount() {
    return randInt(MIN_LOGOS, MAX_LOGOS);
  }

  function randomSpin() {
    var start = rand(-22, 22);
    var end = start + rand(-32, 32);
    return { start: start, end: end };
  }

  function spawnLogo() {
    if (active.length >= MAX_LOGOS) return null;

    var el = document.createElement("span");
    el.className = "hero-backdrop__logo";
    el.setAttribute("aria-hidden", "true");
    el.style.left = rand(4, 96).toFixed(2) + "%";

    if (reduceMotion) {
      el.style.top = rand(12, 88).toFixed(2) + "%";
      container.appendChild(el);
      active.push(el);
      return el;
    }

    var spin = randomSpin();
    el.style.setProperty("--logo-spin-start", spin.start.toFixed(1) + "deg");
    el.style.setProperty("--logo-spin-end", spin.end.toFixed(1) + "deg");
    el.style.setProperty("--logo-rain-delay", rand(0, 4.5).toFixed(2) + "s");
    el.style.animationDuration = RAIN_DURATION_S + "s";
    el.addEventListener("animationend", onRainEnd);
    container.appendChild(el);
    active.push(el);
    return el;
  }

  function removeLogo(el) {
    var i = active.indexOf(el);
    if (i !== -1) active.splice(i, 1);
    el.removeEventListener("animationend", onRainEnd);
    el.remove();
  }

  function queueSpawn(delayMs) {
    window.setTimeout(function () {
      if (active.length >= MAX_LOGOS) return;
      spawnLogo();
    }, delayMs);
  }

  function topUpIfNeeded() {
    if (active.length >= MAX_LOGOS) return;
    var want = desiredCount();
    if (active.length < want) {
      queueSpawn(rand(450, 3800));
    }
  }

  function onRainEnd(ev) {
    if (ev.animationName !== "hero-backdrop-logo-rain") return;
    removeLogo(ev.currentTarget);
    queueSpawn(rand(350, 4200));
    if (active.length < MIN_LOGOS) {
      queueSpawn(rand(120, 1800));
    } else {
      topUpIfNeeded();
    }
  }

  function initRain() {
    if (reduceMotion) {
      var n = randInt(MIN_LOGOS, MAX_LOGOS);
      var i;
      for (i = 0; i < n; i++) {
        window.setTimeout(spawnLogo, rand(0, 2400));
      }
      return;
    }

    var initial = desiredCount();
    var j;
    for (j = 0; j < initial; j++) {
      queueSpawn(rand(0, 7500));
    }

    window.setInterval(function () {
      if (active.length < MIN_LOGOS) {
        queueSpawn(rand(80, 900));
      } else if (active.length < MAX_LOGOS) {
        topUpIfNeeded();
      }
    }, 2200);
  }

  initRain();
})();

(function () {
  var roller = document.getElementById("hero-roller");
  if (!roller) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var n = 4;
  var periodMs = 4200;
  var i = 0;
  var H = 0;

  function waitForHeight(then) {
    var first = roller.querySelector(".hero-rotating-title__roller-line");
    H = first ? first.offsetHeight : 0;
    if (H) {
      then();
      return;
    }
    window.requestAnimationFrame(function () {
      waitForHeight(then);
    });
  }

  function scheduleNext() {
    window.setTimeout(tick, periodMs);
  }

  function tick() {
    i += 1;
    roller.style.transform = "translateY(" + -i * H + "px)";
    if (i === n) {
      roller.addEventListener(
        "transitionend",
        function onEnd(e) {
          if (e.propertyName && e.propertyName.indexOf("transform") === -1) return;
          roller.style.transition = "none";
          roller.style.transform = "translateY(0)";
          i = 0;
          void roller.offsetWidth;
          roller.style.transition = "";
          scheduleNext();
        },
        { once: true },
      );
    } else {
      scheduleNext();
    }
  }

  waitForHeight(scheduleNext);
})();

(function () {
  var banner = document.getElementById("site-banner");
  if (!banner) return;

  var scrollRaf = false;

  function syncCompact() {
    scrollRaf = false;
    var vh = window.innerHeight || document.documentElement.clientHeight || 600;
    var compact = window.scrollY > vh * 0.5;
    document.documentElement.classList.toggle("site-banner--compact", compact);
    document.body.classList.toggle("site-banner--compact", compact);
  }

  function onScroll() {
    if (!scrollRaf) {
      scrollRaf = true;
      window.requestAnimationFrame(syncCompact);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", syncCompact, { passive: true });
  syncCompact();
})();

(function () {
  var section = document.getElementById("recognitions-section");
  if (!section) return;
  var stack = section.querySelector(".reveal-stack");
  if (!stack) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    stack.classList.add("is-inview");
    return;
  }

  var done = false;
  var obs = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (!done && e.isIntersecting) {
          done = true;
          stack.classList.add("is-inview");
          obs.disconnect();
        }
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
  );

  obs.observe(section);
})();

(function () {
  var section = document.getElementById("offerings-section");
  if (!section) return;
  var tablist = section.querySelector('[role="tablist"]');
  var tabs = section.querySelectorAll(".offerings-tab");
  var cards = section.querySelectorAll(".offerings-card");
  if (!tablist || !tabs.length || !cards.length) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var n = tabs.length;
  var activeIndex = 0;
  var animating = false;
  var wheelAcc = 0;

  function updateTabs() {
    tabs.forEach(function (tab, j) {
      var on = j === activeIndex;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function setAriaCards() {
    cards.forEach(function (card, j) {
      card.setAttribute("aria-hidden", j === activeIndex ? "false" : "true");
    });
  }

  function applyIdle(index) {
    activeIndex = Math.max(0, Math.min(n - 1, index));
    cards.forEach(function (card, j) {
      card.classList.remove("is-active", "is-below", "is-above", "is-leaving-up", "is-leaving-down");
      if (j === activeIndex) card.classList.add("is-active");
      else if (j < activeIndex) card.classList.add("is-above");
      else card.classList.add("is-below");
    });
    updateTabs();
    setAriaCards();
  }

  function pointerInSection(e) {
    var r = section.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }

  function goForward() {
    if (reduceMotion) {
      if (activeIndex < n - 1) applyIdle(activeIndex + 1);
      return activeIndex < n - 1;
    }
    if (animating || activeIndex >= n - 1) return false;
    animating = true;
    var cur = cards[activeIndex];
    var nxt = cards[activeIndex + 1];
    var finished = false;
    cur.classList.remove("is-active");
    cur.classList.add("is-leaving-up");
    nxt.classList.remove("is-below");
    nxt.classList.add("is-active");

    function cleanup() {
      if (finished) return;
      finished = true;
      cur.classList.remove("is-leaving-up");
      cur.classList.add("is-above");
      activeIndex += 1;
      updateTabs();
      setAriaCards();
      animating = false;
    }

    function onEnd(e) {
      if (e.propertyName !== "transform") return;
      nxt.removeEventListener("transitionend", onEnd);
      cleanup();
    }
    nxt.addEventListener("transitionend", onEnd);
    window.setTimeout(function () {
      nxt.removeEventListener("transitionend", onEnd);
      cleanup();
    }, 720);
    return true;
  }

  function goBackward() {
    if (reduceMotion) {
      if (activeIndex > 0) applyIdle(activeIndex - 1);
      return activeIndex > 0;
    }
    if (animating || activeIndex <= 0) return false;
    animating = true;
    var cur = cards[activeIndex];
    var prv = cards[activeIndex - 1];
    var finished = false;
    cur.classList.remove("is-active");
    cur.classList.add("is-leaving-down");
    prv.classList.remove("is-above");
    prv.classList.add("is-active");

    function cleanup() {
      if (finished) return;
      finished = true;
      cur.classList.remove("is-leaving-down");
      cur.classList.add("is-below");
      activeIndex -= 1;
      updateTabs();
      setAriaCards();
      animating = false;
    }

    function onEnd(e) {
      if (e.propertyName !== "transform") return;
      prv.removeEventListener("transitionend", onEnd);
      cleanup();
    }
    prv.addEventListener("transitionend", onEnd);
    window.setTimeout(function () {
      prv.removeEventListener("transitionend", onEnd);
      cleanup();
    }, 720);
    return true;
  }

  function goToIndex(target) {
    var t = parseInt(String(target), 10);
    if (isNaN(t) || t === activeIndex) return;
    t = Math.max(0, Math.min(n - 1, t));
    if (reduceMotion || Math.abs(t - activeIndex) > 1) {
      applyIdle(t);
      return;
    }
    if (t > activeIndex) goForward();
    else goBackward();
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var i = parseInt(tab.getAttribute("data-offering-index"), 10);
      if (!isNaN(i)) goToIndex(i);
    });
  });

  section.addEventListener(
    "wheel",
    function (e) {
      if (!pointerInSection(e)) {
        wheelAcc = 0;
        return;
      }
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;

      wheelAcc += e.deltaY;
      if (Math.abs(wheelAcc) < 52) return;

      if (wheelAcc > 0) {
        if (activeIndex < n - 1) {
          e.preventDefault();
          goForward();
        }
        wheelAcc = 0;
      } else {
        if (activeIndex > 0) {
          e.preventDefault();
          goBackward();
        }
        wheelAcc = 0;
      }
    },
    { passive: false },
  );

  tablist.addEventListener("keydown", function (e) {
    var focusIdx = -1;
    for (var k = 0; k < tabs.length; k++) {
      if (tabs[k] === document.activeElement) focusIdx = k;
    }
    if (focusIdx === -1) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goToIndex(focusIdx + 1);
      tabs[Math.min(n - 1, focusIdx + 1)].focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goToIndex(focusIdx - 1);
      tabs[Math.max(0, focusIdx - 1)].focus();
    }
  });

  applyIdle(0);
})();
