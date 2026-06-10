import { useMemo, useState } from "react";
import { AlertCircle, Car, Clock, Home, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useServiceMatrix, useUpsertServiceMatrix } from "../../hooks/useApi";
import type { ServiceMatrixDefinition } from "../../lib/types";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

interface MatrixValue {
  price: string;
  duration: string;
}

const filledInputStyle = {
  borderColor: "#FF8200",
  boxShadow: "0 0 0 3px rgba(255,130,0,0.12)",
  color: "#0A0903",
  fontWeight: 600,
} as const;

const noSpinners =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

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
    <div className="relative">
      <span
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold pointer-events-none"
        style={{ color: filled ? "#FF5100" : "#a1a1aa" }}
      >
        RON
      </span>
      <Input
        id={id}
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`pl-11 ${suffix ? "pr-14" : "pr-3"} ${noSpinners} transition-all`}
        style={filled ? filledInputStyle : {}}
      />
      {suffix && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
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
    <div className="relative">
      <Clock
        className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none z-10 transition-colors"
        style={{ color: filled ? "#FF5100" : "#a1a1aa" }}
      />
      <Input
        id={id}
        type="number"
        min="1"
        step="1"
        placeholder="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`pl-7 pr-10 ${noSpinners} transition-all`}
        style={filled ? filledInputStyle : {}}
      />
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
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
}: {
  definition: ServiceMatrixDefinition;
  value: MatrixValue;
  onChangePrice: (value: string) => void;
  onChangeDuration: (value: string) => void;
}) {
  const hasAny =
    (!!value.price && Number(value.price) > 0) || (!!value.duration && Number(value.duration) > 0);
  const priceSuffix = definition.pricingUnit === "PER_SQM" ? "/ m2" : undefined;

  return (
    <div
      className="rounded-lg border-2 p-3 space-y-3 transition-all"
      style={
        hasAny
          ? {
              borderColor: "#FF8200",
              background: "rgba(255,130,0,0.05)",
            }
          : { borderColor: "hsl(var(--border))" }
      }
    >
      <p
        className="text-xs font-semibold uppercase transition-colors"
        style={{ color: hasAny ? "#FF5100" : undefined }}
      >
        {definition.serviceLabel}
      </p>

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
            Idő
          </Label>
          <TimeInput
            id={`${definition.templateKey}-time`}
            value={value.duration}
            onChange={onChangeDuration}
          />
        </div>
      </div>
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
        .filter((definition) => definition.categorySlug === "car-detailing")
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [definitions],
  );

  const houseDefinitions = useMemo(
    () =>
      definitions
        .filter((definition) => definition.categorySlug === "house-cleaning")
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [definitions],
  );

  const getDefaultValue = (definition: ServiceMatrixDefinition): MatrixValue => {
    const entry = entryByKey.get(definition.templateKey);
    return {
      price: entry?.priceAmount ? String(Number(entry.priceAmount)) : "",
      duration: entry?.durationMin
        ? String(entry.durationMin)
        : String(definition.defaultDurationMin),
    };
  };

  const getValue = (definition: ServiceMatrixDefinition): MatrixValue =>
    values[definition.templateKey] || getDefaultValue(definition);

  const updateValue = (
    definition: ServiceMatrixDefinition,
    field: keyof MatrixValue,
    value: string,
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
      return {
        templateKey: definition.templateKey,
        priceAmount: Number(value.price),
        durationMin: Number(value.duration),
        isActive: true,
      };
    });

    const invalid = payload.find(
      (entry) =>
        !Number.isFinite(entry.priceAmount) ||
        entry.priceAmount <= 0 ||
        !Number.isInteger(entry.durationMin) ||
        entry.durationMin <= 0 ||
        entry.durationMin > 480,
    );

    if (invalid) {
      toast.error(`Tölts ki minden ${label} árat és időt.`);
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
    columns = "sm:grid-cols-3",
  ) => (
    <Card key={variant.variantKey} className="p-6">
      <div className="space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-lg font-medium">{variant.variantLabel}</h3>
          <p className="text-sm text-muted-foreground">{variant.variantDescription}</p>
        </div>
        <div className={`grid ${columns} gap-4`}>
          {variantDefinitions.map((definition) => (
            <ServicePair
              key={definition.templateKey}
              definition={definition}
              value={getValue(definition)}
              onChangePrice={(value) => updateValue(definition, "price", value)}
              onChangeDuration={(value) => updateValue(definition, "duration", value)}
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

  const carVariants = uniqueBy(carDefinitions, (definition) => definition.variantKey);
  const houseFixed = houseDefinitions.filter(
    (definition) => definition.variantKey !== "largerHouses",
  );
  const houseVariants = uniqueBy(houseFixed, (definition) => definition.variantKey);
  const largerHouseDefinitions = houseDefinitions.filter(
    (definition) => definition.variantKey === "largerHouses",
  );
  const sqmExamples = [100, 150, 200];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="car-detailing" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="car-detailing" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Car Detailing
          </TabsTrigger>
          <TabsTrigger value="house-cleaning" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            House Cleaning
          </TabsTrigger>
        </TabsList>

        <TabsContent value="car-detailing" className="space-y-6 mt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Állítsd be az autókozmetika szolgáltatásokat autóméret és csomag szerint.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6">
            {carVariants.map((variant) =>
              renderVariantCard(
                variant,
                carDefinitions.filter((definition) => definition.variantKey === variant.variantKey),
                "sm:grid-cols-3",
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
              Állítsd be a takarítási szolgáltatásokat lakásméret és csomag szerint.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6">
            {houseVariants.map((variant) =>
              renderVariantCard(
                variant,
                houseFixed.filter((definition) => definition.variantKey === variant.variantKey),
                "sm:grid-cols-2",
              ),
            )}

            {largerHouseDefinitions.length > 0 && (
              <Card className="p-6 bg-tertiary/30 border-2 border-dashed border-primary/20">
                <div className="space-y-5">
                  <div className="border-b border-primary/20 pb-3">
                    <h3 className="text-lg font-medium">Nagyobb házak</h3>
                    <p className="text-sm text-muted-foreground">90+ m2 - négyzetméter alapú ár</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
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
                          />
                          {rate > 0 && (
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
      </Tabs>
    </div>
  );
}
