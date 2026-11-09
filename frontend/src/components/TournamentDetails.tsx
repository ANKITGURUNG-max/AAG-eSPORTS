import { ChevronLeft, Trophy, DollarSign, Calendar, ShieldAlert } from "lucide-react";
import { RegistrationPanel } from "./RegistrationPanel";
import type { Tournament } from "./TournamentCard";
import type { UserProfile } from "./ProfilePanel";

export function TournamentDetails({
  tournament,
  profile,
  onBack,
}: {
  tournament: Tournament;
  profile: UserProfile;
  onBack: () => void;
}) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F4EFE6] px-4 pb-12 pt-6 text-black sm:px-6 sm:pt-8">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={onBack}
          className="neo-ghost mb-6 inline-flex min-h-11 items-center gap-2 px-4 text-xs font-black uppercase tracking-wider text-white"
        >
          <ChevronLeft size={18} strokeWidth={3} />
          Back to tournaments
        </button>

        {/* Title Header Card */}
        <section className="neo mb-6 p-6 sm:p-8">
          <div className="mb-2 inline-flex items-center gap-2 border-2 border-black bg-[#C6F36B] px-3 py-1 text-xs font-black uppercase tracking-widest text-black shadow-[2px_2px_0px_#000000]">
            Free Fire Squad Tournament
          </div>
          <h1 className="mt-3 break-words text-3xl font-black tracking-tight text-black sm:text-4xl">
            {tournament.title}
          </h1>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-black/80 sm:text-base">
            {tournament.description}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="border-[3px] border-black bg-[#C6F36B] p-4 shadow-[3px_3px_0px_#000000]">
              <p className="text-xs font-black uppercase tracking-wider text-black/70">Prize pool</p>
              <p className="mt-1 text-2xl font-black text-black">₹{tournament.prize_pool}</p>
            </div>
            <div className="border-[3px] border-black bg-white p-4 shadow-[3px_3px_0px_#000000]">
              <p className="text-xs font-black uppercase tracking-wider text-black/70">Entry fee</p>
              <p className="mt-1 text-2xl font-black text-black">
                {Number(tournament.entry_fee) === 0 ? "FREE" : `₹${tournament.entry_fee}`}
              </p>
            </div>
            <div className="col-span-2 border-[3px] border-black bg-[#FFE600] p-4 shadow-[3px_3px_0px_#000000] sm:col-span-1">
              <p className="text-xs font-black uppercase tracking-wider text-black/70">Match date</p>
              <p className="mt-1 text-sm font-black text-black">
                {new Date(tournament.match_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </section>

        {/* Registration */}
        <RegistrationPanel tournament={tournament} profile={profile} />
      </div>
    </main>
  );
}
