const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  return new Response(JSON.stringify({
    error: "document_extraction_pipeline_not_configured",
    message: "This endpoint is intentionally fail-closed. The certified Gradifi G5 engine and production document extraction adapter must be connected before processing can be enabled.",
    retryable: false
  }), { status: 503, headers });
});