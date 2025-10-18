import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QuestionBankProvider } from "./contexts/QuestionBankContext";
import Landing from "./pages/Landing";
import Drill from "./pages/Drill";
import Dashboard from "./pages/Dashboard";
import WrongAnswerJournal from "./pages/WrongAnswerJournal";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <QuestionBankProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/drill" element={<Drill />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/waj" element={<WrongAnswerJournal />} />
            <Route path="/analytics" element={<Analytics />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QuestionBankProvider>
  </QueryClientProvider>
);

export default App;
