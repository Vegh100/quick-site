import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Check } from "lucide-react";

interface PricingTier {
  name: string;
  price: string;
  period: string;
  badge?: string;
  features: string[];
  cta: string;
  variant?: "default" | "primary";
}

const tiers: PricingTier[] = [
  {
    name: "Starter",
    price: "€0",
    period: "30-day trial",
    badge: "Free Trial",
    features: [
      "Up to 10 bookings/month",
      "Basic calendar integration",
      "Email notifications",
      "Mobile-friendly booking page",
      "Standard support",
    ],
    cta: "Start Free Trial",
    variant: "default",
  },
  {
    name: "Pro",
    price: "€29",
    period: "per month",
    badge: "Popular",
    features: [
      "Unlimited bookings",
      "Advanced calendar sync",
      "SMS & email notifications",
      "Custom branding",
      "Priority support",
      "Payment processing",
      "Analytics dashboard",
    ],
    cta: "Upgrade to Pro",
    variant: "primary",
  },
  {
    name: "Business+",
    price: "€49",
    period: "per month",
    features: [
      "Everything in Pro",
      "Multi-location support",
      "Team management",
      "API access",
      "White-label solution",
      "Dedicated account manager",
      "Custom integrations",
    ],
    cta: "Upgrade to Business+",
    variant: "default",
  },
];

export function PricingCards() {
  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {tiers.map((tier) => (
        <Card
          key={tier.name}
          className={`p-6 relative ${
            tier.variant === "primary" ? "border-primary border-2 shadow-lg" : ""
          }`}
        >
          {tier.badge && (
            <Badge
              className="absolute -top-3 left-1/2 -translate-x-1/2"
              variant={tier.variant === "primary" ? "default" : "secondary"}
            >
              {tier.badge}
            </Badge>
          )}

          <div className="text-center mb-6">
            <h3 className="mb-2">{tier.name}</h3>
            <div className="flex items-baseline justify-center gap-1 mb-1">
              <span className="text-4xl">{tier.price}</span>
            </div>
            <p className="text-muted-foreground text-sm">{tier.period}</p>
          </div>

          <ul className="space-y-3 mb-6">
            {tier.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>

          <Button className="w-full" variant={tier.variant === "primary" ? "default" : "outline"}>
            {tier.cta}
          </Button>
        </Card>
      ))}
    </div>
  );
}
