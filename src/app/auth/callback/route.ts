import { NextRequest, NextResponse } from "next/server";

import { getPublicEnv } from "@/lib/public-env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/app";
  const env = getPublicEnv();

  if (!code) {
    return NextResponse.redirect(new URL("/auth/error?message=Manjka+prijavna+koda.", env.siteUrl));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorUrl = new URL("/auth/error", env.siteUrl);
    errorUrl.searchParams.set("message", error.message);
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(new URL(next, env.siteUrl));
}
