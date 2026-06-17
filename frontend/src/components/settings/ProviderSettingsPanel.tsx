import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Bell, Shield, Briefcase, DollarSign, Loader2, Pencil, Camera } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useAuth } from "../../contexts/AuthContext";
import { useMyProvider, useUpdateProvider, useUploadAvatar } from "../../hooks/useApi";
import { authApi } from "../../lib/api-services";
import { toast } from "sonner";

export function ProviderSettingsPanel() {
  const { user, refreshUser } = useAuth();
  const { data: providerData } = useMyProvider();
  const updateProvider = useUpdateProvider();
  const uploadAvatarMut = useUploadAvatar();

  const provider = providerData?.data;

  // Find the current user's member record to determine settings access.
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
    }
  }, [provider]);
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

  const isOwner = currentMember?.role === "OWNER";

  return (
    <div className="max-w-4xl mx-auto">
      <Tabs
        key={isOwner ? "owner" : "employee"}
        defaultValue={isOwner ? "business" : "notifications"}
        className="space-y-6"
      >
        <TabsList className="flex w-full">
          {isOwner && (
            <TabsTrigger value="business">
              <Briefcase className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Üzlet</span>
            </TabsTrigger>
          )}
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

        {/* Pricing - Owner only */}
        {isOwner && (
          <TabsContent value="pricing">
            <Card className="p-8">
              <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <DollarSign className="h-6 w-6" />
                </div>
                <h3 className="mb-2">Árazási beállítások</h3>
                <p className="text-lg font-semibold">Coming soon...</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ez a rész hamarosan elérhető lesz.
                </p>
              </div>
            </Card>
          </TabsContent>
        )}

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card className="p-8">
            <div className="mx-auto flex max-w-sm flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bell className="h-6 w-6" />
              </div>
              <h3 className="mb-2">Értesítési beállítások</h3>
              <p className="text-lg font-semibold">Coming soon...</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Ez a rész hamarosan elérhető lesz.
              </p>
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
