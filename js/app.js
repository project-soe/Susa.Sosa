/**
 * Susa.Sosa - Aplikasi halaman publik
 * Alur: muat data -> render bagian halaman -> pasang interaksi.
 */
import { initRipple, initReveal, initDialogs, initIntro, openDialog, closeDialog } from "./ui.js";
import { loadData, createManualOrder } from "./api.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = { data: null, filter: "all", lang: localStorage.getItem("susa-language") === "en" ? "en" : "id" };
/* ---------- Bahasa Indonesia / English ---------- */
const translations = {
  "Lewati ke konten":"Skip to content","Menu utama":"Main navigation","Unggulan":"Featured",
  "Katalog":"Catalog","Layanan":"Services","Testimoni":"Testimonials","Kontak":"Contact",
  "Full stack developer":"Full-stack developer","Website dan aplikasi":"Websites and applications",
  "siap pakai":"ready to use","tinggal jalan.":"ready to launch.","Semua hak dilindungi.":"All rights reserved.","Lihat proyek yang sudah jadi, coba preview-nya, lalu pesan lewat WhatsApp.":"Explore completed projects, preview them, and order via WhatsApp.",
  "Lihat Katalog":"View Catalog","Tanya via WhatsApp":"Ask via WhatsApp","Pilihan utama":"Featured picks",
  "Proyek unggulan":"Featured Projects","Proyek unggulan akan segera tampil.":"Featured projects coming soon.",
  "Semua proyek":"All projects","Pilih kategori, klik proyek untuk melihat foto, video, dan detailnya.":"Choose a category, then select a project to view photos, videos, and details.",
  "Semua":"All","Belum ada proyek di kategori ini.":"No projects in this category yet.",
  "Harga jasa":"Service pricing","Butuh yang belum ada di katalog? Proyek bisa dibuat sesuai kebutuhanmu.":"Need something not listed? We can build a project tailored to your needs.",
  "Kata mereka":"What people say","Ada proyek yang ingin dibuat?":"Have a project in mind?",
  "Ceritakan kebutuhanmu lewat WhatsApp. Jawaban cepat, tanpa basa-basi.":"Tell us what you need on WhatsApp. Quick, straightforward responses.",
  "Mulai sekarang":"Get started","Chat WhatsApp":"Chat on WhatsApp","Kembali ke atas ↑":"Back to top ↑",
  "Semua hak dilindungi.":"All rights reserved.","Foto sebelumnya":"Previous photo","Foto berikutnya":"Next photo",
  "Pesan Sekarang":"Order Now","Lihat Demo":"View Demo","Kembali":"Back","Tutup":"Close",
  "Transfer ":"Transfer ","Nama kamu":"Your name","Nama kamu (opsional)":"Your name (optional)",
  "Konfirmasi via WhatsApp":"Confirm via WhatsApp","Setelah transfer, klik tombol di atas dan kirim bukti pembayaran lewat WhatsApp.":"After transferring, click the button above and send your payment receipt via WhatsApp.",
  "Pembayaran manual sedang tidak aktif. Silakan hubungi lewat WhatsApp.":"Manual payment is currently unavailable. Please contact us via WhatsApp.",
  "Metode pembayaran belum diatur.":"Payment methods have not been configured.","a.n. ":"Account name: ",
  "mulai dari":"starting at","Tanya layanan ini":"Ask about this service","Proyek bisa dibuat sesuai kebutuhanmu.":"Projects can be tailored to your needs.",
  "Data belum bisa dimuat. Periksa koneksi lalu muat ulang halaman.":"Unable to load data. Check your connection and reload the page.",
  "Salin":"Copy","Tersalin":"Copied","Gagal, coba lagi":"Failed, try again",
  "Aktifkan JavaScript untuk melihat katalog.":"Enable JavaScript to view the catalog.",
  "Susa.Sosa, ke atas":"Susa.Sosa, back to top","Buka menu":"Open menu","Tutup menu":"Close menu",
  "Filter kategori":"Filter categories","Media ":"Media "
};
const originalText = new WeakMap();
const originalAttrs = new WeakMap();
function translated(value) {
  let result = value;
  for (const [id,en] of Object.entries(translations)) {
    if (result === id) return en;
  }
  return result;
}
function applyLanguage() {
  const lang = state.lang;
  document.documentElement.lang = lang;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (!originalText.has(node)) originalText.set(node, node.nodeValue);
    const source = originalText.get(node);
    node.nodeValue = lang === "en" ? translated(source) : source;
  }
  document.querySelectorAll("[aria-label], [title], [placeholder]").forEach((el) => {
    for (const attr of ["aria-label", "title", "placeholder"]) {
      if (!el.hasAttribute(attr)) continue;
      let values = originalAttrs.get(el);
      if (!values) { values = {}; originalAttrs.set(el, values); }
      if (!(attr in values)) values[attr] = el.getAttribute(attr);
      el.setAttribute(attr, lang === "en" ? translated(values[attr]) : values[attr]);
    }
  });
  const toggle = $("#langToggle");
  if (toggle) {
    const markup = lang === "id" ? '<strong>ID</strong> <span>|</span> EN' : 'ID <span>|</span> <strong>EN</strong>';
    // Jangan membangun ulang tombol jika isinya sudah benar: ini mencegah
    // MutationObserver memicu dirinya sendiri tanpa henti.
    if (toggle.innerHTML !== markup) toggle.innerHTML = markup;
    const ariaLabel = lang === "id" ? "Switch language to English" : "Ganti bahasa ke Indonesia";
    if (toggle.getAttribute("aria-label") !== ariaLabel) toggle.setAttribute("aria-label", ariaLabel);
    const title = ariaLabel;
    if (toggle.title !== title) toggle.title = title;
  }
}


