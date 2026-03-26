"use client";

import {
  ChevronLeft,
  CircleHelp,
  FilePlus2,
  House,
} from "lucide-react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { InstantLink } from "@/components/instant-link";
import { BRAND_NAME } from "@/lib/brand";

function SettingsGearIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M21.3175 7.14139L20.8239 6.28479C20.4506 5.63696 20.264 5.31305 19.9464 5.18388C19.6288 5.05472 19.2696 5.15664 18.5513 5.36048L17.3311 5.70418C16.8725 5.80994 16.3913 5.74994 15.9726 5.53479L15.6357 5.34042C15.2766 5.11043 15.0004 4.77133 14.8475 4.37274L14.5136 3.37536C14.294 2.71534 14.1842 2.38533 13.9228 2.19657C13.6615 2.00781 13.3143 2.00781 12.6199 2.00781H11.5051C10.8108 2.00781 10.4636 2.00781 10.2022 2.19657C9.94085 2.38533 9.83106 2.71534 9.61149 3.37536L9.27753 4.37274C9.12465 4.77133 8.84845 5.11043 8.48937 5.34042L8.15249 5.53479C7.73374 5.74994 7.25259 5.80994 6.79398 5.70418L5.57375 5.36048C4.85541 5.15664 4.49625 5.05472 4.17867 5.18388C3.86109 5.31305 3.67445 5.63696 3.30115 6.28479L2.80757 7.14139C2.45766 7.74864 2.2827 8.05227 2.31666 8.37549C2.35061 8.69871 2.58483 8.95918 3.05326 9.48012L4.0843 10.6328C4.3363 10.9518 4.51521 11.5078 4.51521 12.0077C4.51521 12.5078 4.33636 13.0636 4.08433 13.3827L3.05326 14.5354C2.58483 15.0564 2.35062 15.3168 2.31666 15.6401C2.2827 15.9633 2.45766 16.2669 2.80757 16.8741L3.30114 17.7307C3.67443 18.3785 3.86109 18.7025 4.17867 18.8316C4.49625 18.9608 4.85542 18.8589 5.57377 18.655L6.79394 18.3113C7.25263 18.2055 7.73387 18.2656 8.15267 18.4808L8.4895 18.6752C8.84851 18.9052 9.12464 19.2442 9.2775 19.6428L9.61149 20.6403C9.83106 21.3003 9.94085 21.6303 10.2022 21.8191C10.4636 22.0078 10.8108 22.0078 11.5051 22.0078H12.6199C13.3143 22.0078 13.6615 22.0078 13.9228 21.8191C14.1842 21.6303 14.294 21.3003 14.5136 20.6403L14.8476 19.6428C15.0004 19.2442 15.2765 18.9052 15.6356 18.6752L15.9724 18.4808C16.3912 18.2656 16.8724 18.2055 17.3311 18.3113L18.5513 18.655C19.2696 18.8589 19.6288 18.9608 19.9464 18.8316C20.264 18.7025 20.4506 18.3785 20.8239 17.7307L21.3175 16.8741C21.6674 16.2669 21.8423 15.9633 21.8084 15.6401C21.7744 15.3168 21.5402 15.0564 21.0718 14.5354L20.0407 13.3827C19.7887 13.0636 19.6098 12.5078 19.6098 12.0077C19.6098 11.5078 19.7888 10.9518 20.0407 10.6328L21.0718 9.48012C21.5402 8.95918 21.7744 8.69871 21.8084 8.37549C21.8423 8.05227 21.6674 7.74864 21.3175 7.14139Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M15.5195 12C15.5195 13.933 13.9525 15.5 12.0195 15.5C10.0865 15.5 8.51953 13.933 8.51953 12C8.51953 10.067 10.0865 8.5 12.0195 8.5C13.9525 8.5 15.5195 10.067 15.5195 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const TAB_ITEMS = [
  { href: "/app", displayLabel: "Home", icon: House },
  { href: "/app/support", displayLabel: "Help", icon: CircleHelp },
  {
    href: "/app/settings",
    displayLabel: "Settings",
    icon: SettingsGearIcon,
  },
];

