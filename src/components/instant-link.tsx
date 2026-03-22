"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import {
  forwardRef,
  startTransition,
  useCallback,
  useEffect,
  type AnchorHTMLAttributes,
  type MouseEvent,
} from "react";

type InstantLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
  };

function shouldHandleClientNavigation(event: MouseEvent<HTMLAnchorElement>) {
  return !(
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

export const InstantLink = forwardRef<HTMLAnchorElement, InstantLinkProps>(function InstantLink(
  { href, onClick, onPointerDown, onMouseEnter, onFocus, replace, scroll, prefetch, ...props },
  ref,
) {
  const router = useRouter();

  const prefetchHref = useCallback(() => {
    router.prefetch(href);
  }, [href, router]);

  useEffect(() => {
    prefetchHref();
  }, [prefetchHref]);

  return (
    <Link
      {...props}
      ref={ref}
      href={href}
      replace={replace}
      scroll={scroll}
      prefetch={prefetch}
      onPointerDown={(event) => {
        prefetchHref();
        onPointerDown?.(event);
      }}
      onMouseEnter={(event) => {
        prefetchHref();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        prefetchHref();
        onFocus?.(event);
      }}
      onClick={(event) => {
        onClick?.(event);

        if (!shouldHandleClientNavigation(event)) {
          return;
        }

        event.preventDefault();

        startTransition(() => {
          if (replace) {
            router.replace(href, { scroll });
            return;
          }

          router.push(href, { scroll });
        });
      }}
    />
  );
});
