import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, Megaphone, Plus, Save, ShieldCheck, Trash2, Users, Video, XCircle } from "lucide-react";
import { api } from "../lib/api";
import { AdminPanelSkeleton } from "./Skeletons";
import { Toast } from "./Toast";
import { ThemeToggle } from "./ThemeToggle";

type Payment = {
  id: number;
  reference: string;
  status: string;
  amount: string;
  team: string;
  tournament: string;
  tournament_id: number;
  pending_invites?: string[];
  cancellation_requested?: boolean;
};
type Stats = { users: number; active_tournaments: number; registrations: number; pending_payments: number };
type Tournament = {
  id: number;
  title: string;
  slug: string;
  description: string;
  rules: string;
  match_at: string;
  registration_deadline: string;
  entry_fee: string;
  prize_pool: string;
  status: string;
  live_stream_url?: string;
};
type RosterSlot = {
  slot: number;
  status: string;
  team: string | null;
  captain?: string;
  payment_status?: string;
  players: { player_id: string; username: string; role: string; ign: string; uid: string }[];
};
type Player = {
  id: number;
  player_id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
  date_joined: string;
  game_account: { ign: string; uid: string; game: string } | null;
};

const emptyTournament = {
  title: "",
  slug: "",
  description: "",
  rules: "",
  match_at: "",
  registration_deadline: "",
  entry_fee: "0",
  prize_pool: "0",
  status: "draft",
  live_stream_url: "",
};

function toApiDate(value: string) {
  return value ? new Date(value).toISOString() : value;
}

