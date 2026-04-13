import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import logoUrl from "@assets/logo.png";
import { Lock, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const { toast } = useToast();
  const { passwordRecoveryPending, clearPasswordRecovery, signOut } = useAuth();

  useEffect(() => {
    if (!passwordRecoveryPending) {
      setLocation("/login");
    }
  }, [passwordRecoveryPending, setLocation]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      clearPasswordRecovery();
      await signOut();
      setIsComplete(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!passwordRecoveryPending && !isComplete) {
    return null;
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <div className="fixed inset-0 z-0 opacity-10 pointer-events-none pattern-grid-lg" />
        <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />

        <Card className="w-full max-w-md p-6 sm:p-8 space-y-6 sm:space-y-8 relative z-10 shadow-2xl border-primary/10 rounded-3xl bg-background/80 backdrop-blur-xl overflow-hidden">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Password reset successful</h1>
            <p className="text-muted-foreground">
              Your password has been updated. Please log in with your new password.
            </p>
          </div>

          <Button
            onClick={() => setLocation("/login")}
            className="w-full h-12 text-base font-semibold rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all"
          >
            Back to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="fixed inset-0 z-0 opacity-10 pointer-events-none pattern-grid-lg" />
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />

      <Card className="w-full max-w-md p-6 sm:p-8 space-y-6 sm:space-y-8 relative z-10 shadow-2xl border-primary/10 rounded-3xl bg-background/80 backdrop-blur-xl overflow-hidden">
        <div className="text-center space-y-4">
          <img src={logoUrl} alt="Dawnage AI" className="w-32 mx-auto drop-shadow-md" />
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Set new password</h1>
            <p className="text-sm text-muted-foreground">
              Enter your new password below
            </p>
          </div>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-sm font-medium">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 pr-10 h-12 rounded-2xl bg-muted/30 border-0 focus-visible:ring-primary/20"
                required
                minLength={6}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 h-12 rounded-2xl bg-muted/30 border-0 focus-visible:ring-primary/20"
                required
                minLength={6}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 text-base font-semibold rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
