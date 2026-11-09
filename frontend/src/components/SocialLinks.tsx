import { Camera, MessageCircle, Play } from "lucide-react";

const links = [
  { label: "WhatsApp", href: "https://whatsapp.com/channel/0029VbCOvvRFnSz4w3dyWn0p", Icon: MessageCircle },
  { label: "Instagram", href: "https://www.instagram.com/all_alliance_official/", Icon: Camera },
  { label: "YouTube", href: "https://www.youtube.com/@AllAllianceGamingClub", Icon: Play },
] as const;

export function SocialLinks() {
  return <section className="border-3 border-black bg-white p-4"><p className="text-[10px] uppercase tracking-[.18em] text-black">Join the community</p><p className="mt-2 text-sm text-black/55">Follow AAG eSports for match updates, streams, and announcements.</p><div className="mt-4 grid grid-cols-3 gap-2">{links.map(({ label, href, Icon }) => <a key={label} href={href} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-1.5 border-3 border-black bg-black px-2 text-xs font-bold text-white transition-colors hover:bg-[#C6F36B] hover:text-black"><Icon size={15}/><span>{label}</span></a>)}</div></section>;
}