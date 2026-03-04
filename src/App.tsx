
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";
import { AdminProvider } from "./contexts/AdminContext";
import { AppProvider } from "./contexts/AppContext";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="dark">
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* USER APPLICATION */}
              <Route path="/" element={<Index />} />

              {/* ADMIN APPLICATION — COMPLETELY SEPARATE */}
              <Route
                path="/admin/*"
                element={
                  <AdminProtectedRoute>
                    <AdminProvider>
                      <Admin />
                    </AdminProvider>
                  </AdminProtectedRoute>
                }
              />

              {/* Unauthorized page */}
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Catch-all MUST be last */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
