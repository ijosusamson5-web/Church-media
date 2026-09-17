import { getStore } from "@netlify/blobs";
function corsHeaders() {
  return { "content-type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };
}
export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  const url = new URL(req.url);
  const key = decodeURIComponent(url.pathname.replace(/^\/storage\/?/, ""));
  if (!key) return new Response(JSON.stringify({ error: "missing key" }), { status: 400, headers: corsHeaders() });
  const store = getStore("church-media-sync");
  if (req.method === "GET") {
    try {
      const value = await store.get(key);
      const body = value == null ? null : { key, value, shared: true };
      return new Response(JSON.stringify(body), { status: 200, headers: corsHeaders() });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders() });
    }
  }
  if (req.method === "POST") {
    try {
      const parsed = await req.json();
      await store.set(key, parsed.value);
      return new Response(JSON.stringify({ key, value: parsed.value, shared: true }), { status: 200, headers: corsHeaders() });
    } catch (err) {
      return new Response(JSON.stringify({ error: "bad request" }), { status: 400, headers: corsHeaders() });
    }
  }
  return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: corsHeaders() });
};
export const config = { path: "/storage/*" };