function PaymentApprovals({
  payments,
  activeTab,
  approvingPayment,
  onVerify,
  onCancel,
}: {
  payments: Payment[];
  activeTab: "overview" | "payments";
  approvingPayment: number | null;
  onVerify: (id: number) => void;
  onCancel: (id: number) => void;
}) {
  return (
    <section className="neo p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between border-b-2 border-black dark:border-white/20 pb-4">
        <div className="flex items-center gap-2.5">
          <CreditCard size={20} strokeWidth={2.5} />
          <div>
            <h3 className="font-black uppercase tracking-tight text-black dark:text-white sm:text-lg">Payment & Squad Approvals</h3>
            <p className="text-xs font-bold text-black/60 dark:text-white/70">
              {activeTab === "overview" ? "Approvals for currently selected tournament." : "Verify fee payments and allocate slots."}
            </p>
          </div>
        </div>
        <span className="border-2 border-black bg-black px-2.5 py-1 text-xs font-black text-white">
          {payments.length} RECORD{payments.length === 1 ? "" : "S"}
        </span>
      </div>

      <div className="space-y-3">
        {payments.map(payment => (
          <div key={payment.id} className="border-2 border-black dark:border-white/20 bg-white dark:bg-[#1a1c23] p-4 shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#c6f36b]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-base text-black dark:text-white">{payment.team}</span>
                  {payment.cancellation_requested && (
                    <span className="border border-black bg-[#FF4757] px-2 py-0.5 text-[10px] font-black uppercase text-white">
                      Cancel Requested
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs font-bold text-black/60 dark:text-white/70">
                  {payment.tournament} · Ref: <span className="font-mono text-black dark:text-[#C6F36B]">{payment.reference}</span>
                </p>
              </div>

              <span
                className={`border-2 border-black px-2.5 py-1 text-xs font-black uppercase tracking-wider ${
                  payment.cancellation_requested
                    ? "bg-[#FF4757] text-white"
                    : payment.status === "verified"
                    ? "bg-[#C6F36B] text-black"
                    : payment.status === "pending"
                    ? "bg-[#FFE600] text-black"
                    : "bg-white dark:bg-[#121316] text-black/70 dark:text-white/70"
                }`}
              >
                {payment.status}
              </span>
            </div>

            {payment.cancellation_requested && (
              <div className="mt-3 border-2 border-black bg-[#FFE600] p-2 text-xs font-black text-black">
                Captain requested team retraction. Approving will release their slot.
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 border-black/10 dark:border-white/10 pt-3">
              <span className="text-sm font-black text-black dark:text-white">
                {Number(payment.amount) === 0 ? "FREE ENTRY" : `ENTRY: ₹${payment.amount}`}
              </span>

              <div className="flex gap-2">
                {payment.cancellation_requested ? (
                  <button
                    type="button"
                    disabled={approvingPayment !== null}
                    onClick={() => onCancel(payment.id)}
                    className="neo-danger min-h-10 px-4 text-xs uppercase tracking-wider text-white disabled:opacity-60 flex items-center gap-1.5"
                  >
                    <XCircle size={15} strokeWidth={2.5} />
                    {approvingPayment === payment.id ? "Processing..." : "Approve Cancellation"}
                  </button>
                ) : payment.status === "pending" ? (
                  <button
                    type="button"
                    disabled={approvingPayment !== null}
                    onClick={() => onVerify(payment.id)}
                    className="neo-solid min-h-10 px-4 text-xs uppercase tracking-wider text-black disabled:opacity-60 flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={16} strokeWidth={3} />
                    {approvingPayment === payment.id ? "Verifying..." : "Verify Payment & Assign Slot"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}

        {!payments.length && (
          <div className="border-2 border-black dark:border-white/20 bg-[#F4EFE6] dark:bg-[#121316] p-8 text-center text-sm font-black uppercase text-black/60 dark:text-white/60">
            {activeTab === "overview" ? "No approvals required for this tournament." : "All payments and registrations up to date."}
          </div>
        )}
      </div>
    </section>
  );
}

export function AdminPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [roster, setRoster] = useState<RosterSlot[]>([]);
  const [tournamentForm, setTournamentForm] = useState(emptyTournament);
  const [announcement, setAnnouncement] = useState({ kind: "tournament", title: "", body: "", published: true });
  const [announcementsList, setAnnouncementsList] = useState<{ id: number; kind: string; title: string; body: string; created_at: string }[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "manage" | "payments" | "players">("overview");
  const [rosterMenuOpen, setRosterMenuOpen] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 4500);
    return () => window.clearTimeout(timer);
  }, [message]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [approvingPayment, setApprovingPayment] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    setLoadError("");
    Promise.all([
      api<Stats>("admin/stats/").then(setStats),
      api<Payment[]>("admin/payments/").then(setPayments),
      api<Player[]>("admin/players").then(data =>
        setPlayers(Array.from(new Map(data.map(player => [player.id, player])).values()))
      ),
      api<Tournament[]>("admin/tournaments/").then(data => {
        setTournaments(data);
        if (!selectedTournament && data[0]) setSelectedTournament(String(data[0].id));
      }),
      api<any[]>("admin/announcements/").then(setAnnouncementsList).catch(() => {}),
    ])
      .catch(error => setLoadError(error instanceof Error ? error.message : "Could not load organiser data."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    if (!selectedTournament) return;
    const tournament = tournaments.find(item => String(item.id) === selectedTournament);
    if (tournament)
      setTournamentForm({
        ...emptyTournament,
        ...tournament,
        match_at: tournament.match_at.slice(0, 16),
        registration_deadline: tournament.registration_deadline.slice(0, 16),
      });
    api<{ slots: RosterSlot[] }>(`admin/tournaments/${selectedTournament}/roster`)
      .then(data => setRoster(data.slots))
      .catch(error => {
        setRoster([]);
        setLoadError(error instanceof Error ? error.message : "Could not load tournament roster.");
      });
  }, [selectedTournament, tournaments]);

  const updateTournamentField = (field: keyof typeof emptyTournament, value: string) =>
    setTournamentForm(current => ({ ...current, [field]: value }));

  const saveTournament = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    try {
      const payload = {
        ...tournamentForm,
        match_at: toApiDate(tournamentForm.match_at),
        registration_deadline: toApiDate(tournamentForm.registration_deadline),
        entry_fee: Number(tournamentForm.entry_fee),
        prize_pool: Number(tournamentForm.prize_pool),
        game: "free_fire",
        mode: "squad",
      };
      if (selectedTournament)
        await api(`admin/tournaments/${selectedTournament}/`, { method: "PATCH", body: JSON.stringify(payload) });
      else {
        const created = await api<Tournament>("admin/tournaments/", { method: "POST", body: JSON.stringify(payload) });
        setSelectedTournament(String(created.id));
      }
      setMessage("Tournament saved. Listing updated.");
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save tournament.");
    }
  };

  const publishAnnouncement = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    try {
      const created = await api<any>("admin/announcements/", { method: "POST", body: JSON.stringify(announcement) });
      setAnnouncement({ kind: "tournament", title: "", body: "", published: true });
      if (created?.id) {
        setAnnouncementsList(current => [created, ...current]);
      } else {
        api<any[]>("admin/announcements/").then(setAnnouncementsList).catch(() => {});
      }
      setMessage("Announcement broadcast to player feed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not publish announcement.");
    }
  };

  const deleteAnnouncement = async (id: number) => {
    if (!window.confirm("Delete this announcement from the public feed? This cannot be undone.")) return;
    setMessage("");
    try {
      await api(`admin/announcements/${id}/`, { method: "DELETE" });
      setAnnouncementsList(current => current.filter(item => item.id !== id));
      setMessage("Announcement deleted successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete announcement.");
    }
  };

  const verify = async (id: number) => {
    setMessage("");
    setApprovingPayment(id);
    try {
      const result = await api<{ status: string; slot: number | null }>(`admin/payments/${id}/verify/`, {
        method: "POST",
      });
      setMessage(
        result.slot
          ? `Payment verified! Slot ${String(result.slot).padStart(2, "0")} allocated.`
          : "Payment approved."
      );
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment approval failed.");
    } finally {
      setApprovingPayment(null);
    }
  };

  const cancelPayment = async (id: number) => {
    setMessage("");
    setApprovingPayment(id);
    try {
      await api(`admin/payments/${id}/cancel/`, { method: "POST" });
      setMessage("Cancellation confirmed and slot released.");
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cancellation approval failed.");
    } finally {
      setApprovingPayment(null);
    }
  };

  const deletePlayer = async (player: Player) => {
    if (
      !window.confirm(
        `Delete player ${player.name || player.username} (${player.player_id})? This cannot be undone.`
      )
    )
      return;
    setMessage("");
    try {
      await api(`admin/players/${player.id}`, { method: "DELETE" });
      setPlayers(current => current.filter(item => item.id !== player.id));
      setMessage("Player account deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete player details.");
    }
  };

  const visiblePayments =
    activeTab === "overview" && selectedTournament
      ? payments.filter(payment => String(payment.tournament_id) === selectedTournament)
      : payments;
  const cancellationRequests = payments.filter(payment => payment.cancellation_requested).length;

  return (
    <div className="space-y-6">
      {/* Top Organiser Bar */}
      <div className="neo p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center border-2 border-black bg-[#C6F36B] text-black">
            <ShieldCheck size={22} strokeWidth={2.5} />
          </div>
          <div>
            <span className="neo-badge">PROTECTED ORGANISER ACCESS</span>
            <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-black dark:text-white sm:text-2xl">
              AAG eSports Dashboard
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <a
            href="/"
            className="neo-ghost inline-flex min-h-10 items-center px-4 text-xs font-black uppercase tracking-wider text-white"
          >
            Open Player App →
          </a>
        </div>
      </div>

      <Toast message={loadError} tone="error" />
      <Toast message={message} tone="success" />

      {loading && <AdminPanelSkeleton />}

      {!loading && (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Total Players", stats.users, "bg-white dark:bg-[#1a1c23] text-black dark:text-white", "text-black/70 dark:text-white/70"],
                ["Active Tournaments", stats.active_tournaments, "bg-[#C6F36B] text-black", "text-black/70"],
                ["Registrations", stats.registrations, "bg-white dark:bg-[#1a1c23] text-black dark:text-white", "text-black/70 dark:text-white/70"],
                ["Pending Payments", stats.pending_payments, "bg-[#FFE600] text-black", "text-black/70"],
              ].map(([label, value, cardClass, labelClass]) => (
                <div key={label as string} className={`border-[3px] border-black dark:border-white/20 p-4 shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#c6f36b] ${cardClass}`}>
                  <p className={`text-xs font-black uppercase tracking-wider ${labelClass}`}>{label}</p>
                  <p className="mt-2 text-3xl font-black">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="neo p-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`min-h-11 border-2 p-2 text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === "overview"
                  ? "border-black bg-[#C6F36B] text-black shadow-[3px_3px_0px_#000000]"
                  : "border-transparent text-black dark:text-white hover:border-black dark:hover:border-white/30 hover:bg-[#F4EFE6] dark:hover:bg-[#252836]"
              }`}
            >
              Overview & Roster
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("manage")}
              className={`min-h-11 border-2 p-2 text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === "manage"
                  ? "border-black bg-[#C6F36B] text-black shadow-[3px_3px_0px_#000000]"
                  : "border-transparent text-black dark:text-white hover:border-black dark:hover:border-white/30 hover:bg-[#F4EFE6] dark:hover:bg-[#252836]"
              }`}
            >
              Manage Tournaments
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("payments")}
              className={`min-h-11 border-2 p-2 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "payments"
                  ? "border-black bg-[#C6F36B] text-black shadow-[3px_3px_0px_#000000]"
                  : "border-transparent text-black dark:text-white hover:border-black dark:hover:border-white/30 hover:bg-[#F4EFE6] dark:hover:bg-[#252836]"
              }`}
            >
              <CreditCard size={15} strokeWidth={2.5} />
              <span>Payments</span>
              {payments.filter(payment => payment.status === "pending").length + cancellationRequests > 0 && (
                <span className="border border-black bg-[#FF4757] px-1.5 py-0.2 text-[10px] font-black text-white">
                  {payments.filter(payment => payment.status === "pending").length + cancellationRequests}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("players")}
              className={`min-h-11 border-2 p-2 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "players"
                  ? "border-black bg-[#C6F36B] text-black shadow-[3px_3px_0px_#000000]"
                  : "border-transparent text-black dark:text-white hover:border-black dark:hover:border-white/30 hover:bg-[#F4EFE6] dark:hover:bg-[#252836]"
              }`}
            >
              <Users size={15} strokeWidth={2.5} />
              <span>Players ({players.length})</span>
            </button>
          </div>

          {/* TAB: MANAGE */}
          {activeTab === "manage" && (
            <>
              <section className="neo p-5 sm:p-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b-2 border-black dark:border-white/20 pb-4">
                  <div className="flex items-center gap-2">
                    <Video size={20} strokeWidth={2.5} />
                    <h3 className="text-xl font-black uppercase tracking-tight text-black dark:text-white">Tournament Editor</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTournament("");
                      setTournamentForm(emptyTournament);
                    }}
                    className="neo-solid min-h-10 px-3 text-xs uppercase tracking-wider text-black flex items-center gap-1.5"
                  >
                    <Plus size={16} strokeWidth={3} /> Create New Tournament
                  </button>
                </div>

                <div className="mb-6 grid gap-2.5 sm:grid-cols-2">
                  {tournaments.map(tournament => (
                    <button
                      type="button"
                      key={tournament.id}
                      onClick={() => setSelectedTournament(String(tournament.id))}
                      className={`border-2 p-3 text-left transition-all ${
                        String(tournament.id) === selectedTournament
                          ? "border-black bg-[#C6F36B] text-black shadow-[3px_3px_0px_#000000]"
                          : "border-black dark:border-white/20 bg-white dark:bg-[#121316] text-black dark:text-white hover:bg-[#F4EFE6] dark:hover:bg-[#252836]"
                      }`}
                    >
                      <p className="font-black">{tournament.title}</p>
                      <p className="mt-1 text-xs font-bold text-black/60 dark:text-white/60 uppercase">
                        Status: {tournament.status} · {new Date(tournament.match_at).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>

                <form onSubmit={saveTournament} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">
                        Tournament Title *
                      </label>
                      <input
                        required
                        value={tournamentForm.title}
                        onChange={event => updateTournamentField("title", event.target.value)}
                        className="neo-input"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">
                        URL Slug *
                      </label>
                      <input
                        required
                        value={tournamentForm.slug}
                        onChange={event => updateTournamentField("slug", event.target.value)}
                        className="neo-input"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">
                        Match Date & Time *
                      </label>
                      <input
                        required
                        type="datetime-local"
                        value={tournamentForm.match_at}
                        onChange={event => updateTournamentField("match_at", event.target.value)}
                        className="neo-input"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">
                        Registration Deadline *
                      </label>
                      <input
                        required
                        type="datetime-local"
                        value={tournamentForm.registration_deadline}
                        onChange={event => updateTournamentField("registration_deadline", event.target.value)}
                        className="neo-input"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">
                        Entry Fee (₹) *
                      </label>
                      <input
                        required
                        type="number"
                        value={tournamentForm.entry_fee}
                        onChange={event => updateTournamentField("entry_fee", event.target.value)}
                        className="neo-input"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">
                        Prize Pool (₹) *
                      </label>
                      <input
                        required
                        type="number"
                        value={tournamentForm.prize_pool}
                        onChange={event => updateTournamentField("prize_pool", event.target.value)}
                        className="neo-input"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">
                        Tournament Status *
                      </label>
                      <select
                        value={tournamentForm.status}
                        onChange={event => updateTournamentField("status", event.target.value)}
                        className="neo-input"
                      >
                        <option value="draft">Draft</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">
                      Tournament Description *
                    </label>
                    <textarea
                      required
                      value={tournamentForm.description}
                      onChange={event => updateTournamentField("description", event.target.value)}
                      className="neo-input min-h-24"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">
                      Match Rules & Requirements
                    </label>
                    <textarea
                      value={tournamentForm.rules}
                      onChange={event => updateTournamentField("rules", event.target.value)}
                      className="neo-input min-h-20"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">
                      YouTube Live Stream URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://youtube.com/watch?v=..."
                      value={tournamentForm.live_stream_url}
                      onChange={event => updateTournamentField("live_stream_url", event.target.value)}
                      className="neo-input"
                    />
                  </div>

                  <button
                    type="submit"
                    className="neo-solid min-h-12 px-6 text-xs uppercase tracking-wider text-black flex items-center gap-2"
                  >
                    <Save size={18} strokeWidth={2.5} /> Save Tournament
                  </button>
                </form>
              </section>

              {/* Announcement Box */}
              <section className="neo p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2 border-b-2 border-black dark:border-white/20 pb-3">
                  <Megaphone size={20} strokeWidth={2.5} />
                  <h3 className="text-xl font-black uppercase tracking-tight text-black dark:text-white">Publish News & Feed Update</h3>
                </div>
                <form onSubmit={publishAnnouncement} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">Category</label>
                      <select
                        value={announcement.kind}
                        onChange={event => setAnnouncement(current => ({ ...current, kind: event.target.value }))}
                        className="neo-input"
                      >
                        <option value="tournament">Tournament Update</option>
                        <option value="schedule">Schedule Announcement</option>
                        <option value="news">Platform News</option>
                        <option value="maintenance">Maintenance Alert</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">Headline *</label>
                      <input
                        required
                        value={announcement.title}
                        onChange={event => setAnnouncement(current => ({ ...current, title: event.target.value }))}
                        placeholder="e.g. Registrations now open for Season 01!"
                        className="neo-input"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">Details *</label>
                    <textarea
                      required
                      value={announcement.body}
                      onChange={event => setAnnouncement(current => ({ ...current, body: event.target.value }))}
                      placeholder="Write announcement details for players..."
                      className="neo-input min-h-24"
                    />
                  </div>
                  <button
                    type="submit"
                    className="neo-solid min-h-12 px-6 text-xs uppercase tracking-wider text-black"
                  >
                    Broadcast Announcement
                  </button>
                </form>

                {/* List of Published Announcements with Delete Button */}
                <div className="mt-8 border-t-2 border-black dark:border-white/20 pt-6">
                  <h4 className="mb-4 text-sm font-black uppercase tracking-wider text-black dark:text-white">
                    Published Updates ({announcementsList.length})
                  </h4>

                  <div className="space-y-3">
                    {announcementsList.map(item => (
                      <div
                        key={item.id}
                        className="border-2 border-black dark:border-white/20 bg-white dark:bg-[#121316] p-4 shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#c6f36b] flex flex-wrap items-start justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="neo-badge">{item.kind}</span>
                            <h5 className="font-black text-sm uppercase text-black dark:text-white truncate">{item.title}</h5>
                          </div>
                          <p className="mt-2 text-xs font-semibold text-black/75 dark:text-white/80 line-clamp-2">{item.body}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => deleteAnnouncement(item.id)}
                          className="neo-danger min-h-9 px-3 text-xs uppercase tracking-wider text-white flex items-center gap-1.5 shrink-0"
                        >
                          <Trash2 size={14} strokeWidth={2.5} /> Delete
                        </button>
                      </div>
                    ))}

                    {!announcementsList.length && (
                      <p className="text-center text-xs font-bold uppercase text-black/50 dark:text-white/50 py-3">
                        No announcements posted yet.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && (
            <section className="neo p-5 sm:p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b-2 border-black dark:border-white/20 pb-4">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-black dark:text-white">12-Slot Custom Room Roster</h3>
                  <p className="text-xs font-bold text-black/60 dark:text-white/70">
                    Review assigned custom room slots, team captains, and players.
                  </p>
                </div>

                <div className="relative min-w-60">
                  <button
                    type="button"
                    aria-expanded={rosterMenuOpen}
                    onClick={() => setRosterMenuOpen(open => !open)}
                    className="neo-input flex w-full items-center justify-between text-left font-black"
                  >
                    <span className="truncate">
                      {tournaments.find(tournament => String(tournament.id) === selectedTournament)?.title || "Select Tournament"}
                    </span>
                    <span className="text-black dark:text-[#C6F36B]">▼</span>
                  </button>

                  {rosterMenuOpen && (
                    <div className="neo absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-60 overflow-y-auto p-1 shadow-[5px_5px_0px_#000000] dark:shadow-[5px_5px_0px_#c6f36b]">
                      {tournaments.map(tournament => (
                        <button
                          type="button"
                          key={tournament.id}
                          onClick={() => {
                            setSelectedTournament(String(tournament.id));
                            setRosterMenuOpen(false);
                          }}
                          className={`w-full p-2.5 text-left text-xs font-black uppercase transition-colors ${
                            String(tournament.id) === selectedTournament
                              ? "bg-[#C6F36B] text-black"
                              : "text-black dark:text-white hover:bg-[#F4EFE6] dark:hover:bg-[#252836]"
                          }`}
                        >
                          <span className="block truncate">{tournament.title}</span>
                          <span className="mt-0.5 block text-[10px] text-black/60 dark:text-white/60">
                            {tournament.status} · {new Date(tournament.match_at).toLocaleDateString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Roster slots 1 to 12 */}
              <div className="space-y-3">
                {roster.map(slot => (
                  <article
                    key={slot.slot}
                    className={`border-2 border-black dark:border-white/20 p-4 shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#c6f36b] ${
                      slot.status === "confirmed" ? "bg-[#F7FFF0] dark:bg-[#1a2e1d]" : "bg-white dark:bg-[#121316]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-black bg-[#C6F36B] text-sm font-black text-black">
                          {String(slot.slot).padStart(2, "0")}
                        </span>
                        <div>
                          <p className="font-black text-base text-black dark:text-white">{slot.team || "SLOT VACANT"}</p>
                          <p className="text-xs font-bold uppercase text-black/60 dark:text-white/70">
                            Status: {slot.status} {slot.payment_status ? `· Fee: ${slot.payment_status}` : ""}
                          </p>
                        </div>
                      </div>

                      {slot.captain && (
                        <span className="border border-black dark:border-white/20 bg-white dark:bg-[#1a1c23] px-2.5 py-1 text-xs font-black text-black dark:text-white">
                          Captain: {slot.captain}
                        </span>
                      )}
                    </div>

                    {slot.players.length > 0 && (
                      <div className="mt-3 overflow-x-auto border-t-2 border-black/10 dark:border-white/10 pt-3">
                        <table className="w-full min-w-[500px] text-left text-xs font-bold">
                          <thead>
                            <tr className="border-b-2 border-black dark:border-white/20 text-black/70 dark:text-white/70">
                              <th className="pb-1.5 uppercase">Player ID</th>
                              <th className="pb-1.5 uppercase">Free Fire IGN</th>
                              <th className="pb-1.5 uppercase">Player UID</th>
                              <th className="pb-1.5 uppercase">Role</th>
                            </tr>
                          </thead>
                          <tbody>
                            {slot.players.map(player => (
                              <tr key={`${slot.slot}-${player.player_id}`} className="border-b border-black/10 dark:border-white/10">
                                <td className="py-2 font-mono font-black text-black dark:text-[#C6F36B]">{player.player_id}</td>
                                <td className="py-2 text-black dark:text-white">{player.ign || "—"}</td>
                                <td className="py-2 font-mono text-black dark:text-white">{player.uid}</td>
                                <td className="py-2 uppercase">
                                  <span className={player.role === "captain" ? "bg-[#C6F36B] px-1.5 py-0.5 border border-black text-black text-[10px]" : "text-black/60 dark:text-white/60"}>
                                    {player.role}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* TAB: PAYMENTS (Or shown in Overview) */}
          {(activeTab === "overview" || activeTab === "payments") && (
            <PaymentApprovals
              payments={visiblePayments}
              activeTab={activeTab}
              approvingPayment={approvingPayment}
              onVerify={verify}
              onCancel={cancelPayment}
            />
          )}

          {/* TAB: PLAYERS */}
          {activeTab === "players" && (
            <section className="neo p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between border-b-2 border-black dark:border-white/20 pb-4">
                <div className="flex items-center gap-2">
                  <Users size={20} strokeWidth={2.5} />
                  <h3 className="text-xl font-black uppercase tracking-tight text-black dark:text-white">Player Directory</h3>
                </div>
                <span className="neo-badge">{players.length} Registered Players</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-xs font-bold">
                  <thead>
                    <tr className="border-b-2 border-black dark:border-white/20 bg-[#F4EFE6] dark:bg-[#121316] text-black dark:text-white">
                      <th className="p-3 uppercase">Player ID</th>
                      <th className="p-3 uppercase">Username</th>
                      <th className="p-3 uppercase">Free Fire IGN</th>
                      <th className="p-3 uppercase">UID</th>
                      <th className="p-3 uppercase">Contact</th>
                      <th className="p-3 uppercase">Status</th>
                      <th className="p-3 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map(player => (
                      <tr key={player.id} className="border-b border-black/10 dark:border-white/10 hover:bg-[#F9F6F0] dark:hover:bg-[#252836]/60">
                        <td className="p-3 font-mono font-black text-black dark:text-[#C6F36B]">{player.player_id}</td>
                        <td className="p-3 font-black text-black dark:text-white">
                          {player.name || player.username}
                          {player.name && <span className="block text-[11px] font-normal text-black/60 dark:text-white/60">@{player.username}</span>}
                        </td>
                        <td className="p-3 text-black dark:text-white">{player.game_account?.ign || "—"}</td>
                        <td className="p-3 font-mono text-black dark:text-white">{player.game_account?.uid || "—"}</td>
                        <td className="p-3 text-black/70 dark:text-white/70">
                          {player.email || "—"}
                          {player.phone && <span className="block text-[11px] text-black/50 dark:text-white/50">{player.phone}</span>}
                        </td>
                        <td className="p-3">
                          <span
                            className={`border border-black px-2 py-0.5 text-[10px] font-black uppercase ${
                              player.is_active ? "bg-[#C6F36B] text-black" : "bg-[#FF4D4D] text-white"
                            }`}
                          >
                            {player.is_active ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => deletePlayer(player)}
                            className="neo-danger min-h-8 px-2.5 text-[11px] uppercase tracking-wider text-white flex items-center gap-1"
                          >
                            <Trash2 size={13} strokeWidth={2.5} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!players.length && (
                <div className="p-8 text-center text-sm font-black uppercase text-black/50 dark:text-white/50">
                  No registered player records found.
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
