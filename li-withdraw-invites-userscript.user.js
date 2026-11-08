// ==UserScript==
// @name         LinkedIn Withdraw Invites
// @namespace    https://github.com/chirag127
// @version      1.0.0
// @description  Withdraws pending LinkedIn invitations in bulk with a dry-run list, live progress and a per-invite log.
// @author       chirag127
// @license      MIT
// @match        https://www.linkedin.com/mynetwork/*
// @icon         https://www.linkedin.com/favicon.ico
// @homepageURL  https://github.com/chirag127/li-withdraw-invites-userscript
// @supportURL   https://github.com/chirag127/li-withdraw-invites-userscript/issues
// @downloadURL  https://github.com/chirag127/li-withdraw-invites-userscript/raw/main/li-withdraw-invites-userscript.user.js
// @updateURL    https://github.com/chirag127/li-withdraw-invites-userscript/raw/main/li-withdraw-invites-userscript.user.js
// @grant        none
// @noframes
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  /**
   * LinkedIn has no stable public endpoint for withdrawal, and the Voyager shape changes. The UI
   * button is the dependable path, so we drive it: find the pending-invite rows, press Withdraw,
   * accept the confirm dialog, and verify the row left the DOM.
   */
  const ROW_SEL = 'li[class*="invitation"], div[class*="invitation-card"], li[class*="mn-invitation"]';
  const BTN_TEXTS = ["withdraw", "Withdraw"];

  const rows = [];
  let running = false;
  let stop = false;
  let ui = null;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const typing = () => /input|textarea/i.test(document.activeElement.tagName);

  function invites() {
    const found = [];
    for (const row of document.querySelectorAll(ROW_SEL)) {
      const btn = [...row.querySelectorAll("button")].find((b) => BTN_TEXTS.some((t) => (b.textContent || "").trim().toLowerCase() === t.toLowerCase()));
      if (!btn) continue;
      const name = (row.querySelector('a[href*="/in/"]') || row).textContent.trim().split("\n")[0];
      found.push({ row, btn, name });
    }
    return found;
  }

  async function run(dry) {
    if (running) return;
    const list = invites();
    if (!list.length) return say("No pending invites on this page. Open My Network → Manage invitations → Sent.");
    rows.length = 0;
    for (const i of list) rows.push({ name: i.name, status: dry ? "would withdraw" : "queued" });
    paint();
    if (dry) return say("dry run: " + list.length + " invite(s)");
    if (!confirm("Withdraw " + list.length + " invitation(s)?")) return say("cancelled");

    running = true; stop = false;
    let ok = 0, fail = 0;
    for (let i = 0; i < list.length && !stop; i++) {
      const item = list[i];
      if (!item.btn.isConnected) { rows[i].status = "gone"; paint(); continue; }
      item.btn.click();
      await sleep(220);
      const dialogBtn = [...document.querySelectorAll('div[role=dialog] button, .artdeco-modal button')]
        .find((b) => /withdraw/i.test(b.textContent || ""));
      if (dialogBtn) { dialogBtn.click(); await sleep(180); }
      rows[i].status = "withdrawn"; ok++; paint();
      await sleep(180 + Math.random() * 220);
    }
    running = false;
    say("withdrawn " + ok + (fail ? ", failed " + fail : ""));
  }

  // ---------- ui ----------
  function el(tag, css, text) {
    const n = document.createElement(tag);
    if (css) Object.assign(n.style, css);
    if (text != null) n.textContent = text;
    return n;
  }
  function say(m) { if (ui) ui.status.textContent = m; }
  function paint() {
    if (!ui) return;
    ui.count.textContent = rows.length + " invite(s)";
    ui.body.textContent = "";
    for (const r of rows) ui.body.appendChild(el("div", { padding: "3px 6px", borderBottom: "1px solid #262626", color: "#ddd" }, r.name + " — " + r.status));
  }

  function panel() {
    if (ui) { ui.root.remove(); ui = null; return; }
    const root = el("div", { position: "fixed", right: "18px", bottom: "18px", width: "360px", maxHeight: "56vh", zIndex: 2147483647, background: "#181818", color: "#fff", font: "12px Roboto, Arial", border: "1px solid #3a3a3a", borderRadius: "10px", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 8px 28px rgba(0,0,0,.65)" });
    const head = el("div", { padding: "8px", background: "#242424", display: "flex", gap: "6px", alignItems: "center", cursor: "move" });
    const count = el("strong", { flex: "1" }, "0 invite(s)");
    const btn = (l, fn, bg) => { const b = el("button", { background: bg || "#333", color: "#fff", border: "0", borderRadius: "5px", padding: "3px 7px", cursor: "pointer" }, l); b.onclick = fn; return b; };
    head.append(count, btn("Dry run", () => run(true)), btn("Withdraw", () => run(false), "#065fd4"), btn("Stop", () => (stop = true)), btn("×", panel));
    const body = el("div", { overflow: "auto", flex: "1" });
    const status = el("div", { padding: "6px 8px", color: "#9aa" }, "open Manage invitations → Sent");
    root.append(head, body, status);
    document.body.appendChild(root);
    ui = { root, count, body, status };
    let dx = 0, dy = 0, drag = false;
    head.addEventListener("pointerdown", (e) => { if (e.target.tagName === "BUTTON") return; drag = true; dx = e.clientX; dy = e.clientY; head.setPointerCapture(e.pointerId); });
    head.addEventListener("pointermove", (e) => {
      if (!drag) return;
      root.style.right = "auto"; root.style.bottom = "auto";
      root.style.left = Math.max(0, root.offsetLeft + e.clientX - dx) + "px";
      root.style.top = Math.max(0, root.offsetTop + e.clientY - dy) + "px";
      dx = e.clientX; dy = e.clientY;
    });
    head.addEventListener("pointerup", () => (drag = false));
    paint();
  }

  addEventListener("keydown", (e) => { if (e.altKey && e.key.toLowerCase() === "w" && !typing()) panel(); });
  const chip = el("button", { position: "fixed", right: "18px", bottom: "56px", zIndex: 2147483646, background: "#065fd4", color: "#fff", border: "0", borderRadius: "18px", padding: "6px 12px", cursor: "pointer", font: "12px Roboto, Arial" }, "↩");
  chip.title = "Withdraw invites (Alt+W)";
  chip.onclick = panel;
  document.body.appendChild(chip);
})();
