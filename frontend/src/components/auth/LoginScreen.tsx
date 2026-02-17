import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  ArrowLeft,
  Loader2,
  Sparkles,
  Briefcase,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useAuth } from "../../contexts/AuthContext";
import type { User, UserRole } from "../../lib/types";

interface LoginScreenProps {
  mode: "login" | "register";
  /** The role to register as. Only used in register mode. */
  role?: UserRole;
}

const ROLE_CONFIG: Record<
  UserRole,
  { icon: typeof UserIcon; title: string; subtitle: string }
> = {
  CUSTOMER: {
    icon: UserIcon,
    title: "Ügyfél regisztráció",
    subtitle: "Hozz létre fiókot és foglalj szolgáltatásokat",
  },
  PROVIDER: {
    icon: Briefcase,
    title: "Szolgáltatói regisztráció",
    subtitle: "Regisztrálj és kezdd el az üzleted építését",
  },
  ADMIN: {
    icon: UserIcon,
    title: "Regisztráció",
    subtitle: "Hozz létre egy fiókot",
  },
};

export function LoginScreen({
  mode,
  role: roleProp = "CUSTOMER",
}: LoginScreenProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const pendingRole = (location.state as any)?.pendingRole;
  const { login, register, googleAuth } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const navigateAfterAuth = (user: User) => {
    if (user.role === "PROVIDER") {
      navigate("/szolgaltato", { replace: true });
    } else {
      navigate("/ugyfel", { replace: true });
    }
  };

  const handleSwitchMode = () => {
    if (mode === "login") {
      // Switch to register — use pendingRole to determine which register page
      const registerRole =
        pendingRole === "PROVIDER" ? "szolgaltato" : "ugyfel";
      navigate(`/regisztracio/${registerRole}`);
    } else {
      // Switch to login — pass the current role so login can switch back
      navigate("/bejelentkezes", {
        state: { pendingRole: roleProp },
      });
    }
  };

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const roleConfig = ROLE_CONFIG[roleProp];
  const RoleIcon = roleConfig.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let user: User;
      if (mode === "login") {
        user = await login({ email, password });
        toast.success("Sikeres bejelentkezés!");
      } else {
        user = await register({
          email,
          password,
          firstName,
          lastName,
          role: roleProp,
        });
        toast.success("Sikeres regisztráció!");
      }
      navigateAfterAuth(user);
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
        <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
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
              : roleConfig.subtitle}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {mode === "register" && (
                <RoleIcon className="h-5 w-5 text-primary" />
              )}
              {mode === "login" ? "Bejelentkezés" : roleConfig.title}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Add meg az email címed és jelszavad"
                : "Töltsd ki az adataidat a regisztrációhoz"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Google Sign-In */}
            <div className="mb-4">
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={async (response: CredentialResponse) => {
                    if (!response.credential) {
                      toast.error("Nem sikerült a Google bejelentkezés");
                      return;
                    }
                    setIsGoogleLoading(true);
                    try {
                      const user = await googleAuth(
                        response.credential,
                        mode === "register" ? roleProp : undefined,
                      );
                      toast.success(
                        mode === "login"
                          ? "Sikeres bejelentkezés!"
                          : "Sikeres regisztráció!",
                      );
                      navigateAfterAuth(user);
                    } catch (err: any) {
                      const message =
                        err?.response?.data?.error ||
                        "Sikertelen Google bejelentkezés";
                      toast.error(message);
                    } finally {
                      setIsGoogleLoading(false);
                    }
                  }}
                  onError={() => {
                    toast.error("Google bejelentkezés sikertelen");
                  }}
                  text={mode === "login" ? "signin_with" : "signup_with"}
                  shape="rectangular"
                  width="350"
                  locale="hu"
                />
              </div>
              {isGoogleLoading && (
                <div className="flex justify-center mt-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  vagy email-lel
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
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
                    onClick={handleSwitchMode}
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
                    onClick={handleSwitchMode}
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
