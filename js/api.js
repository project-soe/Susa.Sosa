/**
 * Susa.Sosa - Lapisan data
 * Satu-satunya file yang berbicara ke sumber data (Supabase REST atau data demo).
 * Tanpa library, supaya ringan dan cepat.
 */
import { CONFIG } from "./config.js";

const isDemo = !CONFIG.supabaseUrl;

async function rest(path, options = {}) {
  const res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      // Publishable key dikirim melalui apikey. Jangan jadikan publishable key
      // sebagai Bearer token: Authorization harus berisi JWT user yang valid.
      apikey: CONFIG.supabaseAnonKey,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // PostgREST dengan Prefer: return=minimal memang mengembalikan body kosong.
  // Jangan memanggil res.json() pada respons kosong (akan memicu Unexpected end of JSON).
  const raw = res.status === 204 || res.status === 205 ? "" : await res.text();

  if (!res.ok) {
    let detail = {};
    if (raw) {
      try { detail = JSON.parse(raw); }
      catch { detail = { message: raw }; }
    }
    throw new Error(detail.message || detail.error_description || detail.details || `Permintaan gagal (${res.status})`);
  }

  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Server mengirim respons yang bukan JSON valid.");
  }
}

function normalize(data) {
  const bySort = (a, b) => (a.sort ?? 0) - (b.sort ?? 0);
  data.categories.sort(bySort);
  data.payments.sort(bySort);
  data.projects.forEach((p) => {
    p.media = (p.media ?? []).sort(bySort);
  });
  return data;
}

/** Muat semua data publik sekaligus. */
export async function loadData() {
  if (isDemo) {
    const res = await fetch("data/demo.json");
    if (!res.ok) throw new Error("Data demo tidak ditemukan");
    return normalize(await res.json());
  }
  const [categories, projects, testimonials, settings, payments] = await Promise.all([
    rest("categories?select=*&order=sort"),
    rest("projects?select=*&published=eq.true&order=created_at.desc"),
    rest("testimonials?select=*&published=eq.true&order=created_at.desc"),
    rest("settings?select=*"),
    rest("payment_methods?select=*&active=eq.true&order=sort"),
  ]);

  // Ambil media secara terpisah, bukan embedded relation media(*).
  // Ini lebih tahan terhadap perbedaan metadata relasi PostgREST dan
  // memastikan foto yang sudah diunggah ikut masuk ke kartu proyek.
  const projectIds = projects.map((project) => project.id).filter(Boolean);
  const media = projectIds.length
    ? await rest(`media?select=id,project_id,kind,url,sort,label,label_en&project_id=in.(${projectIds.join(",")})&order=sort.asc`)
    : [];
  const mediaByProject = new Map();
  for (const item of media) {
    if (!mediaByProject.has(item.project_id)) mediaByProject.set(item.project_id, []);
    mediaByProject.get(item.project_id).push(item);
  }
  projects.forEach((project) => {
    project.media = mediaByProject.get(project.id) ?? [];
  });

  return normalize({
    categories,
    projects,
    testimonials,
    settings: Object.fromEntries(settings.map((s) => [s.key, s.value])),
    payments,
  });
}

/** Buat kode pesanan unik, contoh: SS-K3F9QZ. */
function makeOrderCode() {
  return "SS-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * Catat pesanan manual. Harga dan status dikunci di sisi database (trigger),
 * jadi tidak bisa dimanipulasi dari browser.
 * @returns {{code: string}}
 */
export async function createManualOrder(project, buyerName) {
  const code = makeOrderCode();
  if (isDemo) return { code };
  await rest("orders", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      code,
      project_id: project.id,
      buyer_name: buyerName || null,
      method: "manual",
    }),
  });
  return { code };
}
