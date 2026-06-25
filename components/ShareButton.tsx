"use client";
import { Share2 } from "lucide-react";

export function ShareButton({ title, text, url, publicCode }: { title: string; text: string; url: string; publicCode?: string }) {
  async function share() {
    if (publicCode) fetch("/api/share-count", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ public_code: publicCode }) }).catch(() => null);
    if (navigator.share) await navigator.share({ title, text, url });
    else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      alert("Mensaje copiado para compartir.");
    }
  }
  return <button onClick={share} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white"><Share2 size={18}/> Compartir búsqueda</button>;
}
