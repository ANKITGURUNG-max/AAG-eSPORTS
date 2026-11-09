import { DoorOpen } from "lucide-react";

type Slot = { tournament: string; match_at: string; team: string; slot: number | null };

export function PlayerSlotCard({ slots }: { slots: Slot[] }) {
  if (!slots.length) return null;
  return (
    <section className="mb-6 border-[3px] border-black bg-[#C6F36B] p-4 text-black shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#c6f36b]">
      <div className="flex items-center gap-2">
        <DoorOpen size={18} strokeWidth={2.5} />
        <p className="text-xs font-black uppercase tracking-widest">Custom Room Assigned</p>
      </div>
      {slots.map(slot => (
        <div key={`${slot.tournament}-${slot.slot}`} className="mt-3 flex items-end justify-between gap-3 border-t-2 border-black/15 pt-3">
          <div>
            <p className="font-black text-sm uppercase">{slot.tournament}</p>
            <p className="text-xs font-bold text-black/75">
              Squad: {slot.team} · {new Date(slot.match_at).toLocaleString()}
            </p>
          </div>
          <p className="text-3xl font-black">{slot.slot ? String(slot.slot).padStart(2, "0") : "--"}</p>
        </div>
      ))}
    </section>
  );
}
