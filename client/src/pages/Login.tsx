import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoUrl from "@assets/dashboard_1762285477469.png";
import { Phone } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login with phone:", phoneNumber);
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 rounded-2xl">
        <div className="mb-8 text-center">
          <img src={logoUrl} alt="Dawnage AI" className="w-full max-w-[200px] mx-auto mb-6" data-testid="img-logo" />
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">
            Enter your phone number to access your personalized fitness dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="rounded-xl pl-11"
                data-testid="input-phone-number"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              We'll verify your identity with this number
            </p>
          </div>

          <Button type="submit" size="lg" className="w-full rounded-xl" data-testid="button-login">
            Access Dashboard
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t text-center">
          <p className="text-sm text-muted-foreground">
            Gain unprecedented insights into your fitness journey
          </p>
        </div>
      </Card>
    </div>
  );
}