/* ---------- Helper ---------- */

/** Escape teks agar aman disisipkan ke HTML. */
const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);

/** Hanya izinkan link http(s) agar tidak ada javascript: URL. */
const safeUrl = (url) => (/^https?:\/\//i.test(url || "") ? url : "");

const waLink = (text = "") => {
  const number = String(state.data.settings.whatsapp || "").replace(/\D/g, "");
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};

const youtubeId = (url) => (String(url).match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/) || [])[1];

const categoryName = (project) =>
  localized(state.data.categories.find((c) => c.id === project.category_id), "name");

const localized = (item, key) => state.lang === "en" && item?.[`${key}_en`]?.trim() ? item[`${key}_en`] : (item?.[key] ?? "");
const firstImage = (project) => project.media.find((m) => m.kind === "image");

/* ---------- Render: kartu proyek ---------- */

function cardHTML(project, index) {
  const image = firstImage(project);
  const media = image
    ? `<img src="${esc(safeUrl(image.url))}" alt="${esc(localized(project, "title"))}" loading="lazy" decoding="async">`
    : `<div class="card__ph"><span class="logo-mark"></span></div>`;
  return `
    <a class="card card--enter" style="--i:${index}" href="#proyek/${esc(project.slug)}" data-slug="${esc(project.slug)}">
      <div class="card__media">${media}</div>
      <div class="card__body">
        <p class="card__cat">${esc(categoryName(project))}</p>
        <h3 class="card__title">${esc(project.title)}</h3>
        <p>${esc(localized(project, "summary"))}</p>
        <span class="card__price">${rupiah(project.price)}</span>
      </div>
    </a>`;
}

function renderFeatured() {
  const items = state.data.projects
    .filter((p) => p.featured)
    .sort((a, b) => a.featured_order - b.featured_order);
  $("#featured").innerHTML = items.length
    ? items.map(cardHTML).join("")
    : `<p class="empty">Proyek unggulan akan segera tampil.</p>`;
}

function renderChips() {
  const chips = [{ id: "all", name: "Semua" }, ...state.data.categories];
  $("#chips").innerHTML = chips
    .map((c) => `<button class="chip" data-cat="${esc(c.id)}" aria-pressed="${c.id === state.filter}">${esc(localized(c, "name"))}</button>`)
    .join("");
}

function renderCatalog() {
  const items = state.data.projects.filter((p) => state.filter === "all" || p.category_id === state.filter);
  $("#catalog").innerHTML = items.length
    ? items.map(cardHTML).join("")
    : `<p class="empty">Belum ada proyek di kategori ini.</p>`;
}

/* ---------- Render: layanan, testimoni, kontak ---------- */

