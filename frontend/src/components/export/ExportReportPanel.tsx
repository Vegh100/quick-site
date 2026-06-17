import { useState, useMemo } from "react";
import { useRevenueSummary, useExportBookingsCsv } from "../../hooks/useApi";
import { Download, TrendingUp, Calendar, DollarSign, BarChart3, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString("hu-HU")} RON`;
}

export function ExportReportPanel() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
  );
  const [dateTo, setDateTo] = useState(now.toISOString().slice(0, 10));

  const { data: summaryData, isLoading } = useRevenueSummary(dateFrom, dateTo);
  const exportCsv = useExportBookingsCsv();

  const summary = summaryData?.data;
  const dailySummary = summary?.daily;

  const maxDailyRevenue = useMemo(() => {
    if (!dailySummary) return 1;
    return Math.max(...dailySummary.map((d) => d.revenue), 1);
  }, [dailySummary]);

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Riportok és Export
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Bevételi áttekintés és foglalás exportálás
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm border rounded-lg px-3 py-1.5 bg-background"
            />
            <span className="text-muted-foreground text-sm">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm border rounded-lg px-3 py-1.5 bg-background"
            />
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<DollarSign className="h-4 w-4" />}
              label="Bevétel"
              value={formatCurrency(summary.totalRevenue)}
              color="#10b981"
            />
            <StatCard
              icon={<Calendar className="h-4 w-4" />}
              label="Teljesítve"
              value={summary.totalCompleted.toString()}
              color="#3b82f6"
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Átlag/foglalás"
              value={formatCurrency(Math.round(summary.averagePerBooking))}
              color="#f59e0b"
            />
            <StatCard
              icon={<BarChart3 className="h-4 w-4" />}
              label="Szolgáltatások"
              value={summary.byService.length.toString()}
              color="#8b5cf6"
            />
          </div>

          {/* Revenue by Service */}
          {summary.byService.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold text-sm mb-4">Bevétel szolgáltatásonként</h3>
              <div className="space-y-3">
                {summary.byService.map((svc) => {
                  const pct =
                    summary.totalRevenue > 0 ? (svc.revenue / summary.totalRevenue) * 100 : 0;
                  return (
                    <div key={svc.serviceId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium">{svc.serviceName}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(svc.revenue)} ({svc.count}×)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-orange-400 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Daily Revenue Mini Chart */}
          {summary.daily.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold text-sm mb-4">Napi bevétel</h3>
              <div className="flex items-end gap-[2px] h-24">
                {summary.daily.map((day) => {
                  const height = maxDailyRevenue > 0 ? (day.revenue / maxDailyRevenue) * 100 : 0;
                  return (
                    <div key={day.date} className="flex-1 group relative">
                      <div
                        className="bg-gradient-to-t from-primary/80 to-primary/40 rounded-t-sm transition-all hover:from-primary hover:to-primary/60 cursor-default"
                        style={{
                          height: `${Math.max(height, 2)}%`,
                        }}
                      />
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block bg-card border rounded-lg px-2 py-1 text-[10px] shadow-lg whitespace-nowrap z-10">
                        <p className="font-medium">{formatCurrency(day.revenue)}</p>
                        <p className="text-muted-foreground">{day.bookings} foglalás</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                <span>{summary.daily[0]?.date}</span>
                <span>{summary.daily[summary.daily.length - 1]?.date}</span>
              </div>
            </Card>
          )}
        </>
      ) : null}

      {/* Export Button */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Foglalások exportálása</h3>
            <p className="text-xs text-muted-foreground mt-1">
              CSV fájl letöltése a kiválasztott időszakra
            </p>
          </div>
          <Button
            onClick={() => exportCsv.mutate({ dateFrom, dateTo })}
            disabled={exportCsv.isPending}
            className="gap-2"
          >
            {exportCsv.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            CSV Letöltés
          </Button>
        </div>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="p-4">
      <div
        className="flex items-center justify-center w-8 h-8 rounded-lg mb-2"
        style={{ backgroundColor: `${color}15`, color }}
      >
        {icon}
      </div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}
