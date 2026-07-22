export function normalizeDemandQuery(value) {
  return String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ");
}

export function buildDemandEvent({ eventType, query, gameJan }) {
  if (eventType === "search" || eventType === "search_miss") {
    const normalizedQuery = normalizeDemandQuery(query);
    return normalizedQuery ? { event_type: eventType, query: normalizedQuery } : null;
  }
  const jan = String(gameJan || "");
  return eventType === "view" && /^\d{13}$/.test(jan)
    ? { event_type: "view", game_jan: jan }
    : null;
}

function getDemandClient() {
  if (demandClient) return demandClient;
  const env = import.meta.env || {};
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) return null;
  demandClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return demandClient;
}

export async function recordDemandEvent(event, { insert } = {}) {
  const row = buildDemandEvent(event);
  if (!row) return;
  try {
    if (insert) {
      await insert(row);
      return;
    }
    const client = getDemandClient();
    if (!client) return;
    await client.from("chukogame_events").insert(row);
  } catch {
    // Demand telemetry must never interrupt searching or navigation.
  }
}
import { createClient } from "@supabase/supabase-js";

let demandClient;
