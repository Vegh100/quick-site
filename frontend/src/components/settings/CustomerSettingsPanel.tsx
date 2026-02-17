import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";
import {
  Bell,
  MapPin,
  Shield,
  User,
  Loader2,
  Plus,
  Trash2,
  Camera,
  Pencil,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useAuth } from "../../contexts/AuthContext";
import {
  useUpdateProfile,
  useAddresses,
  useAddAddress,
  useNotificationPrefs,
  useUpdateNotificationPrefs,
  useUploadAvatar,
} from "../../hooks/useApi";
import { authApi, userApi } from "../../lib/api-services";
import { toast } from "sonner";

export function CustomerSettingsPanel() {
  const { user, refreshUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const { data: addressesData, refetch: refetchAddresses } = useAddresses();
  const addAddress = useAddAddress();
  const { data: notifPrefsData } = useNotificationPrefs();
  const updateNotifPrefs = useUpdateNotificationPrefs();
  const uploadAvatarMut = useUploadAvatar();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Address form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addrLabel, setAddrLabel] = useState("Otthon");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrZipCode, setAddrZipCode] = useState("");
  const [addrCountry, setAddrCountry] = useState("RO");
  const [addrIsDefault, setAddrIsDefault] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  const handleSaveProfile = async () => {
    try {
      await updateProfile.mutateAsync({ firstName, lastName, phone });
      await refreshUser();
      toast.success("Profil mentve!");
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

  const handleAddAddress = async () => {
    if (!addrStreet || !addrCity || !addrZipCode) {
      toast.error("Utca, város és irányítószám kötelező!");
      return;
    }
    try {
      await addAddress.mutateAsync({
        label: addrLabel,
        street: addrStreet,
        city: addrCity,
        zipCode: addrZipCode,
        country: addrCountry,
        isDefault: addrIsDefault,
      });
      toast.success("Cím hozzáadva!");
      setShowAddressForm(false);
      setAddrLabel("Otthon");
      setAddrStreet("");
      setAddrCity("");
      setAddrZipCode("");
      setAddrIsDefault(false);
    } catch {
      toast.error("Hiba a cím mentésekor");
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await userApi.deleteAddress(id);
      await refetchAddresses();
      toast.success("Cím törölve!");
    } catch {
      toast.error("Hiba a törlés során");
    }
  };

  const addresses = addressesData?.data || [];
  const notifPrefs = notifPrefsData?.data;

  return (
    <div className="max-w-4xl mx-auto">
      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="account">
            <User className="h-4 w-4 mr-2" />
            Fiók
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Értesítések
          </TabsTrigger>
          <TabsTrigger value="addresses">
            <MapPin className="h-4 w-4 mr-2" />
            Címek
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Biztonság
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="mb-4">Személyes adatok</h3>

              {/* Avatar upload */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
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
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG max 5MB
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Keresztnév</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Vezetéknév</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveProfile}
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Mentés
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="mb-4">Értesítési beállítások</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4>Email értesítések (foglalások)</h4>
                    <p className="text-sm text-muted-foreground">
                      Foglalásokról szóló email frissítések
                    </p>
                  </div>
                  <Switch
                    checked={notifPrefs?.emailBookings ?? true}
                    onCheckedChange={(val) =>
                      updateNotifPrefs.mutate({ emailBookings: val })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4>Email üzenetek</h4>
                    <p className="text-sm text-muted-foreground">
                      Szolgáltatóktól érkező üzenetek
                    </p>
                  </div>
                  <Switch
                    checked={notifPrefs?.emailMessages ?? true}
                    onCheckedChange={(val) =>
                      updateNotifPrefs.mutate({ emailMessages: val })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4>SMS emlékeztetők</h4>
                    <p className="text-sm text-muted-foreground">
                      Emlékeztető a találkozó előtt
                    </p>
                  </div>
                  <Switch
                    checked={notifPrefs?.smsReminders ?? true}
                    onCheckedChange={(val) =>
                      updateNotifPrefs.mutate({ smsReminders: val })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4>Marketing értesítések</h4>
                    <p className="text-sm text-muted-foreground">
                      Kedvezmények és ajánlatok
                    </p>
                  </div>
                  <Switch
                    checked={notifPrefs?.emailPromotions ?? false}
                    onCheckedChange={(val) =>
                      updateNotifPrefs.mutate({ emailPromotions: val })
                    }
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="addresses">
          <Card className="p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3>Mentett címek</h3>
                <Button
                  size="sm"
                  onClick={() => setShowAddressForm(!showAddressForm)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Új cím
                </Button>
              </div>

              {showAddressForm && (
                <Card className="p-4 border-2 border-primary/20 space-y-3 mb-4">
                  <h4>Új cím hozzáadása</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Címke</Label>
                      <Input
                        value={addrLabel}
                        onChange={(e) => setAddrLabel(e.target.value)}
                        placeholder="pl. Otthon, Iroda"
                      />
                    </div>
                    <div>
                      <Label>Ország</Label>
                      <Input
                        value={addrCountry}
                        onChange={(e) => setAddrCountry(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Utca, házszám</Label>
                    <Input
                      value={addrStreet}
                      onChange={(e) => setAddrStreet(e.target.value)}
                      placeholder="pl. Főtér 10."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Város</Label>
                      <Input
                        value={addrCity}
                        onChange={(e) => setAddrCity(e.target.value)}
                        placeholder="pl. Kolozsvár"
                      />
                    </div>
                    <div>
                      <Label>Irányítószám</Label>
                      <Input
                        value={addrZipCode}
                        onChange={(e) => setAddrZipCode(e.target.value)}
                        placeholder="pl. 400001"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={addrIsDefault}
                      onChange={(e) => setAddrIsDefault(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Alapértelmezett cím</span>
                  </label>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddressForm(false)}
                    >
                      Mégse
                    </Button>
                    <Button
                      onClick={handleAddAddress}
                      disabled={addAddress.isPending}
                    >
                      {addAddress.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      )}
                      Mentés
                    </Button>
                  </div>
                </Card>
              )}

              {addresses.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nincs mentett cím
                </p>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr: any) => (
                    <div key={addr.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4>{addr.label || "Cím"}</h4>
                            {addr.isDefault && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                Alapértelmezett
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {addr.street}, {addr.city} {addr.zipCode}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDeleteAddress(addr.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="mb-4">Biztonsági beállítások</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="mb-2">Jelszó módosítása</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="currentPassword">Jelenlegi jelszó</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="newPassword">Új jelszó</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">
                        Jelszó megerősítése
                      </Label>
                      <Input
                        id="confirmPassword"
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
