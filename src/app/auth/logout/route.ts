import { NextResponse } from "next/server";

import { getPublicEnv } from "@/lib/public-env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/", getPublicEnv().siteUrl), {
    status: 303,
  });
}
