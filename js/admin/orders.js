/**
 * Admin - Pesanan: pantau dan ubah status.
 */
import { rest, update } from "./db.js";
import { esc, rupiah, toast, loadingHTML, emptyHTML } from "./helpers.js";

const STATUS = [
  ["menunggu", "Menunggu"],
  ["dibayar", "Dibayar"],
  ["selesai", "Selesai"],
  ["dibatalkan", "Dibatalkan"],
  ["kedaluwarsa", "Kedaluwarsa"],
];

const formatDate = (iso) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

export async function render(root) {
  root.innerHTML = loadingHTML;
  const orders = await rest("orders?select=*,projects(title)&order=created_at.desc&limit=100");

  root.innerHTML = `
    <div class="toolbar"><div><h2>Pesanan</h2><p>Cek mutasi rekening, lalu ubah status menjadi Dibayar atau Selesai.</p></div></div>
    ${orders.length ? `<ul class="list">${orders.map(rowHTML).join("")}</ul>` : emptyHTML("Belum ada pesanan.")}`;

  root.onchange = async (event) => {
    const select = event.target.closest("select[data-status]");
    if (!select) return;
    select.dataset.state = select.value;
    try {
      await update("orders", select.closest("[data-id]").dataset.id, { status: select.value });
      toast("Status diperbarui");
    } catch (error) { toast(error.message, "error"); render(root); }
  };
}

const rowHTML = (o) => `
  <li class="item" data-id="${esc(o.id)}">
    <div class="item__main">
      <strong>${esc(o.code)}</strong>
      <small>${esc(o.projects?.title ?? "Proyek dihapus")} &middot; ${rupiah(o.amount)}</small>
      <small>${esc(o.buyer_name || "Tanpa nama")} &middot; ${esc(o.method)} &middot; ${esc(formatDate(o.created_at))}</small>
    </div>
    <div class="item__controls">
      <label class="sr-only" for="st-${esc(o.id)}">Status</label>
      <select class="field status" id="st-${esc(o.id)}" data-status data-state="${esc(o.status)}">
        ${STATUS.map(([v, l]) => `<option value="${v}" ${v === o.status ? "selected" : ""}>${l}</option>`).join("")}
      </select>
    </div>
  </li>`;
