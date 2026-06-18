import { useState, useEffect, lazy, Suspense } from "react";
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
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useAuth } from "../../contexts/AuthContext";
import {
  useUpdateProfile,
  useAddresses,
  useAddAddress,
  useUpdateAddress,
  useDeleteAddress,
  useNotificationPrefs,
  useUpdateNotificationPrefs,
  useUploadAvatar,
} from "../../hooks/useApi";
import { authApi } from "../../lib/api-services";
import { toast } from "sonner";
import { ErrorBoundary } from "../common/ErrorBoundary";
import type { AddressDetails } from "../common/AddressPickerMap";

const AddressPickerMap = lazy(() =>
  import("../common/AddressPickerMap").then((m) => ({
    default: m.AddressPickerMap,
  })),
);

export function CustomerSettingsPanel() {
  const { user, refreshUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const { data: addressesData } = useAddresses();
  const addAddress = useAddAddress();
  const updateAddressMut = useUpdateAddress();
  const deleteAddressMut = useDeleteAddress();
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
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addrLabel, setAddrLabel] = useState("Otthon");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrZipCode, setAddrZipCode] = useState("");
  const [addrCountry, setAddrCountry] = useState("RO");
  const [addrLat, setAddrLat] = useState<number | null>(null);
  const [addrLng, setAddrLng] = useState<number | null>(null);
  const [addrFormatted, setAddrFormatted] = useState<string | null>(null);
  const [addrIsDefault, setAddrIsDefault] = useState(false);

  // Expanded address cards
  const [expandedAddressId, setExpandedAddressId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const timeout = window.setTimeout(() => {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setPhone(user.phone || "");
    }, 0);

    return () => window.clearTimeout(timeout);
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

  const resetAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddressId(null);
    setAddrLabel("Otthon");
    setAddrStreet("");
    setAddrCity("");
    setAddrZipCode("");
    setAddrCountry("RO");
    setAddrLat(null);
    setAddrLng(null);
    setAddrFormatted(null);
    setAddrIsDefault(false);
  };

  const handleAddressFromMap = (details: AddressDetails) => {
    setAddrStreet(details.street);
    setAddrCity(details.city);
    setAddrZipCode(details.zipCode);
    setAddrCountry(details.country);
    setAddrLat(details.latitude);
    setAddrLng(details.longitude);
    setAddrFormatted(details.formattedAddress);
  };

  const handleSaveAddress = async () => {
    if (!addrStreet || !addrCity || !addrZipCode) {
      toast.error("Utca, város és irányítószám kötelező!");
      return;
    }

    const data = {
      label: addrLabel,
      street: addrStreet,
      city: addrCity,
      zipCode: addrZipCode,
      country: addrCountry,
      latitude: addrLat,
      longitude: addrLng,
      formattedAddress: addrFormatted,
      isDefault: addrIsDefault,
    };

    try {
      if (editingAddressId) {
        await updateAddressMut.mutateAsync({ id: editingAddressId, data });
        toast.success("Cím frissítve!");
      } else {
        await addAddress.mutateAsync(data);
        toast.success("Cím hozzáadva!");
      }
      resetAddressForm();
    } catch {
      toast.error("Hiba a cím mentésekor");
    }
  };

  const handleEditAddress = (addr: any) => {
    setEditingAddressId(addr.id);
    setAddrLabel(addr.label || "");
    setAddrStreet(addr.street || "");
    setAddrCity(addr.city || "");
    setAddrZipCode(addr.zipCode || "");
    setAddrCountry(addr.country || "RO");
    setAddrLat(addr.latitude ?? null);
    setAddrLng(addr.longitude ?? null);
    setAddrFormatted(addr.formattedAddress ?? null);
    setAddrIsDefault(addr.isDefault || false);
    setExpandedAddressId(null);
    setShowAddressForm(true);
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await deleteAddressMut.mutateAsync(id);
      toast.success("Cím törölve!");
    } catch {
      toast.error("Hiba a törlés során");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await updateAddressMut.mutateAsync({ id, data: { isDefault: true } });
      toast.success("Alapértelmezett cím beállítva!");
    } catch {
      toast.error("Hiba történt");
    }
  };

  const addresses = addressesData?.data || [];
  const notifPrefs = notifPrefsData?.data;

  const labelPresets = ["Otthon", "Munkahely", "Iskola", "Edzőterem", "Egyéb"];

  return (
    <div className="max-w-4xl mx-auto">
      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="flex w-full">
          <TabsTrigger value="account" className="flex flex-1 items-center justify-center gap-2">
            <User className="h-4 w-4" />
            <span>Fiók</span>
          </TabsTrigger>

          <TabsTrigger
            value="notifications"
            className="flex flex-1 items-center justify-center gap-2"
          >
            <Bell className="h-4 w-4" />
            <span>Értesítések</span>
          </TabsTrigger>

          <TabsTrigger value="addresses" className="flex flex-1 items-center justify-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>Címek</span>
          </TabsTrigger>

          <TabsTrigger value="security" className="flex flex-1 items-center justify-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Biztonság</span>
          </TabsTrigger>
        </TabsList>
        {/* Account Tab */}
        <TabsContent value="account">
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="mb-4">Személyes adatok</h3>

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
                  <Input id="email" type="email" value={user?.email || ""} disabled />
                </div>
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Mentés
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
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
                    onCheckedChange={(val) => updateNotifPrefs.mutate({ emailBookings: val })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4>Email üzenetek</h4>
                    <p className="text-sm text-muted-foreground">Szolgáltatóktól érkező üzenetek</p>
                  </div>
                  <Switch
                    checked={notifPrefs?.emailMessages ?? true}
                    onCheckedChange={(val) => updateNotifPrefs.mutate({ emailMessages: val })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4>SMS emlékeztetők</h4>
                    <p className="text-sm text-muted-foreground">Emlékeztető a találkozó előtt</p>
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
                    <p className="text-sm text-muted-foreground">Kedvezmények és ajánlatok</p>
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

        {/* Addresses Tab */}
        <TabsContent value="addresses">
          <Card className="p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3>Mentett címek</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add hozzá a gyakran használt címeidet a gyorsabb foglaláshoz
                  </p>
                </div>
                {!showAddressForm && (
                  <Button
                    size="sm"
                    onClick={() => {
                      resetAddressForm();
                      setShowAddressForm(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Új cím
                  </Button>
                )}
              </div>

              {/* Address form with map */}
              {showAddressForm && (
                <Card className="p-4 border-2 border-primary/20 space-y-4 mb-4">
                  <h4 className="font-medium">
                    {editingAddressId ? "Cím szerkesztése" : "Új cím hozzáadása"}
                  </h4>

                  {/* Label presets */}
                  <div>
                    <Label>Címke</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {labelPresets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAddrLabel(preset)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            addrLabel === preset
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:bg-muted border-border"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    {!labelPresets.includes(addrLabel) && (
                      <Input
                        value={addrLabel}
                        onChange={(e) => setAddrLabel(e.target.value)}
                        className="mt-2"
                        placeholder="Egyéni címke"
                      />
                    )}
                  </div>

                  {/* Map picker */}
                  <ErrorBoundary
                    fallback={
                      <div className="text-center py-6 border rounded-lg bg-muted/50">
                        <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          A térkép nem tölthető be. Add meg a címet kézzel az alábbi mezőkben.
                        </p>
                      </div>
                    }
                  >
                    <Suspense
                      fallback={
                        <div className="flex items-center justify-center py-8 border rounded-lg">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      }
                    >
                      <AddressPickerMap
                        initialLat={addrLat || undefined}
                        initialLng={addrLng || undefined}
                        onAddressSelect={handleAddressFromMap}
                        height="280px"
                      />
                    </Suspense>
                  </ErrorBoundary>

                  {/* Manual fields (auto-filled from map) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <Label>Utca, házszám</Label>
                      <Input
                        value={addrStreet}
                        onChange={(e) => setAddrStreet(e.target.value)}
                        placeholder="pl. Főtér 10."
                      />
                    </div>
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
                    <Button variant="outline" onClick={resetAddressForm}>
                      Mégse
                    </Button>
                    <Button
                      onClick={handleSaveAddress}
                      disabled={addAddress.isPending || updateAddressMut.isPending}
                    >
                      {(addAddress.isPending || updateAddressMut.isPending) && (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      )}
                      {editingAddressId ? "Frissítés" : "Mentés"}
                    </Button>
                  </div>
                </Card>
              )}

              {/* Address list */}
              {addresses.length === 0 && !showAddressForm ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Nincs mentett cím</p>
                  <p className="text-muted-foreground text-xs mt-1 mb-4">
                    Adj hozzá címeket a gyorsabb foglaláshoz
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      resetAddressForm();
                      setShowAddressForm(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Új cím hozzáadása
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr: any) => (
                    <div
                      key={addr.id}
                      className={`border rounded-lg transition-colors ${
                        addr.isDefault ? "border-primary/30 bg-primary/5" : ""
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() =>
                              setExpandedAddressId(expandedAddressId === addr.id ? null : addr.id)
                            }
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <MapPin className="h-4 w-4 text-primary shrink-0" />
                              <h4 className="font-medium">{addr.label || "Cím"}</h4>
                              {addr.isDefault && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  Alapértelmezett
                                </span>
                              )}
                              {expandedAddressId === addr.id ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground ml-6">
                              {addr.formattedAddress ||
                                `${addr.street}, ${addr.city} ${addr.zipCode}`}
                            </p>
                          </div>
                        </div>

                        {/* Expanded actions */}
                        {expandedAddressId === addr.id && (
                          <div className="mt-3 ml-6 flex flex-wrap gap-2">
                            {!addr.isDefault && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetDefault(addr.id)}
                              >
                                <Star className="h-3 w-3 mr-1" />
                                Alapértelmezett
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditAddress(addr)}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Szerkesztés
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteAddress(addr.id)}
                              disabled={deleteAddressMut.isPending}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Törlés
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Security Tab */}
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
                      <Label htmlFor="confirmPassword">Jelszó megerősítése</Label>
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
