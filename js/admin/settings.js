/**
 * Admin - Pengaturan: WhatsApp, tagline, sosmed, harga jasa, pembayaran aktif.
 */
import { rest, saveSettings } from "./db.js";
import { $, $$, esc, safeUrl, normalizeWa, toast, field, loadingHTML } from "./helpers.js";

const SOCIALS = [
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"],
  ["github", "GitHub"],
];

export async function render(root) {
  root.innerHTML = loadingHTML;
  const rows = await rest("settings?select=*");
  const s = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const socials = s.socials ?? {};
  const services = s.services ?? [];

  root.innerHTML = `
    <div class="toolbar"><div><h2>Pengaturan</h2><p>Kontak, sosial media, harga jasa, dan pembayaran.</p></div></div>
    <form id="settingsForm" class="panel" novalidate>
      <fieldset>
        <legend>Kontak</legend>
        ${field({ label: "Nomor WhatsApp", name: "whatsapp", value: s.whatsapp ?? "", required: true, hint: "Boleh 0851... atau 62851..., otomatis dirapikan.", attrs: 'inputmode="tel"' })}
        ${field({ label: "Kalimat pembuka di Beranda", name: "tagline", value: s.tagline ?? "" })}
      </fieldset>

      <fieldset>
        <legend>Sosial media</legend>
        ${SOCIALS.map(([key, label]) => field({ label, name: `social_${key}`, type: "url", value: socials[key] ?? "", placeholder: "https://..." })).join("")}
      </fieldset>

      <fieldset>
        <legend>Harga jasa</legend>
        <div id="services">${services.map(serviceHTML).join("")}</div>
        <button type="button" class="btn btn--ghost btn--sm" id="addService">+ Tambah layanan</button>
      </fieldset>

      <fieldset>
        <legend>Pembayaran</legend>
        ${field({ label: "Aktifkan pembayaran manual (transfer + konfirmasi WhatsApp)", name: "payment_manual_enabled", type: "checkbox", value: s.payment_manual_enabled !== false })}
        ${field({ label: "Aktifkan pembayaran otomatis (gateway)", name: "payment_gateway_enabled", type: "checkbox", value: s.payment_gateway_enabled === true })}
        <p class="hint">Pembayaran otomatis baru berfungsi setelah tahap 4 selesai.</p>
      </fieldset>

      <button class="btn btn--accent" type="submit">Simpan pengaturan</button>
    </form>`;

  const list = $("#services", root);
  $("#addService", root).onclick = () => {
    list.insertAdjacentHTML("beforeend", serviceHTML({ name: "", price: 0, desc: "" }));
    list.lastElementChild.querySelector("input").focus();
  };
  list.onclick = (event) => event.target.closest("[data-del]")?.closest(".service")?.remove();

  $("#settingsForm", root).onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const whatsapp = normalizeWa(data.get("whatsapp"));
    if (whatsapp.length < 10) return toast("Nomor WhatsApp tidak valid", "error");

    const socialsOut = {};
    for (const [key] of SOCIALS) {
      const url = String(data.get(`social_${key}`)).trim();
      if (url && !safeUrl(url)) return toast(`Link ${key} harus diawali https://`, "error");
      socialsOut[key] = url;
    }
    const servicesOut = $$(".service", form)
      .map((el) => ({
        name: $("[data-s='name']", el).value.trim(),
        price: Number($("[data-s='price']", el).value) || 0,
        desc: $("[data-s='desc']", el).value.trim(),
      }))
      .filter((x) => x.name);

    const button = $("[type=submit]", form);
    button.disabled = true;
    try {
      await saveSettings({
        whatsapp,
        tagline: String(data.get("tagline")).trim(),
        socials: socialsOut,
        services: servicesOut,
        payment_manual_enabled: data.has("payment_manual_enabled"),
        payment_gateway_enabled: data.has("payment_gateway_enabled"),
      });
      toast("Pengaturan disimpan");
      render(root);
    } catch (error) {
      toast(error.message, "error");
      button.disabled = false;
    }
  };
}

const serviceHTML = (s) => `
  <div class="service">
    <input class="field" data-s="name" value="${esc(s.name)}" placeholder="Nama layanan" aria-label="Nama layanan">
    <input class="field" data-s="price" type="number" min="0" step="1000" value="${esc(s.price)}" placeholder="Harga mulai dari" aria-label="Harga" inputmode="numeric">
    <input class="field" data-s="desc" value="${esc(s.desc)}" placeholder="Deskripsi singkat" aria-label="Deskripsi layanan">
    <button type="button" class="btn btn--ghost btn-icon btn--xs" data-del aria-label="Hapus layanan">&times;</button>
  </div>`;
