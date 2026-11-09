import { DoorOpen } from "lucide-react";

type Slot = { tournament: string; match_at: string; team: string; slot: number | null };

export function PlayerSlotCard({ slots }: { slots: Slot[] }) {
  if (!slots.length) return null;
  return <section className="mb-5 border-3 border-black bg-[#C6F36B] p-4"><div className="flex items-center gap-2 text-black"><DoorOpen size={17}/><p className="text-xs font-black uppercase tracking-widest">Custom room slot</p></div>{slots.map(slot => <div key={`${slot.tournament}-${slot.slot}`} className="mt-3 flex items-end justify-between gap-3"><div><p className="font-black">{slot.tournament}</p><p className="text-xs text-black/55">{slot.team} · {new Date(slot.match_at).toLocaleString()}</p></div><p className="text-3xl font-black text-black">{slot.slot ? String(slot.slot).padStart(2, "0") : "--"}</p></div>)}</section>;
}