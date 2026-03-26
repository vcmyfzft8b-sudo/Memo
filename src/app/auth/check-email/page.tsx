import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { CheckEmailCard } from "@/components/check-email-card";
import { BRAND_NAME } from "@/lib/brand";

type SearchParams = Promise<{
  email?: string;
  message?: string;
  messageType?: string;
  mode?: string;
  next?: string;
  sentAt?: string;
  cooldownSeconds?: string;
}>;

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = await searchParams;
  const email = params?.email ?? "your inbox";
  const mode = params?.mode === "signup" ? "signup" : "login";
  const next = params?.next ?? "/app";
  const message = params?.message;
  const messageType = params?.messageType === "error" ? "error" : "info";
  const sentAt = Number(params?.sentAt);
  const cooldownSeconds = Number(params?.cooldownSeconds);

  return (
    <main className="landing-shell landing-auth-page check-email-page">
      <div className="check-email-topbar">
        <Link href="/" className="app-back-button">
          <ChevronLeft className="h-5 w-5" />
          Back
        </Link>
      </div>

      <section className="landing-auth-wrap check-email-wrap">
        <Link href="/" className="landing-auth-brand check-email-brand" aria-label={`${BRAND_NAME} home`}>
          <BrandLogo compact imageSizes="(max-width: 768px) 4.6rem, 7rem" priority />
        </Link>

        <div className="check-email-hero">
          <p className="check-email-eyebrow">Check your email</p>
          <h1 className="check-email-title">Enter your code</h1>
          <p className="check-email-copy">
            We sent a verification code to <strong>{email}</strong>. Enter it below to continue.
          </p>
        </div>

        <CheckEmailCard
          email={params?.email ?? ""}
          mode={mode}
          next={next}
          message={message}
          messageType={messageType}
          sentAt={Number.isFinite(sentAt) ? sentAt : 0}
          cooldownSeconds={Number.isFinite(cooldownSeconds) ? cooldownSeconds : 60}
        />
      </section>
    </main>
  );
}
