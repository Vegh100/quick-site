import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { ProgressIndicator } from "../onboarding/ProgressIndicator";
import { Briefcase, Clock, CheckCircle2, Loader2, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useCategories, useServiceTypes } from "../../hooks/useApi";
import { providerApi } from "../../lib/api-services";

interface ProviderOnboardingFlowProps {
  onComplete?: () => void;
  onBack?: () => void;
}

const onboardingSteps = [
  { id: "profile", label: "Cégadatok" },
  { id: "services", label: "Szolgáltatás" },
  { id: "availability", label: "Időpontok" },
  { id: "complete", label: "Kész" },
];

const JUDETE_RO = [
  "Alba",
  "Arad",
  "Argeș",
  "Bacău",
  "Bihor",
  "Bistrița-Năsăud",
  "Botoșani",
  "Brăila",
  "Brașov",
  "București",
  "Buzău",
  "Călărași",
  "Caraș-Severin",
  "Cluj",
  "Constanța",
  "Covasna",
  "Dâmbovița",
  "Dolj",
  "Galați",
  "Giurgiu",
  "Gorj",
  "Harghita",
  "Hunedoara",
  "Ialomița",
  "Iași",
  "Ilfov",
  "Maramureș",
  "Mehedinți",
  "Mureș",
  "Neamț",
  "Olt",
  "Prahova",
  "Sălaj",
  "Satu Mare",
  "Sibiu",
  "Suceava",
  "Teleorman",
  "Timiș",
  "Tulcea",
  "Vâlcea",
  "Vaslui",
  "Vrancea",
];

const DAYS_HU = [
  "Hétfő",
  "Kedd",
  "Szerda",
  "Csütörtök",
  "Péntek",
  "Szombat",
  "Vasárnap",
];
const DEFAULT_AVAILABILITY = DAYS_HU.map((_, i) => ({
  dayOfWeek: i + 1 === 7 ? 0 : i + 1, // 1=Mon..6=Sat,0=Sun
  startTime: "08:00",
  endTime: "17:00",
  isEnabled: i < 5, // Mon-Fri enabled by default
}));

