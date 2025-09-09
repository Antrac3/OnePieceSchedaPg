import { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSessionProfile } from "@/hooks/useSessionProfile";

export default function ProtectedRoute({ children }: PropsWithChildren) {
  const { isAuthenticated, sessionLoading } = useSessionProfile();
  const location = useLocation();
  if (sessionLoading) return <div className="p-6">Caricamento...</div>;
  if (!isAuthenticated)
    return (
      <Navigate to="/auth" state={{ from: location }} replace />
    );
  return <>{children}</>;
}
