import { Routes, Route } from "react-router-dom";
import PublicLayout from "./components/layout/PublicLayout.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";
import RequireAuth from "./components/auth/RequireAuth.jsx";
import RequireSubscription from "./components/auth/RequireSubscription.jsx";
import RequireAdmin from "./components/auth/RequireAdmin.jsx";
import Landing from "./pages/Landing.jsx";
import Pricing from "./pages/Pricing.jsx";
import Terms from "./pages/Terms.jsx";
import Privacy from "./pages/Privacy.jsx";
import Login from "./pages/Login.jsx";
import AuthCallback from "./pages/AuthCallback.jsx";
import Subscribe from "./pages/Subscribe.jsx";
import Account from "./pages/Account.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Vault from "./pages/Vault.jsx";
import Claims from "./pages/Claims.jsx";
import NewClaim from "./pages/NewClaim.jsx";
import ClaimDetail from "./pages/ClaimDetail.jsx";
import LetterBuilder from "./pages/LetterBuilder.jsx";
import ScopeChecker from "./pages/ScopeChecker.jsx";
import AdminHome from "./pages/admin/AdminHome.jsx";
import AdminItems from "./pages/admin/AdminItems.jsx";
import AdminItemForm from "./pages/admin/AdminItemForm.jsx";
import AdminLeads from "./pages/admin/AdminLeads.jsx";
import AdminSubscribers from "./pages/admin/AdminSubscribers.jsx";
import AdminMonthlyUpdate from "./pages/admin/AdminMonthlyUpdate.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route path="/scope-checker" element={<ScopeChecker />} />

        <Route
          path="*"
          element={<ComingSoon title="Page not found" note="Check the link and try again." />}
        />
      </Route>

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        {/* Signed in, but not gated on an active subscription — you need to
            reach these to start or manage billing in the first place. */}
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="/account" element={<Account />} />

        {/* The paid app: subscription_status must be trialing or active. */}
        <Route
          path="/dashboard"
          element={
            <RequireSubscription>
              <Dashboard />
            </RequireSubscription>
          }
        />
        <Route
          path="/vault"
          element={
            <RequireSubscription>
              <Vault />
            </RequireSubscription>
          }
        />
        <Route
          path="/claims"
          element={
            <RequireSubscription>
              <Claims />
            </RequireSubscription>
          }
        />
        <Route
          path="/claims/new"
          element={
            <RequireSubscription>
              <NewClaim />
            </RequireSubscription>
          }
        />
        <Route
          path="/claims/:id"
          element={
            <RequireSubscription>
              <ClaimDetail />
            </RequireSubscription>
          }
        />
        <Route
          path="/claims/:id/letter"
          element={
            <RequireSubscription>
              <LetterBuilder />
            </RequireSubscription>
          }
        />

        {/* ADMIN_EMAIL only, via the admins table + is_admin(). Not gated
            on RequireSubscription — the person running the Vault shouldn't
            need to personally pay for a subscription to manage it. */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminHome />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/items"
          element={
            <RequireAdmin>
              <AdminItems />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/items/new"
          element={
            <RequireAdmin>
              <AdminItemForm />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/items/:id"
          element={
            <RequireAdmin>
              <AdminItemForm />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/leads"
          element={
            <RequireAdmin>
              <AdminLeads />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/subscribers"
          element={
            <RequireAdmin>
              <AdminSubscribers />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/monthly-update"
          element={
            <RequireAdmin>
              <AdminMonthlyUpdate />
            </RequireAdmin>
          }
        />
      </Route>
    </Routes>
  );
}
