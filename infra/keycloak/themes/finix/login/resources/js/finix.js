// Password visibility toggle, inline validation and busy state. No third-party code.
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".finix-toggle").forEach(function (toggle) {
    var input = document.getElementById(toggle.getAttribute("aria-controls"));
    if (!input) return;
    toggle.addEventListener("click", function () {
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      toggle.setAttribute("aria-pressed", String(show));
      toggle.setAttribute("aria-label", toggle.dataset[show ? "labelHide" : "labelShow"]);
      toggle.querySelector(".eye").hidden = show;
      toggle.querySelector(".eye-off").hidden = !show;
    });
  });
  function problem(input, text) {
    var id = input.id + "-inline";
    var el = document.getElementById(id);
    if (!text) { if (el) el.remove(); input.removeAttribute("aria-invalid"); return; }
    if (!el) {
      el = document.createElement("p"); el.id = id; el.className = "finix-error finix-inline"; el.setAttribute("role", "alert");
      (input.closest(".finix-pw") || input).insertAdjacentElement("afterend", el);
    }
    el.textContent = text; input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", id);
  }
  document.querySelectorAll("form.finix-form:not(.finix-register-form)").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      var btn = form.querySelector(".finix-submit");
      var bad = null;
      var user = form.querySelector("#username"), pass = form.querySelector("#password");
      if (user && !user.value.trim()) { problem(user, "Enter your email address or username."); bad = bad || user; } else if (user) problem(user, "");
      if (pass && !pass.value) { problem(pass, "Enter your password."); bad = bad || pass; } else if (pass) problem(pass, "");
      if (bad) { e.preventDefault(); bad.focus(); return; }
      if (btn.dataset.busy) { e.preventDefault(); return; }
      btn.dataset.busy = "1"; btn.classList.add("is-busy"); btn.setAttribute("aria-busy", "true");
    });
    form.addEventListener("input", function (e) { if (e.target.matches("input")) { var el = document.getElementById(e.target.id + "-inline"); if (el) problem(e.target, ""); } });
  });

  // ----- registration: inline validation, strength guidance, loading state -----
  var reg = document.getElementById("kc-register-form");
  if (reg) {
    var min = parseInt((document.getElementById("pw-hint") || {}).dataset.min || "10", 10);
    var meter = reg.querySelector(".finix-meter"), p1 = reg.querySelector("#password"), p2 = reg.querySelector("#password-confirm");
    var terms = reg.querySelector("#termsAccepted"), btn = reg.querySelector("#kc-register");
    // Guidance only: the real policy (minimum length) is enforced by Keycloak. 1 = too short, 2-4 = meets the minimum, stronger with length and variety.
    function level(v) { if (v.length < min) return 1; return 2 + (v.length >= min + 6 ? 1 : 0) + (/[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v) || /[^A-Za-z0-9]/.test(v) ? 1 : 0) > 4 ? 4 : 2 + (v.length >= min + 6 ? 1 : 0) + ((/[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v)) || /[^A-Za-z0-9]/.test(v) ? 1 : 0); }
    p1.addEventListener("input", function () { meter.dataset.level = String(p1.value ? level(p1.value) : 0); });
    var rules = {
      firstName: function (v) { return v.trim() ? "" : "Enter your first name."; },
      lastName: function (v) { return v.trim() ? "" : "Enter your last name."; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Enter a valid email address."; },
      password: function (v) { return v.length >= min ? "" : "Password must be at least " + min + " characters."; },
      "password-confirm": function (v) { return v && v === p1.value ? "" : "Passwords don't match."; },
      termsAccepted: function () { return terms.checked ? "" : "Please agree to the Terms of Service and Privacy Policy to continue."; }
    };
    function show(input, text) {
      var id = input.id + "-inline", el = document.getElementById(id);
      if (!text) { if (el) el.remove(); input.removeAttribute("aria-invalid"); input.removeAttribute("aria-describedby"); input.classList.toggle("is-valid", input.type !== "checkbox" && !!input.value); return; }
      if (!el) { el = document.createElement("p"); el.id = id; el.className = "finix-error"; el.setAttribute("role", "alert"); (input.closest(".finix-pw") || input.closest(".finix-check") || input).insertAdjacentElement("afterend", el); }
      el.textContent = text; input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", id); input.classList.remove("is-valid");
    }
    function check(input) { var r = rules[input.id]; if (r) show(input, r(input.value)); }
    reg.querySelectorAll("input").forEach(function (i) {
      i.addEventListener("blur", function () { if (i.value || i.type === "checkbox") check(i); });
      i.addEventListener("input", function () { if (i.getAttribute("aria-invalid")) check(i); if (i === p1 && p2.value) check(p2); });
      i.addEventListener("change", function () { if (i.type === "checkbox") check(i); });
    });
    reg.addEventListener("submit", function (e) {
      var first = null;
      Object.keys(rules).forEach(function (id) { var i = reg.querySelector("#" + id); if (!i) return; var msg = rules[id](i.value); show(i, msg); if (msg && !first) first = i; });
      if (first) { e.preventDefault(); first.focus(); return; }
      if (btn.dataset.busy) { e.preventDefault(); return; }
      btn.dataset.busy = "1"; btn.classList.add("is-busy"); btn.setAttribute("aria-busy", "true");
      btn.querySelector(".busy-text").textContent = btn.dataset.busyLabel;
    });
  }
});
