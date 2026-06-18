import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useInviteInfo } from "../../hooks/useApi";
import { memberApi, authApi } from "../../lib/api-services";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Loader2, Building2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setUser, isAuthenticated } = useAuth();
  const { data: inviteData, isLoading, isError } = useInviteInfo(token);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to dashboard
  if (isAuthenticated) {
    navigate("/szolgaltato", { replace: true });
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !inviteData?.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h2 className="text-xl font-semibold">Érvénytelen meghívó</h2>
          <p className="text-muted-foreground">
            Ez a meghívó link érvénytelen vagy már felhasználták. Kérd meg a céged tulajdonosát,
            hogy küldjön egy új meghívót.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Vissza a főoldalra
          </Button>
        </Card>
      </div>
    );
  }

  const invite = inviteData.data;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName || !lastName) {
      toast.error("Kérlek add meg a neved!");
      return;
    }
    if (password.length < 8) {
      toast.error("A jelszó legalább 8 karakter legyen!");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("A jelszavak nem egyeznek!");
      return;
    }

    setIsSubmitting(true);
    try {
      await memberApi.registerFromInvite(token!, {
        password,
        firstName,
        lastName,
      });
      // Cookie is set by backend; fetch user profile
      const meRes = await authApi.me();
      setUser(meRes.data.user);
      toast.success("Sikeres regisztráció! Üdvözlünk a csapatban!");
      navigate("/szolgaltato", { replace: true });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Hiba történt a regisztráció során");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="p-8 max-w-md w-full space-y-6">
        {/* Company info */}
        <div className="text-center space-y-3">
          {invite.provider.logoUrl ? (
            <img
              src={invite.provider.logoUrl}
              alt={invite.provider.businessName}
              className="h-16 w-16 rounded-xl mx-auto object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold">Csatlakozás: {invite.provider.businessName}</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Meghívtak, hogy csatlakozz alkalmazottként. Hozd létre a fiókodat a csatlakozáshoz.
            </p>
          </div>
        </div>

        {/* Invited email info */}
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-sm text-muted-foreground">Meghívó e-mail cím:</p>
          <p className="font-medium">{invite.email}</p>
        </div>

        {/* Registration form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">Vezetéknév *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Kovács"
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Keresztnév *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Anna"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password">Jelszó *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Legalább 8 karakter"
              required
              minLength={8}
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Jelszó megerősítése *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Jelszó újra"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Regisztráció és csatlakozás
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          Már van fiókod?{" "}
          <a href="/bejelentkezes" className="text-primary hover:underline">
            Jelentkezz be
          </a>
        </p>
      </Card>
    </div>
  );
}
