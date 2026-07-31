export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    ok: true,
    service: "store-accountability-manager",
    runtime: "nodejs",
    timestamp: new Date().toISOString()
  });
}
