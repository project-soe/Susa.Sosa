/**
 * Admin - Testimoni: tambah/ubah/hapus, foto opsional.
 */
import { rest, insert, update, remove, uploadImage, removeImage } from "./db.js";
import { esc, safeUrl, toast, ask, openForm, field, switchHTML, loadingHTML, emptyHTML } from "./helpers.js";

export async function render(root) {
  root.innerHTML = loadingHTML;
  const items = await rest("testimonials?select=*&order=created_at.desc");

  root.innerHTML = `
    <div class="toolbar">
      <div><h2>Testimoni</h2><p>Ulasan pelanggan yang tampil di website.</p></div>
      <button class="btn btn--accent" data-act="add">+ Tambah testimoni</button>
    </div>
    ${items.length ? `<ul class="list">${items.map(rowHTML).join("")}</ul>` : emptyHTML("Belum ada testimoni.")}`;

  root.onclick = async (event) => {
    const button = event.target.closest("[data-act]");
    if (!button) return;
    const item = items.find((t) => t.id === button.closest("[data-id]")?.dataset.id);
    if (button.dataset.act === "add") openEditor(null);
    if (button.dataset.act === "edit") openEditor(item);
    if (button.dataset.act === "del" && (await ask(`Hapus testimoni dari ${item.author}?`))) {
      try {
        await remove("testimonials", item.id);
        await removeImage(item.photo_url);
        toast("Testimoni dihapus");
        render(root);
      } catch (error) { toast(error.message, "error"); }
    }
  };

  root.onchange = async (event) => {
    const input = event.target.closest("[data-field]");
    if (!input) return;
    try {
      await update("testimonials", input.closest("[data-id]").dataset.id, { published: input.checked });
      toast("Tersimpan");
    } catch (error) { toast(error.message, "error"); render(root); }
  };

  function openEditor(item) {
    const t = item ?? { author: "", role: "", quote: "", photo_url: null, published: true };
    openForm({
      title: item ? "Edit testimoni" : "Testimoni baru",
      body: `
        ${field({ label: "Nama", name: "author", value: t.author, required: true })}
        ${field({ label: "Pekerjaan atau usaha", name: "role", value: t.role })}
        ${field({ label: "Isi testimoni", name: "quote", type: "textarea", value: t.quote, required: true })}
        <label class="lbl"><span>Foto (opsional)</span>
          <input class="field" type="file" name="photo" accept="image/*"></label>
        ${t.photo_url ? `<label class="check"><input type="checkbox" name="remove_photo"><span>Hapus foto saat ini</span></label>` : ""}
        ${field({ label: "Tampilkan di website", name: "published", type: "checkbox", value: t.published })}`,
      onSubmit: async (data) => {
        const row = {
          author: data.get("author").trim(),
          role: data.get("role").trim(),
          quote: data.get("quote").trim(),
          published: data.has("published"),
        };
        const file = data.get("photo");
        if (file && file.size) {
          row.photo_url = await uploadImage(file, "testimonials");
          await removeImage(t.photo_url);
        } else if (data.has("remove_photo")) {
          row.photo_url = null;
          await removeImage(t.photo_url);
        }
        if (item) await update("testimonials", item.id, row); else await insert("testimonials", row);
        toast("Testimoni disimpan");
        render(root);
      },
    });
  }
}

const rowHTML = (t) => `
  <li class="item" data-id="${esc(t.id)}">
    <div class="item__thumb item__thumb--round">${safeUrl(t.photo_url) ? `<img src="${esc(t.photo_url)}" alt="" loading="lazy">` : esc(t.author.charAt(0).toUpperCase())}</div>
    <div class="item__main"><strong>${esc(t.author)}</strong><small>${esc(t.role)}</small><p class="clamp">${esc(t.quote)}</p></div>
    <div class="item__controls">${switchHTML("published", t.published, "Tampil")}</div>
    <div class="item__actions">
      <button class="btn btn--ghost btn--sm" data-act="edit">Edit</button>
      <button class="btn btn--ghost btn--sm btn--danger-text" data-act="del">Hapus</button>
    </div>
  </li>`;
