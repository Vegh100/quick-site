import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { ServiceSlotPicker } from "../settings/ServiceSlotPicker";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  useTeamMembers,
  useInviteMember,
  useDeactivateMember,
  useMemberDetail,
  useAssignServiceToMember,
  useRemoveServiceFromMember,
  useSetMemberAvailability,
  useMyProvider,
  useUpdateService,
  useServiceTypes,
} from "../../hooks/useApi";
import {
  UserPlus,
  Users,
  ShieldCheck,
  Loader2,
  Mail,
  Trash2,
  Link2,
  Copy,
  Check,
  ChevronRight,
  ArrowLeft,
  Clock,
  Calendar,
  Briefcase,
  BarChart3,
  Plus,
  X,
  TrendingUp,
  CalendarCheck,
  CalendarClock,
  Ban,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import type {
  ProviderMember,
  MemberRole,
  Provider,
  Service,
} from "../../lib/types";

const ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: "Tulajdonos",
  EMPLOYEE: "Alkalmazott",
};

const ROLE_COLORS: Record<MemberRole, string> = {
  OWNER: "bg-amber-500",
  EMPLOYEE: "bg-green-500",
};

const STATUS_LABELS: Record<string, string> = {
  INVITED: "Meghívva",
  ACTIVE: "Aktív",
  DEACTIVATED: "Deaktiválva",
};

const DAYS_HU = [
  "Hétfő",
  "Kedd",
  "Szerda",
  "Csütörtök",
  "Péntek",
  "Szombat",
  "Vasárnap",
];
const DAY_MAP = [1, 2, 3, 4, 5, 6, 0]; // index → dayOfWeek (Mon=1..Sat=6,Sun=0)

interface TeamManagementProps {
  provider: Provider;
}

