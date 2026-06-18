import { useMemo, useState } from "react";
import {
  AlertCircle,
  Car,
  Clock,
  Home,
  Loader2,
  Save,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  useServiceMatrix,
  useUpsertServiceMatrix,
  useMyProvider,
  useSetAvailability,
} from "../../hooks/useApi";
import { useAuth } from "../../contexts/AuthContext";
import type { Availability, ProviderMember, ServiceMatrixDefinition } from "../../lib/types";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";

interface MatrixValue {
  price: string;
  duration: string;
  description: string;
  isActive: boolean;
}

const filledInputFrameStyle = {
  borderColor: "#FF8200",
  boxShadow: "0 0 0 3px rgba(255,130,0,0.12)",
} as const;

const filledInputValueStyle = {
  color: "#0A0903",
  fontWeight: 600,
} as const;

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  return Array.from(
    items
      .reduce((acc, item) => {
        const key = getKey(item);
        if (!acc.has(key)) acc.set(key, item);
        return acc;
      }, new Map<string, T>())
      .values(),
  );
}

function PriceInput({
  id,
  value,
  onChange,
  suffix,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
}) {
  const filled = !!value && Number(value) > 0;

  return (
    <div
      className="flex min-w-0 overflow-hidden rounded-md border border-input bg-input-background transition-[color,box-shadow] focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]"
      style={filled ? filledInputFrameStyle : undefined}
    >
      <span
        className="flex h-10 w-14 shrink-0 items-center justify-center border-r border-border/70 text-xs font-semibold pointer-events-none"
        style={{ color: filled ? "#FF5100" : "#a1a1aa" }}
      >
        RON
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        pattern="[0-9]*[.,]?[0-9]*"
        placeholder="0.00"
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value.replace(",", ".");
          if (/^\d*(?:\.\d{0,2})?$/.test(nextValue)) onChange(nextValue);
        }}
        className="h-10 min-w-0 flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground md:text-sm"
        style={filled ? filledInputValueStyle : undefined}
      />
      {suffix && (
        <span className="flex h-10 min-w-12 shrink-0 items-center justify-center border-l border-border/70 px-3 text-xs text-muted-foreground pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

function TimeInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const filled = !!value && Number(value) > 0;

  return (
    <div
      className="flex min-w-0 overflow-hidden rounded-md border border-input bg-input-background transition-[color,box-shadow] focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]"
      style={filled ? filledInputFrameStyle : undefined}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center border-r border-border/70 pointer-events-none">
        <Clock
          className="h-3.5 w-3.5 transition-colors"
          style={{ color: filled ? "#FF5100" : "#a1a1aa" }}
        />
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="0"
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (/^\d*$/.test(nextValue)) onChange(nextValue);
        }}
        className="h-10 min-w-0 flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground md:text-sm"
        style={filled ? filledInputValueStyle : undefined}
      />
      <span className="flex h-10 w-12 shrink-0 items-center justify-center border-l border-border/70 text-xs text-muted-foreground pointer-events-none">
        min
      </span>
    </div>
  );
}

function ServicePair({
  definition,
  value,
  onChangePrice,
  onChangeDuration,
  onChangeDescription,
  onToggleActive,
}: {
  definition: ServiceMatrixDefinition;
  value: MatrixValue;
  onChangePrice: (value: string) => void;
  onChangeDuration: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onToggleActive: (active: boolean) => void;
}) {
  const [showDesc, setShowDesc] = useState(!!value.description);
  const priceSuffix = definition.pricingUnit === "PER_SQM" ? "/ m2" : undefined;
  const active = value.isActive;
  const hasFilled = active && !!value.price && Number(value.price) > 0;

  return (
    <div
      className="min-w-0 rounded-lg border-2 p-3 space-y-3 transition-all"
      style={
        hasFilled
          ? { borderColor: "#FF8200", background: "rgba(255,130,0,0.05)" }
          : active
            ? { borderColor: "hsl(var(--border))" }
            : { borderColor: "hsl(var(--border))", opacity: 0.55 }
      }
    >
      {/* Label + enable toggle */}
      <div className="flex items-start justify-between gap-2">
        <p
          className="min-w-0 text-xs font-semibold uppercase leading-snug break-words transition-colors"
          style={{ color: hasFilled ? "#FF5100" : undefined }}
        >
          {definition.serviceLabel}
        </p>
        <Switch
          className="shrink-0"
          checked={active}
          onCheckedChange={onToggleActive}
          aria-label={`${definition.serviceLabel} engedélyezése`}
        />
      </div>

      {/* Fields — only visible when active */}
      {active && (
        <>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label
                htmlFor={`${definition.templateKey}-price`}
                className="text-xs text-muted-foreground"
              >
                Ár
              </Label>
              <PriceInput
                id={`${definition.templateKey}-price`}
                value={value.price}
                onChange={onChangePrice}
                suffix={priceSuffix}
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor={`${definition.templateKey}-time`}
                className="text-xs text-muted-foreground"
              >
                Időtartam
              </Label>
              <TimeInput
                id={`${definition.templateKey}-time`}
                value={value.duration}
                onChange={onChangeDuration}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDesc((s) => !s)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDesc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showDesc ? "Leírás elrejtése" : "Egyéni leírás hozzáadása"}
          </button>

          {showDesc && (
            <Textarea
              value={value.description}
              onChange={(e) => onChangeDescription(e.target.value)}
              placeholder="Egyéni leírás ügyfeleink számára (opcionális)…"
              rows={2}
              className="text-xs resize-none"
            />
          )}
        </>
      )}
    </div>
  );
}

