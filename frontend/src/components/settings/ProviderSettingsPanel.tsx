import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import {
  Bell,
  Shield,
  Briefcase,
  DollarSign,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Camera,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useAuth } from "../../contexts/AuthContext";
import {
  useMyProvider,
  useUpdateProvider,
  useNotificationPrefs,
  useUpdateNotificationPrefs,
  useUpdatePricingSettings,
  useAddService,
  useUpdateService,
  useDeleteService,
  useUploadServiceImage,
  useSetAvailability,
  useUploadAvatar,
  useServiceTypes,
} from "../../hooks/useApi";
import { authApi } from "../../lib/api-services";
import { toast } from "sonner";
import type { Service } from "../../lib/types";
import { ServiceSlotPicker } from "./ServiceSlotPicker";

const DAYS_HU = [
  "Hétfő",
  "Kedd",
  "Szerda",
  "Csütörtök",
  "Péntek",
  "Szombat",
  "Vasárnap",
];
const DAY_MAP = [1, 2, 3, 4, 5, 6, 0]; // index → dayOfWeek (Mon=1..Sat=6,Sun=0)

export function ProviderSettingsPanel() {
  const { user, refreshUser } = useAuth();
  const { data: providerData } = useMyProvider();
  const updateProvider = useUpdateProvider();
  const { data: notifPrefsData } = useNotificationPrefs();
  const updateNotifPrefs = useUpdateNotificationPrefs();
  const updatePricing = useUpdatePricingSettings();
  const addServiceMut = useAddService();
  const updateServiceMut = useUpdateService();
  const deleteServiceMut = useDeleteService();
  const uploadServiceImageMut = useUploadServiceImage();
  const setAvailabilityMut = useSetAvailability();
  const uploadAvatarMut = useUploadAvatar();
  const { data: serviceTypesData } = useServiceTypes();

  const provider = providerData?.data;
  const serviceTypes = serviceTypesData?.data || [];

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

  // Service form
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [svcServiceTypeId, setSvcServiceTypeId] = useState("");
  const [svcName, setSvcName] = useState("");
  const [svcDesc, setSvcDesc] = useState("");
  const [svcPrice, setSvcPrice] = useState("");
  const [svcDuration, setSvcDuration] = useState("60");
  const [svcPriceType, setSvcPriceType] = useState<
    "PER_HOUR" | "FIXED" | "PER_SERVICE"
  >("FIXED");
  const [svcImageUrl, setSvcImageUrl] = useState<string>("");
  const [svcImageFile, setSvcImageFile] = useState<File | null>(null);

  // Service slot picker
  const [slotPickerServiceId, setSlotPickerServiceId] = useState<string | null>(
    null,
  );

  // Availability
  const [availSlots, setAvailSlots] = useState(
    DAYS_HU.map((_, i) => ({
      dayOfWeek: DAY_MAP[i],
      startTime: "08:00",
      endTime: "17:00",
      isEnabled: i < 5,
    })),
  );

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

  const resetServiceForm = () => {
    setSvcServiceTypeId("");
    setSvcName("");
    setSvcDesc("");
    setSvcPrice("");
    setSvcDuration("60");
    setSvcPriceType("FIXED");
    setSvcImageUrl("");
    setSvcImageFile(null);
    setEditingService(null);
    setShowServiceForm(false);
  };

  const openEditService = (svc: Service) => {
    setEditingService(svc);
    setSvcServiceTypeId(svc.serviceTypeId || "");
    setSvcName(svc.name);
    setSvcDesc(svc.description || "");
    setSvcPrice(String(Number(svc.priceAmount)));
    setSvcDuration(String(svc.durationMin));
    setSvcPriceType(svc.priceType);
    setSvcImageUrl(svc.imageUrl || "");
    setSvcImageFile(null);
    setShowServiceForm(true);
  };

  const handleSaveService = async () => {
    if (!svcName || !svcPrice) {
      toast.error("Név és ár kötelező!");
      return;
    }
    const duration = parseInt(svcDuration);
    if (!duration || duration <= 0) {
      toast.error("Az időtartam legalább 1 perc kell legyen!");
      return;
    }
    if (duration > 480) {
      toast.error("Az időtartam maximum 8 óra (480 perc) lehet!");
      return;
    }
    const price = parseFloat(svcPrice);
    if (!price || price <= 0) {
      toast.error("Az ár pozitív szám kell legyen!");
      return;
    }
    const data = {
      serviceTypeId: svcServiceTypeId || undefined,
      name: svcName,
      description: svcDesc || undefined,
      priceAmount: price,
      priceType: svcPriceType,
      durationMin: duration,
      slotIntervalMin: duration,
    };

    let savedServiceId: string;
    try {
      if (editingService) {
        const result = await updateServiceMut.mutateAsync({
          serviceId: editingService.id,
          data,
        });
        savedServiceId = result.data?.id ?? editingService.id;
        toast.success("Szolgáltatás frissítve!");
      } else {
        const result = await addServiceMut.mutateAsync(data);
        savedServiceId = result.data?.id ?? "";
        toast.success("Szolgáltatás hozzáadva!");
      }
    } catch {
      toast.error(
        "Nem sikerült menteni a szolgáltatást. Ellenőrizd az adatokat!",
      );
      return;
    }

    // Upload image if a new file was selected
    if (svcImageFile && savedServiceId) {
      try {
        await uploadServiceImageMut.mutateAsync({
          serviceId: savedServiceId,
          file: svcImageFile,
        });
      } catch {
        toast.error("A kép feltöltése nem sikerült. Próbáld újra!");
      }
    }

    resetServiceForm();
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      await deleteServiceMut.mutateAsync(serviceId);
      toast.success("Szolgáltatás törölve!");
    } catch {
      toast.error("Hiba a törlés során");
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
  const allServices = provider?.services || [];
  const isOwner = currentMember?.role === "OWNER";

  // Employee only sees services assigned to them via memberServices
  const services = isOwner
    ? allServices
    : allServices.filter((svc) =>
        currentMember?.memberServices?.some((ms) => ms.serviceId === svc.id),
      );

  return (
    <div className="max-w-4xl mx-auto">
      <Tabs
        key={isOwner ? "owner" : "employee"}
        defaultValue={isOwner ? "business" : "services"}
        className="space-y-6"
      >
        <TabsList className="flex w-full">
          {isOwner && (
            <TabsTrigger value="business">
              <Briefcase className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Üzlet</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="services">
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Szolg.</span>
          </TabsTrigger>
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
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
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
                <Button
                  onClick={handleSaveBusiness}
                  disabled={updateProvider.isPending}
                >
                  {updateProvider.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Mentés
                </Button>
              </div>
            </Card>
          </TabsContent>
        )}

        {/* Services CRUD */}
        <TabsContent value="services">
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3>Szolgáltatások</h3>
              <Button
                size="sm"
                onClick={() => {
                  resetServiceForm();
                  setShowServiceForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Új szolgáltatás
              </Button>
            </div>

            {showServiceForm && (
              <Card className="p-4 border-2 border-primary/20 space-y-4">
                <h4>
                  {editingService
                    ? "Szolgáltatás szerkesztése"
                    : "Új szolgáltatás"}
                </h4>
                <div className="space-y-3">
                  <div>
                    <Label>Szolgáltatás típus</Label>
                    <select
                      value={svcServiceTypeId}
                      onChange={(e) => {
                        const typeId = e.target.value;
                        setSvcServiceTypeId(typeId);
                        if (typeId) {
                          const st = serviceTypes.find((t) => t.id === typeId);
                          if (st) {
                            setSvcName(st.name);
                            setSvcDesc(st.description || "");
                          }
                        } else {
                          setSvcName("");
                          setSvcDesc("");
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
                        return Object.entries(grouped).map(
                          ([catName, types]) => (
                            <optgroup key={catName} label={catName}>
                              {types.map((st) => (
                                <option key={st.id} value={st.id}>
                                  {st.name}
                                </option>
                              ))}
                            </optgroup>
                          ),
                        );
                      })()}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Válaszd ki a szolgáltatás típusát, vagy hagyd üresen és
                      add meg kézzel
                    </p>
                  </div>
                  {!svcServiceTypeId && (
                    <div>
                      <Label>Név</Label>
                      <Input
                        value={svcName}
                        onChange={(e) => setSvcName(e.target.value)}
                        placeholder="pl. Mélytisztítás"
                      />
                    </div>
                  )}
                  <div>
                    <Label>Leírás</Label>
                    <Textarea
                      value={svcDesc}
                      onChange={(e) => setSvcDesc(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Ár (RON)</Label>
                      <Input
                        type="number"
                        value={svcPrice}
                        onChange={(e) => setSvcPrice(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Típus</Label>
                      <select
                        value={svcPriceType}
                        onChange={(e) => setSvcPriceType(e.target.value as any)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="FIXED">Fix ár</option>
                        <option value="PER_HOUR">Óradíj</option>
                        <option value="PER_SERVICE">Szolg. díj</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label>Kb. időtartam (perc)</Label>
                    <Input
                      type="number"
                      value={svcDuration}
                      onChange={(e) => setSvcDuration(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Hozzávetőleg mennyi időt vesz igénybe a szolgáltatás
                    </p>
                  </div>
                  <div>
                    <Label>Szolgáltatás képe</Label>
                    <div className="mt-1 space-y-2">
                      {(svcImageUrl || svcImageFile) && (
                        <div className="relative w-full h-36 rounded-md overflow-hidden border">
                          <img
                            src={
                              svcImageFile
                                ? URL.createObjectURL(svcImageFile)
                                : svcImageUrl
                            }
                            alt="Szolgáltatás képe"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSvcImageFile(null);
                              setSvcImageUrl("");
                            }}
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/80"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setSvcImageFile(file);
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Ajánlott méret: 800×500 px. Max 5 MB.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={resetServiceForm}>
                    Mégse
                  </Button>
                  <Button
                    onClick={handleSaveService}
                    disabled={
                      addServiceMut.isPending ||
                      updateServiceMut.isPending ||
                      uploadServiceImageMut.isPending
                    }
                  >
                    {(addServiceMut.isPending ||
                      updateServiceMut.isPending ||
                      uploadServiceImageMut.isPending) && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    Mentés
                  </Button>
                </div>
              </Card>
            )}

            {services.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                Még nincs szolgáltatás hozzáadva
              </p>
            ) : (
              <div className="space-y-3">
                {services.map((svc) => (
                  <div
                    key={svc.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    {svc.imageUrl && (
                      <div className="w-full h-24 overflow-hidden">
                        <img
                          src={svc.imageUrl}
                          alt={svc.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between p-4">
                      <div>
                        <h4 className="font-medium">{svc.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {Number(svc.priceAmount)} {svc.priceCurrency}
                          {svc.priceType === "PER_HOUR" ? "/óra" : ""} ·{" "}
                          {svc.durationMin} perc
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={
                            slotPickerServiceId === svc.id ? "default" : "ghost"
                          }
                          size="icon"
                          title="Időpontok kezelése"
                          onClick={() =>
                            setSlotPickerServiceId(
                              slotPickerServiceId === svc.id ? null : svc.id,
                            )
                          }
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditService(svc)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDeleteService(svc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {slotPickerServiceId === svc.id && currentMember && (
                      <div className="px-4 pb-4">
                        <ServiceSlotPicker
                          service={svc}
                          memberId={currentMember.id}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

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
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
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
                      <span className="text-sm text-muted-foreground">
                        Zárva
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveAvailability}
                disabled={setAvailabilityMut.isPending}
              >
                {setAvailabilityMut.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
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
                      onCheckedChange={(val) =>
                        updatePricing.mutate({ dynamicPricing: val })
                      }
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
                      onCheckedChange={(val) =>
                        updatePricing.mutate({ weekendPremium: val })
                      }
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
                      onCheckedChange={(val) =>
                        updatePricing.mutate({ autoAccept: val })
                      }
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
                    onCheckedChange={(val) =>
                      updateNotifPrefs.mutate({ emailBookings: val })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4>SMS foglalás értesítés</h4>
                    <p className="text-sm text-muted-foreground">
                      SMS értesítés új foglaláskor
                    </p>
                  </div>
                  <Switch
                    checked={notifPrefs?.smsBookings ?? true}
                    onCheckedChange={(val) =>
                      updateNotifPrefs.mutate({ smsBookings: val })
                    }
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
                      Tippek és legjobb gyakorlatok a Qvick-től
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
                      <Label htmlFor="confirmPasswordP">
                        Jelszó megerősítése
                      </Label>
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
