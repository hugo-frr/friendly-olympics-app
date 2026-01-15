import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TabBar } from "@/components/layout/TabBar";
import AuthPage from "./pages/AuthPage";
import OlympiadsPage from "./pages/OlympiadsPage";
import EnterScoresPage from "./pages/EnterScoresPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DataProvider>
                    <OlympiadsPage />
                    <TabBar />
                  </DataProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/enter"
              element={
                <ProtectedRoute>
                  <DataProvider>
                    <EnterScoresPage />
                    <TabBar />
                  </DataProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <DataProvider>
                    <LeaderboardPage />
                    <TabBar />
                  </DataProvider>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
