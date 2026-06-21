/* boomzino.js — shared DEMO controllers for the Boomzino prototype mockups.
   No real prize logic; drives only the visual spin + win celebration. */
(function (global) {
  function spinWheel(opts) {
    var rotor = document.querySelector(opts.rotor);
    var button = document.querySelector(opts.button);
    if (!rotor || !button) return;
    var segmentCount = opts.segmentCount || 8;
    var winningIndex = opts.winningIndex != null ? opts.winningIndex : 7;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var durationMs = reduce ? 0 : 4500;
    var spinning = false;
    button.addEventListener("click", function () {
      if (spinning) return;
      spinning = true;
      button.setAttribute("disabled", "true");
      var seg = 360 / segmentCount;
      var target = 360 * (reduce ? 0 : 6) + (360 - (winningIndex * seg + seg / 2));
      var settled = false;
      function finish() {
        if (settled) return;
        settled = true;
        if (typeof opts.onWin === "function") opts.onWin();
      }
      rotor.style.transition = reduce ? "none" : "transform " + durationMs + "ms cubic-bezier(0.16,1,0.3,1)";
      rotor.style.transform = "rotate(" + target + "deg)";
      rotor.addEventListener("transitionend", finish, { once: true });
      // Fallback: with reduced motion (or any browser that skips the transition)
      // `transitionend` never fires, so guarantee completion via a timer.
      setTimeout(finish, durationMs + 300);
    });
  }

  function celebrate(opts) {
    var burst = document.querySelector(opts.burst);
    if (burst) burst.hidden = false;
    var layer = document.querySelector(opts.confettiLayer || opts.burst);
    if (!layer) return;
    var colors = ["#F5C24B", "#FFD56A", "#5BE36A", "#8BFF5A", "#E2483D", "#F4F1E8"];
    var count = opts.count || 80;
    for (var i = 0; i < count; i++) {
      var bit = document.createElement("span");
      bit.className = "confetti-bit";
      bit.style.left = (Math.random() * 100) + "%";
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = (Math.random() * 0.6) + "s";
      bit.style.animationDuration = (1.6 + Math.random() * 1.4) + "s";
      layer.appendChild(bit);
    }
  }

  function labelWheel(opts) {
    var rotor = document.querySelector(opts.rotor);
    if (!rotor) return;
    var labels = opts.labels || [];
    var radius = opts.radius || 80;
    var n = labels.length, seg = 360 / n;
    for (var i = 0; i < n; i++) {
      var angle = i * seg + seg / 2; // segment centre, clockwise from top
      var el = document.createElement("span");
      el.className = "seg-label";
      el.textContent = labels[i];
      el.style.transform = "translate(-50%,-50%) rotate(" + angle + "deg) translateY(-" + radius + "px)";
      rotor.appendChild(el);
    }
  }

  global.Boomzino = { spinWheel: spinWheel, celebrate: celebrate, labelWheel: labelWheel };
})(window);
