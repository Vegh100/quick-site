import { Card } from "../ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RevenueChartProps {
  data?: { month: string; revenue: number }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = data || [];

  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="mb-6">Bevétel áttekintés</h3>
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          Még nincs elegendő adat a grafikonhoz
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="mb-6">Bevétel áttekintés</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
          <XAxis dataKey="month" stroke="var(--foreground)" />
          <YAxis stroke="var(--foreground)" />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          />
          <Bar dataKey="revenue" fill="var(--primary)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
