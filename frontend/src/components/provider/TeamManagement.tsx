import { useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  useTeamMembers,
  useInviteMember,
  useUpdateMember,
  useDeactivateMember,
  useUpgradeToCompany,
} from "../../hooks/useApi";
import {
  UserPlus,
  Users,
  Shield,
  ShieldCheck,
  Loader2,
  Mail,
  Trash2,
  ArrowUpCircle,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import type { ProviderMember, MemberRole, Provider } from "../../lib/types";

const ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: "Tulajdonos",
  MANAGER: "Menedzser",
  EMPLOYEE: "Alkalmazott",
};

const ROLE_COLORS: Record<MemberRole, string> = {
  OWNER: "bg-amber-500",
  MANAGER: "bg-blue-500",
  EMPLOYEE: "bg-green-500",
};

const STATUS_LABELS: Record<string, string> = {
  INVITED: "Meghívva",
  ACTIVE: "Aktív",
  DEACTIVATED: "Deaktiválva",
};

interface TeamManagementProps {
  provider: Provider;
}

export function TeamManagement({ provider }: TeamManagementProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MANAGER" | "EMPLOYEE">(
    "EMPLOYEE",
  );
  const [inviteDisplayName, setInviteDisplayName] = useState("");

  const { data: membersData, isLoading } = useTeamMembers();
  const inviteMember = useInviteMember();
  const updateMember = useUpdateMember();
  const deactivateMember = useDeactivateMember();
  const upgradeToCompany = useUpgradeToCompany();

  const members = membersData?.data || [];
  const isCompany = provider.providerType === "COMPANY";

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast.error("Kérlek add meg az e-mail címet!");
      return;
    }

    try {
      await inviteMember.mutateAsync({
        email: inviteEmail,
        role: inviteRole,
        displayName: inviteDisplayName || undefined,
      });
      toast.success("Meghívó elküldve!");
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("EMPLOYEE");
      setInviteDisplayName("");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Hiba a meghívó küldésekor");
    }
  };

  const handleRoleChange = async (
    memberId: string,
    newRole: "MANAGER" | "EMPLOYEE",
  ) => {
    try {
      await updateMember.mutateAsync({ memberId, data: { role: newRole } });
      toast.success("Szerepkör frissítve!");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Hiba a frissítéskor");
    }
  };

  const handleDeactivate = async (memberId: string, name: string) => {
    if (!confirm(`Biztosan deaktiválod: ${name}?`)) return;
    try {
      await deactivateMember.mutateAsync(memberId);
      toast.success("Tag deaktiválva!");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Hiba a deaktiváláskor");
    }
  };

  const handleUpgrade = async () => {
    if (
      !confirm(
        "Biztosan átváltasz céges fiókra? Ezután alkalmazottakat tudsz hozzáadni.",
      )
    )
      return;
    try {
      await upgradeToCompany.mutateAsync();
      toast.success("Sikeresen átváltottál céges fiókra!");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Hiba az átváltáskor");
    }
  };

  const getMemberName = (member: ProviderMember) => {
    if (member.displayName) return member.displayName;
    if (member.user?.firstName || member.user?.lastName) {
      return `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim();
    }
    return member.invitedEmail;
  };

  // SOLO provider: show upgrade button
  if (!isCompany) {
    return (
      <Card className="p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <ArrowUpCircle className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h3 className="text-lg font-semibold">Egyéni fiók</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Jelenleg egyéni szolgáltatóként működsz. Ha alkalmazottakat szeretnél
          hozzáadni, váltsd át a fiókodat céges fiókra.
        </p>
        <Button onClick={handleUpgrade} disabled={upgradeToCompany.isPending}>
          {upgradeToCompany.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          <Building2 className="mr-2 h-4 w-4" />
          Átváltás céges fiókra
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Csapat ({members.length} tag)</h3>
            <p className="text-sm text-muted-foreground">
              Alkalmazottak kezelése
            </p>
          </div>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Meghívás
        </Button>
      </div>

      {/* Members List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : members.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Még nincsenek csapattagok. Hívj meg alkalmazottakat!
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {members
            .filter((m) => m.status !== "DEACTIVATED")
            .map((member) => (
              <Card key={member.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {member.user?.avatarUrl ? (
                        <img
                          src={member.user.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">
                          {getMemberName(member).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{getMemberName(member)}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {member.invitedEmail}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={ROLE_COLORS[member.role]}>
                      {member.role === "OWNER" ? (
                        <ShieldCheck className="mr-1 h-3 w-3" />
                      ) : member.role === "MANAGER" ? (
                        <Shield className="mr-1 h-3 w-3" />
                      ) : null}
                      {ROLE_LABELS[member.role]}
                    </Badge>

                    {member.status === "INVITED" && (
                      <Badge variant="outline">
                        {STATUS_LABELS[member.status]}
                      </Badge>
                    )}

                    {member.role !== "OWNER" && (
                      <div className="flex items-center gap-1">
                        <Select
                          value={member.role}
                          onValueChange={(val) =>
                            handleRoleChange(
                              member.id,
                              val as "MANAGER" | "EMPLOYEE",
                            )
                          }
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MANAGER">Menedzser</SelectItem>
                            <SelectItem value="EMPLOYEE">
                              Alkalmazott
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() =>
                            handleDeactivate(member.id, getMemberName(member))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Csapattag meghívása</DialogTitle>
            <DialogDescription>
              Add meg az alkalmazott e-mail címét. Ha már regisztrált,
              automatikusan hozzáadódik. Ha nem, meghívót kap a regisztrációkor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="invite-email">E-mail cím *</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="alkalmazott@example.com"
              />
            </div>
            <div>
              <Label htmlFor="invite-name">Megjelenítési név</Label>
              <Input
                id="invite-name"
                value={inviteDisplayName}
                onChange={(e) => setInviteDisplayName(e.target.value)}
                placeholder="pl. Kovács Anna"
              />
            </div>
            <div>
              <Label>Szerepkör</Label>
              <Select
                value={inviteRole}
                onValueChange={(val) =>
                  setInviteRole(val as "MANAGER" | "EMPLOYEE")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">
                    Alkalmazott – Saját foglalások kezelése
                  </SelectItem>
                  <SelectItem value="MANAGER">
                    Menedzser – Minden foglalás + beállítások
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setInviteOpen(false)}
                className="flex-1"
              >
                Mégse
              </Button>
              <Button
                onClick={handleInvite}
                disabled={inviteMember.isPending}
                className="flex-1"
              >
                {inviteMember.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Meghívás
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
