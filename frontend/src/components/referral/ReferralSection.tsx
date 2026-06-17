import { useState } from "react";
import { useMyReferral, useRedeemReferral } from "../../hooks/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { Gift, Copy, Check, Users, Share2, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function ReferralSection() {
  const { user } = useAuth();
  const { data: referralData, isLoading } = useMyReferral();
  const redeemMutation = useRedeemReferral();
  const [copied, setCopied] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemError, setRedeemError] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  const referral = referralData?.data;

  const handleCopy = async () => {
    if (!referral?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(referral.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const input = document.createElement("input");
      input.value = referral.shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleRedeem = () => {
    if (!redeemCode.trim()) return;
    setRedeemError("");
    setRedeemSuccess(false);
    redeemMutation.mutate(redeemCode.trim().toUpperCase(), {
      onSuccess: () => {
        setRedeemSuccess(true);
        setRedeemCode("");
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error || "Érvénytelen vagy már felhasznált meghívó kód.";
        setRedeemError(msg);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-rose-600 p-8 text-white">
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Gift className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold">Hívd meg barátaidat!</h2>
          </div>
          <p className="text-white/80 text-sm max-w-md leading-relaxed mb-6">
            Oszd meg a meghívó kódodat és mindketten előnyökre tehettek szert. Minél többen
            csatlakoznak, annál jobb!
          </p>

          {/* Referral Code */}
          {referral && (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl px-5 py-3 font-mono text-lg tracking-[0.25em] font-bold text-center select-all">
                {referral.referral.code}
              </div>
              <Button
                size="lg"
                variant="secondary"
                className="shrink-0 gap-2 rounded-xl bg-white text-orange-600 hover:bg-white/90 font-semibold"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Másolva!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Másolás
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {referral?.stats && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon={<Share2 className="h-4 w-4" />}
            label="Meghívások"
            value={referral.stats.totalSent}
            color="#ff5100"
          />
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Felhasználva"
            value={referral.stats.totalRedeemed}
            color="#10b981"
          />
          <StatCard
            icon={<Sparkles className="h-4 w-4" />}
            label="Függőben"
            value={referral.stats.pendingCount}
            color="#f59e0b"
          />
        </div>
      )}

      {/* Recent redeemed */}
      {referral?.stats.recentRedeemed && referral.stats.recentRedeemed.length > 0 && (
        <div className="rounded-2xl border bg-card p-6">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Legutóbbi csatlakozások
          </h3>
          <div className="space-y-3">
            {referral.stats.recentRedeemed.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center text-white text-xs font-bold">
                  {item.receiver?.firstName?.[0] || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {[item.receiver?.firstName, item.receiver?.lastName]
                      .filter(Boolean)
                      .join(" ") || "Felhasználó"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.redeemedAt ? new Date(item.redeemedAt).toLocaleDateString("hu-HU") : ""}
                  </p>
                </div>
                <Check className="h-4 w-4 text-emerald-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Redeem a code */}
      <div className="rounded-2xl border bg-card p-6">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Gift className="h-4 w-4 text-muted-foreground" />
          Van meghívó kódod?
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Ha kaptál egy meghívó kódot valakitől, add meg itt:
        </p>
        <div className="flex gap-2">
          <Input
            value={redeemCode}
            onChange={(e) => {
              setRedeemCode(e.target.value.toUpperCase());
              setRedeemError("");
              setRedeemSuccess(false);
            }}
            placeholder="Pl. QVCK4X7F"
            className="font-mono tracking-wider uppercase"
            maxLength={8}
          />
          <Button
            onClick={handleRedeem}
            disabled={!redeemCode.trim() || redeemMutation.isPending}
            className="shrink-0 gap-2"
          >
            {redeemMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Beváltás
          </Button>
        </div>
        {redeemError && <p className="text-xs text-destructive mt-2">{redeemError}</p>}
        {redeemSuccess && (
          <p className="text-xs text-emerald-600 mt-2">✅ Meghívó kód sikeresen beváltva!</p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 text-center">
      <div
        className="flex items-center justify-center mx-auto mb-2 w-9 h-9 rounded-xl"
        style={{ backgroundColor: `${color}15`, color }}
      >
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
