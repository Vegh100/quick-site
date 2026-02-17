import { useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { ProgressIndicator } from "../onboarding/ProgressIndicator";
import { Briefcase, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  useCreateProvider,
  useAddService,
  useSetAvailability,
} from "../../hooks/useApi";
import { useCategories } from "../../hooks/useApi";

interface ProviderOnboardingFlowProps {
  onComplete?: () => void;
  onBack?: () => void;
}

const onboardingSteps = [
  { id: "profile", label: "Profil" },
  { id: "services", label: "Szolgáltatás" },
  { id: "availability", label: "Időpontok" },
  { id: "complete", label: "Kész" },
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
  const [currentStep, setCurrentStep] = useState(0);
  const createProvider = useCreateProvider();
  const addService = useAddService();
  const useSetAvailabilityFn = useSetAvailability();
  const { data: categoriesData } = useCategories();

  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDuration, setServiceDuration] = useState("60");

  const [availability, setAvailability] = useState(DEFAULT_AVAILABILITY);

  const categories = categoriesData?.data || [];

  const handleNext = async () => {
    if (currentStep === 0) {
      if (!businessName) {
        toast.error("Kérlek add meg az üzlet nevét!");
        return;
      }
      try {
        await createProvider.mutateAsync({
          businessName,
          description,
          phone,
          categoryIds: selectedCategory ? [selectedCategory] : [],
        });
        toast.success("Szolgáltatói profil létrehozva!");
      } catch {
        toast.error("Hiba a profil létrehozásakor");
        return;
      }
    }

    if (currentStep === 1 && serviceName && servicePrice) {
      try {
        await addService.mutateAsync({
          name: serviceName,
          description: serviceDescription,
          priceAmount: parseFloat(servicePrice),
          priceType: "PER_HOUR" as const,
          durationMin: parseInt(serviceDuration),
        });
        toast.success("Szolgáltatás hozzáadva!");
      } catch {
        toast.error("Hiba a szolgáltatás hozzáadásakor");
        return;
      }
    }

    if (currentStep === 2) {
      const enabledSlots = availability.filter((a) => a.isEnabled);
      if (enabledSlots.length > 0) {
        try {
          const setAvail = useSetAvailabilityFn;
          await setAvail.mutateAsync(enabledSlots);
          toast.success("Időpontok mentve!");
        } catch {
          toast.error("Hiba az időpontok mentésekor");
          return;
        }
      }
    }

    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      toast.success("Minden kész! Üdvözlünk a Qvick-ben!");
      onComplete?.();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack?.();
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
                <h2>Üzleti profil</h2>
                <p className="text-muted-foreground">
                  Add meg az üzleted adatait
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="businessName">Üzlet neve *</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+36 30 123 4567"
                />
              </div>
              <div>
                <Label htmlFor="description">Leírás</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Rövid leírás a szolgáltatásodról..."
                />
              </div>
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
                <Label htmlFor="serviceName">Szolgáltatás neve</Label>
                <Input
                  id="serviceName"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="pl. Mélytisztítás"
                />
              </div>
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
                  <Label htmlFor="duration">Időtartam (perc)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={serviceDuration}
                    onChange={(e) => setServiceDuration(e.target.value)}
                  />
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
              <p>✓ Üzleti profil létrehozva</p>
              <p>✓ Szolgáltatás hozzáadva</p>
              <p>✓ Időpontok beállítva</p>
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
            <Button
              onClick={handleNext}
              className="flex-1"
              disabled={
                createProvider.isPending ||
                addService.isPending ||
                useSetAvailabilityFn.isPending
              }
            >
              {(createProvider.isPending ||
                addService.isPending ||
                useSetAvailabilityFn.isPending) && (
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
