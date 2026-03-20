import Image from "next/image";

import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import memoLogo from "../../F79E79FB-D598-447B-B7DE-00DA9195851B.PNG";

export function BrandLogo({
  subtitle = BRAND_TAGLINE,
  compact = false,
}: {
  subtitle?: string;
  compact?: boolean;
}) {
  return (
    <span className={`brand-logo ${compact ? "compact" : ""}`}>
      <span className="brand-logo-mark" aria-hidden="true">
        <Image
          src={memoLogo}
          alt=""
          width={3651}
          height={3285}
          className="brand-logo-image"
          sizes={compact ? "2.2rem" : "2.55rem"}
        />
      </span>
      <span className="brand-logo-copy">
        <strong>{BRAND_NAME}</strong>
        {!compact ? <small>{subtitle}</small> : null}
      </span>
    </span>
  );
}
