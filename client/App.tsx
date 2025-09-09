import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/Auth";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import MasterPage from "./pages/Master";
import ViewPage from "./pages/View";
import EditPage from "./pages/Edit";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import MasterRoute from "./components/layout/MasterRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/view"
              element={
                <ProtectedRoute>
                  <ViewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit"
              element={
                <ProtectedRoute>
                  <EditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/master"
              element={
                <MasterRoute>
                  <MasterPage />
                </MasterRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
