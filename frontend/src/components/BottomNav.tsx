import { Home, Trophy, Bell, UserRound, Radio } from "lucide-react";
type Props = { active: string; onChange: (value: string) => void };
export function BottomNav({ active, onChange }: Props) {
  const items = [["home", "Home", Home], ["tournaments", "Tournaments", Trophy], ["streams", "Live", Radio], ["updates", "Updates", Bell], ["profile", "Profile", UserRound]] as const;
  return <nav className="glass-nav safe-bottom fixed bottom-0 left-0 right-0 z-20 flex w-full px-1 py-1 md:static md:rounded-2xl md:px-2">{items.map(([id, label, Icon]) => <button key={id} onClick={() => onChange(id)} className={`min-w-0 flex-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-all duration-300 ${active === id ? "bg-[#C6F36B]/15 text-[#C6F36B] shadow-[inset_0_1px_rgb(198_243_107/.22),0_0_18px_rgb(198_243_107/.08)]" : "text-white/45 hover:bg-white/5"}`}><span className="flex flex-col items-center gap-1"><Icon size={18}/><span className="truncate">{label}</span></span></button>)}</nav>;
}
