import { inventorySeed } from "@/lib/seed";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ items: inventorySeed, mode: "seed" });
}
