"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, hydrate, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white px-3 py-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 px-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Freelancer OS</span>
        </div>
        <nav className="space-y-1 text-sm">
          {[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Clients", href: "/dashboard/clients" },
            { label: "Projects", href: "/dashboard/projects" },
            { label: "Invoices", href: "/dashboard/invoices" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block rounded-lg px-2 py-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto pt-4">
          <button
            onClick={logout}
            className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">{children}</main>
    </div>
  );
}
