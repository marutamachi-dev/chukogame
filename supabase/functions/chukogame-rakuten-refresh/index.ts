import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { RakutenAuthenticationError, authorizeCollectorRequest, collectRakutenGame } from "./collector.mjs";

const MASTER_URL = "https://raw.githubusercontent.com/marutamachi-dev/chukogame/main/src/data/game-master.json";
const SOURCE = "rakuten";

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "POST required" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Collector configuration is unavailable" }, 500);

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const secret = request.headers.get("x-collector-secret");
  const authorized = await authorizeCollectorRequest(secret, async (candidate) => {
    const { data, error } = await supabase.rpc("chukogame_collector_request_authorized", { candidate });
    if (error) return false;
    return data === true;
  });
  if (!authorized) return json({ error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => ({}));
  const chunk = Number(body.chunk);
  if (!Number.isInteger(chunk) || chunk < 0 || chunk > 5) return json({ error: "chunk must be an integer from 0 to 5" }, 400);

  let games;
  try {
    const masterResponse = await fetch(MASTER_URL, { cache: "no-store" });
    if (!masterResponse.ok) throw new Error(`master returned ${masterResponse.status}`);
    const master = await masterResponse.json();
    games = master.filter((game: { chunk: number }) => game.chunk === chunk);
    if (games.length !== 50) throw new Error(`expected 50 titles for chunk ${chunk}`);
  } catch (error) {
    return json({ error: "Active catalog is unavailable", detail: safeMessage(error) }, 503);
  }

  const { data: run, error: runError } = await supabase
    .from("chukogame_source_refresh_runs")
    .insert({ source: SOURCE, chunk, status: "running", requested_title_count: games.length })
    .select("id")
    .single();
  if (runError || !run) return json({ error: "Could not start source refresh" }, 500);

  const allOffers: Record<string, unknown>[] = [];
  let verifiedTitles = 0;
  let zeroSearch = 0;
  let noVerifiedMatch = 0;

  try {
    for (const game of games) {
      const result = await collectRakutenGame(game, {
        applicationId: Deno.env.get("RAKUTEN_APPLICATION_ID"),
        accessKey: Deno.env.get("RAKUTEN_ACCESS_KEY"),
        fetch,
      });
      if (result.status === "verified") verifiedTitles += 1;
      if (result.status === "no-search-results") zeroSearch += 1;
      if (result.status === "no-verified-match") noVerifiedMatch += 1;
      allOffers.push(...result.offers);

      const { error } = await supabase.from("chukogame_source_refresh_results").insert({
        refresh_run_id: run.id,
        game_id: game.id,
        game_jan: game.jan,
        status: result.status,
        verified_offer_count: result.offers.length,
      });
      if (error) throw new Error("Could not store collector result");
      await delay(1100);
    }

    const gameJans = games.map((game: { jan: string }) => game.jan);
    const { error: clearError } = await supabase
      .from("chukogame_source_offers")
      .delete()
      .eq("source", SOURCE)
      .in("game_jan", gameJans);
    if (clearError) throw new Error("Could not replace source snapshot");

    if (allOffers.length) {
      const snapshotRows = allOffers.map((offer) => ({
        source: SOURCE,
        game_id: offer.slug,
        game_jan: offer.jan,
        listing_url: offer.directUrl || offer.url,
        title: offer.title,
        price_with_shipping: offer.priceWithShipping,
        observed_at: offer.observedAt,
        refresh_run_id: run.id,
        payload: offer,
      }));
      const { error: offerError } = await supabase.from("chukogame_source_offers").insert(snapshotRows);
      if (offerError) throw new Error("Could not store verified offers");
    }

    const { error: finishError } = await supabase
      .from("chukogame_source_refresh_runs")
      .update({
        status: "succeeded",
        verified_offer_count: allOffers.length,
        verified_title_count: verifiedTitles,
        zero_search_count: zeroSearch,
        no_verified_match_count: noVerifiedMatch,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    if (finishError) throw new Error("Could not complete source refresh");

    return json({
      runId: run.id,
      status: "succeeded",
      requestedTitles: games.length,
      verifiedOffers: allOffers.length,
      verifiedTitles,
      zeroSearch,
      noVerifiedMatch,
    });
  } catch (error) {
    await supabase
      .from("chukogame_source_refresh_runs")
      .update({ status: "failed", error_summary: safeMessage(error), completed_at: new Date().toISOString() })
      .eq("id", run.id);
    return json({ runId: run.id, status: "failed", error: safeMessage(error) }, error instanceof RakutenAuthenticationError ? 502 : 500);
  }
});

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function safeMessage(error: unknown) {
  return error instanceof Error ? error.message.replace(/https?:\/\/\S+/g, "external request failed") : "Unexpected collector error";
}