export function ProviderOnboardingFlow({
  onComplete,
  onBack,
}: ProviderOnboardingFlowProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: categoriesData } = useCategories();
  const { data: serviceTypesData } = useServiceTypes();

  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [ownerMemberId, setOwnerMemberId] = useState<string | null>(null);

  const [serviceTypeId, setServiceTypeId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDuration, setServiceDuration] = useState("60");

  const [availability, setAvailability] = useState(DEFAULT_AVAILABILITY);
  const [skippedService, setSkippedService] = useState(false);
  const [skippedAvailability, setSkippedAvailability] = useState(false);

  const categories = categoriesData?.data || [];
  const serviceTypes = serviceTypesData?.data || [];

  const handleNext = async () => {
    setIsSubmitting(true);
    try {
      if (currentStep === 0) {
        if (!businessName) {
          toast.error("Kérlek add meg a cég nevét!");
          setIsSubmitting(false);
          return;
        }
        if (!taxNumber) {
          toast.error("Kérlek add meg a CUI számot!");
          setIsSubmitting(false);
          return;
        }
        if (!phone) {
          toast.error("Kérlek add meg a telefonszámot!");
          setIsSubmitting(false);
          return;
        }
        const createResult = await providerApi.create({
          businessName,
          description,
          phone,
          taxNumber,
          regNumber: regNumber || undefined,
          county: county || undefined,
          city: city || undefined,
          address: address || undefined,
          categoryIds: selectedCategory ? [selectedCategory] : [],
        });
        const ownerMember = createResult.data?.members?.find(
          (m) => m.role === "OWNER",
        );
        if (ownerMember) setOwnerMemberId(ownerMember.id);
        toast.success("Szolgáltatói profil létrehozva!");
      }

      if (currentStep === 1 && serviceName && servicePrice) {
        const dur = parseInt(serviceDuration);
        await providerApi.addService({
          serviceTypeId: serviceTypeId || undefined,
          name: serviceName,
          description: serviceDescription,
          priceAmount: parseFloat(servicePrice),
          priceType: "PER_HOUR" as const,
          durationMin: dur,
          slotIntervalMin: dur,
        });
        toast.success("Szolgáltatás hozzáadva!");
      }

      if (currentStep === 2) {
        const enabledSlots = availability.filter((a) => a.isEnabled);
        if (enabledSlots.length > 0 && ownerMemberId) {
          await providerApi.setAvailability(ownerMemberId, enabledSlots);
          toast.success("Időpontok mentve!");
        }
      }

      if (currentStep < onboardingSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        toast.success("Minden kész! Üdvözlünk a Qvick-ben!");
        queryClient.invalidateQueries({ queryKey: ["providers"] });
        onComplete ? onComplete() : navigate("/szolgaltato", { replace: true });
      }
    } catch {
      const msgs = [
        "Hiba a profil létrehozásakor",
        "Hiba a szolgáltatás hozzáadásakor",
        "Hiba az időpontok mentésekor",
        "Hiba történt",
      ];
      toast.error(msgs[currentStep] || msgs[3]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack ? onBack() : navigate("/");
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2>Cégadatok</h2>
                <p className="text-muted-foreground">
                  Add meg a céged hivatalos adatait
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* --- Cég azonosítók --- */}
              <div>
                <Label htmlFor="businessName">Cégnév *</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="pl. Qvick Services SRL"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="taxNumber">
                    CUI (Cod Unic de Înregistrare) *
                  </Label>
                  <Input
                    id="taxNumber"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="pl. RO12345678"
                  />
                </div>
                <div>
                  <Label htmlFor="regNumber">Nr. Reg. Comerț</Label>
                  <Input
                    id="regNumber"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    placeholder="pl. J12/345/2020"
                  />
                </div>
              </div>

              {/* --- Kontakt --- */}
              <div>
                <Label htmlFor="phone">Telefon *</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+40 7XX XXX XXX"
                />
              </div>

              {/* --- Székhely --- */}
              <div className="flex items-center gap-2 pt-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Székhely
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="county">Județ (megye)</Label>
                  <select
                    id="county"
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Válassz megyét...</option>
                    {JUDETE_RO.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="city">Város</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="pl. Cluj-Napoca"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Cím (utca, szám)</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="pl. Str. Memorandumului 12"
                />
              </div>

              {/* --- Leírás --- */}
              <div>
                <Label htmlFor="description">Rövid leírás</Label>
                <Textarea
                  id="description"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mi jellemzi a cégedet? Miben vagy a legjobb?"
                />
              </div>

              {/* --- Kategória --- */}
              {categories.length > 0 && (
                <div>
                  <Label>Kategória</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {categories.map((cat: any) => (
                      <Button
                        key={cat.id}
                        variant={
                          selectedCategory === cat.id ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setSelectedCategory(cat.id)}
                      >
                        {cat.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2>Első szolgáltatásod</h2>
                <p className="text-muted-foreground">
                  Add hozzá az első szolgáltatásodat
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Szolgáltatás típus</Label>
                <select
                  value={serviceTypeId}
                  onChange={(e) => {
                    const typeId = e.target.value;
                    setServiceTypeId(typeId);
                    if (typeId) {
                      const st = serviceTypes.find((t) => t.id === typeId);
                      if (st) {
                        setServiceName(st.name);
                        setServiceDescription(st.description || "");
                      }
                    } else {
                      setServiceName("");
                      setServiceDescription("");
                    }
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">-- Válassz típust --</option>
                  {(() => {
                    const grouped = serviceTypes.reduce(
                      (acc, st) => {
                        const catName = st.category?.name || "Egyéb";
                        if (!acc[catName]) acc[catName] = [];
                        acc[catName].push(st);
                        return acc;
                      },
                      {} as Record<string, typeof serviceTypes>,
                    );
                    return Object.entries(grouped).map(([catName, types]) => (
                      <optgroup key={catName} label={catName}>
                        {types.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name}
                          </option>
                        ))}
                      </optgroup>
                    ));
                  })()}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Válaszd ki a szolgáltatás típusát, vagy hagyd üresen és add
                  meg kézzel
                </p>
              </div>
              {!serviceTypeId && (
                <div>
                  <Label htmlFor="serviceName">Szolgáltatás neve</Label>
                  <Input
                    id="serviceName"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="pl. Mélytisztítás"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="serviceDesc">Leírás</Label>
                <Textarea
                  id="serviceDesc"
                  rows={2}
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Ár (RON)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Kb. időtartam (perc)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={serviceDuration}
                    onChange={(e) => setServiceDuration(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Hozzávetőleg mennyi időt vesz igénybe
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2>Elérhetőségi idő</h2>
                <p className="text-muted-foreground">
                  Mikor tudod fogadni az ügyfeleket?
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {DAYS_HU.map((dayName, index) => {
                const slot = availability[index];
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
                          const updated = [...availability];
                          updated[index] = {
                            ...updated[index],
                            isEnabled: e.target.checked,
                          };
                          setAvailability(updated);
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
                            const updated = [...availability];
                            updated[index] = {
                              ...updated[index],
                              startTime: e.target.value,
                            };
                            setAvailability(updated);
                          }}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => {
                            const updated = [...availability];
                            updated[index] = {
                              ...updated[index],
                              endTime: e.target.value,
                            };
                            setAvailability(updated);
                          }}
                          className="w-32"
                        />
                      </div>
                    )}
                    {!slot.isEnabled && (
                      <span className="text-sm text-muted-foreground">
                        Zárva
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                <CheckCircle2 className="h-10 w-10 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="mb-3">Minden kész!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                A szolgáltatói fiókod készen áll. Kezdheted fogadni a
                foglalásokat!
              </p>
            </div>
            <div className="p-6 bg-tertiary/30 rounded-lg max-w-md mx-auto space-y-2">
              <p>✓ Cégprofil létrehozva</p>
              <p>
                {skippedService
                  ? "⏭ Szolgáltatás — később állíthatod be"
                  : "✓ Szolgáltatás hozzáadva"}
              </p>
              <p>
                {skippedAvailability
                  ? "⏭ Időpontok — később állíthatod be"
                  : "✓ Időpontok beállítva"}
              </p>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <ProgressIndicator steps={onboardingSteps} currentStep={currentStep} />
        <Card className="p-8 mt-8">
          {renderStep()}
          <div className="flex gap-3 mt-8 pt-6 border-t">
            <Button variant="outline" onClick={handleBack} className="flex-1">
              {currentStep === 0 ? "Vissza" : "Előző"}
            </Button>
            {(currentStep === 1 || currentStep === 2) && (
              <Button
                variant="ghost"
                onClick={() => {
                  if (currentStep === 1) setSkippedService(true);
                  if (currentStep === 2) setSkippedAvailability(true);
                  setCurrentStep(currentStep + 1);
                }}
                className="text-muted-foreground"
                disabled={isSubmitting}
              >
                Kihagyás
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {currentStep === onboardingSteps.length - 1
                ? "Kezdjük!"
                : "Tovább"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
