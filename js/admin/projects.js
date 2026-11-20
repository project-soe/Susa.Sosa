/**
 * Admin - Proyek: daftar, tampil/unggulan, urutan, form, foto dan video.
 */
import { rest, insert, update, remove, uploadImage, removeImage } from "./db.js";
import {
  $, $$, esc, rupiah, slugify, safeUrl, toast, ask, openForm, field, switchHTML, loadingHTML, emptyHTML,
} from "./helpers.js";

let root;
let categories = [];
let editing = null; // proyek yang sedang diedit di dialog (untuk media)

const firstImage = (p) => (p.media ?? []).filter((m) => m.kind === "image").sort((a, b) => a.sort - b.sort)[0];

export async function render(target) {
  root = target;
  root.innerHTML = loadingHTML;
  const [projects, cats] = await Promise.all([
    rest("projects?select=*,media(id,kind,url,sort,label,label_en)&order=created_at.desc"),
    rest("categories?select=*&order=sort"),
  ]);
  categories = cats;
  const catName = (id) => cats.find((c) => c.id === id)?.name ?? "Tanpa kategori";

  root.innerHTML = `
    <div class="toolbar">
      <div><h2>Proyek</h2><p>Atur proyek yang tampil di website dan di Beranda.</p></div>
      <button class="btn btn--accent" data-act="add">+ Tambah proyek</button>
    </div>
    ${projects.length ? `<ul class="list">${projects.map((p) => rowHTML(p, catName(p.category_id))).join("")}</ul>` : emptyHTML("Belum ada proyek. Klik Tambah proyek.")}`;

  root.onclick = async (event) => {
    const button = event.target.closest("[data-act]");
    if (!button) return;
    const id = button.closest("[data-id]")?.dataset.id;
    const project = projects.find((p) => p.id === id);
    if (button.dataset.act === "add") openEditor(null);
    if (button.dataset.act === "edit") openEditor(project);
    if (button.dataset.act === "del" && (await ask(`Hapus proyek "${project.title}" beserta foto dan videonya?`))) {
      try {
        await Promise.all(project.media.map((m) => removeImage(m.url)));
        await remove("projects", id);
        toast("Proyek dihapus");
        render(root);
      } catch (error) { toast(error.message, "error"); }
    }
  };

  // Saklar dan urutan tersimpan langsung saat diubah
  root.onchange = async (event) => {
    const input = event.target.closest("[data-field]");
    if (!input) return;
    const id = input.closest("[data-id]").dataset.id;
    const value = input.type === "checkbox" ? input.checked : Number(input.value) || 0;
    try {
      await update("projects", id, { [input.dataset.field]: value });
      toast("Tersimpan");
    } catch (error) {
      toast(error.message, "error");
      render(root);
    }
  };
}

function rowHTML(p, categoryLabel) {
  const img = firstImage(p);
  return `
    <li class="item" data-id="${esc(p.id)}">
      <div class="item__thumb">${img ? `<img src="${esc(safeUrl(img.url))}" alt="" loading="lazy">` : `<span class="logo-mark"></span>`}</div>
      <div class="item__main">
        <strong>${esc(p.title)}</strong>
        <small>${esc(categoryLabel)} &middot; ${rupiah(p.price)}</small>
      </div>
      <div class="item__controls">
        ${switchHTML("published", p.published, "Tampil")}
        ${switchHTML("featured", p.featured, "Beranda")}
        <label class="num" title="Urutan di Beranda"><span class="sr-only">Urutan</span>
          <input type="number" min="0" data-field="featured_order" value="${p.featured_order ?? 0}" aria-label="Urutan di Beranda"></label>
      </div>
      <div class="item__actions">
        <button class="btn btn--ghost btn--sm" data-act="edit">Edit</button>
        <button class="btn btn--ghost btn--sm btn--danger-text" data-act="del">Hapus</button>
      </div>
    </li>`;
}

/* ---------- Form proyek ---------- */

