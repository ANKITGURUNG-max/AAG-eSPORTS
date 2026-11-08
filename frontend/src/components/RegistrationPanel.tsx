import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Check, CreditCard, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import type { Tournament } from "./TournamentCard";
import type { UserProfile } from "./ProfilePanel";
import { RegistrationPanelSkeleton } from "./Skeletons";

export function RegistrationPanel({ tournament, profile }: { tournament: Tournament; profile: UserProfile }) {
  const captain = profile.user.player_id;
  const [name, setName] = useState("");
  const [players, setPlayers] = useState([captain, "", "", ""]);
  const [submitted, setSubmitted] = useState<{ registration_id: number; team_id?: number; payment_status: string; pending_invites?: number; invite_tokens?: { uid: string; token: string }[]; demo_status?: string; demo_slot?: number | null } | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setTeamLoading(true);
    api<{ id: number; name: string; members: string[]; registration_id: number; payment_status: string; registration_status: string; slot: number | null; invite_tokens: { uid: string; token: string }[] }[]>(`teams/?tournament=${tournament.id}`)
      .then(teams => {
        const team = teams[0];
        if (!active || !team) return;
        setName(team.name);
        setPlayers([team.members[0] || captain, team.members[1] || "", team.members[2] || "", team.members[3] || ""]);
        setSubmitted({ registration_id: team.registration_id, team_id: team.id, payment_status: team.payment_status, pending_invites: team.invite_tokens.length, invite_tokens: team.invite_tokens, demo_status: team.payment_status === "verified" ? team.payment_status : undefined, demo_slot: team.slot });
      })
      .catch(() => {})
      .finally(() => { if (active) setTeamLoading(false); });
    return () => { active = false; };
  }, [captain, tournament.id]);
  const updatePlayer = (index: number) => (event: ChangeEvent<HTMLInputElement>) => setPlayers(players.map((player, current) => current === index ? event.target.value.toUpperCase() : player));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError("");
    try { setSubmitted(await api("teams/", { method: "POST", body: JSON.stringify({ tournament: tournament.id, name: name.trim(), members: players.filter(Boolean).map(player_id => ({ player_id: player_id.trim() })) }) })); }
    catch (exception) { setError(exception instanceof Error ? exception.message : "Could not submit registration."); }
    finally { setLoading(false); }
  };
  const demoPay = async () => {
    if (!submitted) return;
    setLoading(true); setError("");
    try { const result = await api<{ status: string; slot: number | null; registration_status: string; demo: boolean }>(`payments/demo/${submitted.registration_id}`, { method: "POST" }); setSubmitted({ ...submitted, demo_status: result.registration_status, demo_slot: result.slot }); }
    catch (exception) { setError(exception instanceof Error ? exception.message : "Demo payment failed."); }
    finally { setLoading(false); }
  };
  const saveRoster = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError("");
    try { await api(`teams/${submitted?.team_id}/roster/`, { method: "PATCH", body: JSON.stringify({ name, members: players.filter(Boolean).map(player_id => ({ player_id: player_id.trim() })) }) }); setEditing(false); }
    catch (exception) { setError(exception instanceof Error ? exception.message : "Could not update team."); }
    finally { setLoading(false); }
  };
  if (teamLoading) return <RegistrationPanelSkeleton/>;
  if (submitted) return <div className="rounded-2xl border border-[#C6F36B]/25 bg-[#C6F36B]/5 p-5"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#C6F36B] text-[#101112]"><Check size={20}/></div><h2 className="text-lg font-semibold">Team submitted</h2><p className="mt-2 text-sm leading-5 text-white/60">Teams can have 1–4 players. Teammates do not need an account; an admin will review the roster and approve the registration.</p>{editing ? <form onSubmit={saveRoster} className="mt-4 space-y-2"><input required value={name} onChange={event => setName(event.target.value)} placeholder="Team name" className="auth-input"/>{players.map((player, index) => <input key={index} required={index === 0} value={player} onChange={updatePlayer(index)} placeholder={index === 0 ? "Your Free Fire UID" : `Optional teammate ${index} UID`} className="auth-input"/>) }<div className="flex gap-2"><button disabled={loading} className="min-h-11 flex-1 rounded-xl bg-[#C6F36B] text-sm font-semibold text-[#101112]">Save changes</button><button type="button" onClick={() => setEditing(false)} className="min-h-11 flex-1 rounded-xl border border-white/10 text-sm">Cancel</button></div></form> : <button type="button" onClick={() => setEditing(true)} className="mt-4 min-h-11 w-full rounded-xl border border-[#C6F36B]/30 text-sm text-[#C6F36B]">Edit team before deadline</button>}<div className="mt-5 rounded-xl bg-[#101112] p-4">{Number(tournament.entry_fee) === 0 ? <><div className="flex items-center gap-2 text-sm font-medium text-[#C6F36B]"><ShieldCheck size={16}/> Free registration</div><p className="mt-3 text-xs leading-5 text-white/55">No payment is required. Your registration is waiting for admin approval and slot assignment.</p>{submitted.demo_slot ? <p className="mt-3 text-xs text-[#C6F36B]">Slot {String(submitted.demo_slot).padStart(2, "0")} assigned.</p> : <p className="mt-3 text-xs text-amber-300">Waiting for admin approval.</p>}</> : <><div className="flex items-center gap-2 text-sm font-medium"><CreditCard size={16} className="text-[#C6F36B]"/> Demo payment · ₹{tournament.entry_fee}</div><p className="mt-3 text-xs leading-5 text-white/55">Development-only payment simulation. No money is transferred and no payment credentials are collected.</p>{submitted.demo_status ? <p className="mt-3 flex items-center gap-2 text-xs text-[#C6F36B]"><ShieldCheck size={14}/> Demo payment recorded · {submitted.demo_slot ? `Slot ${String(submitted.demo_slot).padStart(2, "0")} assigned` : "ready for admin approval"}</p> : <button type="button" onClick={demoPay} disabled={loading} className="mt-3 min-h-11 w-full rounded-xl bg-[#C6F36B] text-sm font-semibold text-[#101112] disabled:opacity-60">{loading ? "Processing demo..." : "Use demo payment"}</button>}</>}<p className="mt-3 text-xs text-white/35">Registration #{submitted.registration_id}</p></div>{error && <p className="mt-3 rounded-xl bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}</div>;
  return <form onSubmit={submit} className="rounded-2xl border border-[#C6F36B]/20 bg-[#C6F36B]/5 p-4 sm:p-5"><div className="mb-4 flex items-center gap-2"><CreditCard size={18} className="text-[#C6F36B]"/><div><h2 className="font-semibold">Register your team</h2><p className="text-xs text-white/50">₹{tournament.entry_fee} per team · captain plus up to 3 teammates</p></div></div><input required value={name} onChange={event => setName(event.target.value)} placeholder="Team name" className="auth-input"/><div className="mt-3 space-y-2">{players.map((player, index) => <div key={index} className="flex items-center gap-2"><span className="w-5 text-center text-xs text-white/35">{index + 1}</span><input required={index === 0} readOnly={index === 0} value={player} onChange={updatePlayer(index)} placeholder={index === 0 ? "Your Player ID (automatic)" : `Teammate ${index} Free Fire UID`} className={`auth-input ${index === 0 ? "opacity-60" : ""}`}/></div>)}</div><p className="mt-3 text-xs leading-5 text-white/45">Your Player ID identifies your account. Teammates only need to provide their Free Fire UID; they do not need to register or receive an invitation.</p>{error && <p className="mt-3 rounded-xl bg-red-400/10 p-3 text-sm leading-5 text-red-300">{error}</p>}<div className="mt-4 flex items-start gap-2 text-xs leading-5 text-white/45"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#C6F36B]"/>You can edit your team name or roster until the registration deadline the day before the tournament.</div><button disabled={loading} className="mt-4 min-h-12 w-full rounded-xl bg-[#C6F36B] font-semibold text-[#101112] disabled:opacity-60">{loading ? "Submitting..." : "Submit team & view payment"}</button></form>;
}
