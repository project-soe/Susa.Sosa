/**
 * Susa.Sosa - UI helpers
 * Ripple klik tombol, animasi muncul saat scroll, dan dialog preview.
 * Tanpa dependensi.
 */

/** Efek riak pada setiap .btn saat diklik. */
export function initRipple() {
  document.addEventListener("pointerdown", (event) => {
    const btn = event.target.closest(".btn");
    if (!btn || btn.dataset.ripple === "false") return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const dot = document.createElement("span");
    dot.className = "ripple";
    dot.style.cssText = `width:${size}px;height:${size}px;left:${event.clientX - rect.left - size / 2}px;top:${event.clientY - rect.top - size / 2}px`;
    btn.append(dot);
    dot.addEventListener("animationend", () => dot.remove());
  });
}

/** Elemen .reveal muncul halus ketika masuk layar. */
export function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }),
    { threshold: 0.15 }
  );
  items.forEach((el) => observer.observe(el));
}

/** Buka dialog dengan animasi. */
export function openDialog(dialog) {
  dialog.tabIndex = -1;
  dialog.showModal();
  dialog.focus({ preventScroll: true }); // hindari cincin fokus muncul di tombol pertama
  document.documentElement.style.overflow = "hidden";
}

/** Tutup dialog dengan animasi keluar, lalu kembali ke posisi semula. */
export function closeDialog(dialog) {
  if (!dialog.open || dialog.classList.contains("is-closing")) return;
  dialog.classList.add("is-closing");
  dialog.addEventListener("animationend", () => {
    dialog.classList.remove("is-closing");
    dialog.close();
    document.documentElement.style.overflow = "";
  }, { once: true });
}

/** Pasang perilaku tutup (tombol, klik latar, tombol Esc) pada semua dialog. */
export function initDialogs() {
  document.querySelectorAll("dialog.dialog").forEach((dialog) => {
    dialog.addEventListener("cancel", (e) => { e.preventDefault(); closeDialog(dialog); });
    // Delegasi klik: tombol [data-close] yang dibuat belakangan (isi dinamis) ikut bekerja.
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog || e.target.closest("[data-close]")) closeDialog(dialog);
    });
  });
}

/** Intro logo: tampil sebentar, bisa dilewati, hanya sekali per sesi. */
export function initIntro() {
  const intro = document.querySelector(".intro");
  if (!intro) return;
  if (sessionStorage.getItem("intro-seen")) { intro.remove(); return; }
  const finish = () => { intro.classList.add("is-done"); sessionStorage.setItem("intro-seen", "1"); setTimeout(() => intro.remove(), 700); };
  intro.addEventListener("click", finish);
  setTimeout(finish, 2200);
}
