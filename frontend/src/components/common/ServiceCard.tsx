import { Card } from "../ui/card";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Star, MapPin, Clock } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";

interface ServiceCardProps {
  provider: string;
  service: string;
  rating: number;
  reviews: number;
  price: string;
  location: string;
  availability: string;
  image?: string;
  category: string;
  onClick?: () => void;
}

export function ServiceCard({
  provider,
  service,
  rating,
  reviews,
  price,
  location,
  availability,
  image,
  category,
  onClick,
}: ServiceCardProps) {
  return (
    <Card
      className={`overflow-hidden hover:shadow-lg transition-shadow ${
        onClick ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
    >
      <div className="aspect-video bg-muted relative overflow-hidden">
        {image && (
          <ImageWithFallback
            src={image}
            alt={service}
            className="w-full h-full object-cover"
          />
        )}
        <Badge className="absolute top-3 right-3" variant="secondary">
          {category}
        </Badge>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {provider
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4>{provider}</h4>
              <p className="text-sm text-muted-foreground">{service}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-secondary text-secondary" />
            <span>{rating}</span>
            <span>({reviews})</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{location}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{availability}</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <span className="text-sm text-muted-foreground">Starting from</span>
            <div className="text-xl text-primary">{price}</div>
          </div>
          <Button>Book Now</Button>
        </div>
      </div>
    </Card>
  );
}
