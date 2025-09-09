import SiteHeader from "./SiteHeader";
import React from "react";
import "@/styles/pirate-theme.css";

export default function AppLayout({ children }: React.PropsWithChildren) {
  return (
    <div className="min-h-screen flex flex-col bg-[url('/assets/textures/parchment-01.svg')] bg-cover">
      <SiteHeader />
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-[rgba(7,71,105,0.04)] to-transparent" />
        <main className="flex-1 container py-6 relative z-10">{children}</main>
      </div>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Log Pose · One Piece character sheets
      </footer>
    </div>
  );
}
