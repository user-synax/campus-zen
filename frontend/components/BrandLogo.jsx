import Image from "next/image";

export function BrandMark({ size = 32, className = "", priority = false }) {
  return (
    <Image
      src="/campusZen.png"
      alt="CampusZen logo"
      width={size}
      height={size}
      priority={priority}
      className={`shrink-0 rounded-[9px] object-cover ${className}`}
    />
  );
}

export function BrandLockup({ markSize = 32, showWordmark = true }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark size={markSize} />
      {showWordmark ? (
        <span className="text-[15px] font-semibold tracking-[-0.03em]">
          campuszen
        </span>
      ) : null}
    </span>
  );
}
