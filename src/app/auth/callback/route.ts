import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const authError = request.nextUrl.searchParams.get("error");
  const authErrorCode = request.nextUrl.searchParams.get("error_code");
  const authErrorDescription =
    request.nextUrl.searchParams.get("error_description");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const next = requestedNext?.startsWith("/") ? requestedNext : "/app";

  if (!code) {
    const fallbackUrl = request.nextUrl.clone();
    fallbackUrl.pathname = "/auth/error";
    fallbackUrl.search = "";
    fallbackUrl.searchParams.set(
      "message",
      authErrorDescription ??
        (authErrorCode === "otp_expired"
          ? "This sign-in link has expired. Request a new email and try again."
          : authError
            ? "Authentication was canceled or denied."
            : "Missing authentication code."),
    );
    return NextResponse.redirect(fallbackUrl, { status: 303 });
  }

  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorUrl = request.nextUrl.clone();
    errorUrl.pathname = "/auth/error";
    errorUrl.search = "";
    errorUrl.searchParams.set("message", error.message);
    return applyCookies(NextResponse.redirect(errorUrl, { status: 303 }));
  }

  const successUrl = request.nextUrl.clone();
  successUrl.pathname = next;
  successUrl.search = "";
  return applyCookies(NextResponse.redirect(successUrl, { status: 303 }));
}
