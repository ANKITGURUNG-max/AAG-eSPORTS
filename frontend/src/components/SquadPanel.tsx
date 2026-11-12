import { useEffect, useState } from "react";
import { Check, Copy, Crown, Plus, Shield, ShieldAlert, Trash2, UserMinus, UserPlus, Users, X } from "lucide-react";
import { api } from "../lib/api";
import { DefaultAvatar } from "./DefaultAvatar";
import { Toast } from "./Toast";

type SquadMemberData = {
  id: number;
  user_id: number;
  player_id: string;
  username: string;
  role: "captain" | "member";
  ign: string;
  uid: string;
  photo: string | null;
  joined_at: string;
};

type PendingSquadInvitation = {
  id: number;
  invitee_id: number;
  username: string;
  ign: string;
  uid: string;
  created_at: string;
};

type ReceivedSquadInvitation = {
  id: number;
  squad_name: string;
  squad_id: string;
  inviter_username: string;
  created_at: string;
};

type SquadData = {
  id: number;
  squad_id: string;
  name: string;
  captain_id: number;
  captain_username: string;
  is_captain: boolean;
  member_count: number;
  members: SquadMemberData[];
  pending_invitations: PendingSquadInvitation[];
  created_at: string;
};

type FriendOption = {
  id: number;
  player_id: string;
  username: string;
  ign: string;
  uid: string;
};

