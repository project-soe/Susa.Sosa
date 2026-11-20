/**
 * Susa.Sosa Admin - Akses data (Supabase Auth, REST, Storage)
 * Tanpa library. Sesi disimpan di localStorage dan diperbarui otomatis.
 */
import { CONFIG } from "../config.js";

const SESSION_KEY = "ss-admin-session";
const BASE = CONFIG.supabaseUrl;

export const isConfigured = () => Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);

/* ---------- Sesi ---------- */

const readSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
};
const saveSession = (s) =>
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (s.expires_in ?? 3600),
    })
  );

export const hasSession = () => Boolean(readSession());
export const logout = () => localStorage.removeItem(SESSION_KEY);

async function authRequest(grantType, body) {
  const res = await fetch(`${BASE}/auth/v1/token?grant_type=${grantType}`, {
    method: "POST",
    headers: { apikey: CONFIG.supabaseAnonKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Email atau kata sandi salah");
  saveSession(await res.json());
}

export const login = (email, password) => authRequest("password", { email, password });

async function accessToken() {
  const session = readSession();
  if (!session) throw new Error("Sesi berakhir, silakan masuk lagi");
  if (session.expires_at - 60 < Date.now() / 1000) {
    try {
      await authRequest("refresh_token", { refresh_token: session.refresh_token });
    } catch {
      logout();
      throw new Error("Sesi berakhir, silakan masuk lagi");
    }
  }
  return readSession().access_token;
}

/* ---------- REST ---------- */

const FRIENDLY = {
  23505: "Data dengan nama atau alamat itu sudah ada",
  23503: "Data masih dipakai bagian lain",
  42501: "Akses ditolak oleh keamanan database. Pastikan akun ini memiliki app_metadata.role = admin di Supabase, lalu logout dan login kembali. Lihat README bagian Pengaturan Admin.",
};

/**
 * Permintaan ke tabel Supabase.
 * @param {string} path contoh: "projects?select=*&order=created_at.desc"
 */
export async function rest(path, { method = "GET", body, prefer } = {}) {
  const token = await accessToken();
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: CONFIG.supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) { logout(); location.reload(); }
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(FRIENDLY[detail.code] || detail.message || `Permintaan gagal (${res.status})`);
  }
  return res.status === 204 || method === "DELETE" ? null : res.json().catch(() => null);
}

/** Tambah baris dan kembalikan baris baru. */
export const insert = async (table, row) =>
  (await rest(table, { method: "POST", body: row, prefer: "return=representation" }))[0];

export const update = (table, id, patch) =>
  rest(`${table}?id=eq.${id}`, { method: "PATCH", body: patch, prefer: "return=minimal" });

export const remove = (table, id) => rest(`${table}?id=eq.${id}`, { method: "DELETE" });

/** Simpan banyak pengaturan sekaligus (tambah atau timpa berdasarkan key). */
export const saveSettings = (map) =>
  rest("settings?on_conflict=key", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: Object.entries(map).map(([key, value]) => ({ key, value })),
  });

/* ---------- Storage ---------- */

const PUBLIC_PREFIX = `${BASE}/storage/v1/object/public/media/`;

/** Kompres gambar ke WebP (maks 1600px) agar hemat kuota gratis. */
export async function compressImage(file, maxSize = 1600, quality = 0.82) {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  return blob && blob.size < file.size ? blob : file;
}

/** Unggah gambar ke bucket "media" dan kembalikan URL publik. */
export async function uploadImage(file, folder) {
  const blob = await compressImage(file);
  const ext = blob.type === "image/webp" ? "webp" : (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const token = await accessToken();
  const res = await fetch(`${BASE}/storage/v1/object/media/${path}`, {
    method: "POST",
    headers: { apikey: CONFIG.supabaseAnonKey, Authorization: `Bearer ${token}`, "Content-Type": blob.type || "application/octet-stream" },
    body: blob,
  });
  if (!res.ok) throw new Error("Gagal mengunggah gambar");
  return PUBLIC_PREFIX + path;
}

/** Hapus file di Storage (abaikan jika URL bukan milik bucket kita). */
export async function removeImage(url) {
  if (!url || !url.startsWith(PUBLIC_PREFIX)) return;
  const token = await accessToken();
  await fetch(`${BASE}/storage/v1/object/media/${url.slice(PUBLIC_PREFIX.length)}`, {
    method: "DELETE",
    headers: { apikey: CONFIG.supabaseAnonKey, Authorization: `Bearer ${token}` },
  }).catch(() => {});
}
