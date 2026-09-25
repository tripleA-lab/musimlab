/*************************************************
 * MusimLab — Auth (Google Sign-In)
 * 
 * Cara kerja:
 * 1. User klik butang Google Sign-In
 * 2. Google verify → dapat JWT token
 * 3. Decode token → ambil email
 * 4. Check email == ADMIN_EMAIL
 * 5. Kalau OK → simpan session, redirect admin
 *************************************************/

const Auth = (() => {

  /*************************************************
   * SESSION MANAGEMENT
   *************************************************/
  function saveSession(user) {
    const session = {
      email: user.email,
      name: user.name,
      picture: user.picture,
      loginAt: Date.now(),
      expiresAt: Date.now() + (CONFIG.SESSION_HOURS * 60 * 60 * 1000)
    };
    localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(session));
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(CONFIG.SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      
      // Check expired
      if (Date.now() > session.expiresAt) {
        clearSession();
        return null;
      }
      return session;
    } catch (e) {
      clearSession();
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(CONFIG.SESSION_KEY);
  }

  function isLoggedIn() {
    const session = getSession();
    return session && session.email === CONFIG.ADMIN_EMAIL;
  }

  /*************************************************
   * DECODE JWT (Google ID Token)
   *************************************************/
  function decodeJWT(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("JWT decode error:", e);
      return null;
    }
  }

  /*************************************************
   * LOGIN PAGE — Init Google Button
   *************************************************/
  function initLoginPage() {
    // Kalau dah login → terus redirect ke admin
    if (isLoggedIn()) {
      window.location.href = CONFIG.ADMIN_URL;
      return;
    }

    // Wait for Google library
    if (typeof google === "undefined") {
      setTimeout(initLoginPage, 100);
      return;
    }

    google.accounts.id.initialize({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true
    });

    google.accounts.id.renderButton(
      document.getElementById("googleSignInButton"),
      {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "pill",
        logo_alignment: "left",
        width: 320
      }
    );
  }

  /*************************************************
   * HANDLE GOOGLE RESPONSE
   *************************************************/
  function handleCredentialResponse(response) {
    const errorEl = document.getElementById("errorMessage");
    const loadingEl = document.getElementById("loadingState");
    const btnWrapper = document.getElementById("googleSignInButton");

    // Hide error dulu
    errorEl.style.display = "none";

    // Decode token
    const payload = decodeJWT(response.credential);
    if (!payload) {
      showError("Token tidak sah. Cuba lagi.");
      return;
    }

    // Show loading
    btnWrapper.style.display = "none";
    loadingEl.style.display = "block";

    // Check email
    setTimeout(() => {
      if (payload.email === CONFIG.ADMIN_EMAIL) {
        // ✅ Berjaya
        saveSession({
          email: payload.email,
          name: payload.name,
          picture: payload.picture
        });
        
        // Redirect
        window.location.href = CONFIG.ADMIN_URL;
      } else {
        // ❌ Email tak dibenarkan
        loadingEl.style.display = "none";
        btnWrapper.style.display = "flex";
        showError(`❌ Akses ditolak. Email <strong>${payload.email}</strong> tidak dibenarkan.`);
      }
    }, 600);
  }

  function showError(msg) {
    const errorEl = document.getElementById("errorMessage");
    errorEl.innerHTML = msg;
    errorEl.style.display = "block";
  }

  /*************************************************
   * ADMIN PAGE — Guard
   *************************************************/
  function guardAdminPage() {
    if (!isLoggedIn()) {
      // Belum login → pindah ke login
      window.location.href = CONFIG.LOGIN_URL;
      return false;
    }
    return true;
  }

  /*************************************************
   * LOGOUT
   *************************************************/
  function logout() {
    if (!confirm("Logout dari MusimLab Admin?")) return;
    
    clearSession();
    
    // Disable Google auto-select
    if (typeof google !== "undefined" && google.accounts) {
      google.accounts.id.disableAutoSelect();
    }
    
    window.location.href = CONFIG.LOGIN_URL;
  }

  /*************************************************
   * GET USER INFO
   *************************************************/
  function getUser() {
    const session = getSession();
    if (!session) return null;
    return {
      email: session.email,
      name: session.name,
      picture: session.picture
    };
  }

  /*************************************************
   * AUTO INIT
   *************************************************/
  // Detect halaman mana kita berada
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }

  function autoInit() {
    const path = window.location.pathname;
    
    // Login page
    if (path.endsWith("/mall-musimlab-26/") || 
        path.endsWith("/mall-musimlab-26/index.html")) {
      initLoginPage();
    }
    // Admin page — guard akan handle dalam admin.html
  }

  /*************************************************
   * PUBLIC API
   *************************************************/
  return {
    isLoggedIn,
    getUser,
    logout,
    guardAdminPage,
    clearSession
  };

})();
