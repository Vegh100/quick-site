import {
  Menu,
  User,
  Settings,
  LogOut,
  CreditCard,
  Shield,
  HelpCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useAuth } from "../../contexts/AuthContext";

interface HeaderWithSettingsProps {
  userType: "customer" | "provider";
  onSettingsClick?: () => void;
}

export function HeaderWithSettings({
  userType,
  onSettingsClick,
}: HeaderWithSettingsProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
    : "Felhasználó";
  const displayEmail = user?.email || "";

  const handleMenuAction = (action: string) => {
    if (
      action === "settings" ||
      action === "payment" ||
      action === "billing" ||
      action === "verification"
    ) {
      onSettingsClick?.();
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const customerMenuItems = [
    { icon: Settings, label: "Fiók beállítások", action: "settings" },
    { icon: CreditCard, label: "Fizetési módok", action: "payment" },
    { icon: HelpCircle, label: "Segítség", action: "help" },
  ];

  const providerMenuItems = [
    { icon: Settings, label: "Üzleti beállítások", action: "settings" },
    { icon: CreditCard, label: "Számlázás & Csomagok", action: "billing" },
    { icon: Shield, label: "Hitelesítés", action: "verification" },
    { icon: HelpCircle, label: "Segítség", action: "help" },
  ];

  const menuItems =
    userType === "customer" ? customerMenuItems : providerMenuItems;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-white">Q</span>
            </div>
            <span className="hidden md:inline font-semibold">Qvick</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* User Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
                <span className="hidden md:inline text-sm">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {displayName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {displayEmail}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.action}
                    onClick={() => handleMenuAction(item.action)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                );
              })}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Kijelentkezés</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
