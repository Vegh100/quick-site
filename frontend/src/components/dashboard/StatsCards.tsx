import { Card } from "../ui/card";
import { TrendingUp, Calendar, DollarSign, Star, Users } from "lucide-react";

interface Stat {
  label: string;
  value: string;
  change?: string;
  icon: React.ElementType;
  trend?: "up" | "down";
}

const stats: Stat[] = [
  {
    label: "Total Revenue",
    value: "€2,450",
    change: "+12.5%",
    icon: DollarSign,
    trend: "up",
  },
  {
    label: "Bookings This Month",
    value: "28",
    change: "+8",
    icon: Calendar,
    trend: "up",
  },
  {
    label: "Active Clients",
    value: "142",
    change: "+23",
    icon: Users,
    trend: "up",
  },
  {
    label: "Average Rating",
    value: "4.8",
    change: "+0.2",
    icon: Star,
    trend: "up",
  },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <h3 className="text-2xl mb-1">{stat.value}</h3>
                {stat.change && (
                  <div className="flex items-center gap-1 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">{stat.change}</span>
                    <span className="text-muted-foreground">vs last month</span>
                  </div>
                )}
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
