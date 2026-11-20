/**
 * Admin - Pintu masuk: login, tab, dan pemuatan bagian.
 */
import { initRipple, initDialogs } from "../ui.js";
import { isConfigured, hasSession, login, logout, rest } from "./db.js";
import { $, $$, toast, esc } from "./helpers.js";

const VIEWS = {
  proyek: { label: "Proyek", load: () => import("./projects.js") },
  kategori: { label: "Kategori", load: () => import("./categories.js") },
  testimoni: { label: "Testimoni", load: () => import("./testimonials.js") },
  pembayaran: { label: "Pembayaran", load: () => import("./payments.js") },
  pesanan: { label: "Pesanan", load: () => import("./orders.js") },
  pengaturan: { label: "Pengaturan", load: () => import("./settings.js") },
};

let current = null;

function showApp(show) {
  $("#login").hidden = show;
  $("#app").hidden = !show;
}

async function openView(name) {
  if (!VIEWS[name]) name = "proyek";
  current = name;
  $$("#tabs [data-view]").forEach((tab) => tab.setAttribute("aria-selected", tab.dataset.view === name));
  const root = $("#view");
  root.classList.remove("view-enter");
  void root.offsetWidth; // mulai ulang animasi masuk
  root.classList.add("view-enter");
  try {
    const module = await VIEWS[name].load();
    if (current === name) await module.render(root);
  } catch (error) {
    root.innerHTML = `<p class="empty">${esc(error.message)}</p>`;
  }
}

/** Lencana jumlah pesanan yang menunggu di tab Pesanan. */
async function refreshBadge() {
  try {
    const waiting = await rest("orders?select=id&status=eq.menunggu");
    const badge = $("#ordersBadge");
    badge.textContent = waiting.length;
    badge.hidden = waiting.length === 0;
  } catch { /* abaikan */ }
}

function startApp() {
  showApp(true);
  $("#tabs").innerHTML = Object.entries(VIEWS)
    .map(([key, v]) => `<button class="tab" role="tab" data-view="${key}" aria-selected="false">${v.label}${key === "pesanan" ? ` <span class="badge-count" id="ordersBadge" hidden></span>` : ""}</button>`)
    .join("");
  openView(location.hash.slice(1));
  refreshBadge();
}

function initLogin() {
  $("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $("[type=submit]", event.currentTarget);
    button.disabled = true;
    try {
      await login($("#email").value.trim(), $("#password").value);
      $("#password").value = "";
      startApp();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      button.disabled = false;
    }
  });
}

function main() {
  initRipple();
  initDialogs();
  initLogin();

  if (!isConfigured()) {
    $("#setupNote").hidden = false;
    $("#loginForm").hidden = true;
    return;
  }

  $("#tabs").addEventListener("click", (event) => {
    const tab = event.target.closest("[data-view]");
    if (!tab) return;
    history.replaceState(null, "", `#${tab.dataset.view}`);
    openView(tab.dataset.view);
  });
  $("#logout").addEventListener("click", () => { logout(); showApp(false); });
  window.addEventListener("hashchange", () => { if (hasSession() && location.hash.slice(1) !== current) openView(location.hash.slice(1)); });

  if (hasSession()) startApp();
}

main();