function renderServices() {
  const services = state.data.settings.services ?? [];
  $("#services").innerHTML = services
    .map(
      (s, i) => `
      <article class="plan reveal" style="--i:${i}">
        <h3>${esc(localized(s, "name"))}</h3>
        <p>${esc(localized(s, "desc"))}</p>
        <div class="plan__price"><small>mulai dari</small><br>${rupiah(s.price)}</div>
        <a class="btn btn--ghost" target="_blank" rel="noopener"
           href="${esc(waLink(`Halo Susa.Sosa, saya tertarik dengan layanan: ${s.name}`))}">Tanya layanan ini</a>
      </article>`
    )
    .join("");
}

function renderTestimonials() {
  const items = state.data.testimonials;
  const section = $("#testimoni");
  if (!items.length) { section.hidden = true; return; }
  $("#testimonials").innerHTML = items
    .map((t, i) => {
      const photo = safeUrl(t.photo_url);
      const avatar = photo
        ? `<img src="${esc(photo)}" alt="" loading="lazy">`
        : esc(t.author.charAt(0).toUpperCase());
      return `
      <figure class="quote reveal" style="--i:${i}">
        <blockquote>&ldquo;${esc(localized(t, "quote"))}&rdquo;</blockquote>
        <figcaption><span class="avatar">${avatar}</span><span><strong>${esc(t.author)}</strong>${esc(localized(t, "role"))}</span></figcaption>
      </figure>`;
    })
    .join("");
}

function renderContact() {
  const { settings } = state.data;
  if (settings.tagline || settings.tagline_en) $("#tagline").textContent = localized(settings, "tagline");
  $$("[data-wa]").forEach((a) => {
    a.href = waLink("Halo Susa.Sosa, saya ingin bertanya tentang proyek.");
    a.target = "_blank";
    a.rel = "noopener";
  });
  const labels = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", github: "GitHub" };
  $("#socials").innerHTML = Object.entries(settings.socials ?? {})
    .filter(([, url]) => safeUrl(url))
    .map(([key, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(labels[key] ?? key)}</a>`)
    .join("");
}

/* ---------- Dialog preview ---------- */

const dialog = $("#projectDialog");
let currentProject = null;
let currentMediaIndex = 0;
let galleryPointerStart = null;
let pushedByUs = false; // true jika kita yang menambah riwayat browser saat dialog dibuka

function mediaHTML(m) {
  const url = safeUrl(m.url);
  if (m.kind === "video") {
    const id = youtubeId(url);
    if (id) {
      return `<iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Video proyek" loading="lazy" allowfullscreen></iframe>`;
    }
    return `<video src="${esc(url)}" controls playsinline preload="metadata"></video>`;
  }
  return `<img src="${esc(url)}" alt="" decoding="async">`;
}

function thumbHTML(m, i) {
  const inner = m.kind === "video" ? `<span>Video</span>` : `<img src="${esc(safeUrl(m.url))}" alt="" loading="lazy">`;
  return `<button class="thumb" data-i="${i}" aria-label="Media ${i + 1}" aria-current="${i === 0}">${inner}</button>`;
}

function paymentHTML(project) {
  const { payments, settings } = state.data;
  if (settings.payment_manual_enabled === false) {
    return `<p>Pembayaran manual sedang tidak aktif. Silakan hubungi lewat WhatsApp.</p>`;
  }
  const list = payments
    .map((p) => {
      const qr = safeUrl(p.qr_url) ? `<img class="pay__qr" src="${esc(p.qr_url)}" alt="QR ${esc(p.name)}" loading="lazy">` : "";
      return `
      <li class="pay__item">
        <div class="pay__info">
          <strong>${esc(p.name)}</strong>
          <code>${esc(p.account_number)}</code><br>a.n. ${esc(p.account_name)}
        </div>
        ${qr}
        <button class="btn btn--ghost btn--sm" data-copy="${esc(p.account_number)}">Salin</button>
      </li>`;
    })
    .join("");
  return `
    <h3>Transfer ${rupiah(project.price)}</h3>
    <ul class="pay__list">${list || "<li>Metode pembayaran belum diatur.</li>"}</ul>
    <label class="sr-only" for="buyerName">Nama kamu</label>
    <input class="field" id="buyerName" placeholder="Nama kamu (opsional)" autocomplete="name">
    <button class="btn btn--wa" data-confirm>Konfirmasi via WhatsApp</button>
    <p class="note">Setelah transfer, klik tombol di atas dan kirim bukti pembayaran lewat WhatsApp.</p>`;
}

