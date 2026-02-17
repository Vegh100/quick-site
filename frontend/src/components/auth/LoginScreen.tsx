import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import type { User, UserRole } from "../../lib/types";

interface LoginScreenProps {
  mode: "login" | "register";
  onSuccess: (user: User) => void;
  onSwitchMode: () => void;
  onBack: () => void;
}

export function LoginScreen({
  mode,
  onSuccess,
  onSwitchMode,
  onBack,
}: LoginScreenProps) {
  const { login, register } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<UserRole>("CUSTOMER");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let user: User;
      if (mode === "login") {
        user = await login({ email, password });
        toast.success("Sikeres bejelentkezés!");
      } else {
        user = await register({ email, password, firstName, lastName, role });
        toast.success("Sikeres regisztráció!");
      }
      onSuccess(user);
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        (mode === "login"
          ? "Sikertelen bejelentkezés"
          : "Sikertelen regisztráció");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Vissza
        </Button>

        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Qvick
            </h1>
          </div>
          <p className="text-muted-foreground">
            {mode === "login"
              ? "Jelentkezz be a fiókodba"
              : "Hozz létre egy fiókot"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {mode === "login" ? "Bejelentkezés" : "Regisztráció"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Add meg az email címed és jelszavad"
                : "Töltsd ki az adataidat a regisztrációhoz"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Keresztnév</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="János"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Vezetéknév</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Kovács"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Típus</Label>
                    <Select
                      value={role}
                      onValueChange={(v: string) => setRole(v as UserRole)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CUSTOMER">
                          Ügyfél – Szolgáltatást keresek
                        </SelectItem>
                        <SelectItem value="PROVIDER">
                          Szolgáltató – Szolgáltatást nyújtok
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="janos@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Jelszó</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 karakter"
                  minLength={8}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {mode === "login" ? "Bejelentkezés" : "Regisztráció"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>
                  Nincs még fiókod?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={onSwitchMode}
                  >
                    Regisztráció
                  </Button>
                </>
              ) : (
                <>
                  Már van fiókod?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={onSwitchMode}
                  >
                    Bejelentkezés
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
