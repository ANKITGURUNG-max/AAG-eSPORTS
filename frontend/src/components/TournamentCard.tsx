import { CalendarDays, Users } from "lucide-react";

export type Tournament = {
  id: number;
  title: string;
  description: string;
  match_at: string;
  entry_fee: string;
  prize_pool: string;
  filled_slots: number;
  slots: { number: number; occupied: boolean }[];
  status: string;
};

export function TournamentCard({
  tournament,
  onOpen,
  participated = false,
}: {
  tournament: Tournament;
  onOpen: () => void;
  participated?: boolean;
}) {
  const filledSlots = Math.min(12, Math.max(0, tournament.filled_slots || 0));
  const slotsLeft = 12 - filledSlots;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`neo w-full min-w-0 p-5 text-left transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000000] dark:hover:shadow-[6px_6px_0px_#C6F36B] ${
        participated ? "bg-[#FFF9E6] dark:bg-[#20232c]" : "bg-white dark:bg-[#1a1c23]"
      }`}
    >
      <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 truncate text-xs font-black uppercase tracking-wider text-black/60 dark:text-white/60">
            Free Fire · {participated ? "✓ Enrolled" : tournament.status}
          </p>
          <h3 className="truncate text-lg font-black tracking-tight text-black dark:text-white sm:text-xl">
            {tournament.title}
          </h3>
        </div>
        <span className="shrink-0 border-2 border-black bg-[#C6F36B] px-3 py-1 text-xs font-black text-black shadow-[2px_2px_0px_#000000]">
          ₹{tournament.prize_pool} POOL
        </span>
      </div>

      <p className="mb-4 line-clamp-2 text-sm font-semibold leading-relaxed text-black/70 dark:text-white/70">
        {tournament.description}
      </p>

      {/* Slots Meter */}
      <div className="mb-4 border-2 border-black bg-[#F4EFE6] dark:bg-[#101114] p-3 shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#C6F36B]">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
          <span className="flex items-center gap-1.5 font-black text-black dark:text-white">
            <Users size={15} strokeWidth={2.5} />
            {filledSlots}/12 SLOTS FILLED
          </span>
          <span
            className={`font-black uppercase tracking-wide ${
              slotsLeft <= 2
                ? "bg-[#FF4D4D] text-white px-1.5 py-0.5 border border-black"
                : "text-black dark:text-white"
            }`}
          >
            {slotsLeft === 0 ? "FULL" : `${slotsLeft} LEFT`}
          </span>
        </div>
        <div className="h-3.5 border-2 border-black bg-white dark:bg-[#20232c]">
          <div
            className="h-full bg-[#C6F36B] border-r-2 border-black transition-all duration-300"
            style={{ width: `${(filledSlots / 12) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs font-black text-black dark:text-white pt-1 border-t-2 border-black/10 dark:border-white/15">
        <span className="flex items-center gap-1.5">
          <CalendarDays size={15} strokeWidth={2.5} />
          {new Date(tournament.match_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span className="bg-black text-[#C6F36B] px-2.5 py-1 text-xs uppercase tracking-wider border border-black dark:border-white/20">
          {Number(tournament.entry_fee) === 0 ? "FREE ENTRY" : `₹${tournament.entry_fee} ENTRY`}
        </span>
      </div>
    </button>
  );
}
