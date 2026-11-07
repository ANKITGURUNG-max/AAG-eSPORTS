import { Camera, MessageCircle, Play } from "lucide-react";

const links = [
  { label: "WhatsApp", href: "https://whatsapp.com/channel/0029VbCOvvRFnSz4w3dyWn0p", Icon: MessageCircle },
  { label: "Instagram", href: "https://www.instagram.com/all_alliance_official/", Icon: Camera },
  { label: "YouTube", href: "https://www.youtube.com/@AllAllianceGamingClub", Icon: Play },
] as const;

export function SocialLinks() {
  return <section className="glass-panel rounded-2xl p-4">
    <p className="text-[10px] uppercase tracking-[.18em] text-[#C6F36B]">Join the community</p>
    <p className="mt-2 text-sm text-white/55">Follow AAG eSports for match updates, streams, and announcements.</p>
    <div className="mt-4 grid grid-cols-3 gap-2">
      {links.map(({ label, href, Icon }) => <a key={label} href={href} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-2 text-xs text-white/70 transition-colors hover:border-[#C6F36B]/35 hover:text-[#C6F36B]">
        <Icon size={15}/><span>{label}</span>
      </a>)}
    </div>
  </section>;
}
