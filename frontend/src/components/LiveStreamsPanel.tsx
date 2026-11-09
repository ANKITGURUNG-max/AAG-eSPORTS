import { Radio, Tv } from "lucide-react";
import { SocialLinks } from "./SocialLinks";

type LiveTournament = { id: number; title: string; match_at: string; live_stream_url?: string };

export function LiveStreamsPanel({ tournaments }: { tournaments: LiveTournament[] }) {
  return (
    <section className="space-y-4">
      <div className="neo p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 border-2 border-black bg-black px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-[#C6F36B]">
              <Radio size={13} strokeWidth={3} /> LIVE BROADCASTS
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-black dark:text-white sm:text-2xl">
              Watch The Match Live
            </h2>
            <p className="mt-2 max-w-md text-xs font-bold leading-relaxed text-black/60 dark:text-white/70">
              Tournament broadcasts, custom room spectator streams, and creator POVs will appear here in real-time.
            </p>
          </div>
          <Tv className="shrink-0 text-black/30 dark:text-white/30" size={32} strokeWidth={2} />
        </div>
      </div>

      {tournaments.filter(tournament => tournament.live_stream_url).map(tournament => (
        <a
          key={tournament.id}
          href={tournament.live_stream_url}
          target="_blank"
          rel="noreferrer"
          className="neo block p-4 transition-transform hover:-translate-y-0.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="border border-black bg-[#FF4757] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                Live Now
              </span>
              <h3 className="mt-1.5 font-black text-base uppercase text-black dark:text-white">{tournament.title}</h3>
              <p className="mt-1 text-xs font-bold text-black/60 dark:text-white/70">
                Started {new Date(tournament.match_at).toLocaleString()}
              </p>
            </div>
            <span className="neo-ghost px-3 py-2 text-xs font-black uppercase tracking-wider text-white">
              Watch on YouTube →
            </span>
          </div>
        </a>
      ))}

      {!tournaments.some(tournament => tournament.live_stream_url) && (
        <div className="neo p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center border-2 border-black bg-[#C6F36B] text-black">
            <Radio size={22} strokeWidth={2.5} />
          </div>
          <h3 className="mt-4 font-black uppercase text-black dark:text-white">No Live Streams Currently</h3>
          <p className="mx-auto mt-2 max-w-xs text-xs font-bold text-black/60 dark:text-white/70">
            Check back when the next AAG eSports match round begins.
          </p>
        </div>
      )}

      <SocialLinks />
    </section>
  );
}
