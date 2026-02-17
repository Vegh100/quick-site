import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { CheckCircle, AlertCircle, XCircle, Info } from "lucide-react";

export function DesignShowcase() {
  return (
    <div className="space-y-8">
      <Card className="p-6">
        <h3 className="mb-4">Color Palette</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="h-20 rounded-lg bg-primary mb-2" />
            <p className="text-sm">Primary</p>
            <p className="text-xs text-muted-foreground">#FF5100</p>
          </div>
          <div>
            <div className="h-20 rounded-lg bg-accent mb-2" />
            <p className="text-sm">Accent</p>
            <p className="text-xs text-muted-foreground">#FF8200</p>
          </div>
          <div>
            <div className="h-20 rounded-lg bg-secondary mb-2" />
            <p className="text-sm">Secondary</p>
            <p className="text-xs text-muted-foreground">#FFC929</p>
          </div>
          <div>
            <div className="h-20 rounded-lg bg-tertiary border mb-2" />
            <p className="text-sm">Tertiary</p>
            <p className="text-xs text-muted-foreground">#FFF4D5</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4">Buttons</h3>
        <div className="flex flex-wrap gap-3">
          <Button>Primary Button</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4">Badges</h3>
        <div className="flex flex-wrap gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4">Form Elements</h3>
        <div className="space-y-4 max-w-md">
          <Input placeholder="Input field" />
          <Input placeholder="With icon" className="pl-10" />
          <Input type="email" placeholder="Email input" />
          <Input disabled placeholder="Disabled input" />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4">Alerts & Toasts</h3>
        <div className="space-y-3">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              Success! Your booking has been confirmed.
            </AlertDescription>
          </Alert>

          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              Your trial ends in 7 days. Upgrade to keep your bookings active.
            </AlertDescription>
          </Alert>

          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-900">
              Warning: You have 3 unconfirmed bookings.
            </AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Error: Unable to process payment. Please try again.
            </AlertDescription>
          </Alert>
        </div>
      </Card>
    </div>
  );
}
