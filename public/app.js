/* Login session, roles and navigation, shared by every page except the login pages.
This only controls what the browser shows. The real access check happens on
the server (server/auth.js), so editing this file can't unlock any data. */
(function () {
  "use strict";

  const SUPABASE_URL = "https://xwzjokwjhadsliuoufpu.supabase.co";
  const SUPABASE_KEY = "sb_publishable_1cdPK9k5b5eTuXDQ27Qg5g_3sit3svN";
  const LOGIN_PAGE = "/loginAndSignIn/login.html";

  const PAGES = {
    driver: ["index", "survey"],
    supervisor: ["index", "survey", "dashboard", "reports"]
  };
  const LABELS = { driver: "Driver", supervisor: "Supervisor" };

  document.documentElement.classList.add("auth-pending");

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  function goToLogin() {
    window.location.replace(LOGIN_PAGE);
  }

  async function accessToken() {
    const { data } = await client.auth.getSession();
    return data.session ? data.session.access_token : null;
  }

  window.api = async function (url, options = {}) {
    const token = await accessToken();
    if (!token) {
      goToLogin();
      throw new Error("Not logged in.");
    }
    const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) goToLogin();
    return res;
  };

  window.authReady = (async () => {
    const res = await window.api("/api/me");
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      showBlocked(body.error || `Couldn't check your account (error ${res.status}).`);
      throw new Error(body.error || "Account check failed.");
    }
    applyUser(body.user);
    return body.user;
  })();
  window.authReady.catch(() => {});

  function applyUser(user) {
    const allowed = PAGES[user.role] || [];
    const page = document.body.dataset.page;
    if (page && !allowed.includes(page)) {
      window.location.replace("/index.html");
      return;
    }

    document.querySelectorAll("[data-page-link]").forEach(link => {
      link.hidden = !allowed.includes(link.dataset.pageLink);
    });
    document.querySelectorAll("[data-role-label]").forEach(el => { el.textContent = LABELS[user.role] || user.role; });
    document.querySelectorAll("[data-user-name]").forEach(el => { el.textContent = user.name; });

    document.documentElement.classList.remove("auth-pending");
  }

  function showBlocked(message) {
    const main = document.querySelector("main");
    if (main) {
      const box = document.createElement("section");
      box.className = "panel";
      const p = document.createElement("p");
      p.textContent = message;
      box.append(p);
      main.replaceChildren(box);
    }
    document.querySelectorAll("[data-page-link]").forEach(link => { link.hidden = link.dataset.pageLink !== "index"; });
    document.documentElement.classList.remove("auth-pending");
  }

  async function logOut() {
    try {
      await client.auth.signOut();
    } finally {
      goToLogin();
    }
  }

  document.querySelectorAll("[data-logout]").forEach(button => button.addEventListener("click", logOut));

  // logging out in one tab logs out every tab
  client.auth.onAuthStateChange(event => {
    if (event === "SIGNED_OUT") goToLogin();
  });
})();
