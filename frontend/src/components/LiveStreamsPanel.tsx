import { Radio, Tv } from "lucide-react";
import { SocialLinks } from "./SocialLinks";

type LiveTournament = { id: number; title: string; match_at: string; live_stream_url?: string };

export function LiveStreamsPanel({ tournaments }: { tournaments: LiveTournament[] }) {
  return <section className="space-y-4">
    <div className="glass-panel rounded-3xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#C6F36B]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.18em] text-[#C6F36B]">
            <Radio size={13}/> Live streams
          </div>
          <h2 className="text-xl font-semibold">Watch the drop live.</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-white/55">Tournament broadcasts and creator streams will appear here when they go live.</p>
        </div>
        <Tv className="shrink-0 text-white/20" size={28}/>
      </div>
    </div>
    {tournaments.filter(tournament => tournament.live_stream_url).map(tournament => <a key={tournament.id} href={tournament.live_stream_url} target="_blank" rel="noreferrer" className="glass-panel block rounded-2xl p-4 transition-colors hover:border-[#C6F36B]/35">
      <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-widest text-red-300">Live now</p><h3 className="mt-1 font-semibold">{tournament.title}</h3><p className="mt-1 text-xs text-white/45">{new Date(tournament.match_at).toLocaleString()}</p></div><span className="rounded-full bg-red-400/10 px-3 py-1 text-xs text-red-300">Watch on YouTube</span></div>
    </a>)}
    {!tournaments.some(tournament => tournament.live_stream_url) && <div className="glass-panel rounded-2xl p-6 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/5 text-white/35"><Radio size={21}/></div>
      <h3 className="mt-4 font-medium">No live streams right now</h3>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-5 text-white/45">Check back when the next AAG eSports match begins.</p>
    </div>}
    <SocialLinks/>
  </section>;
}
