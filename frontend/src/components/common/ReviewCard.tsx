import { useState } from "react";
import { Card } from "../ui/card";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Star, MessageSquare, Send, Loader2, CheckCircle2 } from "lucide-react";

interface ReviewCardProps {
  /** Review ID — needed for provider responses */
  reviewId?: string;
  customer: string;
  rating: number;
  comment: string;
  date: string;
  service: string;
  /** Provider's response to this review (if any) */
  providerResponse?: string | null;
  providerRespondedAt?: string | null;
  /** If true, show the "respond" button for providers */
  canRespond?: boolean;
  /** Callback when provider submits a response */
  onRespond?: (reviewId: string, response: string) => void;
  /** Whether the respond mutation is pending */
  isResponding?: boolean;
}

export function ReviewCard({
  reviewId,
  customer,
  rating,
  comment,
  date,
  service,
  providerResponse,
  providerRespondedAt,
  canRespond = false,
  onRespond,
  isResponding = false,
}: ReviewCardProps) {
  const [showRespondForm, setShowRespondForm] = useState(false);
  const [responseText, setResponseText] = useState("");

  const handleSubmitResponse = () => {
    if (!responseText.trim() || !reviewId || !onRespond) return;
    onRespond(reviewId, responseText.trim());
    setShowRespondForm(false);
    setResponseText("");
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Avatar>
          <AvatarFallback className="bg-primary/10 text-primary">
            {customer
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-sm">{customer}</h4>
              {service && (
                <p className="text-xs text-muted-foreground">{service}</p>
              )}
            </div>
            <span className="text-xs text-muted-foreground shrink-0 ml-2">
              {date}
            </span>
          </div>

          {/* Stars */}
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          {/* Comment */}
          {comment && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              &bdquo;{comment}&rdquo;
            </p>
          )}

          {/* Provider Response (if exists) */}
          {providerResponse && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1.5 mb-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  Szolgáltató válasza
                </span>
                {providerRespondedAt && (
                  <span className="text-[10px] text-muted-foreground ml-1">
                    {new Date(providerRespondedAt).toLocaleDateString("hu-HU")}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground pl-5 leading-relaxed">
                {providerResponse}
              </p>
            </div>
          )}

          {/* Respond Button (for providers, when no response exists) */}
          {canRespond && !providerResponse && !showRespondForm && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs h-7 mt-1 text-muted-foreground hover:text-primary"
              onClick={() => setShowRespondForm(true)}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Válasz írása
            </Button>
          )}

          {/* Respond Form */}
          {showRespondForm && (
            <div className="mt-2 space-y-2">
              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Köszönjük a véleményt! ..."
                rows={2}
                className="text-sm resize-none"
                maxLength={1000}
              />
              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setShowRespondForm(false);
                    setResponseText("");
                  }}
                >
                  Mégse
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={!responseText.trim() || isResponding}
                  onClick={handleSubmitResponse}
                >
                  {isResponding ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  Válasz küldése
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
