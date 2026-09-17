function corsHeaders() {
  return { "content-type": "application/json", "Access-Control-Allow-Origin": "*" };
}
export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: corsHeaders() });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not set on this Netlify site." }), { status: 500, headers: corsHeaders() });
  try {
    const body = await req.text();
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body,
    });
    const text = await upstream.text();
    return new Response(text, { status: upstream.status, headers: corsHeaders() });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders() });
  }
};
export const config = { path: "/ai-proxy" };
