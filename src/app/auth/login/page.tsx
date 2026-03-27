import { redirect } from "next/navigation";

import { AuthPageShell } from "@/components/auth-page-shell";
import { getOptionalUser } from "@/lib/auth";
import { normalizeNextPath, sanitizeUserInput } from "@/lib/validation";

type SearchParams = Promise<{
  next?: string;
  email?: string;
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await getOptionalUser();
  const params = await searchParams;
  const next = normalizeNextPath(params?.next);
  const email = typeof params?.email === "string" ? sanitizeUserInput(params.email).slice(0, 320) : undefined;

  if (user) {
    redirect(next);
  }

  return <AuthPageShell mode="login" next={next} prefilledEmail={email} />;
}