function getMemberName(member: ProviderMember) {
  if (member.displayName) return member.displayName;
  if (member.user?.firstName || member.user?.lastName) {
    return `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim();
  }
  return member.invitedEmail;
}

// ============================================================================
// STAT CARD sub-component
// ============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-background">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}
      >
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold text-sm">{value}</p>
      </div>
    </div>
  );
}

// ============================================================================
// MEMBER DETAIL PANEL
// ============================================================================

function MemberDetailPanel({
  memberId,
  onBack,
}: {
  memberId: string;
  onBack: () => void;
}) {
  const { data: detailData, isLoading } = useMemberDetail(memberId);
  const { data: providerData } = useMyProvider();
  const assignService = useAssignServiceToMember();
  const removeService = useRemoveServiceFromMember();
  const setMemberAvailability = useSetMemberAvailability();
  const updateServiceMut = useUpdateService();
  const { data: serviceTypesData } = useServiceTypes();

  const detail = detailData?.data;
  const allServices = providerData?.data?.services || [];
  const serviceTypes = serviceTypesData?.data || [];

  // Service editing state
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editSvcName, setEditSvcName] = useState("");
  const [editSvcDesc, setEditSvcDesc] = useState("");
  const [editSvcPrice, setEditSvcPrice] = useState("");
  const [editSvcDuration, setEditSvcDuration] = useState("60");
  const [editSvcPriceType, setEditSvcPriceType] = useState<
    "FIXED" | "PER_HOUR" | "PER_SERVICE"
  >("FIXED");
  const [editSvcServiceTypeId, setEditSvcServiceTypeId] = useState("");
  const [showSlotPicker, setShowSlotPicker] = useState<string | null>(null);

  // Availability editing state
  const [availSlots, setAvailSlots] = useState(
    DAYS_HU.map((_, i) => ({
      dayOfWeek: DAY_MAP[i],
      startTime: "08:00",
      endTime: "17:00",
      isEnabled: i < 5,
    })),
  );
  const [availDirty, setAvailDirty] = useState(false);

  // Load member availability into local state
  useEffect(() => {
    if (detail?.availability && detail.availability.length > 0) {
      const loaded = DAYS_HU.map((_, i) => {
        const dow = DAY_MAP[i];
        const existing = detail.availability?.find((a) => a.dayOfWeek === dow);
        return existing
          ? {
              dayOfWeek: dow,
              startTime: existing.startTime,
              endTime: existing.endTime,
              isEnabled: existing.isEnabled,
            }
          : {
              dayOfWeek: dow,
              startTime: "08:00",
              endTime: "17:00",
              isEnabled: false,
            };
      });
      setAvailSlots(loaded);
      setAvailDirty(false);
    }
  }, [detail?.availability]);

  if (isLoading || !detail) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const assignedServiceIds = new Set(
    detail.memberServices?.map((ms) => ms.serviceId) || [],
  );
  const unassignedServices = allServices.filter(
    (s) => !assignedServiceIds.has(s.id),
  );

  const handleAssignService = async (serviceId: string) => {
    try {
      await assignService.mutateAsync({ memberId, serviceId });
      toast.success("Szolgáltatás hozzárendelve!");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Hiba történt");
    }
  };

  const openEditService = (svc: Service) => {
    setEditingService(svc);
    setEditSvcServiceTypeId(svc.serviceTypeId || "");
    setEditSvcName(svc.name);
    setEditSvcDesc(svc.description || "");
    setEditSvcPrice(String(Number(svc.priceAmount)));
    setEditSvcDuration(String(svc.durationMin));
    setEditSvcPriceType(svc.priceType);
  };

  const closeEditService = () => {
    setEditingService(null);
    setEditSvcName("");
    setEditSvcDesc("");
    setEditSvcPrice("");
    setEditSvcDuration("60");
    setEditSvcPriceType("FIXED");
    setEditSvcServiceTypeId("");
  };

  const handleSaveEditService = async () => {
    if (!editingService) return;
    if (!editSvcName || !editSvcPrice) {
      toast.error("Név és ár kötelező!");
      return;
    }
    const duration = parseInt(editSvcDuration);
    if (!duration || duration <= 0) {
      toast.error("Az időtartam legalább 1 perc kell legyen!");
      return;
    }
    if (duration > 480) {
      toast.error("Az időtartam maximum 8 óra (480 perc) lehet!");
      return;
    }
    const price = parseFloat(editSvcPrice);
    if (!price || price <= 0) {
      toast.error("Az ár pozitív szám kell legyen!");
      return;
    }
    try {
      await updateServiceMut.mutateAsync({
        serviceId: editingService.id,
        data: {
          serviceTypeId: editSvcServiceTypeId || undefined,
          name: editSvcName,
          description: editSvcDesc || undefined,
          priceAmount: price,
          priceType: editSvcPriceType,
          durationMin: duration,
          slotIntervalMin: duration,
        },
      });
      toast.success("Szolgáltatás frissítve!");
      closeEditService();
    } catch {
      toast.error("Nem sikerült menteni a szolgáltatást.");
    }
  };

  const handleRemoveService = async (serviceId: string) => {
    try {
      await removeService.mutateAsync({ memberId, serviceId });
      toast.success("Szolgáltatás eltávolítva!");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Hiba történt");
    }
  };

  const handleSaveAvailability = async () => {
    try {
      await setMemberAvailability.mutateAsync({
        memberId,
        availability: availSlots,
      });
      toast.success("Időpontok mentve!");
      setAvailDirty(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Hiba az időpontok mentésekor");
    }
  };

  const stats = detail.bookingStats;

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {detail.user?.avatarUrl ? (
              <img
                src={detail.user.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-medium text-muted-foreground">
                {getMemberName(detail).charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{getMemberName(detail)}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3 w-3" />
              {detail.invitedEmail}
              <Badge className={`ml-2 ${ROLE_COLORS[detail.role]}`}>
                {detail.role === "OWNER" && (
                  <ShieldCheck className="mr-1 h-3 w-3" />
                )}
                {ROLE_LABELS[detail.role]}
              </Badge>
              <Badge variant="outline">{STATUS_LABELS[detail.status]}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          icon={BarChart3}
          label="Összes foglalás"
          value={stats.totalBookings}
          color="bg-blue-500"
        />
        <StatCard
          icon={CalendarCheck}
          label="Befejezett"
          value={stats.completedBookings}
          color="bg-green-500"
        />
        <StatCard
          icon={CalendarClock}
          label="Függőben"
          value={stats.pendingBookings}
          color="bg-yellow-500"
        />
        <StatCard
          icon={Ban}
          label="Lemondva"
          value={stats.cancelledBookings}
          color="bg-red-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Bevétel"
          value={`${stats.totalRevenue.toLocaleString("hu-HU")} RON`}
          color="bg-emerald-600"
        />
      </div>

      {/* Tabbed detail */}
      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bookings">
            <Calendar className="h-4 w-4 mr-1" />
            Foglalások
          </TabsTrigger>
          <TabsTrigger value="services">
            <Briefcase className="h-4 w-4 mr-1" />
            Szolgáltatások
          </TabsTrigger>
          <TabsTrigger value="availability">
            <Clock className="h-4 w-4 mr-1" />
            Időpontok
          </TabsTrigger>
        </TabsList>

        {/* BOOKINGS TAB */}
        <TabsContent value="bookings" className="space-y-4">
          {/* Upcoming */}
          <div>
            <h4 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wider">
              Közelgő foglalások
            </h4>
            {detail.upcomingBookings.length === 0 ? (
              <Card className="p-4 text-center text-sm text-muted-foreground">
                Nincs közelgő foglalás
              </Card>
            ) : (
              <div className="space-y-2">
                {detail.upcomingBookings.map((b) => (
                  <Card key={b.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <Calendar className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {b.service?.name || "Szolgáltatás"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {b.customer?.firstName} {b.customer?.lastName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {new Date(b.scheduledDate).toLocaleDateString(
                            "hu-HU",
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {b.scheduledTime}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Recent completed */}
          <div>
            <h4 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wider">
              Utolsó befejezett foglalások
            </h4>
            {detail.recentBookings.length === 0 ? (
              <Card className="p-4 text-center text-sm text-muted-foreground">
                Nincs befejezett foglalás
              </Card>
            ) : (
              <div className="space-y-2">
                {detail.recentBookings.map((b) => (
                  <Card key={b.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {b.service?.name || "Szolgáltatás"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {b.customer?.firstName} {b.customer?.lastName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {Number(b.totalAmount).toLocaleString("hu-HU")} RON
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {b.completedAt
                            ? new Date(b.completedAt).toLocaleDateString(
                                "hu-HU",
                              )
                            : ""}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* SERVICES TAB */}
        <TabsContent value="services" className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wider">
              Hozzárendelt szolgáltatások
            </h4>
            {(detail.memberServices?.length || 0) === 0 ? (
              <Card className="p-4 text-center text-sm text-muted-foreground">
                Nincs hozzárendelt szolgáltatás
              </Card>
            ) : (
              <div className="space-y-2">
                {detail.memberServices?.map((ms) => (
                  <div
                    key={ms.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    <Card className="p-3 border-0 shadow-none">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <Briefcase className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {ms.service?.name || "Szolgáltatás"}
                            </p>
                            {ms.service && (
                              <p className="text-xs text-muted-foreground">
                                {Number(ms.service.priceAmount).toLocaleString(
                                  "hu-HU",
                                )}{" "}
                                {ms.service.priceCurrency} ·{" "}
                                {ms.service.durationMin} perc
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {ms.service && (
                            <>
                              <Button
                                variant={
                                  showSlotPicker === ms.serviceId
                                    ? "default"
                                    : "ghost"
                                }
                                size="icon"
                                className="h-8 w-8"
                                title="Időpontok kezelése"
                                onClick={() =>
                                  setShowSlotPicker(
                                    showSlotPicker === ms.serviceId
                                      ? null
                                      : ms.serviceId,
                                  )
                                }
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Szerkesztés"
                                onClick={() => openEditService(ms.service!)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveService(ms.serviceId)}
                            disabled={removeService.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>

                    {/* Inline edit form */}
                    {editingService?.id === ms.serviceId && (
                      <div className="px-4 pb-4 space-y-4 border-t bg-muted/30">
                        <h4 className="text-sm font-medium pt-3">
                          Szolgáltatás szerkesztése
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs">
                              Szolgáltatás típus
                            </Label>
                            <select
                              value={editSvcServiceTypeId}
                              onChange={(e) => {
                                const typeId = e.target.value;
                                setEditSvcServiceTypeId(typeId);
                                if (typeId) {
                                  const st = serviceTypes.find(
                                    (t: any) => t.id === typeId,
                                  );
                                  if (st) {
                                    setEditSvcName(st.name);
                                    setEditSvcDesc(st.description || "");
                                  }
                                }
                              }}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                            >
                              <option value="">-- Válassz típust --</option>
                              {(() => {
                                const grouped = serviceTypes.reduce(
                                  (acc: Record<string, any[]>, st: any) => {
                                    const catName =
                                      st.category?.name || "Egyéb";
                                    if (!acc[catName]) acc[catName] = [];
                                    acc[catName].push(st);
                                    return acc;
                                  },
                                  {},
                                );
                                return Object.entries(grouped).map(
                                  ([catName, types]) => (
                                    <optgroup key={catName} label={catName}>
                                      {(types as any[]).map((st) => (
                                        <option key={st.id} value={st.id}>
                                          {st.name}
                                        </option>
                                      ))}
                                    </optgroup>
                                  ),
                                );
                              })()}
                            </select>
                          </div>
                          {!editSvcServiceTypeId && (
                            <div>
                              <Label className="text-xs">Név</Label>
                              <Input
                                value={editSvcName}
                                onChange={(e) => setEditSvcName(e.target.value)}
                                placeholder="pl. Mélytisztítás"
                              />
                            </div>
                          )}
                          <div>
                            <Label className="text-xs">Leírás</Label>
                            <Textarea
                              value={editSvcDesc}
                              onChange={(e) => setEditSvcDesc(e.target.value)}
                              rows={2}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Ár (RON)</Label>
                              <Input
                                type="number"
                                value={editSvcPrice}
                                onChange={(e) =>
                                  setEditSvcPrice(e.target.value)
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Típus</Label>
                              <select
                                value={editSvcPriceType}
                                onChange={(e) =>
                                  setEditSvcPriceType(e.target.value as any)
                                }
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                              >
                                <option value="FIXED">Fix ár</option>
                                <option value="PER_HOUR">Óradíj</option>
                                <option value="PER_SERVICE">Szolg. díj</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">
                              Kb. időtartam (perc)
                            </Label>
                            <Input
                              type="number"
                              value={editSvcDuration}
                              onChange={(e) =>
                                setEditSvcDuration(e.target.value)
                              }
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={closeEditService}
                          >
                            Mégse
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveEditService}
                            disabled={updateServiceMut.isPending}
                          >
                            {updateServiceMut.isPending && (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            )}
                            Mentés
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Slot picker */}
                    {ms.service && showSlotPicker === ms.serviceId && (
                      <div className="px-4 pb-4 border-t">
                        <ServiceSlotPicker service={ms.service} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {unassignedServices.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wider">
                Elérhető szolgáltatások
              </h4>
              <div className="space-y-2">
                {unassignedServices.map((svc: Service) => (
                  <Card key={svc.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{svc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {Number(svc.priceAmount).toLocaleString("hu-HU")}{" "}
                            {svc.priceCurrency} · {svc.durationMin} perc
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssignService(svc.id)}
                        disabled={assignService.isPending}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Hozzáadás
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* AVAILABILITY TAB */}
        <TabsContent value="availability" className="space-y-4">
          <div className="space-y-3">
            {DAYS_HU.map((dayName, index) => {
              const slot = availSlots[index];
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <label className="flex items-center gap-2 w-28">
                    <input
                      type="checkbox"
                      checked={slot.isEnabled}
                      onChange={(e) => {
                        const updated = [...availSlots];
                        updated[index] = {
                          ...updated[index],
                          isEnabled: e.target.checked,
                        };
                        setAvailSlots(updated);
                        setAvailDirty(true);
                      }}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-medium">{dayName}</span>
                  </label>
                  {slot.isEnabled && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => {
                          const updated = [...availSlots];
                          updated[index] = {
                            ...updated[index],
                            startTime: e.target.value,
                          };
                          setAvailSlots(updated);
                          setAvailDirty(true);
                        }}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => {
                          const updated = [...availSlots];
                          updated[index] = {
                            ...updated[index],
                            endTime: e.target.value,
                          };
                          setAvailSlots(updated);
                          setAvailDirty(true);
                        }}
                        className="w-32"
                      />
                    </div>
                  )}
                  {!slot.isEnabled && (
                    <span className="text-sm text-muted-foreground">Zárva</span>
                  )}
                </div>
              );
            })}
          </div>

          {availDirty && (
            <div className="flex justify-end">
              <Button
                onClick={handleSaveAvailability}
                disabled={setMemberAvailability.isPending}
              >
                {setMemberAvailability.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Időpontok mentése
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// MAIN TEAM MANAGEMENT COMPONENT
// ============================================================================

export function TeamManagement({ provider }: TeamManagementProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDisplayName, setInviteDisplayName] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const { data: membersData, isLoading } = useTeamMembers();
  const inviteMember = useInviteMember();
  const deactivateMember = useDeactivateMember();

  const members = membersData?.data || [];

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast.error("Kérlek add meg az e-mail címet!");
      return;
    }

    try {
      const result = await inviteMember.mutateAsync({
        email: inviteEmail,
        displayName: inviteDisplayName || undefined,
      });
      const token = result.data?.inviteToken;
      if (token) {
        const link = `${window.location.origin}/meghivas/${token}`;
        setInviteLink(link);
      }
      toast.success("Meghívó létrehozva!");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Hiba a meghívó küldésekor");
    }
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link másolva!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseInvite = () => {
    setInviteOpen(false);
    setInviteEmail("");
    setInviteDisplayName("");
    setInviteLink(null);
    setCopied(false);
  };

  const handleDeactivate = async (
    e: React.MouseEvent,
    memberId: string,
    name: string,
  ) => {
    e.stopPropagation();
    if (!confirm(`Biztosan deaktiválod: ${name}?`)) return;
    try {
      await deactivateMember.mutateAsync(memberId);
      toast.success("Tag deaktiválva!");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Hiba a deaktiváláskor");
    }
  };

  // If a member is selected, show their detail view
  if (selectedMemberId) {
    return (
      <MemberDetailPanel
        memberId={selectedMemberId}
        onBack={() => setSelectedMemberId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Csapat ({members.length} tag)</h3>
            <p className="text-sm text-muted-foreground">
              Alkalmazottak kezelése — kattints egy tagra a részletekért
            </p>
          </div>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Meghívás
        </Button>
      </div>

      {/* Members List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : members.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Még nincsenek csapattagok. Hívj meg alkalmazottakat!
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {members
            .filter((m) => m.status !== "DEACTIVATED")
            .map((member) => (
              <Card
                key={member.id}
                className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedMemberId(member.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {member.user?.avatarUrl ? (
                        <img
                          src={member.user.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">
                          {getMemberName(member).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{getMemberName(member)}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {member.invitedEmail}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Quick stats preview */}
                    {member.memberServices &&
                      member.memberServices.length > 0 && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {member.memberServices.length} szolg.
                        </span>
                      )}
                    {member.availability && member.availability.length > 0 && (
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {member.availability.filter((a) => a.isEnabled).length}{" "}
                        nap
                      </span>
                    )}

                    <Badge className={ROLE_COLORS[member.role]}>
                      {member.role === "OWNER" && (
                        <ShieldCheck className="mr-1 h-3 w-3" />
                      )}
                      {ROLE_LABELS[member.role]}
                    </Badge>

                    {member.status === "INVITED" && (
                      <Badge variant="outline">
                        {STATUS_LABELS[member.status]}
                      </Badge>
                    )}

                    {member.role !== "OWNER" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) =>
                          handleDeactivate(e, member.id, getMemberName(member))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}

                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={handleCloseInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alkalmazott meghívása</DialogTitle>
            <DialogDescription>
              Add meg az alkalmazott adatait. Egy meghívó linket kapsz, amit
              elküldhetsz neki. A linken keresztül tud regisztrálni és
              csatlakozni a cégedhez.
            </DialogDescription>
          </DialogHeader>

          {inviteLink ? (
            <div className="space-y-4 mt-4">
              <div className="rounded-lg bg-muted p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Link2 className="h-4 w-4 text-primary" />
                  Meghívó link létrehozva
                </div>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={inviteLink}
                    className="text-xs font-mono"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Küldd el ezt a linket az alkalmazottnak. A linken keresztül
                  tud regisztrálni és automatikusan csatlakozik a cégedhez.
                </p>
              </div>
              <Button onClick={handleCloseInvite} className="w-full">
                Kész
              </Button>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="invite-email">E-mail cím *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="alkalmazott@example.com"
                />
              </div>
              <div>
                <Label htmlFor="invite-name">Megjelenítési név</Label>
                <Input
                  id="invite-name"
                  value={inviteDisplayName}
                  onChange={(e) => setInviteDisplayName(e.target.value)}
                  placeholder="pl. Kovács Anna"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleCloseInvite}
                  className="flex-1"
                >
                  Mégse
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={inviteMember.isPending}
                  className="flex-1"
                >
                  {inviteMember.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Meghívó létrehozása
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
