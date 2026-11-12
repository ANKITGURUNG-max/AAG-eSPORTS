import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Check, CreditCard, ShieldCheck, Edit3, XCircle, Users, Search, X } from "lucide-react";
import { api } from "../lib/api";
import type { Tournament } from "./TournamentCard";
import type { UserProfile } from "./ProfilePanel";
import { RegistrationPanelSkeleton } from "./Skeletons";
import { Toast } from "./Toast";
import { DefaultAvatar } from "./DefaultAvatar";

type FriendOption = {
  id: number;
  username: string;
  ign: string;
  uid: string;
  player_id: string;
  photo: string | null;
};

function FriendPicker({
  friends,
  onSelect,
  onClose,
  exclude,
}: {
  friends: FriendOption[];
  onSelect: (f: FriendOption) => void;
  onClose: () => void;
  exclude: string[];
}) {
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const filtered = friends.filter(
    (f) =>
      !exclude.includes(f.uid) &&
      !exclude.includes(f.player_id) &&
      (query === "" ||
        f.username.toLowerCase().includes(query.toLowerCase()) ||
        f.ign.toLowerCase().includes(query.toLowerCase()) ||
        f.uid.includes(query))
  );

  return (
    <div
      ref={ref}
      className="absolute left-0 right-0 top-full z-30 mt-1 border-[3px] border-black bg-white dark:bg-[#1a1c23] shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#c6f36b]"
    >
      <div className="border-b-2 border-black dark:border-white/20 p-2">
        <div className="flex items-center gap-2 border-2 border-black dark:border-white/20 bg-[#F4EFE6] dark:bg-[#252836] px-2 py-1">
          <Search size={13} strokeWidth={2.5} className="shrink-0 text-black/50 dark:text-white/50" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search friend by IGN or UID..."
            className="w-full bg-transparent text-xs font-semibold text-black dark:text-white outline-none placeholder:text-black/40 dark:placeholder:text-white/40"
          />
        </div>
      </div>
      <div className="max-h-52 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="p-4 text-center text-xs font-black uppercase text-black/50 dark:text-white/50">
            {friends.length === 0 ? "No friends yet — add some first!" : "No matching friends"}
          </p>
        ) : (
          filtered.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelect(f)}
              className="flex w-full items-center gap-3 border-b border-black/10 dark:border-white/10 px-3 py-2 text-left hover:bg-[#C6F36B] dark:hover:bg-[#2a2d3a] transition-colors"
            >
              {f.photo ? (
                <img src={f.photo} alt={f.username} className="h-8 w-8 shrink-0 border-2 border-black object-cover" />
              ) : (
                <DefaultAvatar name={f.username} size="sm" />
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-black uppercase text-black dark:text-white">{f.ign}</p>
                <p className="truncate text-[10px] font-semibold text-black/60 dark:text-white/60">
                  @{f.username} · UID {f.uid}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function RegistrationPanel({ tournament, profile }: { tournament: Tournament; profile: UserProfile }) {
  const captain = profile.user.player_id;
  const captainUid = profile.game_accounts?.[0]?.uid ?? "";
  const [name, setName] = useState("");
  // players[0] = captain (locked), players[1..3] = teammate uid/player_id
  const [players, setPlayers] = useState([captain, "", "", ""]);
  // selected friend objects for slots 1-3 (index matches players[1..3])
  const [selectedFriends, setSelectedFriends] = useState<(FriendOption | null)[]>([null, null, null]);
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState<{
    registration_id: number;
    team_id?: number;
    payment_status: string;
    pending_invites?: number;
    cancellation_requested?: boolean;
    invite_tokens?: { uid: string; token: string }[];
    demo_status?: string;
    demo_slot?: number | null;
  } | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Load friend list for picker
    api<{ id: number; friend: { username: string; player_id: string; photo: string | null; game_account: { uid: string; ign: string } | null } }[]>("friends/")
      .then((data) => {
        if (!active) return;
        setFriends(
          data.map((entry) => ({
            id: entry.friend ? entry.id : 0,
            username: entry.friend?.username ?? "",
            ign: entry.friend?.game_account?.ign ?? entry.friend?.username ?? "",
            uid: entry.friend?.game_account?.uid ?? "",
            player_id: entry.friend?.player_id ?? "",
            photo: entry.friend?.photo ?? null,
          })).filter((f) => f.uid || f.player_id)
        );
      })
      .catch(() => {});

    // Check for existing registration
    api<
      {
        id: number;
        name: string;
        members: string[];
        registration_id: number;
        payment_status: string;
        registration_status: string;
        slot: number | null;
        cancellation_requested?: boolean;
        invite_tokens: { uid: string; token: string }[];
      }[]
    >(`teams/?tournament=${tournament.id}`)
      .then((teams) => {
        const team = teams[0];
        if (!active || !team) return;
        setName(team.name);
        setPlayers([
          team.members[0] || captain,
          team.members[1] || "",
          team.members[2] || "",
          team.members[3] || "",
        ]);
        if (team.registration_status === "cancelled" || team.registration_status === "refunded") return;
        setSubmitted({
          registration_id: team.registration_id,
          team_id: team.id,
          payment_status: team.payment_status,
          cancellation_requested: team.cancellation_requested,
          pending_invites: team.invite_tokens.length,
          invite_tokens: team.invite_tokens,
          demo_status: team.payment_status === "verified" ? team.payment_status : undefined,
          demo_slot: team.slot,
        });
      })
      .catch(() => {})
      .finally(() => {
        if (active) setTeamLoading(false);
      });

    return () => {
      active = false;
    };
  }, [captain, tournament.id]);

  const updatePlayer = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value.toUpperCase();
    setPlayers(players.map((p, i) => (i === index ? val : p)));
    // Clear selected friend if manually typing
    if (index > 0) {
      setSelectedFriends((prev) => {
        const next = [...prev];
        next[index - 1] = null;
        return next;
      });
    }
  };

  const pickFriend = (slot: number, friend: FriendOption) => {
    // Fill slot with friend's uid (preferred) or player_id
    const val = friend.uid || friend.player_id;
    setPlayers(players.map((p, i) => (i === slot ? val : p)));
    setSelectedFriends((prev) => {
      const next = [...prev];
      next[slot - 1] = friend;
      return next;
    });
    setPickerSlot(null);
  };

  const clearSlot = (slot: number) => {
    setPlayers(players.map((p, i) => (i === slot ? "" : p)));
    setSelectedFriends((prev) => {
      const next = [...prev];
      next[slot - 1] = null;
      return next;
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      setSubmitted(
        await api("teams/", {
          method: "POST",
          body: JSON.stringify({
            tournament: tournament.id,
            name: name.trim(),
            members: players.filter(Boolean).map((player_id) => ({ player_id: player_id.trim() })),
          }),
        })
      );
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Could not submit registration.");
    } finally {
      setLoading(false);
    }
  };

  const demoPay = async () => {
    if (!submitted) return;
    setLoading(true);
    setError("");
    try {
      const result = await api<{
        status: string;
        slot: number | null;
        registration_status: string;
        demo: boolean;
      }>(`payments/demo/${submitted.registration_id}`, { method: "POST" });
      setSubmitted({ ...submitted, demo_status: result.registration_status, demo_slot: result.slot });
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Demo payment failed.");
    } finally {
      setLoading(false);
    }
  };

  const saveRoster = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api(`teams/${submitted?.team_id}/roster/`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          members: players.filter(Boolean).map((player_id) => ({ player_id })),
        }),
      });
      setEditing(false);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Could not update team.");
    } finally {
      setLoading(false);
    }
  };

  const retract = async () => {
    if (!submitted?.team_id || !window.confirm("Send a cancellation request for this team? An admin must approve it."))
      return;
    setLoading(true);
    setError("");
    try {
      await api(`teams/${submitted.team_id}/retract/`, { method: "POST" });
      setSubmitted({ ...submitted, cancellation_requested: true });
      setError("Cancellation request sent to the admin.");
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Could not send cancellation request.");
    } finally {
      setLoading(false);
    }
  };

  if (teamLoading) return <RegistrationPanelSkeleton />;

  if (submitted) {
    return (
      <div className="neo p-6 sm:p-8">
        <Toast message={error} tone={error.startsWith("Could not") ? "error" : "success"} />
        <div className="mb-4 inline-flex items-center gap-3 border-[3px] border-black bg-[#C6F36B] px-4 py-2 font-black shadow-[3px_3px_0px_#000000]">
          <Check size={22} strokeWidth={3} className="text-black" />
          <h2 className="text-xl font-black uppercase tracking-tight text-black">Team Registered</h2>
        </div>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-black/75 dark:text-white/80">
          Your squad is in the system. An admin will review and verify your entry. You can update your team name or roster before the registration deadline.
        </p>

        {editing ? (
          <form onSubmit={saveRoster} className="mt-6 space-y-3 border-2 border-black dark:border-white/20 bg-[#F4EFE6] dark:bg-[#121316] p-4">
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white">
              Squad Name
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Team name"
                className="neo-input mt-1"
              />
            </label>
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white">
                Roster (1–4 Free Fire UIDs)
              </label>
              {players.map((player, index) => (
                <input
                  key={index}
                  required={index === 0}
                  value={player}
                  onChange={updatePlayer(index)}
                  placeholder={index === 0 ? "Captain Player ID" : `Teammate ${index} Free Fire UID (Optional)`}
                  className="neo-input"
                />
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                disabled={loading}
                type="submit"
                className="neo-solid min-h-12 flex-1 px-4 text-xs uppercase tracking-wider text-black disabled:opacity-60"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="neo-ghost min-h-12 flex-1 px-4 text-xs uppercase tracking-wider text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="neo-accent min-h-11 px-4 text-xs uppercase tracking-wider text-black flex items-center gap-2"
            >
              <Edit3 size={15} strokeWidth={2.5} />
              Edit Squad Roster
            </button>
            {submitted.cancellation_requested ? (
              <div className="border-2 border-black bg-[#FFE600] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0px_#000000]">
                Cancellation Request Pending Admin Approval
              </div>
            ) : (
              <button
                type="button"
                onClick={retract}
                disabled={loading}
                className="neo-danger min-h-11 px-4 text-xs uppercase tracking-wider text-white disabled:opacity-60 flex items-center gap-2"
              >
                <XCircle size={15} strokeWidth={2.5} />
                {loading ? "Requesting..." : "Request Team Cancellation"}
              </button>
            )}
          </div>
        )}

        {/* Payment / Approval Box */}
        <div className="mt-6 border-[3px] border-black dark:border-white/20 bg-white dark:bg-[#121316] p-5 shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#c6f36b]">
          {Number(tournament.entry_fee) === 0 ? (
            <>
              <div className="flex items-center gap-2 text-sm font-black uppercase text-black dark:text-white">
                <ShieldCheck size={20} strokeWidth={2.5} className="text-[#00B894]" /> Free Registration
              </div>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-black/70 dark:text-white/70">
                No payment is required. The tournament organiser will approve your squad and allocate your custom room slot.
              </p>
              {submitted.demo_slot ? (
                <div className="mt-4 border-2 border-black bg-[#C6F36B] p-3 text-sm font-black text-black">
                  ✓ Slot {String(submitted.demo_slot).padStart(2, "0")} Assigned
                </div>
              ) : (
                <div className="mt-4 border-2 border-black bg-[#FFE600] p-3 text-xs font-black uppercase text-black">
                  Waiting for Organiser Approval
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between border-b-2 border-black dark:border-white/20 pb-3">
                <span className="flex items-center gap-2 text-sm font-black uppercase text-black dark:text-white">
                  <CreditCard size={18} strokeWidth={2.5} /> Entry Fee: ₹{tournament.entry_fee}
                </span>
                <span className="neo-badge">Registration #{submitted.registration_id}</span>
              </div>
              <p className="mt-3 text-xs font-semibold leading-relaxed text-black/70 dark:text-white/70">
                Demo payment simulator (for development and test tournaments). Real UPI credentials are never requested.
              </p>
              {submitted.demo_status ? (
                <div className="mt-4 border-2 border-black bg-[#C6F36B] p-3 text-sm font-black text-black flex items-center gap-2">
                  <ShieldCheck size={18} strokeWidth={3} />
                  Payment Recorded ·{" "}
                  {submitted.demo_slot
                    ? `Slot ${String(submitted.demo_slot).padStart(2, "0")} allocated`
                    : "ready for organiser review"}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={demoPay}
                  disabled={loading}
                  className="neo-solid mt-4 min-h-12 w-full text-xs uppercase tracking-wider text-black disabled:opacity-60"
                >
                  {loading ? "Processing..." : `Test Demo Payment (₹${tournament.entry_fee})`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Slots 1-3: teammate pickers
  const slotLabels = ["Player 2 (Teammate)", "Player 3 (Teammate)", "Player 4 (Teammate)"];

  return (
    <form onSubmit={submit} className="neo p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between border-b-2 border-black dark:border-white/20 pb-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-black dark:text-white">Register Your Squad</h2>
          <p className="mt-1 text-xs font-bold text-black/60 dark:text-white/60">
            {Number(tournament.entry_fee) === 0 ? "FREE ENTRY" : `₹${tournament.entry_fee} ENTRY FEE`} · 4 Free Fire Players
          </p>
        </div>
        <div className="hidden border-2 border-black bg-[#C6F36B] px-3 py-1 text-xs font-black text-black sm:block">
          STEP 01/02
        </div>
      </div>

      <div className="space-y-4">
        {/* Squad/Team Name */}
        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-black dark:text-white">
            Squad / Team Name *
          </label>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Total Gaming, Team Elite"
            className="neo-input"
          />
        </div>

        {/* Team Members */}
        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-black dark:text-white">
            Team Members (4 Players)
          </label>
          <div className="space-y-2.5">
            {/* Slot 1: Captain (locked) */}
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-black dark:border-white/20 bg-[#C6F36B] text-xs font-black text-black">
                1
              </span>
              <div className="flex-1 relative">
                <div className="neo-input flex items-center gap-2 bg-[#F4EFE6] dark:bg-[#252836] cursor-not-allowed">
                  <ShieldCheck size={14} strokeWidth={2.5} className="shrink-0 text-black/50 dark:text-white/50" />
                  <span className="flex-1 text-sm font-black text-black dark:text-white truncate">
                    {profile.user.first_name || profile.user.username}
                    {captainUid && (
                      <span className="ml-2 text-xs font-semibold text-black/50 dark:text-white/40">
                        UID {captainUid}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 border border-black bg-black px-1.5 py-0.5 text-[9px] font-black uppercase text-[#C6F36B]">
                    CAPTAIN
                  </span>
                </div>
              </div>
            </div>

            {/* Slots 2-4: Teammates with friend picker */}
            {[1, 2, 3].map((slot) => {
              const friendObj = selectedFriends[slot - 1];
              const isPickerOpen = pickerSlot === slot;
              const otherSelected = players.filter((p, i) => i !== slot && i !== 0 && p);

              return (
                <div key={slot} className="flex items-start gap-2">
                  <span className="mt-0 grid h-10 w-10 shrink-0 place-items-center border-2 border-black dark:border-white/20 bg-[#F4EFE6] dark:bg-[#252836] text-xs font-black text-black dark:text-white">
                    {slot + 1}
                  </span>
                  <div className="flex-1 relative">
                    {friendObj ? (
                      /* Selected friend card */
                      <div className="flex items-center gap-2 border-2 border-black dark:border-white/20 bg-[#C6F36B]/30 dark:bg-[#2a2d3a] px-3 py-2">
                        {friendObj.photo ? (
                          <img
                            src={friendObj.photo}
                            alt={friendObj.username}
                            className="h-7 w-7 shrink-0 border-2 border-black object-cover"
                          />
                        ) : (
                          <DefaultAvatar name={friendObj.username} size="sm" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-black uppercase text-black dark:text-white">{friendObj.ign}</p>
                          <p className="truncate text-[10px] font-semibold text-black/60 dark:text-white/60">
                            @{friendObj.username} · UID {friendObj.uid}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => clearSlot(slot)}
                          className="shrink-0 text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                          aria-label="Remove player"
                        >
                          <X size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    ) : (
                      /* Input + pick friend button */
                      <div className="flex gap-2">
                        <input
                          value={players[slot]}
                          onChange={updatePlayer(slot)}
                          placeholder={`${slotLabels[slot - 1]} — Free Fire UID or Player ID`}
                          className="neo-input flex-1 min-w-0"
                        />
                        <button
                          type="button"
                          onClick={() => setPickerSlot(isPickerOpen ? null : slot)}
                          className={`shrink-0 border-2 border-black px-3 py-2 text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                            isPickerOpen
                              ? "bg-[#C6F36B] text-black shadow-[2px_2px_0px_#000000]"
                              : "bg-white dark:bg-[#1a1c23] text-black dark:text-white hover:bg-[#C6F36B] hover:text-black"
                          }`}
                          title="Pick from friends"
                        >
                          <Users size={14} strokeWidth={2.5} />
                          <span className="hidden sm:inline">Friends</span>
                        </button>
                      </div>
                    )}

                    {/* Friend Picker Dropdown */}
                    {isPickerOpen && (
                      <FriendPicker
                        friends={friends}
                        onSelect={(f) => pickFriend(slot, f)}
                        onClose={() => setPickerSlot(null)}
                        exclude={[captain, ...otherSelected]}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs font-semibold text-black/60 dark:text-white/60">
            Pick teammates from your Friends list or type their Free Fire UID directly. Each tournament can have different players.
          </p>
        </div>
      </div>

      <Toast message={error} tone="error" />

      <div className="mt-6 flex items-start gap-2 border-2 border-black bg-[#FFE600] p-3 text-xs font-bold text-black">
        <ShieldCheck size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" />
        <span>Roster rules: Exactly 4 players required. You can adjust squad members or team name until registration closes.</span>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="neo-solid mt-6 min-h-14 w-full text-sm uppercase tracking-wider text-black disabled:opacity-60"
      >
        {loading ? "Submitting Squad..." : "Submit Squad & Proceed to Slot Confirmation"}
      </button>
    </form>
  );
}
