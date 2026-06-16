"use client";

import { create } from "zustand";
import { api } from "@/lib/api";

interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  orgId: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  orgName: string;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("access_token", data.accessToken);
    set({ user: data.user, accessToken: data.accessToken });
  },

  register: async (formData) => {
    const { data } = await api.post("/auth/register", formData);
    localStorage.setItem("access_token", data.accessToken);
    set({ user: data.user, accessToken: data.accessToken });
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("access_token");
      set({ user: null, accessToken: null });
    }
  },

  hydrate: async () => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!stored) {
      set({ isLoading: false });
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data, accessToken: stored, isLoading: false });
    } catch {
      localStorage.removeItem("access_token");
      set({ user: null, accessToken: null, isLoading: false });
    }
  },
}));
