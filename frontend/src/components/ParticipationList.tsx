import { CalendarDays, Trophy } from "lucide-react";

type Participation = {
  tournament_id: number;
  title: string;
  match_at: string;
  status: string;
  team: string;
  slot: number | null;
};

export function ParticipationList({ entries }: { entries: Participation[] }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        <Trophy size={18} strokeWidth={2.5} className="text-black dark:text-[#C6F36B]" />
        <h2 className="text-lg font-black uppercase tracking-tight text-black dark:text-white">Your Tournaments</h2>
      </div>
      {entries.length ? (
        <div className="space-y-3">
          {entries.map(entry => (
            <article key={`${entry.tournament_id}-${entry.team}`} className="neo p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-black text-base text-black dark:text-white uppercase">{entry.title}</h3>
                  <p className="mt-1 text-xs font-bold text-black/60 dark:text-white/70">Team · {entry.team}</p>
                </div>
                <span className="shrink-0 border-2 border-black bg-[#C6F36B] px-2.5 py-1 text-[10px] font-black uppercase text-black">
                  {entry.status}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t-2 border-black/10 dark:border-white/10 pt-3 text-xs font-bold text-black/70 dark:text-white/70">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} strokeWidth={2.5} />
                  {new Date(entry.match_at).toLocaleDateString()}
                </span>
                {entry.slot ? (
                  <span className="font-black text-black dark:text-[#C6F36B]">
                    Slot {String(entry.slot).padStart(2, "0")} Assigned
                  </span>
                ) : (
                  <span className="text-black/50 dark:text-white/50">Slot pending approval</span>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="neo p-5 text-center text-xs font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
          You have not registered for any tournament yet.
        </div>
      )}
    </section>
  );
}