function getChrome(pathname: string) {
  if (pathname.startsWith("/app/lectures/")) {
    return {
      title: "Note",
      subtitle: "Review, export, and chat with the content",
      backHref: "/app",
    };
  }

  if (pathname.startsWith("/app/support/") && pathname !== "/app/support") {
    return {
      title: "Help",
      subtitle: "Usage guide",
      backHref: "/app/support",
    };
  }

  if (pathname === "/app/support") {
    return {
      title: "Help",
      subtitle: "Guides",
      backHref: null,
    };
  }

  if (pathname === "/app/settings") {
    return {
      title: "Settings",
      subtitle: "Theme and account",
      backHref: null,
    };
  }

  return {
    title: "Notes",
    subtitle: "Your full library in one place",
    backHref: null,
  };
}

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const chrome = getChrome(pathname);

  useEffect(() => {
    for (const item of TAB_ITEMS) {
      router.prefetch(item.href);
    }
  }, [router]);

  return (
    <div className="ios-app-shell desktop-shell">
      <div className="desktop-brandline">
        <InstantLink href="/app" className="desktop-brandline-brand">
          <BrandLogo compact />
        </InstantLink>

        <div className="desktop-brandline-actions">
          {chrome.backHref ? (
            <InstantLink href={chrome.backHref} className="app-back-button desktop-brandline-back">
              <ChevronLeft className="h-5 w-5" />
              Back
            </InstantLink>
          ) : null}
        </div>
      </div>

      <aside className="desktop-sidebar">
        <div className="desktop-sidebar-inner">
          <InstantLink href="/app" className="nota-sidebar-brand">
            <BrandLogo />
          </InstantLink>

          <InstantLink href="/app?mode=record" className="nota-sidebar-cta">
            <FilePlus2 className="h-4 w-4" />
            New note
          </InstantLink>

          <nav className="desktop-sidebar-nav" aria-label="Sidebar navigation">
            {TAB_ITEMS.map((item) => {
              const active =
                item.href === "/app"
                  ? pathname === "/app" || pathname.startsWith("/app/lectures/")
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <InstantLink
                  key={item.href}
                  href={item.href}
                  className={`desktop-sidebar-link ${active ? "active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="desktop-sidebar-link-icon">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span>{item.displayLabel}</span>
                </InstantLink>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="desktop-main">
        <header className="ios-nav app-topbar">
          <div className="ios-nav-inner app-topbar-inner">
            <InstantLink href="/app" className="app-topbar-brand" aria-label={`${BRAND_NAME} home`}>
              <BrandLogo compact />
            </InstantLink>

            <div className="app-topbar-copy">
              <div className="app-topbar-title">{chrome.title}</div>
              <div className="app-topbar-subtitle">{chrome.subtitle}</div>
            </div>

            {chrome.backHref ? (
              <div className="ios-nav-actions">
                <InstantLink href={chrome.backHref} className="app-back-button">
                  <ChevronLeft className="h-5 w-5" />
                  Back
                </InstantLink>
              </div>
            ) : null}

            <div className="ios-nav-actions app-topbar-actions">
              <InstantLink href="/app?mode=record" className="app-topbar-cta">
                <FilePlus2 className="h-4 w-4" />
                <span>New note</span>
              </InstantLink>
            </div>
          </div>
        </header>

        <main className="ios-content app-shell-content">{children}</main>
      </div>

      <nav className="ios-tabbar" aria-label="Main navigation">
        <div className="ios-tabbar-inner">
          {TAB_ITEMS.map((item) => {
            const active =
              item.href === "/app"
                ? pathname === "/app" || pathname.startsWith("/app/lectures/")
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <InstantLink
                key={item.href}
                href={item.href}
                className={`ios-tab-item ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.displayLabel}</span>
              </InstantLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