function showGalleryMedia(index) {
  if (!currentProject?.media?.length) return;
  const total = currentProject.media.length;
  currentMediaIndex = (index + total) % total;
  const main = $("#galleryMain");
  if (!main) return;
  main.querySelector("img, video, iframe")?.remove();
  const media = currentProject.media[currentMediaIndex];
  main.insertAdjacentHTML("afterbegin", mediaHTML(media));
  const caption = $("#galleryCaption");
  if (caption) {
    caption.textContent = localized(media, "label");
    caption.hidden = !localized(media, "label").trim();
  }
  $(".thumb", dialog).forEach((thumb, i) => {
    thumb.setAttribute("aria-current", String(i === currentMediaIndex));
  });
  const counter = $("#galleryCounter");
  if (counter) counter.textContent = `${currentMediaIndex + 1} / ${total}`;
  $("#galleryThumbs .thumb[aria-current=\"true\"]")?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
}

function renderDialog(project) {
  const demo = safeUrl(project.demo_url);
  $("#dlgBody").innerHTML = `
    ${project.media.length ? `
      <div class="gallery__main" id="galleryMain">
        ${mediaHTML(project.media[0])}
        ${project.media.length > 1 ? `
          <button class="gallery__nav gallery__nav--prev" type="button" data-gallery-prev aria-label="Foto sebelumnya">&#8249;</button>
          <button class="gallery__nav gallery__nav--next" type="button" data-gallery-next aria-label="Foto berikutnya">&#8250;</button>
          <span class="gallery__counter" id="galleryCounter">1 / ${project.media.length}</span>` : ""}
      </div>
      <p class="gallery__caption" id="galleryCaption" ${localized(project.media[0], "label").trim() ? "" : "hidden"}>${esc(localized(project.media[0], "label"))}</p>
      ${project.media.length > 1 ? `<div class="gallery__thumbs" id="galleryThumbs">${project.media.map(thumbHTML).join("")}</div>` : ""}`
    : `<div class="gallery__main"><div class="card__ph"><span class="logo-mark"></span></div></div>`}
    <p class="card__cat">${esc(categoryName(project))}</p>
    <h2 id="dlgTitle">${esc(project.title)}</h2>
    <p class="dlg__desc">${esc(localized(project, "description") || localized(project, "summary"))}</p>
    <div class="dlg__price">${rupiah(project.price)}</div>
    <div class="row">
      <button class="btn btn--accent" data-order>Pesan Sekarang</button>
      ${demo ? `<a class="btn btn--ghost" href="${esc(demo)}" target="_blank" rel="noopener">Lihat Demo</a>` : ""}
      <button class="btn btn--ghost" data-close>Kembali</button>
    </div>
    <section class="pay" id="paySection" hidden>${paymentHTML(project)}</section>`;
}

function openProject(slug, { push = true } = {}) {
  const project = state.data?.projects.find((p) => p.slug === slug);
  if (!project) return;
  currentProject = project;
  currentMediaIndex = 0;
  renderDialog(project);
  dialog.scrollTop = 0;
  if (!dialog.open) openDialog(dialog);
  if (push && location.hash !== `#proyek/${slug}`) {
    history.pushState(null, "", `#proyek/${slug}`);
    pushedByUs = true;
  }
}

/** Pesan: catat pesanan, lalu buka WhatsApp dengan kode pesanan. */
async function confirmOrder(button) {
  const name = $("#buyerName")?.value.trim();
  button.disabled = true;
  const popup = window.open("", "_blank"); // dibuka sekarang agar tidak diblokir browser
  try {
    const { code } = await createManualOrder(currentProject, name);
    const text =
      `Halo Susa.Sosa, saya sudah transfer.\n` +
      `Kode pesanan: ${code}\nProyek: ${currentProject.title}\nTotal: ${rupiah(currentProject.price)}` +
      (name ? `\nNama: ${name}` : "");
    const url = waLink(text);
    if (popup) popup.location.href = url; else location.href = url;
  } catch {
    popup?.close();
    button.disabled = false;
    button.textContent = "Gagal, coba lagi";
  }
  button.disabled = false;
}

