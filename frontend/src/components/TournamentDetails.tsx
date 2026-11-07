import { ChevronLeft } from "lucide-react";
import { RegistrationPanel } from "./RegistrationPanel";
import type { Tournament } from "./TournamentCard";
import type { UserProfile } from "./ProfilePanel";

export function TournamentDetails({ tournament, profile, onBack }: { tournament: Tournament; profile: UserProfile; onBack: () => void }) {
  return <main className="min-h-screen overflow-x-hidden bg-[#101112] px-4 pb-8 pt-5 text-[#F4F4F0] sm:px-6 sm:pt-8"><button onClick={onBack} className="mb-8 flex min-h-11 items-center gap-2 text-sm text-white/60"><ChevronLeft size={18}/> Back</button><p className="text-xs uppercase tracking-[.2em] text-[#C6F36B]">Tournament details</p><h1 className="mt-2 break-words text-2xl font-semibold sm:text-3xl">{tournament.title}</h1><p className="mt-4 text-sm leading-6 text-white/65 sm:text-base">{tournament.description}</p><div className="my-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#191B1D] p-4"><p className="text-xs text-white/45">Prize pool</p><p className="mt-1 text-lg sm:text-xl">₹{tournament.prize_pool}</p></div><div className="rounded-2xl bg-[#191B1D] p-4"><p className="text-xs text-white/45">Entry fee</p><p className="mt-1 text-lg sm:text-xl">₹{tournament.entry_fee}</p></div></div><RegistrationPanel tournament={tournament} profile={profile}/></main>;
}
