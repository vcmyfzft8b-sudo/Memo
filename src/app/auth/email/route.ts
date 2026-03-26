import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

const emailAuthSchema = z.object({
  email: z.string().trim().email(),
  mode: z.enum(["login", "signup"]),
  next: z.string().trim().optional(),
});

function normalizeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/")) {
    return "/app";
  }

  return value;
}

function redirectToCheckEmail(
  request: NextRequest,
  options: {
    email: string;
    mode: "login" | "signup";
    next: string;
    message?: string;
    messageType?: "error" | "info";
    sentAt?: number;
  },
) {
  const successUrl = request.nextUrl.clone();
  successUrl.pathname = "/auth/check-email";
  successUrl.search = "";
  successUrl.searchParams.set("email", options.email);
  successUrl.searchParams.set("mode", options.mode);
  successUrl.searchParams.set("next", options.next);
  successUrl.searchParams.set("sentAt", String(options.sentAt ?? Date.now()));

  if (options.message) {
    successUrl.searchParams.set("message", options.message);
  }

  if (options.messageType) {
    successUrl.searchParams.set("messageType", options.messageType);
  }

  return successUrl;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const parsed = emailAuthSchema.safeParse({
    email: formData.get("email"),
    mode: formData.get("mode"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    const retryUrl = redirectToCheckEmail(request, {
      email: String(formData.get("email") ?? ""),
      mode: formData.get("mode") === "signup" ? "signup" : "login",
      next: normalizeNextPath(String(formData.get("next") ?? "/app")),
      message: "Enter a valid email address.",
      messageType: "error",
      sentAt: 0,
    });
    return NextResponse.redirect(retryUrl, { status: 303 });
  }

  const next = normalizeNextPath(parsed.data.next);
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: parsed.data.mode === "signup",
    },
  });

  if (error) {
    const retryUrl = redirectToCheckEmail(request, {
      email: parsed.data.email,
      mode: parsed.data.mode,
      next,
      message: error.message,
      messageType: "error",
      sentAt: 0,
    });
    return applyCookies(NextResponse.redirect(retryUrl, { status: 303 }));
  }

  const successUrl = redirectToCheckEmail(request, {
    email: parsed.data.email,
    mode: parsed.data.mode,
    next,
    message: "Code sent. Enter it below to continue.",
    messageType: "info",
  });

  return applyCookies(NextResponse.redirect(successUrl, { status: 303 }));
}
