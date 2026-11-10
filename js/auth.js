/**
 * EDUTRACK AUTHENTICATION & AUDIT LOGGING MODULE
 * Strict Supabase Session Verification & Audit Trail
 */

const AuthModule = {
  // Check if admin is currently authenticated with a real Supabase session
  init: async () => {
    try {
      if (!supabaseClient) {
        console.error("Supabase client is not available.");
        return false;
      }

      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      const isLoginPage = window.location.pathname.endsWith('login.html');

      if (session && session.user) {
        AppState.user = session.user;
        AuthModule.updateUI();

        // If on login page with active session, redirect to dashboard
        if (isLoginPage) {
          window.location.href = "index.html#dashboard";
        }
        return true;
      } else {
        AppState.user = null;
        
        // If on private management dashboard without active session, redirect to login
        if (!isLoginPage && !window.location.hash.includes('preview')) {
          console.warn("Unauthenticated access attempt. Redirecting to login.html...");
          window.location.href = "login.html";
        }
        return false;
      }
    } catch (err) {
      console.error("Auth check error:", err);
      if (!window.location.pathname.endsWith('login.html')) {
        window.location.href = "login.html";
      }
      return false;
    }
  },

  // Perform authentic Supabase login
  login: async (email, password) => {
    if (!supabaseClient) {
      throw new Error("Supabase client is not initialized.");
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    if (!data || !data.session) {
      throw new Error("Failed to establish authenticated session.");
    }

    AppState.user = data.session.user;
    return data.session;
  },

  // Update header and sidebar with authenticated admin details
  updateUI: () => {
    const adminEmailEls = document.querySelectorAll('.admin-email-text');
    const adminRoleEls = document.querySelectorAll('.admin-role-text');
    const email = AppState.user?.email || "Administrator";
    const role = "Master Admin";

    adminEmailEls.forEach(el => el.textContent = email);
    adminRoleEls.forEach(el => el.textContent = role);
  },

  // Log audit event to Supabase
  logAudit: async (action, entityType, entityId, details) => {
    try {
      if (!supabaseClient) return;
      const logEntry = {
        action,
        entity_type: entityType,
        entity_id: String(entityId || ''),
        details: typeof details === 'object' ? details : { info: details },
        actor_email: AppState.user?.email || "admin@edutrack.org",
        created_at: new Date().toISOString()
      };
      await supabaseClient.from('audit_logs').insert([logEntry]);
    } catch (e) {
      console.warn("Audit log notice:", e);
    }
  },

  // Logout cleanly
  logout: async () => {
    if (confirm("Are you sure you want to sign out of the EduTrack Administration panel?")) {
      try {
        if (supabaseClient) {
          await supabaseClient.auth.signOut();
        }
      } catch (e) {
        console.error("Sign out error:", e);
      }
      AppState.user = null;
      window.location.href = "login.html";
    }
  }
};

window.AuthModule = AuthModule;
