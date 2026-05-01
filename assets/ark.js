/* ============================================================
   ark.js — ArkDez shared utilities
   Used by all freelancer pages
============================================================ */

const ARK = (function () {

  // ── Config ─────────────────────────────────────────────────
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzsjcZmIhwJF5DslXrFTPZJENckjKB_3re9qK73dewpLCCUNBcEi4-_iHBr6UvhVCSQpA/exec";
  const LOGIN_URL  = "/freelancer/login";
  const API_KEY    = "d29bb7407783daa176e5f6cf8dfc6677940df38fda145b06";

  // ── API ────────────────────────────────────────────────────
  async function api(payload) {
    const body = new Blob([JSON.stringify({ ...payload, apiKey: API_KEY })], { type: "text/plain" });
    const res  = await fetch(SCRIPT_URL, { method: "POST", body });
    return res.json();
  }

  // ── Storage ────────────────────────────────────────────────
  function getToken() {
    return localStorage.getItem("ark_token") || sessionStorage.getItem("ark_token");
  }

  function getUser() {
    const s = localStorage.getItem("ark_user") || sessionStorage.getItem("ark_user");
    try { return s ? JSON.parse(s) : null; } catch(e) { return null; }
  }

  function setUser(user, remember = true) {
    const store = remember ? localStorage : sessionStorage;
    store.setItem("ark_user", JSON.stringify(user));
  }

  function clearSession() {
    ["ark_token", "ark_user"].forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  }

  // ── Auth guard ─────────────────────────────────────────────
  // Call at the top of every protected page
  async function requireAuth(onSuccess) {
    const token = getToken();
    if (!token) {
      // No token — use cached user or redirect
      const cached = getUser();
      if (cached) { onSuccess(cached); return; }
      return redirect();
    }

    // Try to validate with 10s timeout — always fall back to cached user on any failure
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 10000);
      const body = new Blob([JSON.stringify({ action: "validate_token", token, apiKey: API_KEY })], { type: "text/plain" });
      const fetchRes = await fetch(SCRIPT_URL, { method: "POST", body, signal: controller.signal });
      clearTimeout(tid);
      const res = await fetchRes.json();
      if (res.success) {
        setUser(res.user);
        onSuccess(res.user);
      } else {
        // Server rejected token — use cached user if available, else redirect
        const cached = getUser();
        if (cached) { onSuccess(cached); return; }
        redirect();
      }
    } catch(e) {
      // Timeout, network error, or JSON parse failure — use cached user
      const cached = getUser();
      if (cached) { onSuccess(cached); return; }
      redirect();
    }
  }

  function redirect() {
    window.location.href = LOGIN_URL;
  }

  // ── Logout ─────────────────────────────────────────────────
  async function logout() {
    const token = getToken();
    clearSession();
    if (SCRIPT_URL && token) {
      try { await api({ action: "logout", token }); } catch(e) {}
    }
    showToast("Signed out. See you soon!", "success");
    setTimeout(() => { window.location.href = LOGIN_URL; }, 900);
  }

  // ── Toast ──────────────────────────────────────────────────
  function showToast(msg, type = "") {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }
    const icons = {
      success: '<polyline points="20 6 9 17 4 12"/>',
      error:   '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
      warn:    '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      info:    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
    };
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink:0">${icons[type] || icons.info}</svg>${escHtml(msg)}`;
    container.appendChild(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 300); }, 3500);
  }

  // ── Sidebar ────────────────────────────────────────────────
  function openSidebar() {
    document.getElementById("sidebar")?.classList.add("open");
    document.getElementById("sidebar-overlay")?.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeSidebar() {
    document.getElementById("sidebar")?.classList.remove("open");
    document.getElementById("sidebar-overlay")?.classList.remove("open");
    document.body.style.overflow = "";
  }

  // ── User menu ──────────────────────────────────────────────
  let _userMenuOpen = false;
  function toggleUserMenu() {
    _userMenuOpen = !_userMenuOpen;
    document.getElementById("user-menu")?.classList.toggle("open", _userMenuOpen);
  }
  function closeUserMenu() {
    _userMenuOpen = false;
    document.getElementById("user-menu")?.classList.remove("open");
  }

  // ── Notifications ──────────────────────────────────────────
  function toggleNotifications() {
    document.getElementById("notif-overlay")?.classList.toggle("open");
    document.getElementById("notif-drawer")?.classList.toggle("open");
  }
  function closeNotifications() {
    document.getElementById("notif-overlay")?.classList.remove("open");
    document.getElementById("notif-drawer")?.classList.remove("open");
  }

  // ── Boot sidebar UI with user data ─────────────────────────
  function bootSidebar(user) {
    const { firstName, lastName, email, workspaceName } = user;
    const initials = ((firstName || "?")[0] + (lastName || "")[0]).toUpperCase();
    document.getElementById("user-name")?.textContent && (document.getElementById("user-name").textContent = firstName + " " + lastName);
    document.getElementById("user-email")?.textContent && (document.getElementById("user-email").textContent = email);
    document.getElementById("user-av")?.textContent && (document.getElementById("user-av").textContent = initials);
    document.getElementById("ws-name")?.textContent && (document.getElementById("ws-name").textContent = workspaceName || "My Workspace");
    document.getElementById("ws-av")?.textContent && (document.getElementById("ws-av").textContent = (workspaceName || "W")[0].toUpperCase());
  }

  // ── Escape key handler ─────────────────────────────────────
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeSidebar(); closeUserMenu(); closeNotifications(); }
  });

  // Close user menu on outside click
  document.addEventListener("click", e => {
    if (!e.target.closest("#user-menu") &&
        !e.target.closest("#user-pill") &&
        !e.target.closest(".workspace-pill")) {
      closeUserMenu();
    }
  });

  // ── Utils ──────────────────────────────────────────────────
  function escHtml(str) {
    return String(str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function initials(name) {
    return (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch(e) { return iso; }
  }

  function fmtCurrency(amount, currency = "USD") {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount || 0);
    } catch(e) { return "$" + (amount || 0); }
  }

  function timeAgo(iso) {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)   return "Just now";
    if (m < 60)  return m + "m ago";
    const h = Math.floor(m / 60);
    if (h < 24)  return h + "h ago";
    const d = Math.floor(h / 24);
    if (d < 7)   return d + "d ago";
    return fmtDate(iso);
  }

  function badge(status) {
    const map = {
      active:    "badge-active",
      inactive:  "badge-draft",
      pending:   "badge-pending",
      draft:     "badge-draft",
      paid:      "badge-paid",
      overdue:   "badge-overdue",
      completed: "badge-completed",
      paused:    "badge-paused",
      cancelled: "badge-draft",
      sent:      "badge-pending",
      viewed:    "badge-pending",
      signed:    "badge-completed"
    };
    const cls = map[status] || "badge-draft";
    return `<span class="badge ${cls}"><span class="badge-dot"></span>${escHtml(status)}</span>`;
  }

  function avatarColor(str) {
    const colors = [
      "linear-gradient(135deg,#0a1a0f,#22c55e)",
      "linear-gradient(135deg,#1e3a5f,#3b82f6)",
      "linear-gradient(135deg,#4a0f2e,#ec4899)",
      "linear-gradient(135deg,#2d1b00,#f59e0b)",
      "linear-gradient(135deg,#1a0533,#8b5cf6)",
      "linear-gradient(135deg,#0f2620,#0d9488)"
    ];
    let hash = 0;
    for (let i = 0; i < (str || "").length; i++) hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
    return colors[Math.abs(hash) % colors.length];
  }

  // ── Modal helper ───────────────────────────────────────────
  function openModal(id) {
    document.getElementById(id)?.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeModal(id) {
    document.getElementById(id)?.classList.remove("open");
    document.body.style.overflow = "";
  }

  // ── Public API ─────────────────────────────────────────────
  return {
    api, getToken, getUser, setUser, clearSession,
    requireAuth, logout,
    showToast, escHtml, initials, fmtDate, fmtCurrency, timeAgo, badge, avatarColor,
    openSidebar, closeSidebar,
    toggleUserMenu, closeUserMenu,
    toggleNotifications, closeNotifications,
    bootSidebar, openModal, closeModal
  };

})();