export function SquadPanel({
  onNavigateToTournaments,
}: {
  onNavigateToTournaments?: () => void;
}) {
  const [squad, setSquad] = useState<SquadData | null>(null);
  const [inSquad, setInSquad] = useState(false);
  const [receivedInvitations, setReceivedInvitations] = useState<ReceivedSquadInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Create squad form state
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [friendsList, setFriendsList] = useState<FriendOption[]>([]);
  const [invitingFriendId, setInvitingFriendId] = useState<number | null>(null);

  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadSquad = async () => {
    try {
      setLoading(true);
      const res = await api<{ in_squad: boolean; squad: SquadData | null; invitations: ReceivedSquadInvitation[] }>("squads/me/");
      setInSquad(res.in_squad);
      setSquad(res.squad);
      setReceivedInvitations(res.invitations || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSquad();
  }, []);

  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreating(true);
    setMessage(null);
    try {
      const created = await api<SquadData>("squads/", {
        method: "POST",
        body: JSON.stringify({ name: createName.trim() }),
      });
      setSquad(created);
      setInSquad(true);
      setCreateName("");
      setMessage({ text: `Squad '${created.name}' created! ID: ${created.squad_id}`, tone: "success" });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Could not create squad.", tone: "error" });
    } finally {
      setCreating(false);
    }
  };

  const openInviteModal = async () => {
    setMessage(null);
    try {
      const friends = await api<FriendOption[]>("friends/");
      // Exclude members already in this squad
      const currentMemberIds = new Set(squad?.members.map(m => m.user_id) || []);
      const available = friends.filter(f => !currentMemberIds.has(f.id));
      setFriendsList(available);
      setInviteModalOpen(true);
    } catch {
      setMessage({ text: "Could not load friends list.", tone: "error" });
    }
  };

  const sendInvite = async (friendId: number, friendName: string) => {
    setInvitingFriendId(friendId);
    setMessage(null);
    try {
      await api("squads/invite/", {
        method: "POST",
        body: JSON.stringify({ user_id: friendId }),
      });
      setMessage({ text: `Invitation sent to ${friendName}!`, tone: "success" });
      setFriendsList(prev => prev.filter(f => f.id !== friendId));
      loadSquad();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Could not send invitation.", tone: "error" });
    } finally {
      setInvitingFriendId(null);
    }
  };

  const acceptInvitation = async (invitationId: number, squadName: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      await api(`squads/invitations/${invitationId}/accept/`, { method: "POST" });
      setMessage({ text: `Joined squad '${squadName}'!`, tone: "success" });
      loadSquad();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Could not join squad.", tone: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const rejectInvitation = async (invitationId: number) => {
    setActionLoading(true);
    setMessage(null);
    try {
      await api(`squads/invitations/${invitationId}/reject/`, { method: "POST" });
      setMessage({ text: "Squad invitation declined.", tone: "success" });
      setReceivedInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Could not decline invitation.", tone: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const leaveSquad = async () => {
    if (!window.confirm("Are you sure you want to leave this squad?")) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await api<{ detail: string }>("squads/leave/", { method: "POST" });
      setMessage({ text: res.detail || "You have left the squad.", tone: "success" });
      setInSquad(false);
      setSquad(null);
      loadSquad();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Could not leave squad.", tone: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const disbandSquad = async () => {
    if (!window.confirm("Are you sure you want to disband this squad? All members will be removed.")) return;
    setActionLoading(true);
    setMessage(null);
    try {
      await api("squads/disband/", { method: "POST" });
      setMessage({ text: "Squad disbanded.", tone: "success" });
      setInSquad(false);
      setSquad(null);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Could not disband squad.", tone: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const removeMember = async (userId: number, username: string) => {
    if (!window.confirm(`Are you sure you want to remove ${username} from the squad?`)) return;
    setActionLoading(true);
    setMessage(null);
    try {
      await api(`squads/members/${userId}/remove/`, { method: "POST" });
      setMessage({ text: `${username} has been removed from the squad.`, tone: "success" });
      loadSquad();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Could not remove member.", tone: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const copySquadId = () => {
    if (!squad?.squad_id) return;
    navigator.clipboard.writeText(squad.squad_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="neo p-8 text-center bg-white dark:bg-[#121316]">
        <p className="text-xs font-black uppercase tracking-wider text-black/60 dark:text-white/60">
          Loading squad details...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && <Toast message={message.text} tone={message.tone} />}

      {/* CASE 1: USER IS NOT IN A SQUAD */}
      {!inSquad && (
        <section className="space-y-6">
          {/* Pending Received Invitations */}
          {receivedInvitations.length > 0 && (
            <div className="neo p-5 sm:p-6 bg-[#C6F36B]/20 border-[3px] border-black shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#c6f36b]">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={20} strokeWidth={2.5} className="text-black dark:text-[#C6F36B]" />
                <h3 className="text-base font-black uppercase text-black dark:text-white">
                  Pending Squad Invitations ({receivedInvitations.length})
                </h3>
              </div>

              <div className="space-y-3">
                {receivedInvitations.map(inv => (
                  <div
                    key={inv.id}
                    className="border-2 border-black bg-white dark:bg-[#1a1c23] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[2px_2px_0px_#000000]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black uppercase text-black dark:text-white">
                          {inv.squad_name}
                        </span>
                        <span className="border border-black bg-[#C6F36B] px-1.5 py-0.2 text-[10px] font-black text-black">
                          {inv.squad_id}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-black/70 dark:text-white/70 mt-0.5">
                        Invited by <span className="font-black text-black dark:text-white">{inv.inviter_username}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => acceptInvitation(inv.id, inv.squad_name)}
                        className="neo-solid min-h-8 px-4 text-xs uppercase tracking-wider text-black"
                      >
                        Accept & Join
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => rejectInvitation(inv.id)}
                        className="border-2 border-black bg-white dark:bg-[#121316] min-h-8 px-3 text-xs font-black uppercase text-black dark:text-white hover:bg-black hover:text-white"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create Squad Card */}
          <div className="neo p-6 sm:p-8 bg-white dark:bg-[#121316] border-[3px] border-black shadow-[6px_6px_0px_#000000] dark:shadow-[6px_6px_0px_#c6f36b]">
            <span className="neo-badge">FORMATION CENTER</span>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-black dark:text-white sm:text-3xl">
              Create Your Squad
            </h2>
            <p className="mt-1 text-xs font-bold text-black/60 dark:text-white/60">
              Form a squad of 4 players to enter official Free Fire tournaments and claim room slots.
            </p>

            <form onSubmit={handleCreateSquad} className="mt-6 space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
                  Squad Name *
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  placeholder="e.g. TEAM PHANTOM"
                  maxLength={40}
                  className="neo-input uppercase tracking-wider"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="neo-solid min-h-12 w-full text-xs uppercase tracking-wider text-black flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Plus size={16} strokeWidth={3} />
                {creating ? "Creating Squad..." : "Create Squad & Become Captain"}
              </button>
            </form>

            <div className="mt-6 border-t-2 border-black/10 dark:border-white/10 pt-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white mb-2">
                Squad Rules:
              </h4>
              <ul className="space-y-1.5 text-xs font-semibold text-black/70 dark:text-white/70 list-disc list-inside">
                <li>A squad consists of exactly 4 players (1 Captain + 3 Members).</li>
                <li>Each player can belong to only 1 active squad at a time.</li>
                <li>Only the Captain can submit tournament registrations and invite friends.</li>
                <li>All 4 players must have registered their Free Fire UID and IGN.</li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* CASE 2: USER IS IN AN ACTIVE SQUAD */}
      {inSquad && squad && (
        <section className="space-y-6">
          {/* SQUAD PROFILE HEADER */}
          <div className="neo p-6 sm:p-8 bg-white dark:bg-[#121316] border-[3px] border-black shadow-[6px_6px_0px_#000000] dark:shadow-[6px_6px_0px_#c6f36b]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black dark:border-white/20 pb-5">
              <div>
                <span className="neo-badge">OFFICIAL SQUAD PROFILE</span>
                <h1 className="mt-2 text-2xl sm:text-3xl font-black uppercase tracking-tight text-black dark:text-white">
                  {squad.name}
                </h1>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-black/60 dark:text-white/60">
                    SQUAD ID:
                  </span>
                  <button
                    type="button"
                    onClick={copySquadId}
                    className="inline-flex items-center gap-1.5 border-2 border-black bg-[#C6F36B] px-2.5 py-0.5 text-xs font-black text-black shadow-[2px_2px_0px_#000000] hover:scale-105 active:scale-95 transition-transform"
                  >
                    <span>{squad.squad_id}</span>
                    {copied ? <Check size={13} strokeWidth={3} /> : <Copy size={13} strokeWidth={2.5} />}
                  </button>
                  {copied && <span className="text-[11px] font-bold text-green-600 dark:text-[#C6F36B]">Copied!</span>}
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex flex-col items-start sm:items-end gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`border-2 border-black px-3 py-1 text-xs font-black uppercase tracking-wider ${
                      squad.member_count === 4
                        ? "bg-[#C6F36B] text-black shadow-[2px_2px_0px_#000000]"
                        : "bg-[#FFE600] text-black shadow-[2px_2px_0px_#000000]"
                    }`}
                  >
                    {squad.member_count === 4 ? "4/4 READY FOR TOURNAMENT" : `${squad.member_count}/4 PLAYERS (INCOMPLETE)`}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-black/60 dark:text-white/60">
                  Captain: <span className="font-black text-black dark:text-white">{squad.captain_username}</span>
                </p>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                {squad.is_captain && squad.member_count < 4 && (
                  <button
                    type="button"
                    onClick={openInviteModal}
                    className="neo-solid min-h-9 px-4 text-xs uppercase tracking-wider text-black flex items-center gap-1.5"
                  >
                    <UserPlus size={15} strokeWidth={3} /> Invite Friends
                  </button>
                )}
                {squad.member_count === 4 && onNavigateToTournaments && (
                  <button
                    type="button"
                    onClick={onNavigateToTournaments}
                    className="neo-solid min-h-9 px-4 text-xs uppercase tracking-wider text-black flex items-center gap-1.5"
                  >
                    <Shield size={15} strokeWidth={2.5} /> Enter Tournaments →
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {squad.is_captain ? (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={disbandSquad}
                    className="border-2 border-black bg-white dark:bg-[#1a1c23] min-h-9 px-3 text-xs font-black uppercase tracking-wider text-[#FF4757] hover:bg-[#FF4757] hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 size={14} /> Disband Squad
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={leaveSquad}
                    className="border-2 border-black bg-white dark:bg-[#1a1c23] min-h-9 px-3 text-xs font-black uppercase tracking-wider text-[#FF4757] hover:bg-[#FF4757] hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <UserMinus size={14} /> Leave Squad
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 4-MEMBER ROSTER GRID (CAPTAIN + 3 MEMBERS) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black uppercase tracking-tight text-black dark:text-white flex items-center gap-2">
                <Users size={20} strokeWidth={2.5} />
                Squad Members ({squad.member_count}/4)
              </h2>
              {squad.member_count < 4 && (
                <span className="text-xs font-bold text-[#FF4757] dark:text-[#FFE600]">
                  Need {4 - squad.member_count} more player{4 - squad.member_count === 1 ? "" : "s"} to register
                </span>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* SLOTS 1 TO 4 */}
              {[0, 1, 2, 3].map(slotIndex => {
                const member = squad.members[slotIndex];
                const isCaptainSlot = slotIndex === 0;

                if (member) {
                  const isSelf = member.user_id === squad.captain_id && squad.is_captain;
                  const isCaptainBadge = member.role === "captain";

                  return (
                    <div
                      key={member.id}
                      className="neo p-4 bg-white dark:bg-[#1a1c23] border-[3px] border-black shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#c6f36b] flex flex-col justify-between gap-3 relative"
                    >
                      {/* Badge */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1 border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            isCaptainBadge ? "bg-[#C6F36B] text-black" : "bg-black text-white"
                          }`}
                        >
                          {isCaptainBadge && <Crown size={12} strokeWidth={3} />}
                          {isCaptainBadge ? "CAPTAIN" : `MEMBER 0${slotIndex + 1}`}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-black/50 dark:text-white/50">
                          {member.player_id}
                        </span>
                      </div>

                      {/* Player identity */}
                      <div className="flex items-center gap-3">
                        {member.photo ? (
                          <img
                            src={member.photo}
                            alt={member.username}
                            className="h-12 w-12 border-2 border-black object-cover shrink-0"
                          />
                        ) : (
                          <DefaultAvatar name={member.username} size="md" />
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-base font-black uppercase text-black dark:text-white">
                            {member.username}
                          </h4>
                          <p className="text-xs font-bold text-black/75 dark:text-white/75 truncate">
                            IGN: <span className="font-black text-black dark:text-white">{member.ign || "—"}</span>
                          </p>
                          <p className="text-xs font-bold text-black/75 dark:text-white/75 font-mono">
                            UID: <span className="text-black dark:text-[#C6F36B]">{member.uid || "—"}</span>
                          </p>
                        </div>
                      </div>

                      {/* Captain actions */}
                      <div className="border-t border-black/10 dark:border-white/10 pt-2 flex items-center justify-between text-[11px]">
                        <span className="text-black/50 dark:text-white/50 font-bold">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </span>
                        {squad.is_captain && !isCaptainBadge && (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => removeMember(member.user_id, member.username)}
                            className="text-[#FF4757] font-black uppercase hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                {/* EMPTY SLOT */}
                return (
                  <div
                    key={`empty-${slotIndex}`}
                    className="border-[3px] border-dashed border-black/40 dark:border-white/30 p-5 flex flex-col items-center justify-center text-center gap-3 min-h-[190px] bg-black/5 dark:bg-white/5"
                  >
                    <span className="border border-black/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black/60 dark:text-white/60">
                      MEMBER 0{slotIndex + 1}: OPEN
                    </span>
                    <ShieldAlert size={28} className="text-black/30 dark:text-white/30" />
                    <p className="text-xs font-black uppercase tracking-tight text-black/60 dark:text-white/60">
                      Slot Open
                    </p>
                    {squad.is_captain ? (
                      <button
                        type="button"
                        onClick={openInviteModal}
                        className="neo-solid min-h-8 px-3 text-xs uppercase tracking-wider text-black flex items-center gap-1"
                      >
                        <Plus size={14} strokeWidth={3} /> Invite Friend
                      </button>
                    ) : (
                      <p className="text-[10px] font-bold text-black/50 dark:text-white/50">
                        Waiting for captain
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* PENDING OUTGOING INVITATIONS */}
          {squad.is_captain && squad.pending_invitations && squad.pending_invitations.length > 0 && (
            <div className="neo p-5 bg-white dark:bg-[#121316] border-[3px] border-black">
              <h3 className="text-sm font-black uppercase tracking-tight text-black dark:text-white mb-3">
                Pending Squad Invitations Sent ({squad.pending_invitations.length})
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {squad.pending_invitations.map(inv => (
                  <div
                    key={inv.id}
                    className="border-2 border-black p-3 bg-zinc-50 dark:bg-[#1a1c23] flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-black uppercase text-black dark:text-white">{inv.username}</p>
                      <p className="text-[11px] font-mono text-black/60 dark:text-white/60">FF UID: {inv.uid || "—"}</p>
                    </div>
                    <span className="border border-black bg-[#FFE600] px-2 py-0.5 text-[10px] font-black uppercase text-black">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* INVITE FRIENDS MODAL */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="neo w-full max-w-md bg-[#F4EFE6] dark:bg-[#0D0E12] p-5 sm:p-6 shadow-[8px_8px_0px_#000000] dark:shadow-[8px_8px_0px_#c6f36b] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b-2 border-black dark:border-white/20 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus size={20} strokeWidth={2.5} />
                <h3 className="text-lg font-black uppercase tracking-tight text-black dark:text-white">
                  Invite Friend to Squad
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="border-2 border-black p-1 text-black dark:text-white hover:bg-black hover:text-white"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <p className="text-xs font-bold text-black/60 dark:text-white/60 mb-3">
              Only players from your Friends list can be invited to your squad.
            </p>

            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
              {friendsList.length === 0 ? (
                <div className="neo p-6 text-center">
                  <p className="text-xs font-black uppercase text-black dark:text-white">
                    No eligible friends available
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-black/60 dark:text-white/60">
                    Add players to your friends list first using Find Players by Free Fire UID.
                  </p>
                </div>
              ) : (
                friendsList.map(friend => (
                  <div
                    key={friend.id}
                    className="border-2 border-black bg-white dark:bg-[#1a1c23] p-3 flex items-center justify-between gap-3 shadow-[2px_2px_0px_#000000]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black uppercase text-black dark:text-white">
                        {friend.username}
                      </p>
                      <p className="text-xs font-bold text-black/75 dark:text-white/75 truncate">
                        IGN: {friend.ign || "—"} | UID: {friend.uid}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={invitingFriendId === friend.id}
                      onClick={() => sendInvite(friend.id, friend.username)}
                      className="neo-solid min-h-8 px-3 text-xs uppercase tracking-wider text-black shrink-0 disabled:opacity-60"
                    >
                      {invitingFriendId === friend.id ? "Inviting..." : "Invite"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
