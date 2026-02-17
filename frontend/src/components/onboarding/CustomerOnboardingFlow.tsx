import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ProgressIndicator } from "./ProgressIndicator";
import { MapPin, User, Bell, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { useUpdateProfile, useAddAddress } from "../../hooks/useApi";

interface CustomerOnboardingFlowProps {
  onComplete?: () => void;
  onBack?: () => void;
}

const steps = [
  { id: "profile", label: "Profil" },
  { id: "location", label: "Helyszín" },
  { id: "complete", label: "Kész" },
];

export function CustomerOnboardingFlow({
  onComplete,
  onBack,
}: CustomerOnboardingFlowProps) {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const updateProfile = useUpdateProfile();
  const addAddress = useAddAddress();
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
    address: "",
    city: "",
    zipCode: "",
  });

  const handleNext = async () => {
    if (currentStep === 0) {
      // Save profile
      try {
        await updateProfile.mutateAsync({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
        });
        await refreshUser();
        toast.success("Profil mentve!");
      } catch {
        toast.error("Hiba a profil mentésekor");
        return;
      }
    }
    if (currentStep === 1 && formData.address && formData.city) {
      // Save address
      try {
        await addAddress.mutateAsync({
          label: "Otthon",
          street: formData.address,
          city: formData.city,
          zipCode: formData.zipCode,
          isDefault: true,
        });
        toast.success("Cím mentve!");
      } catch {
        toast.error("Hiba a cím mentésekor");
        return;
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      toast.success("Üdvözlünk a Qvick-ben!");
      onComplete ? onComplete() : navigate("/ugyfel", { replace: true });
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack ? onBack() : navigate("/");
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
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
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2>Profil létrehozása</h2>
                <p className="text-muted-foreground">Mesélj magadról</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Keresztnév</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      updateFormData("firstName", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Vezetéknév</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateFormData("lastName", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Telefonszám</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+36 30 123 4567"
                  value={formData.phone}
                  onChange={(e) => updateFormData("phone", e.target.value)}
                />
              </div>
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
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2>Helyszíned</h2>
                <p className="text-muted-foreground">
                  Hol szeretnél szolgáltatásokat igénybe venni?
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="address">Cím</Label>
                <Input
                  id="address"
                  placeholder="Példa utca 123"
                  value={formData.address}
                  onChange={(e) => updateFormData("address", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Város</Label>
                  <Input
                    id="city"
                    placeholder="Budapest"
                    value={formData.city}
                    onChange={(e) => updateFormData("city", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">Irányítószám</Label>
                  <Input
                    id="zipCode"
                    placeholder="1011"
                    value={formData.zipCode}
                    onChange={(e) => updateFormData("zipCode", e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 bg-tertiary/30 rounded-lg">
                <p className="text-sm">
                  💡 A területeden elérhető szolgáltatókat fogjuk neked mutatni
                </p>
              </div>
            </div>
          </motion.div>
        );

      case 2:
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
                A fiókod készen áll. Kezdj el felfedezni és foglalni
                szolgáltatásokat megbízható helyi szolgáltatóktól.
              </p>
            </div>

            <div className="p-6 bg-tertiary/30 rounded-lg max-w-md mx-auto space-y-2">
              <p>✓ Profil létrehozva</p>
              <p>✓ Helyszín mentve</p>
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
        <ProgressIndicator steps={steps} currentStep={currentStep} />

        <Card className="p-8 mt-8">
          {renderStep()}

          <div className="flex gap-3 mt-8 pt-6 border-t">
            <Button variant="outline" onClick={handlePrev} className="flex-1">
              {currentStep === 0 ? "Vissza" : "Előző"}
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1"
              disabled={updateProfile.isPending || addAddress.isPending}
            >
              {currentStep === steps.length - 1 ? "Kezdjük!" : "Tovább"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
