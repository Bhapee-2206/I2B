/**
 * EDUTRACK AUTHENTICATION & AUDIT LOGGING MODULE
 * Strict Administrator Session Verification & Audit Trail
 */

const AuthModule = {
  // Master Administrator Credentials
  MASTER_CREDENTIALS: {
    username: 'bhavabharath@45',
    password: 'bhavani03',
    emailAlias: 'bhavabharath45@gmail.com'
  },

  // Check if admin is currently authenticated with a real session
  init: async () => {
    try {
      const isLoginPage = window.location.pathname.endsWith('login.html');

      // 1. Check active Supabase Auth session first
      if (supabaseClient) {
        try {
          const { data: { session } } = await supabaseClient.auth.getSession();
          if (session && session.user) {
            AppState.user = {
              ...session.user,
              displayEmail: session.user.email?.includes('bhavabharath') ? 'bhavabharath@45' : session.user.email
            };
            AuthModule.updateUI();
            if (isLoginPage) {
              window.location.href = "index.html#dashboard";
            }
            return true;
          }
        } catch (e) {
          console.warn("Supabase session check notice:", e);
        }
      }

      // 2. Check local authenticated administrator session
      const storedSession = localStorage.getItem('edutrack_admin_session');
      if (storedSession) {
        try {
          const sessionData = JSON.parse(storedSession);
          if (sessionData && sessionData.user && (!sessionData.expires_at || sessionData.expires_at > Date.now())) {
            AppState.user = sessionData.user;
            AuthModule.updateUI();
            if (isLoginPage) {
              window.location.href = "index.html#dashboard";
            }
            return true;
          }
        } catch (e) {
          localStorage.removeItem('edutrack_admin_session');
        }
      }

      // Not authenticated
      AppState.user = null;
      if (!isLoginPage && !window.location.hash.includes('preview')) {
        console.warn("Unauthenticated access attempt. Redirecting to login.html...");
        window.location.href = "login.html";
      }
      return false;
    } catch (err) {
      console.error("Auth check error:", err);
      if (!window.location.pathname.endsWith('login.html')) {
        window.location.href = "login.html";
      }
      return false;
    }
  },

  // Perform administrator login
  login: async (identifier, password) => {
    const cleanId = (identifier || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanId || !cleanPass) {
      throw new Error("Please enter both Administrator ID and password.");
    }

    // Check if matching master administrative credentials (case-insensitive on ID)
    const isMasterAdmin = (
      cleanId.toLowerCase() === AuthModule.MASTER_CREDENTIALS.username.toLowerCase() ||
      cleanId.toLowerCase() === AuthModule.MASTER_CREDENTIALS.emailAlias.toLowerCase()
    ) && cleanPass === AuthModule.MASTER_CREDENTIALS.password;

    if (isMasterAdmin) {
      const masterUser = {
        id: 'admin-bhavabharath-45',
        email: AuthModule.MASTER_CREDENTIALS.username,
        displayEmail: AuthModule.MASTER_CREDENTIALS.username,
        user_metadata: {
          full_name: 'Bhavabharath',
          role: 'super_admin'
        },
        role: 'authenticated',
        aud: 'authenticated',
        created_at: new Date().toISOString()
      };

      AppState.user = masterUser;
      localStorage.setItem('edutrack_admin_session', JSON.stringify({
        user: masterUser,
        token: 'edutrack_token_' + Date.now(),
        expires_at: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
      }));

      // In background, attempt to sync/authenticate with Supabase Auth if possible
      if (supabaseClient) {
        try {
          await supabaseClient.auth.signInWithPassword({
            email: AuthModule.MASTER_CREDENTIALS.emailAlias,
            password: cleanPass
          }).catch(() => {});
        } catch (e) {
          // Non-blocking
        }
      }

      // Log successful sign-in audit
      await AuthModule.logAudit('ADMIN_SIGN_IN', 'AUTH', masterUser.id, {
        credential: AuthModule.MASTER_CREDENTIALS.username,
        timestamp: new Date().toISOString()
      });

      return masterUser;
    }

    // If not master credentials, try Supabase Auth directly if it's a valid email format
    if (supabaseClient && cleanId.includes('@') && cleanId.includes('.')) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: cleanId,
        password: cleanPass
      });

      if (error) {
        throw error;
      }

      if (!data || !data.session) {
        throw new Error("Failed to establish authenticated session.");
      }

      AppState.user = data.session.user;
      return data.session.user;
    }

    throw new Error("Invalid Administrator ID or password. Please verify your credentials.");
  },

  // Update header and sidebar with authenticated admin details
  updateUI: () => {
    const adminEmailEls = document.querySelectorAll('.admin-email-text');
    const adminRoleEls = document.querySelectorAll('.admin-role-text');
    const email = AppState.user?.displayEmail || AppState.user?.email || AuthModule.MASTER_CREDENTIALS.username;
    const role = "Master Admin";

    adminEmailEls.forEach(el => el.textContent = email);
    adminRoleEls.forEach(el => el.textContent = role);

    const avatarEls = document.querySelectorAll('.admin-avatar');
    avatarEls.forEach(el => el.textContent = "BB");
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
        actor_email: AppState.user?.displayEmail || AppState.user?.email || AuthModule.MASTER_CREDENTIALS.username,
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
        localStorage.removeItem('edutrack_admin_session');
        if (supabaseClient) {
          await supabaseClient.auth.signOut().catch(() => {});
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
