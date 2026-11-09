import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Eye, EyeOff, ShieldCheck, Sparkles, Trophy, Flame } from "lucide-react";
import { adminLogin, api, login, register } from "./lib/api";
import { BottomNav } from "./components/BottomNav";
import { Tournament, TournamentCard } from "./components/TournamentCard";
import { ProfilePanel, type UserProfile } from "./components/ProfilePanel";
import { TournamentDetails } from "./components/TournamentDetails";
import { AdminPanel } from "./components/AdminPanel";
import { PlayerSlotCard } from "./components/PlayerSlotCard";
import { ParticipationList } from "./components/ParticipationList";
import { DefaultAvatar } from "./components/DefaultAvatar";
import { PlayerAppSkeleton } from "./components/Skeletons";
import { LiveStreamsPanel } from "./components/LiveStreamsPanel";
import { Toast } from "./components/Toast";
import { ThemeToggle } from "./components/ThemeToggle";

function AuthScreen({ onAuthenticated }: { onAuthenticated: (tokens: { access: string; refresh: string }) => void }) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [form, setForm] = useState({
    identifier: "",
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    ign: "",
    uid: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const update = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: event.target.value });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const created =
        mode === "register"
          ? await register({
              username: form.username.trim(),
              email: form.email.trim(),
              password: form.password,
              first_name: form.first_name.trim(),
              last_name: form.last_name.trim(),
              phone: form.phone.trim(),
              ign: form.ign.trim(),
              uid: form.uid.trim(),
            })
          : null;
      const identifier = created?.username || form.identifier.trim() || form.username.trim();
      const token = await login({ identifier, username: identifier, password: form.password });
      onAuthenticated(token);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Unable to continue. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4EFE6] dark:bg-[#0D0E12] px-4 py-8 text-black dark:text-white sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <ThemeToggle />
        </div>
        {/* Brand Header */}
        <div className="mb-6 text-center">
          <div className="inline-block border-[3px] border-black bg-[#C6F36B] px-4 py-1.5 shadow-[4px_4px_0px_#000000]">
            <span className="text-2xl font-black tracking-tight text-black sm:text-3xl">
              AAG <span className="bg-black text-[#C6F36B] px-1.5">eSports</span>
            </span>
          </div>
          <p className="mt-3 text-xs font-black uppercase tracking-[0.25em] text-black dark:text-white/80">
            Free Fire Squad Tournament Hub
          </p>
        </div>

        {/* Card */}
        <div className="neo p-6 sm:p-8 shadow-[6px_6px_0px_#000000] dark:shadow-[6px_6px_0px_#c6f36b]">
          <div className="mb-6 border-b-2 border-black dark:border-white/20 pb-4">
            <h1 className="text-2xl font-black uppercase tracking-tight text-black dark:text-white sm:text-3xl">
              {mode === "register" ? "Create Player Account" : "Player Sign In"}
            </h1>
            <p className="mt-1 text-xs font-bold text-black/60 dark:text-white/70">
              {mode === "register"
                ? "Join tournaments, form squads, and get your custom room slots."
                : "Sign in with your username, Player ID, or Free Fire UID."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">First Name *</label>
                  <input
                    required
                    value={form.first_name}
                    onChange={update("first_name")}
                    placeholder="First name"
                    className="neo-input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">Last Name</label>
                  <input
                    value={form.last_name}
                    onChange={update("last_name")}
                    placeholder="Last name"
                    className="neo-input"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">
                {mode === "register" ? "Username *" : "Username / Player ID / Free Fire UID *"}
              </label>
              <input
                required
                value={mode === "register" ? form.username : form.identifier}
                onChange={update(mode === "register" ? "username" : "identifier")}
                placeholder={mode === "register" ? "Choose a username" : "Enter username, DZ-ID, or UID"}
                autoComplete="username"
                className="neo-input"
              />
            </div>

            {mode === "register" && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">Email *</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={update("email")}
                      placeholder="player@gmail.com"
                      className="neo-input"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">Phone</label>
                    <input
                      value={form.phone}
                      onChange={update("phone")}
                      placeholder="WhatsApp phone"
                      className="neo-input"
                    />
                  </div>
                </div>

                <div className="border-t-2 border-black dark:border-white/20 pt-3">
                  <p className="mb-2 text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                    <Flame size={15} strokeWidth={2.5} className="text-[#FF4757]" /> Free Fire In-Game Account
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <input
                        required
                        value={form.ign}
                        onChange={update("ign")}
                        placeholder="In-Game Name (IGN)"
                        className="neo-input"
                      />
                    </div>
                    <div>
                      <input
                        required
                        value={form.uid}
                        onChange={update("uid")}
                        placeholder="Free Fire UID"
                        inputMode="numeric"
                        className="neo-input"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">Password *</label>
              <div className="relative">
                <input
                  required
                  minLength={8}
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={update("password")}
                  placeholder="8+ characters"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  className="neo-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 grid w-12 place-items-center text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                </button>
              </div>
            </div>

            <Toast message={error} tone="error" />

            <button
              disabled={loading}
              type="submit"
              className="neo-solid mt-4 min-h-14 w-full text-sm uppercase tracking-wider text-black disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? "Please wait..." : mode === "register" ? "Create Player Account" : "Sign In to Arena"}
            </button>
          </form>

          <div className="mt-6 border-t-2 border-black dark:border-white/20 pt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "register" ? "login" : "register");
                setError("");
                setShowPassword(false);
              }}
              className="text-xs font-black uppercase tracking-wider text-black dark:text-white hover:underline"
            >
              {mode === "register" ? "Already have an account? Sign in →" : "New player? Create an account →"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function AdminLoginScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await adminLogin(password);
      localStorage.setItem("aag_admin_token", result.token);
      onAuthenticated();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Unable to access organiser dashboard.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4EFE6] dark:bg-[#0D0E12] px-4 text-black dark:text-white">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-end">
          <ThemeToggle />
        </div>
        <form onSubmit={submit} className="neo w-full p-6 sm:p-8 shadow-[6px_6px_0px_#000000] dark:shadow-[6px_6px_0px_#c6f36b]">
        <span className="neo-badge">ORGANISER VERIFICATION</span>
        <h1 className="mt-3 text-2xl font-black uppercase tracking-tight text-black dark:text-white">Admin Access</h1>
        <p className="mt-1 text-xs font-bold text-black/60 dark:text-white/70">
          Enter master organiser password to manage matches, allocations, and registrations.
        </p>

        <div className="relative mt-5">
          <input
            required
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={event => setPassword(event.target.value)}
            placeholder="Organiser password"
            className="neo-input pr-12"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(value => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white"
          >
            {showPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
          </button>
        </div>

        <Toast message={error} tone="error" />

        <button
          disabled={loading}
          type="submit"
          className="neo-solid mt-5 min-h-12 w-full text-xs uppercase tracking-wider text-black disabled:opacity-60"
        >
          {loading ? "Verifying..." : "Unlock Organiser Dashboard"}
        </button>
      </form>
    </div>
  </main>
);
}

export default function App() {
  const [active, setActive] = useState("home");
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    try {
      const cached = localStorage.getItem("aag_cache_tournaments");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [liveTournaments, setLiveTournaments] = useState<Tournament[]>([]);
  const [updates, setUpdates] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("aag_cache_updates");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem("aag_cache_profile");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [selected, setSelected] = useState<Tournament | null>(null);
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(Boolean(localStorage.getItem("dropzone_access")));
  const [initialLoading, setInitialLoading] = useState(
    Boolean(localStorage.getItem("dropzone_access")) && !localStorage.getItem("aag_cache_profile")
  );
  const [mySlots, setMySlots] = useState<{ tournament: string; match_at: string; team: string; slot: number | null }[]>(() => {
    try {
      const cached = localStorage.getItem("aag_cache_slots");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [participation, setParticipation] = useState<
    { tournament_id: number; title: string; match_at: string; status: string; team: string; slot: number | null }[]
  >(() => {
    try {
      const cached = localStorage.getItem("aag_cache_participation");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const inviteToken = window.location.pathname.startsWith("/invite/") ? window.location.pathname.split("/")[2] : "";
  const adminRoute = /^\/admin\/?$/.test(window.location.pathname);

  useEffect(() => {
    if (!authenticated) {
      setInitialLoading(false);
      return;
    }
    let mounted = true;
    api<Tournament[]>("tournaments/?status=upcoming")
      .then(data => {
        if (!mounted) return;
        setTournaments(data);
        try { localStorage.setItem("aag_cache_tournaments", JSON.stringify(data)); } catch {}
      })
      .catch(() => {});
    api<Tournament[]>("tournaments/?status=ongoing")
      .then(data => {
        if (!mounted) return;
        setLiveTournaments(data);
      })
      .catch(() => {});
    api<any[]>("announcements/")
      .then(data => {
        if (!mounted) return;
        setUpdates(data);
        try { localStorage.setItem("aag_cache_updates", JSON.stringify(data)); } catch {}
      })
      .catch(() => {});
    api<UserProfile>("me/")
      .then(data => {
        if (!mounted) return;
        setProfile(data);
        try { localStorage.setItem("aag_cache_profile", JSON.stringify(data)); } catch {}
      })
      .catch(() => {
        localStorage.removeItem("dropzone_access");
        localStorage.removeItem("aag_cache_profile");
        setAuthenticated(false);
      })
      .finally(() => {
        if (mounted) setInitialLoading(false);
      });
    api<typeof mySlots>("my/slots")
      .then(data => {
        if (!mounted) return;
        setMySlots(data);
        try { localStorage.setItem("aag_cache_slots", JSON.stringify(data)); } catch {}
      })
      .catch(() => {});
    api<typeof participation>("my/participation")
      .then(data => {
        if (!mounted) return;
        setParticipation(data);
        try { localStorage.setItem("aag_cache_participation", JSON.stringify(data)); } catch {}
      })
      .catch(() => {});
    if (inviteToken)
      api(`teams/invitations/${inviteToken}/claim`, { method: "POST" })
        .then(() => setError("Invite claimed successfully. You are now part of the squad."))
        .catch(exception => setError(exception instanceof Error ? exception.message : "Invite could not be claimed."));
    return () => {
      mounted = false;
    };
  }, [authenticated, inviteToken]);

  const signOut = () => {
    localStorage.removeItem("dropzone_access");
    localStorage.removeItem("dropzone_refresh");
    localStorage.removeItem("aag_cache_profile");
    localStorage.removeItem("aag_cache_tournaments");
    localStorage.removeItem("aag_cache_updates");
    localStorage.removeItem("aag_cache_slots");
    localStorage.removeItem("aag_cache_participation");
    setProfile(null);
    setAuthenticated(false);
    setActive("home");
  };

  // Route 1: Admin Route (Protected by admin token)
  if (adminRoute && !localStorage.getItem("aag_admin_token")) {
    return <AdminLoginScreen onAuthenticated={() => window.location.reload()} />;
  }
  if (adminRoute) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[#F4EFE6] dark:bg-[#0D0E12] px-3 pb-12 pt-6 text-black dark:text-white sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <AdminPanel />
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("aag_admin_token");
              window.location.reload();
            }}
            className="neo-ghost mt-6 min-h-11 px-4 text-xs uppercase tracking-wider text-white"
          >
            Sign out of Organiser Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Route 2: Not Authenticated Player
  if (!authenticated) {
    return (
      <AuthScreen
        onAuthenticated={tokens => {
          localStorage.setItem("dropzone_access", tokens.access);
          localStorage.setItem("dropzone_refresh", tokens.refresh);
          setAuthenticated(true);
        }}
      />
    );
  }

  // Route 3: Initial loading skeleton
  if (initialLoading) {
    return <PlayerAppSkeleton />;
  }

  // Route 4: Admin mode from within player app
  if (active === "admin" && profile?.user.is_admin) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[#F4EFE6] dark:bg-[#0D0E12] px-3 pb-12 pt-6 text-black dark:text-white sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <AdminPanel />
          <button
            type="button"
            onClick={() => setActive("home")}
            className="neo-solid mt-6 min-h-11 px-4 text-xs uppercase tracking-wider text-black"
          >
            Back to Player App
          </button>
        </div>
      </div>
    );
  }

  // Route 5: Full Tournament Details View
  if (selected) {
    return <TournamentDetails tournament={selected} profile={profile!} onBack={() => setSelected(null)} />;
  }

  const activeParticipation = participation.filter(entry => entry.status === "pending" || entry.status === "confirmed");
  const participatedIds = new Set(activeParticipation.map(entry => entry.tournament_id));

  // Route 6: Main App View with Navigation
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F4EFE6] dark:bg-[#0D0E12] text-black dark:text-white transition-colors duration-150">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 pb-24 pt-4 sm:px-6 sm:pt-6 md:grid md:grid-cols-[240px_minmax(0,1fr)] md:pb-8">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block">
          <div className="mb-8 border-[3px] border-black bg-[#C6F36B] p-4 shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#c6f36b]">
            <p className="text-xl font-black tracking-tight text-black">
              AAG <span className="bg-black text-[#C6F36B] px-1.5">eSports</span>
            </p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-black/70">
              AAG eSports
            </p>
          </div>
          <BottomNav active={active} onChange={setActive} />
        </aside>

        {/* Main Content Area */}
        <main key={active} className="tab-content min-w-0">
          {/* Header */}
          <header className="mb-6 flex min-w-0 items-center justify-between gap-3 border-b-2 border-black dark:border-white/20 pb-4 sm:mb-8">
            <div className="min-w-0">
              <span className="neo-badge">AAG eSports</span>
              <h1 className="mt-2 truncate text-2xl font-black uppercase tracking-tight text-black dark:text-white sm:text-3xl">
                {active === "home" ? "Ready to drop?" : active.toUpperCase()}
              </h1>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setActive("profile")}
                aria-label="Open profile"
                className="transition-transform hover:scale-105 active:scale-95"
              >
                <DefaultAvatar name={profile?.user.first_name || profile?.user.username || "Player"} size="md" />
              </button>
            </div>
          </header>

          {/* Custom Room Slot Alert if player is assigned */}
          {mySlots.length > 0 && <PlayerSlotCard slots={mySlots} />}

          <Toast message={error} tone="error" />

          {/* TAB: HOME */}
          {active === "home" && (
            <>
              {/* Neo Brutalist Hero Banner */}
              <section className="neo mb-6 border-[3px] border-black bg-[#C6F36B] p-6 text-black shadow-[6px_6px_0px_#000000] dark:shadow-[6px_6px_0px_#c6f36b] sm:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <span className="border-2 border-black bg-black px-3 py-1 text-xs font-black uppercase tracking-widest text-[#C6F36B]">
                    SEASON 01 TOURNAMENTS
                  </span>
                  <Sparkles size={24} strokeWidth={2.5} />
                </div>
                <p className="mb-2 text-xs font-black uppercase tracking-wider text-black/70">
                  Welcome, {profile?.user.first_name || profile?.user.username} 👋
                </p>
                <h2 className="max-w-md text-3xl font-black leading-tight sm:text-4xl uppercase tracking-tight">
                  Your Squad.<br />Your Moment.
                </h2>
                <p className="mt-3 max-w-sm text-xs font-bold leading-relaxed text-black/75 sm:text-sm">
                  Register your squad, claim custom room slots, and compete for verified prize pools.
                </p>
              </section>

              {/* Player's active tournaments */}
              <ParticipationList entries={activeParticipation} />

              {/* Next upcoming tournaments */}
              <div className="mb-4 mt-8 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Trophy size={20} strokeWidth={2.5} className="text-black dark:text-[#C6F36B]" />
                  <h2 className="text-xl font-black uppercase tracking-tight text-black dark:text-white">Upcoming Tournaments</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActive("tournaments")}
                  className="neo-solid min-h-8 px-3 text-xs font-black uppercase tracking-wider text-black"
                >
                  View All →
                </button>
              </div>

              <div className="space-y-4">
                {tournaments.slice(0, 3).map(tournament => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    participated={participatedIds.has(tournament.id)}
                    onOpen={() => setSelected(tournament)}
                  />
                ))}
                {!tournaments.length && (
                  <div className="neo p-8 text-center text-sm font-black uppercase text-black/60 dark:text-white/60">
                    No upcoming tournaments scheduled yet.
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB: TOURNAMENTS */}
          {active === "tournaments" && (
            <div className="space-y-4">
              {tournaments.map(tournament => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  participated={participatedIds.has(tournament.id)}
                  onOpen={() => setSelected(tournament)}
                />
              ))}
              {!tournaments.length && (
                <div className="neo p-8 text-center text-sm font-black uppercase text-black/60 dark:text-white/60">
                  No tournaments available.
                </div>
              )}
            </div>
          )}

          {/* TAB: STREAMS */}
          {active === "streams" && <LiveStreamsPanel tournaments={liveTournaments} />}

          {/* TAB: UPDATES */}
          {active === "updates" && (
            <div className="space-y-4">
              {updates.map(update => (
                <article key={update.id} className="neo p-5">
                  <span className="neo-badge">{update.kind}</span>
                  <h3 className="mt-2 text-lg font-black uppercase tracking-tight text-black dark:text-white">{update.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-black/75 dark:text-white/80">{update.body}</p>
                </article>
              ))}
              {!updates.length && (
                <div className="neo p-8 text-center text-sm font-black uppercase text-black/60 dark:text-white/60">
                  No community updates posted yet.
                </div>
              )}
            </div>
          )}

          {/* TAB: PROFILE */}
          {active === "profile" && profile && (
            <div className="space-y-6">
              <ProfilePanel profile={profile} onSaved={setProfile} onSignOut={signOut} />
              {profile.user.is_admin && (
                <a
                  href="/admin"
                  className="neo-solid flex min-h-12 w-full items-center justify-center gap-2 text-xs uppercase tracking-wider text-black"
                >
                  <ShieldCheck size={18} strokeWidth={2.5} /> Open Organiser Dashboard
                </a>
              )}
            </div>
          )}
        </main>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <BottomNav active={active} onChange={setActive} />
        </div>
      </div>
    </div>
  );
}
