import type { Service } from "./types";

export function formatServicePrice(
  service: Pick<Service, "priceAmount" | "priceCurrency" | "priceType" | "pricingUnit">,
) {
  const amount = Number(service.priceAmount).toLocaleString("hu-HU");
  const unit =
    service.pricingUnit === "PER_SQM" ? "/m2" : service.priceType === "PER_HOUR" ? "/óra" : "";

  return `${amount} ${service.priceCurrency}${unit}`;
}
