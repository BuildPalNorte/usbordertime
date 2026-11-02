import { jsonLd } from "@/lib/guide-schema";
import { COPY, type Locale } from "@/lib/i18n";
import { exchangeJsonLd } from "@/lib/exchange-seo";
import { RATE_CREDIT_URL } from "@/lib/rate";

/** Crawlable explanation under the sign-in screen. The converter itself stays in the app. */
export function ExchangePublic({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  return (
    <article
      lang={locale}
      className="mx-auto w-full max-w-lg px-5 pt-2 pb-[max(3rem,env(safe-area-inset-bottom))]"
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(exchangeJsonLd(locale)) }} />
      <h2 className="text-[22px] leading-[1.15] font-bold tracking-[-0.03em] text-balance">
        {copy.exchangeSeoUpdatedTitle}
      </h2>
      <p className="mt-2 text-[16px] leading-[1.6] text-muted text-pretty">{copy.exchangeSeoUpdatedBody}</p>
      <h2 className="mt-8 text-[22px] leading-[1.15] font-bold tracking-[-0.03em] text-balance">
        {copy.exchangeSeoMoveTitle}
      </h2>
      <p className="mt-2 text-[16px] leading-[1.6] text-muted text-pretty">{copy.exchangeSeoMoveBody}</p>
      <p className="mt-8 text-[13px] leading-snug text-muted">
        {copy.exchangeNote}{" "}
        <a href={RATE_CREDIT_URL} target="_blank" rel="noopener noreferrer" className="underline">
          {copy.exchangeCredit}
        </a>
      </p>
    </article>
  );
}
