import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ServiceCard } from "../common/ServiceCard";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "../ui/button";

const providers = [
  {
    provider: "SparkleClean Pro",
    service: "Professional House Cleaning",
    rating: 4.9,
    reviews: 127,
    price: "€50",
    location: "Amsterdam",
    availability: "Next available: Today",
    image: "https://images.unsplash.com/photo-1664008760004-182420e58e7c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGVhbmluZyUyMHNlcnZpY2UlMjBpbGx1c3RyYXRpb258ZW58MXx8fHwxNzYxMDkwMDY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    category: "Cleaning",
  },
  {
    provider: "GreenThumb Gardens",
    service: "Garden Maintenance & Design",
    rating: 4.8,
    reviews: 89,
    price: "€60",
    location: "Rotterdam",
    availability: "Next available: Tomorrow",
    image: "https://images.unsplash.com/photo-1632406895715-c9521b447fab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWxlbmRhciUyMHBsYW5uaW5nJTIwd29ya3NwYWNlfGVufDF8fHx8MTc2MTEzMjAwN3ww&ixlib=rb-4.1.0&q=80&w=1080",
    category: "Gardening",
  },
  {
    provider: "AutoShine Detailing",
    service: "Premium Car Wash & Detailing",
    rating: 5.0,
    reviews: 64,
    price: "€45",
    location: "Utrecht",
    availability: "Next available: Oct 24",
    image: "https://images.unsplash.com/photo-1629507313712-f21468afdf2e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHBvcnRyYWl0JTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc2MTEzMjAwN3ww&ixlib=rb-4.1.0&q=80&w=1080",
    category: "Car Wash",
  },
];

export function DiscoveryList() {
  return (
    <div className="space-y-6">
      <div className="flex gap-4 flex-col md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for services..."
            className="pl-10"
          />
        </div>
        <Select>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="cleaning">Cleaning</SelectItem>
            <SelectItem value="gardening">Gardening</SelectItem>
            <SelectItem value="carwash">Car Wash</SelectItem>
            <SelectItem value="plumbing">Plumbing</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="amsterdam">Amsterdam</SelectItem>
            <SelectItem value="rotterdam">Rotterdam</SelectItem>
            <SelectItem value="utrecht">Utrecht</SelectItem>
            <SelectItem value="hague">The Hague</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map((provider, index) => (
          <ServiceCard key={index} {...provider} />
        ))}
      </div>
    </div>
  );
}
