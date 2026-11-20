/**
 * Admin - Metode pembayaran (bank dan e-wallet) beserta QR.
 */
import { rest, insert, update, remove, uploadImage, removeImage } from "./db.js";
import { esc, safeUrl, toast, ask, openForm, field, switchHTML, loadingHTML, emptyHTML } from "./helpers.js";

const KIND = { bank: "Bank", ewallet: "E-wallet" };

export async function render(root) {
  root.innerHTML = loadingHTML;
  const items = await rest("payment_methods?select=*&order=sort");

  root.innerHTML = `
    <div class="toolbar">
      <div><h2>Metode pembayaran</h2><p>Rekening bank dan e-wallet yang ditampilkan saat pengunjung memesan.</p></div>
      <button class="btn btn--accent" data-act="add">+ Tambah metode</button>
    </div>
    ${items.length ? `<ul class="list">${items.map(rowHTML).join("")}</ul>` : emptyHTML("Belum ada metode pembayaran.")}`;

  root.onclick = async (event) => {
    const button = event.target.closest("[data-act]");
    if (!button) return;
    const item = items.find((m) => m.id === button.closest("[data-id]")?.dataset.id);
    if (button.dataset.act === "add") openEditor(null);
    if (button.dataset.act === "edit") openEditor(item);
    if (button.dataset.act === "del" && (await ask(`Hapus metode ${item.name}?`))) {
      try {
        await remove("payment_methods", item.id);
        await removeImage(item.qr_url);
        toast("Metode dihapus");
        render(root);
      } catch (error) { toast(error.message, "error"); }
    }
  };

  root.onchange = async (event) => {
    const input = event.target.closest("[data-field]");
    if (!input) return;
    try {
      await update("payment_methods", input.closest("[data-id]").dataset.id, { active: input.checked });
      toast("Tersimpan");
    } catch (error) { toast(error.message, "error"); render(root); }
  };

  function openEditor(item) {
    const m = item ?? { kind: "bank", name: "", account_number: "", account_name: "", qr_url: null, active: true, sort: items.length + 1 };
    openForm({
      title: item ? "Edit metode pembayaran" : "Metode pembayaran baru",
      body: `
        ${field({ label: "Jenis", name: "kind", type: "select", value: m.kind, options: [{ value: "bank", label: "Bank" }, { value: "ewallet", label: "E-wallet" }] })}
        ${field({ label: "Nama (BCA, DANA, GoPay, ...)", name: "name", value: m.name, required: true })}
        ${field({ label: "Nomor rekening / nomor HP", name: "account_number", value: m.account_number, required: true, attrs: 'inputmode="numeric"' })}
        ${field({ label: "Atas nama", name: "account_name", value: m.account_name, required: true })}
        <label class="lbl"><span>Kode QR (opsional)</span>
          <input class="field" type="file" name="qr" accept="image/*"></label>
        ${m.qr_url ? `<label class="check"><input type="checkbox" name="remove_qr"><span>Hapus QR saat ini</span></label>` : ""}
        ${field({ label: "Aktif (tampil ke pengunjung)", name: "active", type: "checkbox", value: m.active })}`,
      onSubmit: async (data) => {
        const row = {
          kind: data.get("kind"),
          name: data.get("name").trim(),
          account_number: data.get("account_number").trim(),
          account_name: data.get("account_name").trim(),
          active: data.has("active"),
        };
        const file = data.get("qr");
        if (file && file.size) {
          row.qr_url = await uploadImage(file, "qr");
          await removeImage(m.qr_url);
        } else if (data.has("remove_qr")) {
          row.qr_url = null;
          await removeImage(m.qr_url);
        }
        if (item) await update("payment_methods", item.id, row);
        else await insert("payment_methods", { ...row, sort: m.sort });
        toast("Metode pembayaran disimpan");
        render(root);
      },
    });
  }
}

const rowHTML = (m) => `
  <li class="item" data-id="${esc(m.id)}">
    <div class="item__thumb">${safeUrl(m.qr_url) ? `<img src="${esc(m.qr_url)}" alt="QR ${esc(m.name)}" loading="lazy">` : `<span class="badge">${esc(KIND[m.kind])}</span>`}</div>
    <div class="item__main"><strong>${esc(m.name)}</strong><small>${esc(m.account_number)} &middot; a.n. ${esc(m.account_name)}</small></div>
    <div class="item__controls">${switchHTML("active", m.active, "Aktif")}</div>
    <div class="item__actions">
      <button class="btn btn--ghost btn--sm" data-act="edit">Edit</button>
      <button class="btn btn--ghost btn--sm btn--danger-text" data-act="del">Hapus</button>
    </div>
  </li>`;
