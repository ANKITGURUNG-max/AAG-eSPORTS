import { useState, type ChangeEvent, type FormEvent } from "react";
import { LogOut, Save, UserRound, Flame } from "lucide-react";
import { api } from "../lib/api";
import { DefaultAvatar } from "./DefaultAvatar";
import { Toast } from "./Toast";

export type UserProfile = {
  user: {
    player_id: string;
    username: string;
    email: string;
    phone: string;
    first_name?: string;
    last_name?: string;
    is_admin?: boolean;
  };
  game_accounts: { ign: string; uid: string }[];
};

export function ProfilePanel({
  profile,
  onSaved,
  onSignOut,
}: {
  profile: UserProfile;
  onSaved: (profile: UserProfile) => void;
  onSignOut: () => void;
}) {
  const account = profile.game_accounts[0];
  const [form, setForm] = useState({
    first_name: profile.user.first_name || "",
    last_name: profile.user.last_name || "",
    email: profile.user.email || "",
    phone: profile.user.phone || "",
    ign: account?.ign || "",
    uid: account?.uid || "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const update = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: event.target.value });

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const updated = await api<UserProfile>("me/1/", { method: "PUT", body: JSON.stringify(form) });
      onSaved(updated);
      setMessage("Profile details saved successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Toast message={message} tone={message.startsWith("Could not") || message.startsWith("That ") ? "error" : "success"} />

      {/* Profile Overview Card */}
      <section className="neo p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <DefaultAvatar name={profile.user.first_name || profile.user.username} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black uppercase text-black dark:text-white">{profile.user.username}</h2>
            <div className="mt-1 inline-flex items-center gap-1.5 border-2 border-black bg-[#C6F36B] px-2.5 py-0.5 text-xs font-black text-black">
              ID: {profile.user.player_id}
            </div>
            <p className="mt-1.5 text-xs font-bold text-black/60 dark:text-white/70">Registered Player · Active Season</p>
          </div>
        </div>
        <div className="border-2 border-black bg-white dark:bg-[#1a1c23] px-3 py-1.5 text-xs font-black uppercase tracking-wider text-black dark:text-white shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#c6f36b]">
          VERIFIED SQUAD
        </div>
      </section>

      {/* Edit Details Form */}
      <form onSubmit={save} className="neo p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-2.5 border-b-2 border-black dark:border-white/20 pb-4">
          <UserRound size={22} strokeWidth={2.5} />
          <h2 className="text-xl font-black uppercase tracking-tight text-black dark:text-white">Player Information</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">First Name</label>
              <input value={form.first_name} onChange={update("first_name")} placeholder="First name" className="neo-input" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">Last Name</label>
              <input value={form.last_name} onChange={update("last_name")} placeholder="Last name" className="neo-input" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">Email Address *</label>
              <input required type="email" value={form.email} onChange={update("email")} placeholder="Email address" className="neo-input" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">Phone Number</label>
              <input value={form.phone} onChange={update("phone")} placeholder="Phone number" className="neo-input" />
            </div>
          </div>

          {/* Game Account Section */}
          <div className="mt-6 border-t-2 border-black dark:border-white/20 pt-6">
            <div className="mb-3 flex items-center gap-2">
              <Flame size={18} strokeWidth={2.5} className="text-[#FF4757]" />
              <p className="font-black uppercase tracking-wider text-black dark:text-white">Free Fire In-Game Account</p>
            </div>
            <p className="mb-4 text-xs font-semibold text-black/60 dark:text-white/70">
              Your In-Game Name (IGN) and Player UID are required for squad matches and custom rooms.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">In-Game Name (IGN) *</label>
                <input required value={form.ign} onChange={update("ign")} placeholder="e.g. AAG_SKYLORD" className="neo-input" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black dark:text-white">Free Fire UID *</label>
                <input required value={form.uid} onChange={update("uid")} placeholder="e.g. 192837465" inputMode="numeric" className="neo-input" />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="neo-solid mt-8 flex min-h-12 w-full items-center justify-center gap-2 text-xs uppercase tracking-wider text-black disabled:opacity-60"
        >
          <Save size={18} strokeWidth={2.5} />
          {saving ? "Saving Changes..." : "Save Player Profile"}
        </button>
      </form>

      {/* Sign Out */}
      <button
        type="button"
        onClick={onSignOut}
        className="neo-ghost flex min-h-12 w-full items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-white"
      >
        <LogOut size={16} strokeWidth={2.5} /> Sign Out of AAG eSports
      </button>
    </div>
  );
}
