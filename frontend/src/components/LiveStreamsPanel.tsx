import { Radio, Tv } from "lucide-react";
import { SocialLinks } from "./SocialLinks";

type LiveTournament = { id: number; title: string; match_at: string; live_stream_url?: string };

export function LiveStreamsPanel({ tournaments }: { tournaments: LiveTournament[] }) {
  return <section className="space-y-4">
    <div className="border-3 border-black bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 border-3 border-black bg-black px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-[#C6F36B]">
            <Radio size={13}/> Live streams
          </div>
          <h2 className="text-xl font-black">Watch the drop live.</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-black/55">Tournament broadcasts and creator streams will appear here when they go live.</p>
        </div>
        <Tv className="shrink-0 text-black/20" size={28}/>
      </div>
    </div>
    {tournaments.filter(tournament => tournament.live_stream_url).map(tournament => <a key={tournament.id} href={tournament.live_stream_url} target="_blank" rel="noreferrer" className="neo block p-4 transition-colors hover:bg-[#C6F36B] hover:text-black"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-widest text-red-600">Live now</p><h3 className="mt-1 font-black">{tournament.title}</h3><p className="mt-1 text-xs text-black/45">{new Date(tournament.match_at).toLocaleString()}</p></div><span className="bg-black px-3 py-1 text-xs font-bold text-white">Watch on YouTube</span></div></a>)}
    {!tournaments.some(tournament => tournament.live_stream_url) && <div className="border-3 border-black bg-white p-6 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center border-3 border-black bg-black text-white/35"><Radio size={21}/></div>
      <h3 className="mt-4 font-medium">No live streams right now</h3>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-5 text-black/45">Check back when the next AAG eSports match begins.</p>
    </div>}
    <SocialLinks/>
  </section>;
}