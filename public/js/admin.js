// Moderacijos puslapis (/admin): apskųsti ir paslėpti tekstai — grąžinti, paslėpti, ištrinti.
// Tekstas visada per textContent. Raktas — tik sessionStorage (užvėrus skirtuką dingsta).

(function () {
  "use strict";

  const TOKEN_KEY = "ns_admin";
  const $ = (sel) => document.querySelector(sel);
  const status = $("#admin-status");
  const list = $("#admin-list");
  let token = sessionStorage.getItem(TOKEN_KEY) || "";

  async function call(path, method = "GET") {
    const res = await fetch(path, { method, headers: { authorization: "Bearer " + token } });
    if (res.status === 404 && path.endsWith("/reported")) throw new Error("auth");
    return res.json();
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function item(post) {
    const card = el("article", "card admin-item" + (post.hidden ? " is-hidden" : ""));
    card.dataset.emotion = post.emotion;
    const kind = post.kind === "istorija" ? "Istorija" : "Srautas";
    const meta = [kind, post.emotion, "pranešimų: " + post.reports, "suprantu: " + post.hugs];
    if (post.hidden) meta.push("PASLĖPTA");
    card.append(el("p", "admin-meta", meta.join(" · ")), el("p", "card-text", post.text));
    const actions = el("div", "admin-actions");
    const act = (label, action, cls, ask) => {
      const btn = el("button", "btn " + cls, label);
      btn.type = "button";
      btn.addEventListener("click", async () => {
        if (ask && !confirm(ask)) return;
        btn.disabled = true;
        const data = await call(`/api/admin/posts/${post.id}/${action}`, "POST");
        if (!data.ok) alert(data.reason || "Nepavyko.");
        load();
      });
      return btn;
    };
    actions.append(
      post.hidden ? act("Grąžinti", "unhide", "btn-calm") : act("Paslėpti", "hide", "btn-calm"),
      act("Ištrinti", "delete", "btn-danger", "Ištrinti šį tekstą visam laikui?"),
    );
    card.append(actions);
    return card;
  }

  async function load() {
    status.textContent = "Kraunama…";
    try {
      const data = await call("/api/admin/reported");
      $("#admin-login").hidden = true;
      list.replaceChildren(...data.posts.map(item));
      status.textContent = data.posts.length
        ? `Apskųstų ar paslėptų tekstų: ${data.posts.length}`
        : "Apskųstų tekstų nėra.";
    } catch (err) {
      $("#admin-login").hidden = false;
      list.replaceChildren();
      status.textContent = err.message === "auth" ? "Neteisingas raktas." : "Nepavyko.";
      sessionStorage.removeItem(TOKEN_KEY);
    }
  }

  $("#admin-login").addEventListener("submit", (e) => {
    e.preventDefault();
    token = $("#admin-token").value.trim();
    sessionStorage.setItem(TOKEN_KEY, token);
    load();
  });

  if (token) load();
})();
