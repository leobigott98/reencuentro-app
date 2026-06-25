"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="w-full rounded-2xl bg-cerca-600 px-5 py-3 font-bold text-white shadow-sm disabled:opacity-60">
      {pending ? "Enviando..." : children}
    </button>
  );
}
