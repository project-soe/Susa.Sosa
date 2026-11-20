/**
 * Susa.Sosa Admin - Helper tampilan (toast, konfirmasi, form dialog, field)
 */
import { openDialog, closeDialog } from "../ui.js";

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);

export const slugify = (text) =>
  String(text).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const safeUrl = (url) => (/^https?:\/\//i.test(url || "") ? url : "");

/** Ubah nomor WA ke format internasional tanpa +, contoh 0851... menjadi 62851... */
export function normalizeWa(input) {
  let digits = String(input).replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (digits.startsWith("8")) digits = "62" + digits;
  return digits;
}

/* ---------- Toast ---------- */

export function toast(message, type = "ok") {
  const box = $("#toasts");
  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.setAttribute("role", type === "error" ? "alert" : "status");
  el.textContent = message;
  box.append(el);
  setTimeout(() => {
    el.classList.add("is-leaving");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }, type === "error" ? 5000 : 2200);
}

/* ---------- Konfirmasi ---------- */

/** Dialog konfirmasi. Mengembalikan Promise<boolean>. */
export function ask(message, { confirmLabel = "Hapus", danger = true } = {}) {
  const dlg = $("#askDialog");
  $("#askText").textContent = message;
  const yes = $("#askYes");
  yes.textContent = confirmLabel;
  yes.classList.toggle("btn--danger", danger);
  openDialog(dlg);
  return new Promise((resolve) => {
    const finish = (value) => {
      yes.onclick = null;
      dlg.removeEventListener("close", onClose);
      resolve(value);
    };
    const onClose = () => finish(false);
    yes.onclick = () => { finish(true); closeDialog(dlg); };
    dlg.addEventListener("close", onClose, { once: true });
  });
}

/* ---------- Form dialog ---------- */

const formDialog = () => $("#formDialog");

/**
 * Tampilkan form di dialog.
 * onSubmit(formData, form) boleh mengembalikan false agar dialog tidak ditutup.
 */
export function openForm({ title, body, submitLabel = "Simpan", onSubmit }) {
  const dlg = formDialog();
  $("#formBody").innerHTML = `
    <h2>${esc(title)}</h2>
    <form id="theForm" novalidate>
      ${body}
      <div class="row form-actions">
        <button class="btn btn--accent" type="submit">${esc(submitLabel)}</button>
        <button class="btn btn--ghost" type="button" data-close>Batal</button>
      </div>
    </form>`;
  const form = $("#theForm");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const submit = $("[type=submit]", form);
    submit.disabled = true;
    try {
      const result = await onSubmit(new FormData(form), form);
      if (result !== false) closeDialog(dlg);
    } catch (error) {
      toast(error.message, "error");
    } finally {
      submit.disabled = false;
    }
  });
  if (!dlg.open) { openDialog(dlg); dlg.scrollTop = 0; }
  return form;
}

export const closeForm = () => closeDialog(formDialog());

/* ---------- Field ---------- */

export function field({ label, name, type = "text", value = "", placeholder = "", required = false, options = [], rows = 4, hint = "", attrs = "" }) {
  const common = `name="${esc(name)}" ${required ? "required" : ""} ${attrs}`;
  if (type === "checkbox") {
    return `<label class="check"><input type="checkbox" ${common} ${value ? "checked" : ""}><span>${esc(label)}</span></label>`;
  }
  let control;
  if (type === "textarea") {
    control = `<textarea class="field" ${common} rows="${rows}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;
  } else if (type === "select") {
    control = `<select class="field" ${common}>${options
      .map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(value) ? "selected" : ""}>${esc(o.label)}</option>`)
      .join("")}</select>`;
  } else {
    control = `<input class="field" type="${type}" ${common} value="${esc(value)}" placeholder="${esc(placeholder)}">`;
  }
  return `<label class="lbl"><span>${esc(label)}${required ? " *" : ""}</span>${control}${hint ? `<small>${esc(hint)}</small>` : ""}</label>`;
}

export const loadingHTML = `<div class="skeleton" style="min-height:160px"></div>`;
export const emptyHTML = (text) => `<p class="empty">${esc(text)}</p>`;

/** Saklar geser (untuk Tampil, Unggulan, Aktif). */
export const switchHTML = (fieldName, checked, label) =>
  `<label class="switch"><input type="checkbox" data-field="${fieldName}" ${checked ? "checked" : ""}><span class="switch__track" aria-hidden="true"></span><em>${esc(label)}</em></label>`;
