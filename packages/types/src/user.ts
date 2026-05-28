export type UserRole = "owner" | "admin" | "member" | "subcontractor";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  orgId: string;
  createdAt: Date;
}
