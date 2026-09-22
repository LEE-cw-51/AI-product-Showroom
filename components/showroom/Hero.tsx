import { CtaLink } from "./CtaLink";

export function Hero({
  headline,
  subheadline,
  ctaUrl,
  ctaLabel,
  isSoldOut,
}: {
  headline: string;
  subheadline: string;
  ctaUrl: string;
  ctaLabel: string;
  isSoldOut: boolean;
}) {
  return (
    <section className="border-t border-rule pt-8">
      <p className="text-2xl leading-snug font-medium tracking-tight text-balance sm:text-3xl">
        {headline}
      </p>
      <p className="mt-3 text-steel">{subheadline}</p>
      <div className="mt-6">
        <CtaLink href={ctaUrl} label={ctaLabel} isSoldOut={isSoldOut} />
      </div>
    </section>
  );
}
