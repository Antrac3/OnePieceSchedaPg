import { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { useSessionProfile } from "@/hooks/useSessionProfile";

export default function MasterRoute({ children }: PropsWithChildren) {
  const { isAuthenticated, sessionLoading, role } = useSessionProfile();
  if (sessionLoading) return <div className="p-6">Caricamento...</div>;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (role !== "master") return <Navigate to="/" replace />;
  return <>{children}</>;
}
