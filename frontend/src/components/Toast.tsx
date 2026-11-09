export function Toast({ message, tone = "success" }: { message: string; tone?: "success" | "error" }) {
  if (!message) return null;
  return <div role="status" aria-live="polite" className={`fixed left-1/2 top-4 z-[60] flex w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-2xl shadow-black/40 ${tone === "error" ? "border-red-400/40 bg-[#29191B] text-red-200" : "border-[#C6F36B]/35 bg-[#191B1D] text-[#C6F36B]"}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${tone === "error" ? "bg-red-300 text-[#29191B]" : "bg-[#C6F36B] text-[#101112]"}`}>{tone === "error" ? "!" : "✓"}</span><span>{message}</span></div>;
}
