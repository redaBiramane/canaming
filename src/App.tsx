import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import LandingPage from "./pages/LandingPage";
import RenamePage from "./pages/RenamePage";
import SqlPage from "./pages/SqlPage";
import DbtPage from "./pages/DbtPage";
import SasPage from "./pages/SasPage";
import IaNamingPage from "./pages/IaNamingPage";
import AdminPage from "./pages/AdminPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import SignalementsPage from "./pages/SignalementsPage";
import UsersPage from "./pages/UsersPage";
import SuggestionsPage from "./pages/SuggestionsPage";
import DashboardPage from "./pages/DashboardPage";
import DocumentationPage from "./pages/DocumentationPage";
import ExcelPastePage from "./pages/ExcelPastePage";
import StopWordsPage from "./pages/StopWordsPage";
import GlossaryPage from "./pages/GlossaryPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground font-bold animate-pulse">CA</div>
          <p className="text-muted-foreground text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes - Rendered without AppLayout */}
      {!user && <Route path="/" element={<LandingPage />} />}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      
      {/* Protected Routes - Rendered inside AppLayout */}
      <Route path="/*" element={
        !user ? <Navigate to="/login" replace /> : (
          <AppLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/rename" element={<RenamePage />} />
              <Route path="/excel-paste" element={<ExcelPastePage />} />
              <Route path="/sql" element={<SqlPage />} />
              <Route path="/dbt" element={<DbtPage />} />
              <Route path="/sas" element={<SasPage />} />
              <Route path="/ia-naming" element={<IaNamingPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/signalements" element={<SignalementsPage />} />
              <Route path="/suggestions" element={<SuggestionsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/documentation" element={<DocumentationPage />} />
              <Route path="/glossary" element={<GlossaryPage />} />
              <Route path="/stop-words" element={<StopWordsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        )
      } />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider defaultTheme="system" storageKey="ca-naming-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
