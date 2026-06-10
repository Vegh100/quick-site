import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import { Bell, Shield, Briefcase, DollarSign, Loader2, Pencil, Clock, Camera } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useAuth } from "../../contexts/AuthContext";
import {
  useMyProvider,
  useUpdateProvider,
  useNotificationPrefs,
  useUpdateNotificationPrefs,
  useUpdatePricingSettings,
  useSetAvailability,
  useUploadAvatar,
} from "../../hooks/useApi";
import { authApi } from "../../lib/api-services";
import { toast } from "sonner";

const DAYS_HU = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];
const DAY_MAP = [1, 2, 3, 4, 5, 6, 0]; // index → dayOfWeek (Mon=1..Sat=6,Sun=0)

export function ProviderSettingsPanel() {
  const { user, refreshUser } = useAuth();
  const { data: providerData } = useMyProvider();
  const updateProvider = useUpdateProvider();
  const { data: notifPrefsData } = useNotificationPrefs();
  const updateNotifPrefs = useUpdateNotificationPrefs();
  const updatePricing = useUpdatePricingSettings();
  const setAvailabilityMut = useSetAvailability();
  const uploadAvatarMut = useUploadAvatar();

  const provider = providerData?.data;

  // Find the current user's member record to access per-member availability
  const currentMember = provider?.members?.find((m) => m.userId === user?.id);

  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Availability
  const [availSlots, setAvailSlots] = useState(
    DAYS_HU.map((_, i) => ({
      dayOfWeek: DAY_MAP[i],
      startTime: "08:00",
      endTime: "17:00",
      isEnabled: i < 5,
    })),
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (provider) {
      setBusinessName(provider.businessName || "");
      setDescription(provider.description || "");
      setPhone(provider.phone || "");
      setServiceArea(provider.serviceArea || "");
      setTaxNumber(provider.taxNumber || "");
      setRegNumber(provider.regNumber || "");
      setCounty(provider.county || "");
      setCity(provider.city || "");
      setAddress(provider.address || "");

      // Load availability from the current member
      const memberAvail = currentMember?.availability;
      if (memberAvail && memberAvail.length > 0) {
        const loaded = DAYS_HU.map((_, i) => {
          const dow = DAY_MAP[i];
          const existing = memberAvail.find((a) => a.dayOfWeek === dow);
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
      }
    }
  }, [provider, currentMember]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSaveBusiness = async () => {
    try {
      await updateProvider.mutateAsync({
        businessName,
        description,
        phone,
        serviceArea,
        taxNumber,
        regNumber,
        county,
        city,
        address,
      });
      toast.success("Üzleti profil mentve!");
    } catch {
      toast.error("Hiba történt a mentés során");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAvatarMut.mutateAsync(file);
      await refreshUser();
      toast.success("Profilkép feltöltve!");
    } catch {
      toast.error("Hiba a feltöltés során");
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("A jelszavak nem egyeznek");
      return;
    }
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Jelszó megváltoztatva!");
    } catch {
      toast.error("Hibás jelenlegi jelszó");
    }
  };

  const handleSaveAvailability = async () => {
    if (!currentMember) {
      toast.error("Nem található tag rekord");
      return;
    }
    try {
      await setAvailabilityMut.mutateAsync({
        memberId: currentMember.id,
        availability: availSlots,
      });
      toast.success("Időpontok mentve!");
    } catch {
      toast.error("Hiba az időpontok mentésekor");
    }
  };

  const notifPrefs = notifPrefsData?.data;
  const isOwner = currentMember?.role === "OWNER";

  return (
    <div className="max-w-4xl mx-auto">
      <Tabs
        key={isOwner ? "owner" : "employee"}
        defaultValue={isOwner ? "business" : "availability"}
        className="space-y-6"
      >
        <TabsList className="flex w-full">
          {isOwner && (
            <TabsTrigger value="business">
              <Briefcase className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Üzlet</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="availability">
            <Clock className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Időpont</span>
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="pricing">
              <DollarSign className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Árazás</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Értesítés</span>
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Bizton.</span>
          </TabsTrigger>
        </TabsList>

        {/* Business Profile - Owner only */}
        {isOwner && (
          <TabsContent value="business">
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="mb-4">Üzleti profil</h3>

                {/* Avatar upload */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 h-7 w-7 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90">
                      <Pencil className="h-3 w-3" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                    </label>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Profilkép</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG max 5MB</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="businessName">Cégnév</Label>
                    <Input
                      id="businessName"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="taxNumber">CUI</Label>
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
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={user?.email || ""} disabled />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Telefon</Label>
                      <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="serviceArea">Szolgáltatási terület</Label>
                      <Input
                        id="serviceArea"
                        value={serviceArea}
                        onChange={(e) => setServiceArea(e.target.value)}
                        placeholder="pl. Cluj, Kolozs megye"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="county">Județ (megye)</Label>
                      <Input
                        id="county"
                        value={county}
                        onChange={(e) => setCounty(e.target.value)}
                        placeholder="pl. Cluj"
                      />
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
                    <Label htmlFor="description">Leírás</Label>
                    <Textarea
                      id="description"
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Ez jelenik meg az ügyfeleknek a profilodon
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveBusiness} disabled={updateProvider.isPending}>
                  {updateProvider.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Mentés
                </Button>
              </div>
            </Card>
          </TabsContent>
        )}

        {/* Availability */}
        <TabsContent value="availability">
          <Card className="p-6 space-y-6">
            <h3>Elérhetőségi időpontok</h3>
            <p className="text-sm text-muted-foreground">
              Állítsd be, mikor vagy elérhető foglalásokra
            </p>

            <div className="space-y-3">
              {DAYS_HU.map((dayName, index) => {
                const slot = availSlots[index];
                return (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
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
                        }}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium">{dayName}</span>
                    </label>
                    {slot.isEnabled ? (
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
                          }}
                          className="w-32"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Zárva</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveAvailability} disabled={setAvailabilityMut.isPending}>
                {setAvailabilityMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Időpontok mentése
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Pricing - Owner only */}
        {isOwner && (
          <TabsContent value="pricing">
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="mb-4">Árazási beállítások</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4>Dinamikus árazás</h4>
                      <p className="text-sm text-muted-foreground">
                        Árak igazítása a kereslet alapján
                      </p>
                    </div>
                    <Switch
                      checked={provider?.dynamicPricing ?? false}
                      onCheckedChange={(val) => updatePricing.mutate({ dynamicPricing: val })}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <h4>Hétvégi felár</h4>
                      <p className="text-sm text-muted-foreground">
                        20% felár hétvégi foglalásokra
                      </p>
                    </div>
                    <Switch
                      checked={provider?.weekendPremium ?? false}
                      onCheckedChange={(val) => updatePricing.mutate({ weekendPremium: val })}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <h4>Automatikus elfogadás</h4>
                      <p className="text-sm text-muted-foreground">
                        Foglalások automatikus elfogadása
                      </p>
                    </div>
                    <Switch
                      checked={provider?.autoAccept ?? false}
                      onCheckedChange={(val) => updatePricing.mutate({ autoAccept: val })}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        )}

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="mb-4">Értesítési beállítások</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4>Új foglalás értesítés</h4>
                    <p className="text-sm text-muted-foreground">
                      Azonnali értesítés új foglaláskor
                    </p>
                  </div>
                  <Switch
                    checked={notifPrefs?.emailBookings ?? true}
                    onCheckedChange={(val) => updateNotifPrefs.mutate({ emailBookings: val })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4>SMS foglalás értesítés</h4>
                    <p className="text-sm text-muted-foreground">SMS értesítés új foglaláskor</p>
                  </div>
                  <Switch
                    checked={notifPrefs?.smsBookings ?? true}
                    onCheckedChange={(val) => updateNotifPrefs.mutate({ smsBookings: val })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4>SMS emlékeztetők</h4>
                    <p className="text-sm text-muted-foreground">
                      Emlékeztető 1 órával a találkozó előtt
                    </p>
                  </div>
                  <Switch
                    checked={notifPrefs?.smsReminders ?? true}
                    onCheckedChange={(val) => updateNotifPrefs.mutate({ smsReminders: val })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4>Marketing értesítések</h4>
                    <p className="text-sm text-muted-foreground">
                      Tippek és legjobb gyakorlatok a Qvick-től
                    </p>
                  </div>
                  <Switch
                    checked={notifPrefs?.emailPromotions ?? false}
                    onCheckedChange={(val) => updateNotifPrefs.mutate({ emailPromotions: val })}
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="mb-4">Biztonsági beállítások</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="mb-2">Jelszó módosítása</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="currentPasswordP">Jelenlegi jelszó</Label>
                      <Input
                        id="currentPasswordP"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="newPasswordP">Új jelszó</Label>
                      <Input
                        id="newPasswordP"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPasswordP">Jelszó megerősítése</Label>
                      <Input
                        id="confirmPasswordP"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleChangePassword}
                      disabled={!currentPassword || !newPassword}
                    >
                      Jelszó módosítása
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
