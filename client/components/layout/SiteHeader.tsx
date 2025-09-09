import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn, LogOut } from "lucide-react";
import PirateButton from "@/components/ui/pirate-button";
import AnimatedIcon from "@/components/ui/animated-icon";
import { useSessionProfile } from "@/hooks/useSessionProfile";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase"; const supabase = getSupabase();

export default function SiteHeader() {
  const { isAuthenticated, role } = useSessionProfile();
  const navigate = useNavigate();
  const location = useLocation();

  const logout = async () => {
    if (!isSupabaseConfigured()) return;
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const linkClass = (path: string) =>
    `px-3 py-2 rounded-md text-sm font-heading ${location.pathname === path ? "bg-yellow-400/20 text-yellow-600" : "hover:bg-yellow-200/10"}`;

  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-background/80 bg-gradient-to-b from-[rgba(11,111,164,0.06)] to-transparent">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <AnimatedIcon src="https://cdn.builder.io/api/v1/image/assets%2F6b619505ba96465eb1afa787c4410188%2F6d46fcaf17b8448f90542ca5bb718e0f?format=webp&width=80" className="h-10 w-10" spin />
          <span className="font-display text-2xl text-white drop-shadow">Log Pose</span>
        </Link>
        <nav className="hidden md:flex items-center gap-3">
          <Link className={linkClass("/")} to="/">
            <AnimatedIcon src="/assets/icons/feather.svg" className="h-4 w-4 inline-block mr-2" /> Compila
          </Link>
          <Link className={linkClass("/view")} to="/view">
            <AnimatedIcon src="/assets/icons/log-pose.svg" className="h-4 w-4 inline-block mr-2" /> Visualizza
          </Link>
          <Link className={linkClass("/edit")} to="/edit">
            <AnimatedIcon src="/assets/icons/sword.svg" className="h-4 w-4 inline-block mr-2" /> Modifica
          </Link>
          {role === "master" && (
            <Link className={linkClass("/master")} to="/master">
              <span className="inline-flex items-center gap-2"><AnimatedIcon src="/assets/icons/compass.svg" className="h-4 w-4" /> Master</span>
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {!isAuthenticated ? (
            <PirateButton asChild>
              <Link to="/auth" className="inline-flex items-center gap-2"><LogIn className="h-4 w-4" /> Login</Link>
            </PirateButton>
          ) : (
            <PirateButton variant="destructive" onClick={logout}><LogOut className="h-4 w-4" /> Logout</PirateButton>
          )}
        </div>
      </div>
    </header>
  );
}
