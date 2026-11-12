import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Check, CreditCard, ShieldCheck, Edit3, XCircle } from "lucide-react";
import { api } from "../lib/api";
import type { Tournament } from "./TournamentCard";
import type { UserProfile } from "./ProfilePanel";
import { RegistrationPanelSkeleton } from "./Skeletons";
import { Toast } from "./Toast";

export function RegistrationPanel({ tournament, profile }: { tournament: Tournament; profile: UserProfile }) {
  const captain = profile.user.player_id;
  const [name, setName] = useState("");
  const [players, setPlayers] = useState([captain, "", "", ""]);
  const [squadInfo, setSquadInfo] = useState<{
    in_squad: boolean;
    squad: {
      id: number;
      name: string;
      squad_id: string;
      is_captain: boolean;
      captain_username: string;
      member_count: number;
      members: { player_id: string; username: string; ign: string; uid: string; role: string }[];
    } | null;
  } | null>(null);
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
    setTeamLoading(true);

    // Fetch user's squad
    api<{ in_squad: boolean; squad: any }>("squads/me/")
      .then(res => {
        if (!active) return;
        setSquadInfo(res);
        if (res.in_squad && res.squad) {
          setName(prev => prev || res.squad.name);
          if (res.squad.members && res.squad.members.length > 0) {
            const memberIds = res.squad.members.map((m: any) => m.player_id || m.uid);
            while (memberIds.length < 4) memberIds.push("");
            setPlayers(memberIds);
          }
        }
      })
      .catch(() => {});

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
      .then(teams => {
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

  const updatePlayer = (index: number) => (event: ChangeEvent<HTMLInputElement>) =>
    setPlayers(players.map((player, current) => (current === index ? event.target.value.toUpperCase() : player)));

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
            members: players.filter(Boolean).map(player_id => ({ player_id: player_id.trim() })),
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
          members: players.filter(Boolean).map(player_id => ({ player_id })),
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
    if (!submitted?.team_id || !window.confirm("Send a cancellation request for this team? An admin must approve it.")) return;
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
                onChange={event => setName(event.target.value)}
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
                  Payment Recorded · {submitted.demo_slot ? `Slot ${String(submitted.demo_slot).padStart(2, "0")} allocated` : "ready for organiser review"}
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

  const isSquadIncomplete = Boolean(squadInfo?.in_squad && squadInfo.squad && squadInfo.squad.member_count < 4);
  const isSquadNotCaptain = Boolean(squadInfo?.in_squad && squadInfo.squad && !squadInfo.squad.is_captain);

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

      {/* Squad Status Card */}
      {squadInfo?.in_squad && squadInfo.squad && (
        <div className="mb-5 border-[3px] border-black bg-[#C6F36B] p-4 text-black shadow-[4px_4px_0px_#000000]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-black text-[#C6F36B] px-2 py-0.5">
                REGISTERING WITH SQUAD
              </span>
              <h3 className="text-lg font-black uppercase mt-1">{squadInfo.squad.name}</h3>
            </div>
            <span className="border-2 border-black bg-white px-2.5 py-1 font-mono text-xs font-black">
              {squadInfo.squad.squad_id}
            </span>
          </div>

          {isSquadNotCaptain && (
            <div className="mt-3 border-2 border-black bg-[#FFE600] p-2.5 text-xs font-black uppercase text-black">
              Only your Squad Captain ({squadInfo.squad.captain_username}) can submit tournament registration.
            </div>
          )}

          {isSquadIncomplete && (
            <div className="mt-3 border-2 border-black bg-[#FF4757] p-2.5 text-xs font-black uppercase text-white">
              A squad must have exactly 4 players before tournament registration. Currently: {squadInfo.squad.member_count}/4 players. Please invite friends in My Squad to complete your roster.
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-black dark:text-white">
            Squad / Team Name *
          </label>
          <input
            required
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="e.g. Total Gaming, Team Elite"
            className="neo-input"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-black dark:text-white">
            Team Members (4 Players)
          </label>
          <div className="space-y-2.5">
            {players.map((player, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-black dark:border-white/20 bg-[#F4EFE6] dark:bg-[#252836] text-xs font-black text-black dark:text-white">
                  {index + 1}
                </span>
                <input
                  required
                  readOnly={index === 0 && Boolean(squadInfo?.in_squad)}
                  value={player}
                  onChange={updatePlayer(index)}
                  placeholder={index === 0 ? "Captain Player ID" : `Player ${index + 1} Free Fire UID or Player ID`}
                  className={`neo-input ${index === 0 && squadInfo?.in_squad ? "bg-[#F4EFE6] dark:bg-[#252836] font-black" : ""}`}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs font-semibold text-black/60 dark:text-white/60">
            All 4 squad members will be officially registered under your squad room slot.
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
        disabled={loading || isSquadIncomplete || isSquadNotCaptain}
        className="neo-solid mt-6 min-h-14 w-full text-sm uppercase tracking-wider text-black disabled:opacity-60"
      >
        {loading
          ? "Submitting Squad..."
          : isSquadIncomplete
          ? "Incomplete Squad (Need 4 Players)"
          : isSquadNotCaptain
          ? "Captain Only Registration"
          : "Submit Squad & Proceed to Slot Confirmation"}
      </button>
    </form>
  );
}
