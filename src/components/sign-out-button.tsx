"use client";

import { useState } from "react";

import { EmojiIcon } from "@/components/emoji-icon";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // Fall through to the server logout route so cookies still get cleared.
    }

    event.currentTarget.submit();
  }

  return (
    <form action="/auth/logout" method="post" onSubmit={handleSubmit}>
      <button type="submit" className="settings-inline-action" disabled={isSubmitting}>
        <EmojiIcon symbol="🚪" size="0.95rem" />
        {isSubmitting ? "Signing out..." : "Sign out"}
      </button>
    </form>
  );
}
