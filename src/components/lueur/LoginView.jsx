const AUTH_ERRORS = {
  access_denied: "Accès refusé — ce compte Google n'est pas autorisé.",
  consent_required: "Connexion annulée.",
};

export function LoginView({ onLogin, authError, user }) {
  const message = AUTH_ERRORS[authError] || (authError ? "Connexion impossible." : null);

  return (
    <div className="lueur-state-fullscreen lueur-login">
      <div className="lueur-login-card">
        <p className="lueur-login-kicker">Dashboard santé</p>
        <h1 className="lueur-login-title">Lueur</h1>
        <p className="lueur-login-sub">Accès personnel — connexion Google requise.</p>

        {message && <p className="lueur-login-error">{message}</p>}

        {user?.picture && (
          <img className="lueur-login-avatar" src={user.picture} alt="" width={48} height={48} />
        )}

        <button type="button" className="lueur-btn-google" onClick={onLogin}>
          <GoogleMark />
          Se connecter avec Google
        </button>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.083 36 24 36c-5.963 0-11-4.037-11-9s4.037-9 11-9c2.52 0 4.847.86 6.691 2.294l6.305-6.305C34.046 8.053 29.268 6 24 6 12.955 6 4 14.955 4 26s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c2.52 0 4.847.86 6.691 2.294l6.305-6.305C34.046 8.053 29.268 6 24 6 16.318 6 9.656 10.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 46c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 37.091 26.715 38 24 38c-5.077 0-9.381-3.343-10.832-8.031l-6.522 5.025C9.505 39.556 16.227 46 24 46z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 26c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
