type IllustrationProps = {
  className?: string;
};

/** Flat, minimal person silhouette — used for the "Particulier" account type card. */
export function PersonalIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="32" cy="21" r="10" fill="currentColor" />
      <path d="M14 53c0-11.598 8.059-21 18-21s18 9.402 18 21" fill="currentColor" />
    </svg>
  );
}

/** Three-person team icon (provided asset) recolored to match currentColor via a CSS mask —
 * used for the "Entreprise" account type card. */
export function BusinessIllustration({ className }: IllustrationProps) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "inline-block",
        backgroundColor: "currentColor",
        WebkitMaskImage: "url(/choose_type/business_icons.png)",
        maskImage: "url(/choose_type/business_icons.png)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
