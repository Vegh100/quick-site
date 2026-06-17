import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { PricingCards } from "./PricingCards";
import { Star } from "lucide-react";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaywallModal({ open, onOpenChange }: PaywallModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upgrade & Keep Your Bookings Active</DialogTitle>
          <DialogDescription>
            Your trial is ending soon. Choose a plan to continue accepting bookings.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <PricingCards />
        </div>

        <div className="bg-tertiary/30 p-6 rounded-lg space-y-4">
          <div className="flex items-center justify-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-secondary text-secondary" />
            ))}
          </div>
          <p className="text-center">
            "Qvick transformed how we manage bookings. Our revenue increased by 40% in the first
            month!"
          </p>
          <p className="text-center text-sm text-muted-foreground">
            — Maria, Amsterdam Cleaning Services
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <p>✓ Cancel anytime</p>
          </div>
          <div>
            <p>✓ 30-day free trial</p>
          </div>
          <div>
            <p>✓ No credit card required</p>
          </div>
        </div>

        <p className="text-center text-muted-foreground text-sm">
          Join 100+ local businesses already using Qvick
        </p>
      </DialogContent>
    </Dialog>
  );
}