function openEditor(project) {
  editing = project;
  const p = project ?? { title: "", slug: "", category_id: "", summary: "", description: "", price: 0, demo_url: "", featured: false, featured_order: 0, published: true };
  const form = openForm({
    title: project ? "Edit proyek" : "Proyek baru",
    submitLabel: project ? "Simpan perubahan" : "Simpan dan lanjut ke foto",
    body: `
      ${field({ label: "Judul proyek (Indonesia)", name: "title", value: p.title, required: true })}
      ${field({ label: "Project title (English)", name: "title_en", value: p.title_en ?? "" })}
      ${field({ label: "Kategori", name: "category_id", type: "select", value: p.category_id ?? "",
        options: [{ value: "", label: "Tanpa kategori" }, ...categories.map((c) => ({ value: c.id, label: c.name }))] })}
      ${field({ label: "Ringkasan (Indonesia)", name: "summary", value: p.summary, placeholder: "Satu kalimat singkat" })}
      ${field({ label: "Summary (English)", name: "summary_en", value: p.summary_en ?? "", placeholder: "A short sentence" })}
      ${field({ label: "Deskripsi lengkap (Indonesia)", name: "description", type: "textarea", rows: 5, value: p.description })}
      ${field({ label: "Full description (English)", name: "description_en", type: "textarea", rows: 5, value: p.description_en ?? "" })}
      ${field({ label: "Harga (Rp)", name: "price", type: "number", value: p.price, required: true, attrs: 'min="0" step="1000" inputmode="numeric"' })}
      ${field({ label: "Link demo (opsional)", name: "demo_url", type: "url", value: p.demo_url ?? "", placeholder: "https://..." })}
      <div class="checks">
        ${field({ label: "Tampilkan di website", name: "published", type: "checkbox", value: p.published })}
        ${field({ label: "Tampilkan di Beranda (unggulan)", name: "featured", type: "checkbox", value: p.featured })}
      </div>
      ${project ? mediaSectionHTML(project) : `<p class="hint">Foto dan video bisa ditambahkan setelah proyek disimpan.</p>`}`,
    onSubmit: async (data) => {
      const row = {
        title: data.get("title").trim(),
        category_id: data.get("category_id") || null,
        summary: data.get("summary").trim(),
        summary_en: data.get("summary_en").trim(),
        description: data.get("description").trim(),
        description_en: data.get("description_en").trim(),
        price: Number(data.get("price")) || 0,
        demo_url: data.get("demo_url").trim() || null,
        published: data.has("published"),
        featured: data.has("featured"),
      };
      if (project) {
        await update("projects", project.id, row);
        toast("Proyek diperbarui");
      } else {
        row.slug = await uniqueSlug(row.title);
        const created = await insert("projects", row);
        toast("Proyek dibuat. Sekarang tambahkan foto.");
        await render(root);
        openEditor({ ...created, media: [] });
        return false;
      }
      render(root);
    },
  });
  if (project) wireMedia(form);
}

