"use client";

import { useAuthStore } from "@/store/auth.store";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Good morning, {user?.firstName ?? "there"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">Here's what's happening today.</p>
      </div>

      {/* Placeholder stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active projects", value: "—" },
          { label: "Pending invoices", value: "—" },
          { label: "Unread messages", value: "—" },
          { label: "Hours this week", value: "—" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
        <p className="text-sm text-gray-400">
          Foundation complete — CRM, Projects, and Invoices coming in Weeks 3–6.
        </p>
      </div>
    </div>
  );
}
