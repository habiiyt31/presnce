import { NextResponse } from "next/server";

const API_BASE = "https://api.twitterapi.io";
const RATE_LIMIT_DELAY_MS = 5500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseTweetUrl(url: string): { handle: string; id: string } | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/([^/]+)\/status\/(\d+)/);
  if (!match) return null;
  return { handle: match[1], id: match[2] };
}

async function fetchWithRetry(
  url: string,
  apiKey: string,
  label: string,
  maxRetries = 3,
): Promise<{ ok: boolean; status: number; data: any }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      headers: { "X-API-Key": apiKey },
      cache: "no-store",
    });

    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); }
    catch { data = { raw: text.slice(0, 200) }; }

    if (res.status === 429 && attempt < maxRetries) {
      console.log(`[/api/twitter] ${label} hit 429 (attempt ${attempt}/${maxRetries}), waiting...`);
      await sleep(RATE_LIMIT_DELAY_MS);
      continue;
    }

    return { ok: res.ok, status: res.status, data };
  }
  return { ok: false, status: 429, data: { error: "Too Many Requests" } };
}

export async function POST(req: Request) {
  let body: { tweetUrl?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid request body" }, { status: 400 }); }

  if (!body.tweetUrl) {
    return NextResponse.json({ error: "tweetUrl required" }, { status: 400 });
  }

  const parsed = parseTweetUrl(body.tweetUrl);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid tweet URL" }, { status: 400 });
  }

  const apiKey = process.env.TWITTER_API_KEY;
  if (!apiKey) {
    console.error("[/api/twitter] TWITTER_API_KEY is missing");
    return NextResponse.json({ error: "TWITTER_API_KEY not configured" }, { status: 500 });
  }

  console.log("[/api/twitter] Fetching:", { handle: parsed.handle, id: parsed.id });

  try {
    const profileUrl = `${API_BASE}/twitter/user/info?userName=${encodeURIComponent(parsed.handle)}`;
    const tweetUrl   = `${API_BASE}/twitter/tweets?tweet_ids=${encodeURIComponent(parsed.id)}`;

    console.log("[/api/twitter] Step 1/2 — fetching profile...");
    const profile = await fetchWithRetry(profileUrl, apiKey, "profile");

    if (profile.ok) {
      console.log("[/api/twitter] waiting 5.5s for rate limit...");
      await sleep(RATE_LIMIT_DELAY_MS);
    }

    console.log("[/api/twitter] Step 2/2 — fetching tweet...");
    const tweet = await fetchWithRetry(tweetUrl, apiKey, "tweet");

    if (!profile.ok || !tweet.ok) {
      console.error("[/api/twitter] calls failed:", {
        profile: profile.data,
        tweet: tweet.data,
      });
      return NextResponse.json({
        error: "twitterapi.io upstream error",
        detail: {
          profile: profile.data?.message ?? `HTTP ${profile.status}`,
          tweet:   tweet.data?.message   ?? `HTTP ${tweet.status}`,
        },
      }, { status: 502 });
    }

    const profileData = profile.data?.data ?? profile.data?.user ?? profile.data;
    const tweetsList: any[] =
      tweet.data?.tweets ??
      tweet.data?.data ??
      (Array.isArray(tweet.data) ? tweet.data : []);
    const tweetData = tweetsList[0] ?? tweet.data?.tweet ?? {};

    const payload = { profile: profileData, tweet: tweetData };

    console.log("[/api/twitter] Success:", {
      handle: parsed.handle,
      hasProfile: !!profileData?.userName,
      hasTweet: !!tweetData?.id,
      tweetText: tweetData?.text?.slice(0, 80),
    });

    return NextResponse.json(payload);
  } catch (err: any) {
    console.error("[/api/twitter] Exception:", err);
    return NextResponse.json({ error: err?.message ?? "fetch failed" }, { status: 502 });
  }
}