async function uniqueSlug(title) {
  const base = slugify(title) || "proyek";
  const taken = (await rest(`projects?select=slug&slug=like.${encodeURIComponent(base)}*`)).map((r) => r.slug);
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/* ---------- Foto dan video ---------- */

function mediaSectionHTML(project) {
  const items = [...(project.media ?? [])].sort((a, b) => a.sort - b.sort);
  project.media = items;
  return `
    <fieldset class="media">
      <legend>Foto dan video</legend>
      <div class="media__grid" id="mediaGrid">${items.map(mediaItemHTML).join("") || `<p class="hint">Belum ada media.</p>`}</div>
      <div class="row">
        <label class="btn btn--ghost btn--sm">Unggah foto
          <input type="file" id="photoInput" accept="image/*" multiple hidden>
        </label>
      </div>
      <div class="media__video">
        <input class="field" id="videoUrl" type="url" placeholder="Link video YouTube" aria-label="Link video YouTube">
        <button type="button" class="btn btn--ghost btn--sm" id="videoAdd">Tambah video</button>
      </div>
      <p class="hint">Foto dikompres otomatis agar ringan. Video disarankan lewat YouTube (gratis, tidak memakai kuota penyimpanan).</p>
    </fieldset>`;
}

function mediaItemHTML(m, i, all) {
  const thumb = m.kind === "image" ? `<img src="${esc(safeUrl(m.url))}" alt="">` : `<span>Video</span>`;
  return `
    <div class="media__item" data-mid="${esc(m.id)}">
      <div class="media__thumb">${thumb}</div>
      ${m.kind === "image" ? `<label class="media__label">Label foto (Indonesia)<input class="field" type="text" data-media-label maxlength="80" value="${esc(m.label ?? "")}" placeholder="Contoh: Halaman Utama"></label><label class="media__label">Photo label (English)<input class="field" type="text" data-media-label-en maxlength="80" value="${esc(m.label_en ?? "")}" placeholder="Example: Homepage"></label>` : ""}
      <div class="media__tools">
        <button type="button" class="btn btn--ghost btn-icon btn--xs" data-m="up" aria-label="Naikkan" ${i === 0 ? "disabled" : ""}>&uarr;</button>
        <button type="button" class="btn btn--ghost btn-icon btn--xs" data-m="down" aria-label="Turunkan" ${i === (all?.length ?? 1) - 1 ? "disabled" : ""}>&darr;</button>
        <button type="button" class="btn btn--ghost btn-icon btn--xs" data-m="del" aria-label="Hapus media">&times;</button>
      </div>
    </div>`;
}

function redrawMedia() {
  const grid = $("#mediaGrid");
  const items = editing.media;
  grid.innerHTML = items.length ? items.map((m, i) => mediaItemHTML(m, i, items)).join("") : `<p class="hint">Belum ada media.</p>`;
}

function wireMedia(form) {
  const addMedia = async (kind, url) => {
    const row = await insert("media", { project_id: editing.id, kind, url, sort: editing.media.length, label: "" });
    editing.media.push(row);
  };

  $("#photoInput").addEventListener("change", async (event) => {
    const files = [...event.target.files];
    event.target.value = "";
    if (!files.length) return;
    toast(`Mengunggah ${files.length} foto...`);
    try {
      for (const file of files) await addMedia("image", await uploadImage(file, `projects/${editing.id}`));
      redrawMedia();
      toast("Foto ditambahkan");
    } catch (error) { toast(error.message, "error"); }
  });

  $("#videoAdd").addEventListener("click", async () => {
    const url = safeUrl($("#videoUrl").value.trim());
    if (!url) return toast("Masukkan link video yang diawali https://", "error");
    try {
      await addMedia("video", url);
      $("#videoUrl").value = "";
      redrawMedia();
      toast("Video ditambahkan");
    } catch (error) { toast(error.message, "error"); }
  });

  $("#mediaGrid").addEventListener("change", async (event) => {
    const input = event.target.closest("[data-media-label], [data-media-label-en]");
    if (!input) return;
    const item = input.closest("[data-mid]");
    const media = editing.media.find((m) => m.id === item?.dataset.mid);
    if (!media) return;
    const field = input.hasAttribute("data-media-label-en") ? "label_en" : "label";
    const label = input.value.trim();
    try {
      await update("media", media.id, { [field]: label });
      media[field] = label;
      toast("Label foto tersimpan");
    } catch (error) {
      input.value = media[field] ?? "";
      toast(error.message, "error");
    }
  });

  $("#mediaGrid").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-m]");
    if (!button) return;
    const id = button.closest("[data-mid]").dataset.mid;
    const index = editing.media.findIndex((m) => m.id === id);
    try {
      if (button.dataset.m === "del") {
        const [gone] = editing.media.splice(index, 1);
        await remove("media", id);
        await removeImage(gone.url);
        await Promise.all(editing.media.map((m, i) => (m.sort === i ? null : (m.sort = i, update("media", m.id, { sort: i })))));
      } else {
        const to = button.dataset.m === "up" ? index - 1 : index + 1;
        [editing.media[index], editing.media[to]] = [editing.media[to], editing.media[index]];
        await Promise.all(editing.media.map((m, i) => (m.sort === i ? null : (m.sort = i, update("media", m.id, { sort: i })))));
      }
      redrawMedia();
    } catch (error) { toast(error.message, "error"); }
  });
}
