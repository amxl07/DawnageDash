import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface WhatsAppOnboardingDialogProps {
  whatsappNumber: string; // Phone number without special characters, e.g., "919876543210"
  defaultMessage?: string; // Optional pre-filled message
}

export function WhatsAppOnboardingDialog({
  whatsappNumber,
  defaultMessage = "Hi! I just signed up for Dawnage AI and want to configure my assistant.",
}: WhatsAppOnboardingDialogProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Check if user is new and hasn't dismissed this dialog before
    if (!user) return;

    console.log("WhatsApp Dialog - User object:", user);
    console.log("WhatsApp Dialog - User created_at:", user.created_at);

    const hasSeenOnboarding = localStorage.getItem(
      `whatsapp_onboarding_seen_${user.id}`
    );

    console.log("WhatsApp Dialog - Has seen onboarding:", hasSeenOnboarding);

    // Check if user signed up recently (within last 24 hours)
    // Supabase user.created_at is a string in ISO format
    if (user.created_at) {
      const userCreatedAt = new Date(user.created_at);
      const now = new Date();
      const hoursSinceSignup = (now.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60);

      console.log("WhatsApp Dialog - Hours since signup:", hoursSinceSignup);

      // Show dialog if:
      // 1. User hasn't seen it before
      // 2. AND user signed up within last 24 hours
      if (!hasSeenOnboarding && hoursSinceSignup < 24) {
        console.log("WhatsApp Dialog - Showing dialog!");
        // Show dialog after a short delay for better UX
        const timer = setTimeout(() => {
          setOpen(true);
        }, 2000); // 2 second delay

        return () => clearTimeout(timer);
      } else {
        console.log("WhatsApp Dialog - Not showing. Reasons:", {
          hasSeenOnboarding,
          hoursSinceSignup,
          tooOld: hoursSinceSignup >= 24
        });
      }
    } else {
      // If no created_at (shouldn't happen), show to all users who haven't seen it
      console.log("WhatsApp Dialog - No created_at found, showing to all new users");
      if (!hasSeenOnboarding) {
        const timer = setTimeout(() => {
          setOpen(true);
        }, 2000);

        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const handleOpenWhatsApp = () => {
    if (!user) return;

    // Mark as seen
    localStorage.setItem(`whatsapp_onboarding_seen_${user.id}`, "true");

    // Encode message for URL
    const encodedMessage = encodeURIComponent(defaultMessage);

    // WhatsApp click-to-chat URL
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    // Open WhatsApp in new window
    window.open(whatsappUrl, "_blank");

    // Close dialog
    setOpen(false);
  };

  const handleDismiss = () => {
    if (!user) return;

    // Mark as seen so it won't show again
    localStorage.setItem(`whatsapp_onboarding_seen_${user.id}`, "true");
    setOpen(false);
  };

  const handleRemindLater = () => {
    // Just close the dialog without marking as seen
    // It will show again on next dashboard visit (within 24 hours of signup)
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <DialogTitle className="text-2xl">
                Configure Your AI Assistant
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-base pt-4">
            Get personalized fitness coaching directly on WhatsApp! Connect with
            your Dawnage AI assistant to:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-primary text-sm font-semibold">1</span>
            </div>
            <div>
              <p className="font-medium">Daily Check-ins via Chat</p>
              <p className="text-sm text-muted-foreground">
                Log your workouts, meals, and measurements conversationally
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-primary text-sm font-semibold">2</span>
            </div>
            <div>
              <p className="font-medium">Real-time Coaching & Tips</p>
              <p className="text-sm text-muted-foreground">
                Get instant feedback and personalized recommendations
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-primary text-sm font-semibold">3</span>
            </div>
            <div>
              <p className="font-medium">Progress Updates & Reminders</p>
              <p className="text-sm text-muted-foreground">
                Stay motivated with regular insights and encouragement
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleRemindLater}
            className="w-full sm:w-auto"
          >
            Remind Me Later
          </Button>
          <Button
            variant="ghost"
            onClick={handleDismiss}
            className="w-full sm:w-auto"
          >
            <X className="w-4 h-4 mr-2" />
            Don't Show Again
          </Button>
          <Button
            onClick={handleOpenWhatsApp}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Open WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
