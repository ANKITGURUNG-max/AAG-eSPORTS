import { useEffect, useState } from "react";
import { Check, Search, Shield, UserCheck, UserMinus, UserPlus, Users, X } from "lucide-react";
import { api } from "../lib/api";
import { DefaultAvatar } from "./DefaultAvatar";
import { Toast } from "./Toast";

type SearchPlayerResult = {
  id: number;
  player_id: string;
  username: string;
  ign: string;
  uid: string;
  photo: string | null;
  status: "self" | "friends" | "pending_sent" | "pending_received" | "none";
  request_id: number | null;
};

type Friend = {
  friendship_id: number;
  id: number;
  player_id: string;
  username: string;
  ign: string;
  uid: string;
  photo: string | null;
  created_at: string;
};

type ReceivedRequest = {
  id: number;
  sender: {
    id: number;
    player_id: string;
    username: string;
    ign: string;
    uid: string;
    photo: string | null;
  };
  created_at: string;
};

type SentRequest = {
  id: number;
  receiver: {
    id: number;
    player_id: string;
    username: string;
    ign: string;
    uid: string;
    photo: string | null;
  };
  created_at: string;
};

export function FriendsPanel({
  onInviteToSquad,
  isSquadCaptain,
}: {
  onInviteToSquad?: (user_id: number) => void;
  isSquadCaptain?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"search" | "friends" | "received" | "sent">("search");
  const [searchUid, setSearchUid] = useState("");
  const [searchResults, setSearchResults] = useState<SearchPlayerResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<ReceivedRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const loadFriendsData = async () => {
    try {
      setLoading(true);
      const [friendsData, receivedData, sentData] = await Promise.all([
        api<Friend[]>("friends/"),
        api<ReceivedRequest[]>("friends/requests/received/"),
        api<SentRequest[]>("friends/requests/sent/"),
      ]);
      setFriends(friendsData);
      setReceivedRequests(receivedData);
      setSentRequests(sentData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriendsData();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUid.trim()) return;
    setSearching(true);
    setHasSearched(true);
    setMessage(null);
    try {
      const results = await api<SearchPlayerResult[]>(`players/search/?uid=${encodeURIComponent(searchUid.trim())}`);
      setSearchResults(results);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Search failed.", tone: "error" });
    } finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (target: { id?: number; uid?: string; username: string }) => {
    setMessage(null);
    setActionLoadingId(target.id || 999999);
    try {
      const res = await api<{ id?: number; detail: string; status?: string }>("friends/request/", {
        method: "POST",
        body: JSON.stringify({ user_id: target.id, uid: target.uid }),
      });
      setMessage({ text: res.detail || `Friend request sent to ${target.username}.`, tone: "success" });
      // Update search result status locally
      setSearchResults(prev =>
        prev.map(p =>
          (target.id && p.id === target.id) || (target.uid && p.uid === target.uid)
            ? { ...p, status: res.status === "accepted" ? "friends" : "pending_sent", request_id: res.id || p.request_id }
            : p
        )
      );
      loadFriendsData();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Could not send friend request.", tone: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const acceptRequest = async (requestId: number, username: string) => {
    setMessage(null);
    setActionLoadingId(requestId);
    try {
      await api(`friends/requests/${requestId}/accept/`, { method: "POST" });
      setMessage({ text: `You are now friends with ${username}!`, tone: "success" });
      loadFriendsData();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Could not accept request.", tone: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const rejectRequest = async (requestId: number) => {
    setMessage(null);
    setActionLoadingId(requestId);
    try {
      await api(`friends/requests/${requestId}/reject/`, { method: "POST" });
      setMessage({ text: "Friend request rejected.", tone: "success" });
      setReceivedRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Could not reject request.", tone: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const cancelRequest = async (requestId: number) => {
    setMessage(null);
    setActionLoadingId(requestId);
    try {
      await api(`friends/requests/${requestId}/cancel/`, { method: "POST" });
      setMessage({ text: "Friend request cancelled.", tone: "success" });
      setSentRequests(prev => prev.filter(r => r.id !== requestId));
      setSearchResults(prev =>
        prev.map(p => (p.request_id === requestId ? { ...p, status: "none", request_id: null } : p))
      );
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Could not cancel request.", tone: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const removeFriend = async (userId: number, username: string) => {
    if (!window.confirm(`Are you sure you want to remove ${username} from your friends?`)) return;
    setMessage(null);
    setActionLoadingId(userId);
    try {
      await api(`friends/${userId}/`, { method: "DELETE" });
      setMessage({ text: `Removed ${username} from friends.`, tone: "success" });
      setFriends(prev => prev.filter(f => f.id !== userId));
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Could not remove friend.", tone: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast feedback */}
      {message && <Toast message={message.text} tone={message.tone} />}

      {/* Tabs navigation */}
      <div className="neo p-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => { setActiveTab("search"); setMessage(null); }}
          className={`min-h-11 border-2 p-2 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "search"
              ? "border-black bg-[#C6F36B] text-black shadow-[3px_3px_0px_#000000]"
              : "border-transparent text-black dark:text-white hover:border-black hover:bg-[#F4EFE6] dark:hover:bg-[#252836]"
          }`}
        >
          <Search size={15} strokeWidth={2.5} />
          <span>Find Players</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("friends"); setMessage(null); }}
          className={`min-h-11 border-2 p-2 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "friends"
              ? "border-black bg-[#C6F36B] text-black shadow-[3px_3px_0px_#000000]"
              : "border-transparent text-black dark:text-white hover:border-black hover:bg-[#F4EFE6] dark:hover:bg-[#252836]"
          }`}
        >
          <Users size={15} strokeWidth={2.5} />
          <span>My Friends ({friends.length})</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("received"); setMessage(null); }}
          className={`min-h-11 border-2 p-2 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "received"
              ? "border-black bg-[#C6F36B] text-black shadow-[3px_3px_0px_#000000]"
              : "border-transparent text-black dark:text-white hover:border-black hover:bg-[#F4EFE6] dark:hover:bg-[#252836]"
          }`}
        >
          <UserPlus size={15} strokeWidth={2.5} />
          <span>Received</span>
          {receivedRequests.length > 0 && (
            <span className="border border-black bg-[#FF4757] px-1.5 py-0.2 text-[10px] font-black text-white">
              {receivedRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("sent"); setMessage(null); }}
          className={`min-h-11 border-2 p-2 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "sent"
              ? "border-black bg-[#C6F36B] text-black shadow-[3px_3px_0px_#000000]"
              : "border-transparent text-black dark:text-white hover:border-black hover:bg-[#F4EFE6] dark:hover:bg-[#252836]"
          }`}
        >
          <UserCheck size={15} strokeWidth={2.5} />
          <span>Sent ({sentRequests.length})</span>
        </button>
      </div>

      {/* TAB 1: FIND PLAYERS (FREE FIRE UID SEARCH) */}
      {activeTab === "search" && (
        <section className="space-y-5">
          <div className="neo p-5 sm:p-6 bg-white dark:bg-[#121316]">
            <div className="mb-4 border-b-2 border-black dark:border-white/20 pb-3">
              <span className="neo-badge">DATABASE LOOKUP</span>
              <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-black dark:text-white sm:text-2xl">
                Find Players by Free Fire UID
              </h2>
              <p className="mt-1 text-xs font-bold text-black/60 dark:text-white/60">
                Search registered Free Fire UIDs to add teammates to your friends list.
              </p>
            </div>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  value={searchUid}
                  onChange={e => setSearchUid(e.target.value)}
                  placeholder="Enter Free Fire UID (e.g. 1234567890)"
                  className="neo-input uppercase tracking-wider"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="neo-solid min-h-12 px-6 text-xs uppercase tracking-wider text-black flex items-center justify-center gap-2 shrink-0 disabled:opacity-60"
              >
                <Search size={16} strokeWidth={3} />
                {searching ? "Searching..." : "Search Player"}
              </button>
            </form>
          </div>

          {/* Results section */}
          {hasSearched && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-black/70 dark:text-white/70">
                  Search Results ({searchResults.length})
                </h3>
              </div>

              {searchResults.length === 0 ? (
                <div className="neo p-8 text-center bg-white dark:bg-[#121316]">
                  <p className="text-base font-black uppercase text-black dark:text-white">No player found</p>
                  <p className="mt-1 text-xs font-bold text-black/60 dark:text-white/60">
                    No registered player matched Free Fire UID &ldquo;{searchUid}&rdquo;. Make sure the player has signed up with this UID.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {searchResults.map(player => (
                    <div
                      key={player.id}
                      className="neo p-4 bg-white dark:bg-[#1a1c23] flex flex-col justify-between gap-4 border-[3px] border-black shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#c6f36b]"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="shrink-0">
                          {player.photo ? (
                            <img
                              src={player.photo}
                              alt={player.username}
                              className="h-14 w-14 border-2 border-black object-cover shadow-[2px_2px_0px_#000000]"
                            />
                          ) : (
                            <DefaultAvatar name={player.username} size="lg" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="truncate text-base font-black uppercase tracking-tight text-black dark:text-white">
                              {player.username}
                            </h4>
                            <span className="border border-black bg-[#C6F36B] px-1.5 py-0.5 text-[9px] font-black uppercase text-black">
                              {player.player_id}
                            </span>
                          </div>

                          <div className="mt-2 space-y-0.5 text-xs">
                            <p className="font-bold text-black/75 dark:text-white/75">
                              <span className="text-[10px] uppercase font-black tracking-wider text-black/50 dark:text-white/50">IGN: </span>
                              <span className="font-black text-black dark:text-white">{player.ign || "—"}</span>
                            </p>
                            <p className="font-bold text-black/75 dark:text-white/75">
                              <span className="text-[10px] uppercase font-black tracking-wider text-black/50 dark:text-white/50">FF UID: </span>
                              <span className="font-mono font-bold text-black dark:text-[#C6F36B]">{player.uid}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="border-t border-black/10 dark:border-white/10 pt-3">
                        {player.status === "self" ? (
                          <span className="inline-block border border-black bg-zinc-200 dark:bg-zinc-800 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-black dark:text-white w-full text-center">
                            You (Your Account)
                          </span>
                        ) : player.status === "friends" ? (
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 border border-black bg-[#C6F36B] px-3 py-1.5 text-xs font-black uppercase tracking-wider text-black">
                              <Check size={14} strokeWidth={3} /> Friends
                            </span>
                            {isSquadCaptain && onInviteToSquad && (
                              <button
                                type="button"
                                onClick={() => onInviteToSquad(player.id)}
                                className="neo-solid min-h-8 px-3 text-xs uppercase tracking-wider text-black"
                              >
                                Invite to Squad
                              </button>
                            )}
                          </div>
                        ) : player.status === "pending_sent" ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-black/60 dark:text-white/60">
                              Request Pending
                            </span>
                            {player.request_id && (
                              <button
                                type="button"
                                disabled={actionLoadingId === player.request_id}
                                onClick={() => cancelRequest(player.request_id!)}
                                className="neo-ghost min-h-8 px-3 text-xs uppercase tracking-wider text-black dark:text-white border-2 border-black"
                              >
                                Cancel Request
                              </button>
                            )}
                          </div>
                        ) : player.status === "pending_received" ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={actionLoadingId === player.request_id}
                              onClick={() => player.request_id && acceptRequest(player.request_id, player.username)}
                              className="neo-solid min-h-8 flex-1 text-xs uppercase tracking-wider text-black"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              disabled={actionLoadingId === player.request_id}
                              onClick={() => player.request_id && rejectRequest(player.request_id)}
                              className="border-2 border-black bg-white dark:bg-[#121316] min-h-8 px-3 text-xs font-black uppercase text-black dark:text-white hover:bg-black hover:text-white"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={actionLoadingId === player.id}
                            onClick={() => sendFriendRequest(player)}
                            className="neo-solid min-h-9 w-full text-xs uppercase tracking-wider text-black flex items-center justify-center gap-2"
                          >
                            <UserPlus size={16} strokeWidth={2.5} />
                            {actionLoadingId === player.id ? "Sending..." : "Add Friend"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: MY FRIENDS */}
      {activeTab === "friends" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black uppercase tracking-tight text-black dark:text-white">
              Friends List ({friends.length})
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab("search")}
              className="neo-solid min-h-8 px-3 text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5"
            >
              <UserPlus size={14} strokeWidth={3} /> Add More Friends
            </button>
          </div>

          {friends.length === 0 ? (
            <div className="neo p-8 text-center bg-white dark:bg-[#121316]">
              <Users size={36} strokeWidth={2} className="mx-auto text-black/30 dark:text-white/30 mb-2" />
              <p className="text-base font-black uppercase text-black dark:text-white">No friends yet</p>
              <p className="mt-1 text-xs font-bold text-black/60 dark:text-white/60">
                Search players by their Free Fire UID to send friend requests and build your squad roster.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("search")}
                className="neo-solid mt-4 min-h-9 px-4 text-xs uppercase tracking-wider text-black inline-flex items-center gap-2"
              >
                <Search size={14} strokeWidth={3} /> Find Players Now
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {friends.map(friend => (
                <div
                  key={friend.id}
                  className="neo p-4 bg-white dark:bg-[#1a1c23] border-[3px] border-black shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#c6f36b] flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    {friend.photo ? (
                      <img
                        src={friend.photo}
                        alt={friend.username}
                        className="h-12 w-12 border-2 border-black object-cover shrink-0"
                      />
                    ) : (
                      <DefaultAvatar name={friend.username} size="md" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="truncate text-base font-black uppercase text-black dark:text-white">
                          {friend.username}
                        </h4>
                        <span className="border border-black bg-[#C6F36B] px-1.5 py-0.2 text-[9px] font-black text-black shrink-0">
                          {friend.player_id}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-black/75 dark:text-white/75 truncate">
                        IGN: <span className="font-black text-black dark:text-white">{friend.ign || "—"}</span>
                      </p>
                      <p className="text-xs font-bold text-black/75 dark:text-white/75 font-mono">
                        FF UID: <span className="text-black dark:text-[#C6F36B]">{friend.uid || "—"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-black/10 dark:border-white/10 pt-2.5">
                    {isSquadCaptain && onInviteToSquad && (
                      <button
                        type="button"
                        onClick={() => onInviteToSquad(friend.id)}
                        className="neo-solid min-h-8 px-3 text-xs uppercase tracking-wider text-black flex items-center gap-1.5"
                      >
                        <Shield size={14} strokeWidth={2.5} /> Invite to Squad
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={actionLoadingId === friend.id}
                      onClick={() => removeFriend(friend.id, friend.username)}
                      className="ml-auto text-xs font-black uppercase tracking-wider text-[#FF4757] hover:underline flex items-center gap-1"
                    >
                      <UserMinus size={14} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: RECEIVED REQUESTS */}
      {activeTab === "received" && (
        <section className="space-y-4">
          <h2 className="text-lg font-black uppercase tracking-tight text-black dark:text-white">
            Received Friend Requests ({receivedRequests.length})
          </h2>

          {receivedRequests.length === 0 ? (
            <div className="neo p-8 text-center bg-white dark:bg-[#121316]">
              <p className="text-base font-black uppercase text-black dark:text-white">No pending requests</p>
              <p className="mt-1 text-xs font-bold text-black/60 dark:text-white/60">
                When other players search for your Free Fire UID and add you, invitations will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {receivedRequests.map(req => (
                <div
                  key={req.id}
                  className="neo p-4 bg-white dark:bg-[#1a1c23] border-[3px] border-black shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#c6f36b] space-y-3"
                >
                  <div className="flex items-start gap-3">
                    {req.sender.photo ? (
                      <img
                        src={req.sender.photo}
                        alt={req.sender.username}
                        className="h-12 w-12 border-2 border-black object-cover shrink-0"
                      />
                    ) : (
                      <DefaultAvatar name={req.sender.username} size="md" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="truncate text-base font-black uppercase text-black dark:text-white">
                          {req.sender.username}
                        </h4>
                        <span className="border border-black bg-[#C6F36B] px-1.5 py-0.2 text-[9px] font-black text-black shrink-0">
                          {req.sender.player_id}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-black/75 dark:text-white/75 truncate">
                        IGN: <span className="font-black text-black dark:text-white">{req.sender.ign || "—"}</span>
                      </p>
                      <p className="text-xs font-bold text-black/75 dark:text-white/75 font-mono">
                        FF UID: <span className="text-black dark:text-[#C6F36B]">{req.sender.uid || "—"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t border-black/10 dark:border-white/10 pt-2.5">
                    <button
                      type="button"
                      disabled={actionLoadingId === req.id}
                      onClick={() => acceptRequest(req.id, req.sender.username)}
                      className="neo-solid min-h-8 flex-1 text-xs uppercase tracking-wider text-black"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={actionLoadingId === req.id}
                      onClick={() => rejectRequest(req.id)}
                      className="border-2 border-black bg-white dark:bg-[#121316] min-h-8 px-4 text-xs font-black uppercase text-black dark:text-white hover:bg-black hover:text-white"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 4: SENT REQUESTS */}
      {activeTab === "sent" && (
        <section className="space-y-4">
          <h2 className="text-lg font-black uppercase tracking-tight text-black dark:text-white">
            Sent Friend Requests ({sentRequests.length})
          </h2>

          {sentRequests.length === 0 ? (
            <div className="neo p-8 text-center bg-white dark:bg-[#121316]">
              <p className="text-base font-black uppercase text-black dark:text-white">No outgoing requests</p>
              <p className="mt-1 text-xs font-bold text-black/60 dark:text-white/60">
                You have no pending friend requests sent.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {sentRequests.map(req => (
                <div
                  key={req.id}
                  className="neo p-4 bg-white dark:bg-[#1a1c23] border-[3px] border-black shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#c6f36b] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {req.receiver.photo ? (
                      <img
                        src={req.receiver.photo}
                        alt={req.receiver.username}
                        className="h-11 w-11 border-2 border-black object-cover shrink-0"
                      />
                    ) : (
                      <DefaultAvatar name={req.receiver.username} size="sm" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black uppercase text-black dark:text-white">
                        {req.receiver.username}
                      </p>
                      <p className="text-xs font-mono font-bold text-black/60 dark:text-white/60">
                        UID: {req.receiver.uid}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={actionLoadingId === req.id}
                    onClick={() => cancelRequest(req.id)}
                    className="neo-ghost min-h-8 px-3 text-xs uppercase tracking-wider text-black dark:text-white border-2 border-black shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