// ── Working Hours Tab ──────────────────────────────────────────────────────────

const DAYS_HU = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];
const DAY_MAP = [1, 2, 3, 4, 5, 6, 0];

interface DaySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
  breakStart: string | null;
  breakEnd: string | null;
}

function defaultWorkingHours(): DaySlot[] {
  return DAYS_HU.map((_, i) => ({
    dayOfWeek: DAY_MAP[i],
    startTime: "08:00",
    endTime: "17:00",
    isEnabled: i < 5,
    breakStart: null,
    breakEnd: null,
  }));
}

function buildWorkingHours(availability?: Availability[]): DaySlot[] {
  if (!availability?.length) return defaultWorkingHours();

  return DAYS_HU.map((_, i) => {
    const dow = DAY_MAP[i];
    const existing = availability.find((slot) => slot.dayOfWeek === dow);

    return existing
      ? {
          dayOfWeek: dow,
          startTime: existing.startTime,
          endTime: existing.endTime,
          isEnabled: existing.isEnabled,
          breakStart: existing.breakStart ?? null,
          breakEnd: existing.breakEnd ?? null,
        }
      : {
          dayOfWeek: dow,
          startTime: "08:00",
          endTime: "17:00",
          isEnabled: false,
          breakStart: null,
          breakEnd: null,
        };
  });
}

function minutesFromTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function validateWorkingHours(slots: DaySlot[]): string | null {
  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    const day = DAYS_HU[i];
    if (!slot.isEnabled) continue;

    const start = minutesFromTime(slot.startTime);
    const end = minutesFromTime(slot.endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      return `${day}: a munkaidő kezdete legyen korábbi, mint a vége.`;
    }

    const hasBreakStart = !!slot.breakStart;
    const hasBreakEnd = !!slot.breakEnd;
    if (hasBreakStart !== hasBreakEnd) {
      return `${day}: a szünethez kezdő és záró idő is szükséges.`;
    }

    if (slot.breakStart && slot.breakEnd) {
      const breakStart = minutesFromTime(slot.breakStart);
      const breakEnd = minutesFromTime(slot.breakEnd);
      if (breakStart >= breakEnd) {
        return `${day}: a szünet kezdete legyen korábbi, mint a vége.`;
      }
      if (breakStart < start || breakEnd > end) {
        return `${day}: a szünetnek a munkaidőn belül kell lennie.`;
      }
    }
  }

  return null;
}

function availabilitySignature(availability?: Availability[]) {
  return (availability ?? [])
    .map(
      (slot) =>
        `${slot.dayOfWeek}:${slot.startTime}-${slot.endTime}:${slot.isEnabled}:${slot.breakStart ?? ""}-${slot.breakEnd ?? ""}`,
    )
    .sort()
    .join("|");
}

function memberName(member: ProviderMember): string {
  return (
    member.displayName ||
    [member.user?.firstName, member.user?.lastName].filter(Boolean).join(" ") ||
    member.invitedEmail ||
    "Munkatárs"
  );
}

