export interface Org {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "agency";
  createdAt: Date;
}
