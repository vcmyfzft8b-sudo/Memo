import { NextRequest, NextResponse } from "next/server";

import { getPublicEnv } from "@/lib/public-env";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient();
  const next = request.nextUrl.searchParams.get("next") ?? "/app";
  const env = getPublicEnv();
  const callbackUrl = new URL("/auth/callback", env.siteUrl);
  callbackUrl.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    const errorUrl = new URL("/auth/error", env.siteUrl);
    errorUrl.searchParams.set(
      "message",
      error?.message ?? "Google prijava trenutno ni na voljo.",
    );

    return applyCookies(NextResponse.redirect(errorUrl, { status: 303 }));
  }

  return applyCookies(NextResponse.redirect(data.url, { status: 303 }));
}
