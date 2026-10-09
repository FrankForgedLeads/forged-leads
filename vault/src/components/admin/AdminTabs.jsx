import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/admin/items", label: "Items" },
  { to: "/admin/leads", label: "Leads" },
  { to: "/admin/subscribers", label: "Subscribers" },
  { to: "/admin/analysis", label: "Analysis runs" },
  { to: "/admin/usage", label: "Usage" },
  { to: "/admin/feedback", label: "Feedback" },
  { to: "/admin/monthly-update", label: "Monthly update" },
];

export default function AdminTabs() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            `shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
              isActive
                ? "border-gold-500 bg-gold-500 text-navy-950"
                : "border-navy-600 bg-navy-800 text-white/70 hover:text-white"
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}
