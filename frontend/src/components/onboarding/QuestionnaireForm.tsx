import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Upload } from "lucide-react";

interface QuestionnaireFormProps {
  step: number;
  onNext?: () => void;
  onBack?: () => void;
}

export function QuestionnaireForm({ step, onNext, onBack }: QuestionnaireFormProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-2xl w-full p-8">
        {step === 0 && <ProfileStep />}
        {step === 1 && <AvailabilityStep />}
        {step === 2 && <ServicesStep />}
        {step === 3 && <PreviewStep />}

        <div className="flex justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={step === 0}
          >
            Back
          </Button>
          <Button onClick={onNext}>
            {step === 3 ? "Activate Free Trial" : "Continue"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ProfileStep() {
  return (
    <div className="space-y-6">
      <div>
        <h2>Tell us about your business</h2>
        <p className="text-muted-foreground">Let's set up your profile</p>
      </div>

      <div className="flex items-center gap-6">
        <Avatar className="h-24 w-24">
          <AvatarFallback className="bg-muted">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <div>
          <Button variant="outline" size="sm">
            Upload Logo
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            JPG, PNG or GIF. Max 2MB.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="businessName">Business Name</Label>
          <Input id="businessName" placeholder="e.g., SparkleClean Pro" />
        </div>

        <div>
          <Label htmlFor="serviceType">Service Type</Label>
          <Select>
            <SelectTrigger id="serviceType">
              <SelectValue placeholder="Select service type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cleaning">Cleaning</SelectItem>
              <SelectItem value="gardening">Gardening</SelectItem>
              <SelectItem value="carwash">Car Wash</SelectItem>
              <SelectItem value="plumbing">Plumbing</SelectItem>
              <SelectItem value="electrical">Electrical</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" placeholder="e.g., Amsterdam" />
          </div>
          <div>
            <Label htmlFor="teamSize">Team Size</Label>
            <Select>
              <SelectTrigger id="teamSize">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solo">Just me</SelectItem>
                <SelectItem value="2-5">2-5 people</SelectItem>
                <SelectItem value="6-10">6-10 people</SelectItem>
                <SelectItem value="11+">11+ people</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="description">Business Description</Label>
          <Textarea
            id="description"
            placeholder="Tell customers what makes your business special..."
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}

function AvailabilityStep() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="space-y-6">
      <div>
        <h2>Set your availability</h2>
        <p className="text-muted-foreground">Choose when you're available for bookings</p>
      </div>

      <div className="space-y-3">
        {days.map((day) => (
          <div key={day} className="flex items-center gap-4 p-3 border rounded-lg">
            <input type="checkbox" id={day} className="h-4 w-4" defaultChecked={day !== "Sunday"} />
            <Label htmlFor={day} className="flex-1 cursor-pointer">{day}</Label>
            <div className="flex gap-2">
              <Input type="time" defaultValue="09:00" className="w-32" />
              <span className="flex items-center">to</span>
              <Input type="time" defaultValue="17:00" className="w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServicesStep() {
  return (
    <div className="space-y-6">
      <div>
        <h2>Add your services</h2>
        <p className="text-muted-foreground">Set up your pricing and service offerings</p>
      </div>

      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="p-4 border rounded-lg space-y-3">
            <div>
              <Label>Service Name</Label>
              <Input placeholder="e.g., Basic House Cleaning" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (€)</Label>
                <Input type="number" placeholder="50" />
              </div>
              <div>
                <Label>Duration</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Describe what's included..." rows={2} />
            </div>
          </div>
        ))}
        <Button variant="outline" className="w-full">+ Add Another Service</Button>
      </div>
    </div>
  );
}

function PreviewStep() {
  return (
    <div className="space-y-6">
      <div>
        <h2>You're all set!</h2>
        <p className="text-muted-foreground">Here's your booking page preview</p>
      </div>

      <div className="bg-tertiary/30 p-6 rounded-lg space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-white">SC</AvatarFallback>
          </Avatar>
          <div>
            <h3>SparkleClean Pro</h3>
            <p className="text-muted-foreground">Cleaning • Amsterdam</p>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg">
          <h4 className="mb-2">Your Booking Link</h4>
          <div className="flex gap-2">
            <Input value="qvick.app/sparkleClean" readOnly className="flex-1" />
            <Button variant="outline">Copy</Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card p-4 rounded-lg text-center">
            <div className="text-2xl text-primary mb-1">0</div>
            <div className="text-sm text-muted-foreground">Bookings</div>
          </div>
          <div className="bg-card p-4 rounded-lg text-center">
            <div className="text-2xl text-primary mb-1">€0</div>
            <div className="text-sm text-muted-foreground">Revenue</div>
          </div>
          <div className="bg-card p-4 rounded-lg text-center">
            <div className="text-2xl text-primary mb-1">5.0</div>
            <div className="text-sm text-muted-foreground">Rating</div>
          </div>
        </div>
      </div>
    </div>
  );
}