dialog.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  if (target.closest("[data-gallery-prev]")) {
    showGalleryMedia(currentMediaIndex - 1);
    return;
  }
  if (target.closest("[data-gallery-next]")) {
    showGalleryMedia(currentMediaIndex + 1);
    return;
  }
  const thumb = target.closest(".thumb");
  if (thumb && currentProject) {
    showGalleryMedia(Number(thumb.dataset.i));
    return;
  }
  if (target.closest("[data-order]")) {
    const pay = $("#paySection");
    pay.hidden = false;
    pay.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }
  const copy = target.closest("[data-copy]");
  if (copy) {
    try {
      await navigator.clipboard.writeText(copy.dataset.copy);
      const old = copy.textContent;
      copy.textContent = "Tersalin";
      setTimeout(() => (copy.textContent = old), 1500);
    } catch { /* clipboard tidak tersedia */ }
    return;
  }
  const confirm = target.closest("[data-confirm]");
  if (confirm) confirmOrder(confirm);
});

/* Tombol kembali browser/HP menutup dialog; menutup dialog merapikan alamat. */
const galleryBody = $("#dlgBody");
galleryBody.addEventListener("pointerdown", (event) => {
  if (!event.target.closest("#galleryMain") || event.target.closest("button")) return;
  galleryPointerStart = { x: event.clientX, y: event.clientY };
});
galleryBody.addEventListener("pointerup", (event) => {
  if (!galleryPointerStart || !event.target.closest("#galleryMain")) { galleryPointerStart = null; return; }
  const dx = event.clientX - galleryPointerStart.x;
  const dy = event.clientY - galleryPointerStart.y;
  galleryPointerStart = null;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) showGalleryMedia(currentMediaIndex + (dx < 0 ? 1 : -1));
});
galleryBody.addEventListener("pointercancel", () => { galleryPointerStart = null; });

dialog.addEventListener("close", () => {
  currentProject = null;
  if (!location.hash.startsWith("#proyek/")) return;
  if (pushedByUs) {
    pushedByUs = false;
    history.back();
  } else {
    // Dibuka dari link langsung: rapikan alamat tanpa keluar dari website.
    history.replaceState(null, "", location.pathname + location.search);
  }
});
window.addEventListener("popstate", handleHash);

function handleHash() {
  const match = location.hash.match(/^#proyek\/(.+)$/);
  if (match) {
    openProject(decodeURIComponent(match[1]), { push: false });
  } else {
    pushedByUs = false;
    if (dialog.open) closeDialog(dialog);
  }
}

/* ---------- Interaksi halaman ---------- */

function initLanguage() {
  const toggle = $("#langToggle");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    state.lang = state.lang === "id" ? "en" : "id";
    localStorage.setItem("susa-language", state.lang);
    applyLanguage();
  });
  applyLanguage();
  const observer = new MutationObserver((records) => {
    // Abaikan mutasi internal tombol bahasa agar observer tidak mengamati
    // perubahan DOM yang dibuat oleh applyLanguage() sendiri.
    const hasExternalChanges = records.some((record) =>
      record.target !== toggle && !toggle.contains(record.target)
    );
    if (hasExternalChanges) applyLanguage();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function initNav() {
  const toggle = $("#navToggle");
  const nav = $("#nav");
  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open);
    toggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
  };
  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });

  // Tandai menu aktif sesuai bagian yang sedang terlihat
  const links = $$("a", nav);
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${entry.target.id}`));
    }),
    { rootMargin: "-45% 0px -50% 0px" }
  );
  $$("main section[id]").forEach((s) => observer.observe(s));
}

function initCatalog() {
  $("#chips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    state.filter = chip.dataset.cat;
    renderChips();
    renderCatalog();
  });
  document.addEventListener("click", (e) => {
    const card = e.target.closest("a.card[data-slug]");
    if (!card || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    openProject(card.dataset.slug);
  });
}

function showError() {
  const message = `<p class="empty">Data belum bisa dimuat. Periksa koneksi lalu muat ulang halaman.</p>`;
  $("#featured").innerHTML = message;
  $("#catalog").innerHTML = "";
}

/* ---------- Mulai ---------- */

async function main() {
  $("#year").textContent = new Date().getFullYear();
  initLanguage();
  initIntro();
  initRipple();
  initDialogs();
  initNav();
  initCatalog();

  const skeleton = Array.from({ length: 3 }, () => `<div class="skeleton"></div>`).join("");
  $("#featured").innerHTML = skeleton;

  try {
    state.data = await loadData();
  } catch (error) {
    console.error(error);
    showError();
    return;
  }
  renderFeatured();
  renderChips();
  renderCatalog();
  renderServices();
  renderTestimonials();
  renderContact();
  initReveal();
  handleHash();
}

main();
