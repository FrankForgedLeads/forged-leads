import { Routes, Route } from "react-router-dom";
import PublicLayout from "./components/layout/PublicLayout.jsx";
import Landing from "./pages/Landing.jsx";
import Pricing from "./pages/Pricing.jsx";
import Terms from "./pages/Terms.jsx";
import Privacy from "./pages/Privacy.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />

        {/* Stub routes — built out in later phases */}
        <Route
          path="/login"
          element={
            <ComingSoon
              title="Magic-link login"
              note="Supabase auth lands in Phase 2. You'll log in with just your email — no password."
            />
          }
        />
        <Route
          path="/scope-checker"
          element={
            <ComingSoon
              title="Free Scope Checker"
              note="The 12-item checklist with a live running total lands in Phase 5."
            />
          }
        />
        <Route
          path="*"
          element={<ComingSoon title="Page not found" note="Check the link and try again." />}
        />
      </Route>
    </Routes>
  );
}
