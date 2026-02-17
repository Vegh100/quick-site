import { Card } from "../ui/card";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Star } from "lucide-react";

interface ReviewCardProps {
  customer: string;
  rating: number;
  comment: string;
  date: string;
  service: string;
}

export function ReviewCard({ customer, rating, comment, date, service }: ReviewCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Avatar>
          <AvatarFallback className="bg-primary/10 text-primary">
            {customer.split(" ").map(n => n[0]).join("")}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h4>{customer}</h4>
              <p className="text-sm text-muted-foreground">{service}</p>
            </div>
            <span className="text-sm text-muted-foreground">{date}</span>
          </div>

          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < rating
                    ? "fill-secondary text-secondary"
                    : "text-muted-foreground"
                }`}
              />
            ))}
          </div>

          <p className="text-sm">{comment}</p>
        </div>
      </div>
    </Card>
  );
}
