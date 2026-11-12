// Development Account card: copy buttons and "Use demo credentials". Fills the form only; it never submits or authenticates.
document.addEventListener("DOMContentLoaded", function () {
  var card = document.querySelector(".finix-dev");
  if (!card) return;
  var status = card.querySelector(".finix-dev-status");
  function say(text) { status.textContent = ""; setTimeout(function () { status.textContent = text; }, 30); }
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      try { document.execCommand("copy") ? resolve() : reject(); } catch (e) { reject(e); } finally { document.body.removeChild(t); }
    });
  }
  card.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      copy(btn.dataset.copy).then(function () {
        btn.classList.add("is-copied"); say(btn.dataset.what + " copied to clipboard.");
        setTimeout(function () { btn.classList.remove("is-copied"); }, 1800);
      }, function () { say("Couldn't copy automatically. Select the text and copy it manually."); });
    });
  });
  var fill = card.querySelector(".finix-dev-fill");
  fill.addEventListener("click", function () {
    var u = document.getElementById("username"), p = document.getElementById("password");
    if (!u || !p) return;
    [[u, fill.dataset.fillUser], [p, fill.dataset.fillPass]].forEach(function (pair) {
      pair[0].value = pair[1]; pair[0].dispatchEvent(new Event("input", { bubbles: true }));
    });
    var btn = document.getElementById("kc-login"); if (btn) btn.focus();
    say("Credentials filled. Press Sign in to continue.");
  });
});
