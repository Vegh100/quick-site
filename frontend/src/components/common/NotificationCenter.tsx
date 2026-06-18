import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Bell, Calendar, DollarSign, Star, User, CheckCircle2, Clock } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

interface Notification {
  id: string;
  type: "booking" | "payment" | "review" | "user" | "confirmation" | "reminder";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationCenterProps {
  userType: "customer" | "provider";
}

const providerNotifications: Notification[] = [
  {
    id: "1",
    type: "booking",
    title: "New Booking",
    message: "Emma Johnson booked Deep House Cleaning for Oct 24",
    time: "2 min ago",
    read: false,
  },
  {
    id: "2",
    type: "review",
    title: "New Review",
    message: "Sarah Williams left you a 5-star review",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "3",
    type: "payment",
    title: "Payment Received",
    message: "€45 received from Michael Chen",
    time: "3 hours ago",
    read: false,
  },
  {
    id: "4",
    type: "booking",
    title: "Booking Reminder",
    message: "You have a booking tomorrow at 10:00 AM",
    time: "5 hours ago",
    read: true,
  },
  {
    id: "5",
    type: "user",
    title: "Profile Updated",
    message: "Your business profile was successfully updated",
    time: "1 day ago",
    read: true,
  },
];

const customerNotifications: Notification[] = [
  {
    id: "1",
    type: "confirmation",
    title: "Booking Confirmed",
    message: "Your house cleaning with Clean Pro is confirmed for Oct 24",
    time: "10 min ago",
    read: false,
  },
  {
    id: "2",
    type: "reminder",
    title: "Service Tomorrow",
    message: "Garden maintenance scheduled for tomorrow at 2:00 PM",
    time: "2 hours ago",
    read: false,
  },
  {
    id: "3",
    type: "review",
    title: "Review Reminder",
    message: "How was your car wash service? Leave a review",
    time: "1 day ago",
    read: false,
  },
  {
    id: "4",
    type: "payment",
    title: "Payment Successful",
    message: "€65 paid to Fresh Gardens Ltd",
    time: "2 days ago",
    read: true,
  },
  {
    id: "5",
    type: "user",
    title: "Account Updated",
    message: "Your payment method was successfully updated",
    time: "3 days ago",
    read: true,
  },
];

const iconMap = {
  booking: Calendar,
  payment: DollarSign,
  review: Star,
  user: User,
  confirmation: CheckCircle2,
  reminder: Clock,
};

export function NotificationCenter({ userType }: NotificationCenterProps) {
  const notifications = userType === "provider" ? providerNotifications : customerNotifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = iconMap[notification.type];
              return (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    notification.read
                      ? "bg-background hover:bg-muted/50"
                      : "bg-primary/5 border-primary/20 hover:bg-primary/10"
                  }`}
                >
                  <div className="flex gap-3">
                    <div
                      className={`p-2 rounded-lg h-fit ${
                        notification.read ? "bg-muted" : "bg-primary/10"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          notification.read ? "text-muted-foreground" : "text-primary"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm">{notification.title}</h4>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{notification.message}</p>
                      <span className="text-xs text-muted-foreground">{notification.time}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
          <Button variant="outline" className="w-full">
            Mark All as Read
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
