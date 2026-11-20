/**
 * Admin - Kategori: tambah, ubah nama/urutan, hapus.
 */
import { rest, insert, update, remove } from "./db.js";
import { esc, slugify, toast, ask, loadingHTML, emptyHTML } from "./helpers.js";

export async function render(root) {
  root.innerHTML = loadingHTML;
  const categories = await rest("categories?select=*&order=sort");

  root.innerHTML = `
    <div class="toolbar"><div><h2>Kategori</h2><p>Dipakai sebagai filter di katalog.</p></div></div>
    <form class="inline-form" id="catForm">
      <label class="sr-only" for="catName">Nama kategori</label>
      <input class="field" id="catName" placeholder="Nama kategori baru" required maxlength="40">
      <button class="btn btn--accent" type="submit">Tambah</button>
    </form>
    ${categories.length ? `<ul class="list">${categories.map(rowHTML).join("")}</ul>` : emptyHTML("Belum ada kategori.")}`;

  root.querySelector("#catForm").onsubmit = async (event) => {
    event.preventDefault();
    const input = root.querySelector("#catName");
    const name = input.value.trim();
    if (!name) return;
    try {
      await insert("categories", { name, slug: slugify(name) || `kategori-${Date.now()}`, sort: categories.length + 1 });
      toast("Kategori ditambahkan");
      render(root);
    } catch (error) { toast(error.message, "error"); }
  };

  root.onchange = async (event) => {
    const input = event.target.closest("[data-field]");
    if (!input) return;
    const id = input.closest("[data-id]").dataset.id;
    const field = input.dataset.field;
    const value = field === "sort" ? Number(input.value) || 0 : input.value.trim();
    if (field === "name" && !value) return render(root);
    try {
      await update("categories", id, field === "name" ? { name: value, slug: slugify(value) } : { sort: value });
      toast("Tersimpan");
    } catch (error) { toast(error.message, "error"); render(root); }
  };

  root.onclick = async (event) => {
    const button = event.target.closest("[data-act='del']");
    if (!button) return;
    const row = button.closest("[data-id]");
    const name = row.querySelector("[data-field='name']").value;
    if (!(await ask(`Hapus kategori "${name}"? Proyek di dalamnya tidak ikut terhapus, hanya menjadi tanpa kategori.`))) return;
    try {
      await remove("categories", row.dataset.id);
      toast("Kategori dihapus");
      render(root);
    } catch (error) { toast(error.message, "error"); }
  };
}

const rowHTML = (c) => `
  <li class="item" data-id="${esc(c.id)}">
    <div class="item__main"><input class="field" data-field="name" value="${esc(c.name)}" maxlength="40" aria-label="Nama kategori"></div>
    <label class="num" title="Urutan"><span class="sr-only">Urutan</span>
      <input type="number" min="0" data-field="sort" value="${c.sort}" aria-label="Urutan"></label>
    <div class="item__actions"><button class="btn btn--ghost btn--sm btn--danger-text" data-act="del">Hapus</button></div>
  </li>`;
