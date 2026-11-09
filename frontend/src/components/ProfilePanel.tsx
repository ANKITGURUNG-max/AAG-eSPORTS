import { useState, type ChangeEvent, type FormEvent } from "react";
import { LogOut, Save, UserRound } from "lucide-react";
import { api } from "../lib/api";
import { DefaultAvatar } from "./DefaultAvatar";
import { Toast } from "./Toast";

export type UserProfile = {
  user: { player_id: string; username: string; email: string; phone: string; first_name?: string; last_name?: string; is_admin?: boolean };
  game_accounts: { ign: string; uid: string }[];
};

export function ProfilePanel({ profile, onSaved, onSignOut }: { profile: UserProfile; onSaved: (profile: UserProfile) => void; onSignOut: () => void }) {
  const account = profile.game_accounts[0];
  const [form, setForm] = useState({ first_name: profile.user.first_name || "", last_name: profile.user.last_name || "", email: profile.user.email || "", phone: profile.user.phone || "", ign: account?.ign || "", uid: account?.uid || "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const update = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value });
  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage("");
    try { const updated = await api<UserProfile>("me/1/", { method: "PUT", body: JSON.stringify(form) }); onSaved(updated); setMessage("Profile saved."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save profile."); }
    finally { setSaving(false); }
  };
  return <div className="space-y-4"><Toast message={message} tone={message.startsWith("Could not") || message.startsWith("That ") ? "error" : "success"}/><section className="rounded-2xl bg-[#191B1D] p-5"><div className="flex items-center gap-3"><DefaultAvatar name={profile.user.first_name || profile.user.username} size="lg"/><div className="min-w-0"><p className="truncate font-semibold">{profile.user.username}</p><p className="text-xs text-[#C6F36B]">{profile.user.player_id}</p><p className="mt-1 text-xs text-white/40">Player account · Active</p></div></div></section><form onSubmit={save} className="rounded-2xl bg-[#191B1D] p-4 sm:p-5"><div className="mb-5 flex items-center gap-2"><UserRound size={17} className="text-[#C6F36B]"/><h2 className="font-semibold">Account details</h2></div><div className="grid grid-cols-2 gap-3"><input value={form.first_name} onChange={update("first_name")} placeholder="First name" className="auth-input"/><input value={form.last_name} onChange={update("last_name")} placeholder="Last name" className="auth-input"/></div><div className="mt-3 space-y-3"><input required type="email" value={form.email} onChange={update("email")} placeholder="Email address" className="auth-input"/><input value={form.phone} onChange={update("phone")} placeholder="Phone number" className="auth-input"/></div><div className="my-6 border-t border-white/10 pt-5"><p className="mb-1 font-semibold">Free Fire account</p><p className="mb-3 text-xs leading-5 text-white/45">Your IGN and UID are required before joining a squad.</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><input required value={form.ign} onChange={update("ign")} placeholder="In-game name (IGN)" className="auth-input"/><input required value={form.uid} onChange={update("uid")} placeholder="Free Fire UID" inputMode="numeric" className="auth-input"/></div></div><button disabled={saving} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#C6F36B] font-semibold text-[#101112] disabled:opacity-60"><Save size={16}/>{saving ? "Saving..." : "Save profile"}</button></form><button onClick={onSignOut} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-sm text-white/55"><LogOut size={16}/> Sign out</button></div>;
}