function WorkingHoursEditor({ member }: { member: ProviderMember }) {
  const setAvailabilityMut = useSetAvailability();
  const [slots, setSlots] = useState<DaySlot[]>(() => buildWorkingHours(member.availability));

  const updateSlot = (index: number, field: keyof DaySlot, value: string | boolean | null) =>
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));

  const toggleBreak = (index: number, enable: boolean) => {
    setSlots((prev) =>
      prev.map((s, i) =>
        i === index
          ? { ...s, breakStart: enable ? "12:00" : null, breakEnd: enable ? "13:00" : null }
          : s,
      ),
    );
  };

  const handleSave = async () => {
    const validationError = validateWorkingHours(slots);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      await setAvailabilityMut.mutateAsync({ memberId: member.id, availability: slots });
      toast.success("Munkaidő mentve!");
    } catch {
      toast.error("Hiba a munkaidő mentésekor");
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <CalendarDays className="h-4 w-4" />
        <AlertDescription>
          Állítsd be, hogy melyik napokon és mikor dolgozol. Szünetet (pl. ebédszünet) is megadhatsz
          naponként — arra az időre az ügyfelek nem fognak tudni foglalni.
        </AlertDescription>
      </Alert>

      <Card className="divide-y p-4">
        {DAYS_HU.map((day, i) => {
          const slot = slots[i];
          const hasBreak = slot.breakStart !== null;
          return (
            <div key={day} className="py-3 first:pt-0 last:pb-0 space-y-2">
              <div className="grid gap-3 md:grid-cols-[7rem_minmax(0,1fr)] md:items-center">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={slot.isEnabled}
                    onCheckedChange={(v) => updateSlot(i, "isEnabled", v)}
                  />
                  <span
                    className={`text-sm font-medium ${!slot.isEnabled ? "text-muted-foreground" : ""}`}
                  >
                    {day}
                  </span>
                </div>

                {slot.isEnabled ? (
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center lg:grid-cols-[7rem_auto_7rem_minmax(9rem,1fr)]">
                    <Input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateSlot(i, "startTime", e.target.value)}
                      className="h-8 text-sm"
                    />
                    <span className="hidden text-sm text-muted-foreground sm:block">–</span>
                    <Input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateSlot(i, "endTime", e.target.value)}
                      className="h-8 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => toggleBreak(i, !hasBreak)}
                      className="flex min-w-0 items-center gap-1 text-left text-xs text-muted-foreground transition-colors hover:text-foreground sm:col-span-3 lg:col-span-1 lg:justify-self-end"
                    >
                      {hasBreak ? (
                        <>
                          <ChevronUp className="h-3 w-3" /> Szünet eltávolítása
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" /> + Szünet hozzáadása
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Nem dolgozom</span>
                )}
              </div>

              {slot.isEnabled && hasBreak && (
                <div className="grid gap-2 rounded-lg bg-muted/40 p-3 sm:grid-cols-[4rem_minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center md:ml-28">
                  <span className="text-xs text-muted-foreground">Szünet:</span>
                  <Input
                    type="time"
                    value={slot.breakStart ?? "12:00"}
                    onChange={(e) => updateSlot(i, "breakStart", e.target.value)}
                    className="h-8 text-xs"
                  />
                  <span className="hidden text-xs text-muted-foreground sm:block">–</span>
                  <Input
                    type="time"
                    value={slot.breakEnd ?? "13:00"}
                    onChange={(e) => updateSlot(i, "breakEnd", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSave} disabled={setAvailabilityMut.isPending}>
          {setAvailabilityMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Munkaidő mentése
        </Button>
      </div>
    </div>
  );
}

function WorkingHoursTab() {
  const { user } = useAuth();
  const { data: providerData, isLoading } = useMyProvider();
  const provider = providerData?.data;
  const currentMember = useMemo(
    () => provider?.members?.find((member) => member.userId === user?.id) ?? null,
    [provider?.members, user?.id],
  );
  const isOwner = currentMember?.role === "OWNER";
  const editableMembers = useMemo(() => {
    const activeMembers = (provider?.members ?? []).filter((member) => member.status === "ACTIVE");
    return isOwner ? activeMembers : currentMember ? [currentMember] : [];
  }, [currentMember, isOwner, provider?.members]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const selectedMember =
    editableMembers.find((member) => member.id === selectedMemberId) ?? editableMembers[0] ?? null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentMember || !selectedMember) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nem található aktív munkatárs rekord ehhez a fiókhoz, ezért a munkaidő nem módosítható.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription>
          A munkaidő minden munkatársra külön vonatkozik. Ha egy munkatársra már van foglalás egy
          idősávban, ugyanarra a munkatársra nem fogadható új foglalás, de más elérhető munkatársra
          igen.
        </AlertDescription>
      </Alert>

      {isOwner && editableMembers.length > 1 && (
        <Card className="p-4">
          <div className="mb-3">
            <h3 className="text-sm font-medium">Munkatárs</h3>
            <p className="text-xs text-muted-foreground">
              Válaszd ki, kinek a munkaidejét szeretnéd szerkeszteni.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {editableMembers.map((member) => {
              const selected = member.id === selectedMember.id;
              return (
                <Button
                  key={member.id}
                  type="button"
                  variant={selected ? "default" : "outline"}
                  onClick={() => setSelectedMemberId(member.id)}
                  className="justify-start"
                >
                  {memberName(member)}
                  {member.role === "OWNER" && (
                    <span className="ml-1 text-xs opacity-75">(tulajdonos)</span>
                  )}
                </Button>
              );
            })}
          </div>
        </Card>
      )}

      <WorkingHoursEditor
        key={`${selectedMember.id}:${availabilitySignature(selectedMember.availability)}`}
        member={selectedMember}
      />
    </div>
  );
}

export function GigManager() {
  const { data, isLoading } = useServiceMatrix();
  const upsertMatrix = useUpsertServiceMatrix();
  const definitions = useMemo(() => data?.data?.definitions || [], [data?.data?.definitions]);
  const entries = useMemo(() => data?.data?.entries || [], [data?.data?.entries]);
  const [values, setValues] = useState<Record<string, MatrixValue>>({});
  const entryByKey = useMemo(
    () => new Map(entries.map((entry) => [entry.templateKey, entry])),
    [entries],
  );

  const carDefinitions = useMemo(
    () =>
      definitions
        .filter((d) => d.categorySlug === "car-detailing")
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [definitions],
  );

  const houseDefinitions = useMemo(
    () =>
      definitions
        .filter((d) => d.categorySlug === "house-cleaning")
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [definitions],
  );

  const getDefaultValue = (definition: ServiceMatrixDefinition): MatrixValue => {
    const entry = entryByKey.get(definition.templateKey);
    return {
      price:
        entry?.priceAmount && Number(entry.priceAmount) > 0
          ? String(Number(entry.priceAmount))
          : "",
      duration: entry?.durationMin
        ? String(entry.durationMin)
        : String(definition.defaultDurationMin),
      description: entry?.description || "",
      isActive: entry ? entry.isActive : false,
    };
  };

  const getValue = (definition: ServiceMatrixDefinition): MatrixValue =>
    values[definition.templateKey] || getDefaultValue(definition);

  const updateValue = (
    definition: ServiceMatrixDefinition,
    field: keyof MatrixValue,
    value: string | boolean,
  ) => {
    setValues((current) => ({
      ...current,
      [definition.templateKey]: {
        ...getDefaultValue(definition),
        ...current[definition.templateKey],
        [field]: value,
      },
    }));
  };

  const saveDomain = async (domainDefinitions: ServiceMatrixDefinition[], label: string) => {
    const payload = domainDefinitions.map((definition) => {
      const value = getValue(definition);
      const active = value.isActive;
      return {
        templateKey: definition.templateKey,
        priceAmount: active ? Number(value.price) : 0,
        durationMin:
          active && Number(value.duration) > 0
            ? Number(value.duration)
            : definition.defaultDurationMin,
        isActive: active,
        description: value.description.trim() || undefined,
      };
    });

    const invalidActive = payload.find(
      (entry) => entry.isActive && (!Number.isFinite(entry.priceAmount) || entry.priceAmount <= 0),
    );

    if (invalidActive) {
      toast.error(`Engedélyezett ${label} szolgáltatásokhoz adj meg árat.`);
      return;
    }

    try {
      await upsertMatrix.mutateAsync({ entries: payload });
      toast.success(`${label} szolgáltatások mentve.`);
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        `Nem sikerült menteni: ${label}.`;
      toast.error(message);
    }
  };

  const renderVariantCard = (
    variant: ServiceMatrixDefinition,
    variantDefinitions: ServiceMatrixDefinition[],
    columns = "lg:grid-cols-3",
  ) => (
    <Card key={variant.variantKey} className="p-4 sm:p-6">
      <div className="space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-lg font-medium">{variant.variantLabel}</h3>
          <p className="text-sm text-muted-foreground">{variant.variantDescription}</p>
        </div>
        <div className={`grid min-w-0 ${columns} gap-4`}>
          {variantDefinitions.map((definition) => (
            <ServicePair
              key={definition.templateKey}
              definition={definition}
              value={getValue(definition)}
              onChangePrice={(v) => updateValue(definition, "price", v)}
              onChangeDuration={(v) => updateValue(definition, "duration", v)}
              onChangeDescription={(v) => updateValue(definition, "description", v)}
              onToggleActive={(v) => updateValue(definition, "isActive", v)}
            />
          ))}
        </div>
      </div>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const carVariants = uniqueBy(carDefinitions, (d) => d.variantKey);
  const houseFixed = houseDefinitions.filter((d) => d.variantKey !== "largerHouses");
  const houseVariants = uniqueBy(houseFixed, (d) => d.variantKey);
  const largerHouseDefinitions = houseDefinitions.filter((d) => d.variantKey === "largerHouses");
  const sqmExamples = [100, 150, 200];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="car-detailing" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:max-w-2xl sm:grid-cols-3">
          <TabsTrigger
            value="car-detailing"
            className="flex min-h-10 items-center justify-center gap-2 px-2 text-sm"
          >
            <Car className="h-4 w-4" />
            Car Detailing
          </TabsTrigger>
          <TabsTrigger
            value="house-cleaning"
            className="flex min-h-10 items-center justify-center gap-2 px-2 text-sm"
          >
            <Home className="h-4 w-4" />
            House Cleaning
          </TabsTrigger>
          <TabsTrigger
            value="working-hours"
            className="flex min-h-10 items-center justify-center gap-2 px-2 text-sm"
          >
            <Clock className="h-4 w-4" />
            Munkaidő
          </TabsTrigger>
        </TabsList>

        <TabsContent value="car-detailing" className="space-y-6 mt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Kapcsold be a kínálni kívánt szolgáltatásokat és állítsd be az árat és időtartamot. A
              kikapcsolt szolgáltatások nem jelennek meg az ügyfeleknek.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6">
            {carVariants.map((variant) =>
              renderVariantCard(
                variant,
                carDefinitions.filter((d) => d.variantKey === variant.variantKey),
                "lg:grid-cols-3",
              ),
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => saveDomain(carDefinitions, "Car Detailing")}
              size="lg"
              disabled={upsertMatrix.isPending}
            >
              {upsertMatrix.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Car Detailing szolgáltatások mentése
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="house-cleaning" className="space-y-6 mt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Kapcsold be a kínálni kívánt szolgáltatásokat és állítsd be az árat és időtartamot. A
              kikapcsolt szolgáltatások nem jelennek meg az ügyfeleknek.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6">
            {houseVariants.map((variant) =>
              renderVariantCard(
                variant,
                houseFixed.filter((d) => d.variantKey === variant.variantKey),
                "md:grid-cols-2",
              ),
            )}

            {largerHouseDefinitions.length > 0 && (
              <Card className="p-6 bg-tertiary/30 border-2 border-dashed border-primary/20">
                <div className="space-y-5">
                  <div className="border-b border-primary/20 pb-3">
                    <h3 className="text-lg font-medium">Nagyobb házak</h3>
                    <p className="text-sm text-muted-foreground">90+ m2 — négyzetméter alapú ár</p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {largerHouseDefinitions.map((definition) => {
                      const value = getValue(definition);
                      const rate = Number(value.price);

                      return (
                        <div key={definition.templateKey} className="space-y-3">
                          <ServicePair
                            definition={definition}
                            value={value}
                            onChangePrice={(next) => updateValue(definition, "price", next)}
                            onChangeDuration={(next) => updateValue(definition, "duration", next)}
                            onChangeDescription={(next) =>
                              updateValue(definition, "description", next)
                            }
                            onToggleActive={(next) => updateValue(definition, "isActive", next)}
                          />
                          {value.isActive && rate > 0 && (
                            <div className="p-3 bg-background rounded-lg border text-sm">
                              <p className="font-medium text-xs uppercase text-muted-foreground mb-1.5">
                                Ár példák
                              </p>
                              <div className="space-y-0.5 text-muted-foreground">
                                {sqmExamples.map((meters) => (
                                  <p key={meters}>
                                    {meters} m2 ={" "}
                                    <span className="font-semibold" style={{ color: "#FF5100" }}>
                                      {(rate * meters).toFixed(2)} RON
                                    </span>
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => saveDomain(houseDefinitions, "House Cleaning")}
              size="lg"
              disabled={upsertMatrix.isPending}
            >
              {upsertMatrix.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              House Cleaning szolgáltatások mentése
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="working-hours" className="mt-6">
          <WorkingHoursTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
