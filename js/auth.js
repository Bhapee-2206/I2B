/**
 * EDUTRACK AUTHENTICATION & AUDIT LOGGING MODULE
 */

const AuthModule = {
  // Check if admin is currently authenticated
  init: async () => {
    try {
      if (supabaseClient) {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (session && session.user) {
          AppState.user = session.user;
        } else {
          // Check localStorage for offline / single-admin session fallback
          const localAdmin = localStorage.getItem('edutrack_admin_session');
          if (localAdmin) {
            AppState.user = JSON.parse(localAdmin);
          } else {
            // Default active administrative profile for single-admin deployment
            AppState.user = {
              email: "admin@i2b-edu.com",
              role: "Administrator",
              id: "admin-system-id"
            };
            localStorage.setItem('edutrack_admin_session', JSON.stringify(AppState.user));
          }
        }
      }
      AuthModule.updateUI();
    } catch (err) {
      console.warn("Auth initialization notice:", err);
      AppState.user = {
        email: "admin@i2b-edu.com",
        role: "Administrator"
      };
      AuthModule.updateUI();
    }
  },

  // Update header and sidebar with admin details
  updateUI: () => {
    const adminEmailEls = document.querySelectorAll('.admin-email-text');
    const adminRoleEls = document.querySelectorAll('.admin-role-text');
    const email = AppState.user?.email || "admin@i2b-edu.com";
    const role = "Administrator";

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
        entity_id: entityId,
        details: typeof details === 'object' ? details : { info: details },
        actor_email: AppState.user?.email || "admin@i2b-edu.com"
      };
      await supabaseClient.from('audit_logs').insert([logEntry]);
    } catch (e) {
      console.error("Audit log error:", e);
    }
  },

  // Logout
  logout: async () => {
    if (confirm("Are you sure you want to log out of the administration panel?")) {
      try {
        if (supabaseClient) {
          await supabaseClient.auth.signOut();
        }
      } catch (e) {}
      localStorage.removeItem('edutrack_admin_session');
      Utils.showToast("Logged out", "You have been logged out.", "info");
      setTimeout(() => {
        window.location.hash = "#dashboard";
        window.location.reload();
      }, 500);
    }
  }
};

window.AuthModule = AuthModule;
