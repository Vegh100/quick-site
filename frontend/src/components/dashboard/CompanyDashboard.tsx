import { Card } from "../ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  Star,
  Clock,
  Target,
  BarChart3,
  CheckCircle,
} from "lucide-react";
import type { ProviderStats } from "../../lib/types";

type StatsData = ProviderStats;

// ============================================================================
// KPI CARD
// ============================================================================

function KpiCard({
  label,
  value,
  subValue,
  change,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  subValue?: string;
  change?: number;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
}) {
  const getTrendColor = () => {
    if (trend === "up") return "text-green-600";
    if (trend === "down") return "text-red-500";
    return "text-muted-foreground";
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground truncate">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <div className="flex items-center gap-2 mt-1">
            {change !== undefined && (
              <span className={`text-xs font-medium flex items-center gap-0.5 ${getTrendColor()}`}>
                {trend === "up" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : trend === "down" ? (
                  <TrendingDown className="h-3 w-3" />
                ) : null}
                {change > 0 ? "+" : ""}
                {change}%
              </span>
            )}
            {subValue && <span className="text-xs text-muted-foreground">{subValue}</span>}
          </div>
        </div>
        <div
          className="p-2.5 rounded-xl flex-shrink-0"
          style={{
            backgroundColor: "rgba(var(--primary-rgb, 59, 130, 246), 0.1)",
          }}
        >
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// PERSONAL DASHBOARD (for owner's own tab and employee dashboard)
// ============================================================================

export function PersonalDashboard({ stats }: { stats: StatsData }) {
  const monthNames: Record<string, string> = {
    "01": "Jan",
    "02": "Feb",
    "03": "Már",
    "04": "Ápr",
    "05": "Máj",
    "06": "Jún",
    "07": "Júl",
    "08": "Aug",
    "09": "Sze",
    "10": "Okt",
    "11": "Nov",
    "12": "Dec",
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Havi bevétel"
          value={`${stats.thisMonthRevenue.toLocaleString("hu-HU")} RON`}
          change={stats.revenueChange}
          trend={stats.revenueChange > 0 ? "up" : stats.revenueChange < 0 ? "down" : "neutral"}
          subValue="vs előző hónap"
          icon={DollarSign}
        />
        <KpiCard
          label="Havi foglalások"
          value={String(stats.thisMonthBookings)}
          change={stats.bookingChange}
          trend={stats.bookingChange > 0 ? "up" : stats.bookingChange < 0 ? "down" : "neutral"}
          subValue="vs előző hónap"
          icon={Calendar}
        />
        <KpiCard label="Ügyfelek" value={String(stats.totalClients)} icon={Users} />
        <KpiCard
          label="Értékelés"
          value={stats.averageRating.toFixed(1)}
          subValue={`${stats.totalReviews} értékelés`}
          icon={Star}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Teljesítési arány" value={`${stats.completionRate}%`} icon={Target} />
        <KpiCard
          label="Átl. foglalás értéke"
          value={`${stats.avgBookingValue} RON`}
          icon={BarChart3}
        />
        <KpiCard label="Átl. időtartam" value={`${stats.avgDuration} perc`} icon={Clock} />
        <KpiCard
          label="Heti foglalások"
          value={String(stats.thisWeekBookings)}
          subValue="ezen a héten"
          icon={CheckCircle}
        />
      </div>

      {/* Revenue Trend */}
      {stats.revenueByMonth && stats.revenueByMonth.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-1">Bevétel alakulás</h3>
          <p className="text-sm text-muted-foreground mb-4">Utolsó 6 hónap</p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats.revenueByMonth}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis
                dataKey="month"
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickFormatter={(v: string) => monthNames[v.split("-")[1]] || v}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
                formatter={(value: number) => [`${value.toLocaleString("hu-HU")} RON`, "Bevétel"]}
                labelFormatter={(label: string) => monthNames[label.split("-")[1]] || label}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--primary)"
                strokeWidth={2.5}
                fill="url(#revenueGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Status breakdown + Service breakdown side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Donut */}
        {stats.statusBreakdown && stats.statusBreakdown.length > 0 && (
          <StatusDonut data={stats.statusBreakdown} />
        )}

        {/* Service Breakdown */}
        {stats.serviceBreakdown && stats.serviceBreakdown.length > 0 && (
          <ServiceBreakdownChart data={stats.serviceBreakdown} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPANY DASHBOARD (for team/company tab)
// ============================================================================

export function CompanyDashboard({ stats }: { stats: StatsData }) {
  const monthNames: Record<string, string> = {
    "01": "Jan",
    "02": "Feb",
    "03": "Már",
    "04": "Ápr",
    "05": "Máj",
    "06": "Jún",
    "07": "Júl",
    "08": "Aug",
    "09": "Sze",
    "10": "Okt",
    "11": "Nov",
    "12": "Dec",
  };

  return (
    <div className="space-y-6">
      {/* Top KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Havi bevétel"
          value={`${stats.thisMonthRevenue.toLocaleString("hu-HU")} RON`}
          change={stats.revenueChange}
          trend={stats.revenueChange > 0 ? "up" : stats.revenueChange < 0 ? "down" : "neutral"}
          subValue="vs előző hónap"
          icon={DollarSign}
        />
        <KpiCard
          label="Összes bevétel"
          value={`${stats.totalRevenue.toLocaleString("hu-HU")} RON`}
          icon={DollarSign}
        />
        <KpiCard
          label="Havi foglalások"
          value={String(stats.thisMonthBookings)}
          change={stats.bookingChange}
          trend={stats.bookingChange > 0 ? "up" : stats.bookingChange < 0 ? "down" : "neutral"}
          subValue="vs előző hónap"
          icon={Calendar}
        />
        <KpiCard label="Összes ügyfél" value={String(stats.totalClients)} icon={Users} />
      </div>

      {/* Second KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Teljesítési arány" value={`${stats.completionRate}%`} icon={Target} />
        <KpiCard
          label="Átl. foglalás érték"
          value={`${stats.avgBookingValue} RON`}
          icon={BarChart3}
        />
        <KpiCard
          label="Heti foglalások"
          value={String(stats.thisWeekBookings)}
          icon={CheckCircle}
        />
        <KpiCard
          label="Értékelés"
          value={stats.averageRating.toFixed(1)}
          subValue={`${stats.totalReviews} értékelés`}
          icon={Star}
        />
        <KpiCard
          label="Függőben"
          value={String(stats.pendingBookings)}
          subValue="megerősítésre vár"
          icon={Clock}
        />
      </div>

      {/* Revenue Area Chart + Daily Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend */}
        {stats.revenueByMonth && stats.revenueByMonth.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold mb-1">Bevétel alakulás</h3>
            <p className="text-sm text-muted-foreground mb-4">Havi bevétel, utolsó 6 hónap</p>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={stats.revenueByMonth}>
                <defs>
                  <linearGradient id="companyRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  dataKey="month"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickFormatter={(v: string) => monthNames[v.split("-")[1]] || v}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                  formatter={(value: number) => [`${value.toLocaleString("hu-HU")} RON`, "Bevétel"]}
                  labelFormatter={(label: string) => monthNames[label.split("-")[1]] || label}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="url(#companyRevenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Daily Activity - last 30 days */}
        {stats.dailyData && stats.dailyData.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold mb-1">Napi aktivitás</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Foglalások száma az utolsó 30 napban
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickFormatter={(v: string) => {
                    const parts = v.split("-");
                    return `${parts[1]}.${parts[2]}`;
                  }}
                  interval={4}
                />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                  formatter={(value: number, name: string) => [
                    value,
                    name === "bookings" ? "Foglalás" : name,
                  ]}
                  labelFormatter={(label: string) =>
                    new Date(label).toLocaleDateString("hu-HU", {
                      month: "short",
                      day: "numeric",
                      weekday: "short",
                    })
                  }
                />
                <Bar
                  dataKey="bookings"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* Status Donut + Service Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats.statusBreakdown && stats.statusBreakdown.length > 0 && (
          <StatusDonut data={stats.statusBreakdown} />
        )}
        {stats.serviceBreakdown && stats.serviceBreakdown.length > 0 && (
          <ServiceBreakdownChart data={stats.serviceBreakdown} />
        )}
      </div>

      {/* Member Performance */}
      {stats.memberStats && stats.memberStats.length > 0 && (
        <MemberPerformanceChart data={stats.memberStats} />
      )}
    </div>
  );
}

// ============================================================================
// STATUS DONUT CHART
// ============================================================================

const STATUS_CHART_COLORS: Record<string, string> = {
  COMPLETED: "#22c55e",
  CONFIRMED: "#3b82f6",
  PENDING: "#eab308",
  IN_PROGRESS: "#a855f7",
  CANCELLED: "#ef4444",
};

function StatusDonut({ data }: { data: { status: string; count: number; label: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-1">Foglalás státuszok</h3>
      <p className="text-sm text-muted-foreground mb-4">Összes foglalás eloszlása</p>
      <div className="flex items-center gap-6">
        <ResponsiveContainer width="50%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="count"
              nameKey="label"
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={STATUS_CHART_COLORS[entry.status] || "#94a3b8"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "13px",
              }}
              formatter={(value: number, name: string) => [
                `${value} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2">
          {data.map((entry) => (
            <div key={entry.status} className="flex items-center gap-2 text-sm">
              <div
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: STATUS_CHART_COLORS[entry.status] || "#94a3b8",
                }}
              />
              <span className="flex-1 text-muted-foreground">{entry.label}</span>
              <span className="font-medium">{entry.count}</span>
              <span className="text-muted-foreground text-xs">
                ({total > 0 ? Math.round((entry.count / total) * 100) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// SERVICE BREAKDOWN CHART
// ============================================================================

const SERVICE_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#f97316",
];

function ServiceBreakdownChart({
  data,
}: {
  data: {
    serviceId: string;
    serviceName: string;
    bookingCount: number;
    revenue: number;
  }[];
}) {
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-1">Szolgáltatások</h3>
      <p className="text-sm text-muted-foreground mb-4">Foglalások szolgáltatás szerint</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
          <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
          <YAxis
            type="category"
            dataKey="serviceName"
            stroke="var(--muted-foreground)"
            fontSize={12}
            width={120}
            tickFormatter={(v: string) => (v.length > 16 ? v.substring(0, 14) + "…" : v)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "13px",
            }}
            formatter={(value: number, name: string) => [
              value,
              name === "bookingCount" ? "Foglalások" : name === "revenue" ? "Bevétel (RON)" : name,
            ]}
          />
          <Bar
            dataKey="bookingCount"
            fill={SERVICE_COLORS[0]}
            radius={[0, 4, 4, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ============================================================================
// MEMBER PERFORMANCE CHART (company only)
// ============================================================================

function MemberPerformanceChart({
  data,
}: {
  data: {
    memberId: string;
    memberName: string;
    bookingCount: number;
    revenue: number;
  }[];
}) {
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-1">Csapattagok teljesítménye</h3>
      <p className="text-sm text-muted-foreground mb-4">Foglalások és bevétel csapattagonként</p>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 60)}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
          <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
          <YAxis
            type="category"
            dataKey="memberName"
            stroke="var(--muted-foreground)"
            fontSize={12}
            width={140}
            tickFormatter={(v: string) => (v.length > 18 ? v.substring(0, 16) + "…" : v)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "13px",
            }}
            formatter={(value: number, name: string) => [
              name === "revenue" ? `${value.toLocaleString("hu-HU")} RON` : value,
              name === "bookingCount" ? "Foglalások" : "Bevétel",
            ]}
          />
          <Legend
            formatter={(value: string) =>
              value === "bookingCount" ? "Foglalások" : "Bevétel (RON)"
            }
          />
          <Bar dataKey="bookingCount" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={20} />
          <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
