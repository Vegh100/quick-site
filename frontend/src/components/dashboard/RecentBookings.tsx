import { Card } from "../ui/card";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Calendar, Clock } from "lucide-react";

interface Booking {
  id: string;
  customer: string;
  service: string;
  date: string;
  time: string;
  status: "confirmed" | "pending" | "completed";
  price: string;
}

const bookings: Booking[] = [
  {
    id: "1",
    customer: "Emma Johnson",
    service: "Deep House Cleaning",
    date: "Oct 24, 2025",
    time: "10:00 AM",
    status: "confirmed",
    price: "€85",
  },
  {
    id: "2",
    customer: "Michael Chen",
    service: "Garden Maintenance",
    date: "Oct 25, 2025",
    time: "2:00 PM",
    status: "pending",
    price: "€60",
  },
  {
    id: "3",
    customer: "Sarah Williams",
    service: "Car Wash Premium",
    date: "Oct 23, 2025",
    time: "9:00 AM",
    status: "completed",
    price: "€45",
  },
];

const statusColors = {
  confirmed: "bg-green-100 text-green-800",
  pending: "bg-secondary text-secondary-foreground",
  completed: "bg-muted text-muted-foreground",
};

export function RecentBookings() {
  return (
    <Card className="p-6">
      <h3 className="mb-4">Recent Bookings</h3>
      <div className="space-y-4">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Avatar>
              <AvatarFallback className="bg-primary/10 text-primary">
                {booking.customer.split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h4 className="truncate">{booking.customer}</h4>
              <p className="text-sm text-muted-foreground truncate">{booking.service}</p>
            </div>

            <div className="text-sm text-muted-foreground hidden md:flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {booking.date}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {booking.time}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-medium">{booking.price}</span>
              <Badge className={statusColors[booking.status]} variant="secondary">
                {booking.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
