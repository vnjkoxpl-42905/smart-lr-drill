import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QuestionBankProvider } from "./contexts/QuestionBankContext";
import { AuthProvider } from "./contexts/AuthContext";
import { UserSettingsProvider } from "./contexts/UserSettingsContext";
import Landing from "./pages/Landing";
import Drill from "./pages/Drill";
import Dashboard from "./pages/Dashboard";
import WrongAnswerJournal from "./pages/WrongAnswerJournal";
import Analytics from "./pages/Analytics";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const App = () => (
  <AuthProvider>
    <UserSettingsProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Auth route - NO question bank needed */}
            <Route path="/auth" element={<Auth />} />
            
            {/* All other routes - wrapped with QuestionBankProvider */}
            <Route path="/*" element={
              <QuestionBankProvider>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/drill" element={<Drill />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/waj" element={<WrongAnswerJournal />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </QuestionBankProvider>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </UserSettingsProvider>
  </AuthProvider>
);

export default App;
