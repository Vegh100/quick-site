import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { User, Shield, Loader2, Camera, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useAuth } from "../../contexts/AuthContext";
import { useUpdateProfile, useUploadAvatar } from "../../hooks/useApi";
import { authApi } from "../../lib/api-services";
import { toast } from "sonner";

export function EmployeeProfilePanel() {
  const { user, refreshUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const uploadAvatarMut = useUploadAvatar();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A fájl mérete nem lehet nagyobb 5MB-nál");
      return;
    }

    try {
      await uploadAvatarMut.mutateAsync(file);
      await refreshUser();
      toast.success("Profilkép feltöltve!");
    } catch {
      toast.error("Hiba a feltöltés során");
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Az új jelszónak legalább 6 karakter hosszúnak kell lennie");
      return;
    }
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

  return (
    <div className="max-w-2xl mx-auto">
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Biztonság
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="p-6 space-y-6">
            {/* Avatar upload */}
            <div>
              <h3 className="mb-4">Profilkép</h3>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 h-8 w-8 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                    {uploadAvatarMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Pencil className="h-4 w-4" />
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={uploadAvatarMut.isPending}
                    />
                  </label>
                </div>
                <div>
                  <p className="text-sm font-medium">Profilkép módosítása</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG vagy WebP, max 5MB</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Personal data */}
            <div>
              <h3 className="mb-4">Személyes adatok</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emp-firstName">Keresztnév</Label>
                    <Input
                      id="emp-firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Keresztnév"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emp-lastName">Vezetéknév</Label>
                    <Input
                      id="emp-lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Vezetéknév"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="emp-email">Email</Label>
                  <Input
                    id="emp-email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Az email cím nem módosítható</p>
                </div>
                <div>
                  <Label htmlFor="emp-phone">Telefonszám</Label>
                  <Input
                    id="emp-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+40 7XX XXX XXX"
                  />
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

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="mb-4">Jelszó módosítása</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="emp-currentPassword">Jelenlegi jelszó</Label>
                  <Input
                    id="emp-currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <Label htmlFor="emp-newPassword">Új jelszó</Label>
                  <Input
                    id="emp-newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Legalább 6 karakter"
                  />
                </div>
                <div>
                  <Label htmlFor="emp-confirmPassword">Jelszó megerősítése</Label>
                  <Input
                    id="emp-confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <Button onClick={handleChangePassword} disabled={!currentPassword || !newPassword}>
                  Jelszó módosítása
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
