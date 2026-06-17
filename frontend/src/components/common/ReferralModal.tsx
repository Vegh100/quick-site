import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Gift, Copy, Mail, Share2, Check } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface ReferralModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReferralModal({ open, onOpenChange }: ReferralModalProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const referralCode = user?.id ? user.id.slice(0, 8).toUpperCase() : "";
  const referralLink = `${window.location.origin}/ref/${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent("Csatlakozz a Qvick-hez!");
    const body = encodeURIComponent(
      `Szia!\n\nPróbáld ki a Qvick-et, egy szuper szolgáltatás piacteret!\n\nRegisztrálj itt: ${referralLink}\n\nÜdv!`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Qvick – Szolgáltatás piactér",
          text: "Csatlakozz a Qvick-hez!",
          url: referralLink,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Ajánlás és jutalom
          </DialogTitle>
          <DialogDescription>
            Oszd meg a Qvick-et más vállalkozásokkal és szerezz jutalmat, ha csatlakoznak
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 p-6 rounded-lg text-center">
            <div className="text-4xl mb-2">🎁</div>
            <h3 className="mb-2">Kapj 1 hónap ingyeneset!</h3>
            <p className="text-sm text-muted-foreground">
              Hívj meg egy vállalkozást a Qvick-re, és mindketten kaptok 1 ingyenes hónapot a
              regisztrációkor
            </p>
          </div>

          <div>
            <Label htmlFor="referralLink">Ajánló linked</Label>
            <div className="flex gap-2 mt-2">
              <Input id="referralLink" value={referralLink} readOnly className="flex-1" />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="w-full" onClick={handleEmail}>
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
            <Button variant="outline" className="w-full" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Megosztás
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
