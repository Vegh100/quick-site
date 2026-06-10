import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowLeft, Briefcase, CheckCircle2, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useAuth } from "../../contexts/AuthContext";
import { providerApi } from "../../lib/api-services";

interface ProviderOnboardingFlowProps {
  onComplete?: () => void;
  onBack?: () => void;
}

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

export function ProviderOnboardingFlow({ onComplete, onBack }: ProviderOnboardingFlowProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  const handleSubmit = async () => {
    if (!businessName.trim()) {
      toast.error("Kérlek add meg a cég nevét!");
      return;
    }
    if (!taxNumber.trim()) {
      toast.error("Kérlek add meg a CUI számot!");
      return;
    }
    if (!phone.trim()) {
      toast.error("Kérlek add meg a telefonszámot!");
      return;
    }

    setIsSubmitting(true);
    try {
      const createdProvider = await providerApi.create({
        businessName: businessName.trim(),
        description: description.trim() || undefined,
        phone: phone.trim(),
        taxNumber: taxNumber.trim(),
        regNumber: regNumber.trim() || undefined,
        county: county || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        categoryIds: [],
      });

      queryClient.setQueryData(["providers", "me"], createdProvider);
      await refreshUser();
      await queryClient.invalidateQueries({ queryKey: ["providers", "me"] });
      await queryClient.invalidateQueries({
        queryKey: ["providers", "me", "members"],
      });

      toast.success("Vállalkozás létrehozva!");
      if (onComplete) {
        onComplete();
      } else {
        navigate("/szolgaltato", { replace: true });
      }
    } catch (err: unknown) {
      const apiError = err as {
        response?: { data?: { error?: string; details?: string[] } };
      };
      const message =
        apiError.response?.data?.error ||
        apiError.response?.data?.details?.[0] ||
        "Hiba a vállalkozás létrehozásakor";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.28))] py-8 sm:py-12">
      <div className="container mx-auto max-w-5xl px-4">
        <Button variant="ghost" onClick={handleBack} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Vissza
        </Button>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border bg-card p-6 shadow-sm"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div className="mt-6 space-y-3">
              <p className="text-sm font-medium text-primary">Szolgáltatói profil</p>
              <h1 className="text-3xl font-semibold tracking-normal">Vállalkozás létrehozása</h1>
              <p className="text-muted-foreground">
                Csak a hivatalos céges adatokat kérjük, hogy a profilod létrejöjjön.
              </p>
            </div>
            <div className="mt-8 space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Cégadatok mentése</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm">Dashboard megnyitása</span>
              </div>
            </div>
          </motion.section>

          <Card className="p-5 shadow-sm sm:p-8">
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Cégadatok</h2>
                  <p className="text-sm text-muted-foreground">
                    A csillaggal jelölt mezők kötelezők.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="businessName">Cégnév *</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="pl. Qvick Services SRL"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="taxNumber">CUI (Cod Unic de Înregistrare) *</Label>
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

                <div>
                  <Label htmlFor="phone">Telefon *</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+40 7XX XXX XXX"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Székhely</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="county">Județ (megye)</Label>
                    <select
                      id="county"
                      value={county}
                      onChange={(e) => setCounty(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Válassz megyét...</option>
                      {JUDETE_RO.map((countyName) => (
                        <option key={countyName} value={countyName}>
                          {countyName}
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

                <div>
                  <Label htmlFor="description">Rövid leírás</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mi jellemzi a cégedet? Miben vagy a legjobb?"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="sm:flex-1"
                  disabled={isSubmitting}
                >
                  Vissza
                </Button>
                <Button onClick={handleSubmit} className="sm:flex-1" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Vállalkozás létrehozása
                </Button>
              </div>
            </motion.div>
          </Card>
        </div>
      </div>
    </div>
  );
}
