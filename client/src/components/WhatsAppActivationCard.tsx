import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Sparkles, Zap, Calendar } from "lucide-react";

interface WhatsAppActivationCardProps {
  whatsappNumber: string;
  defaultMessage?: string;
}

export function WhatsAppActivationCard({
  whatsappNumber,
  defaultMessage = "Hi! I want to activate my Dawnage AI fitness assistant.",
}: WhatsAppActivationCardProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleActivate = () => {
    // Encode message for URL
    const encodedMessage = encodeURIComponent(defaultMessage);

    // WhatsApp click-to-chat URL
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    // Open WhatsApp in new window
    window.open(whatsappUrl, "_blank");
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  if (isDismissed) {
    return null;
  }

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* WhatsApp Icon */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-green-500 flex items-center justify-center shadow-lg">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-2xl font-bold text-green-900 dark:text-green-100">
                Activate Dawnage AI Assistant
              </h3>
              <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
            </div>

            <p className="text-green-800 dark:text-green-200 mb-4 text-base">
              Get personalized fitness coaching directly on WhatsApp! Track your progress, receive daily reminders, and get instant feedback.
            </p>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="font-medium">Daily Check-ins</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="font-medium">Real-time Coaching</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="font-medium">Smart Reminders</span>
              </div>
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleActivate}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Activate on WhatsApp
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative background pattern */}
      <div className="absolute bottom-0 right-0 opacity-10 pointer-events-none">
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
          <circle cx="150" cy="150" r="100" fill="currentColor" className="text-green-600" />
          <circle cx="180" cy="120" r="60" fill="currentColor" className="text-green-500" />
        </svg>
      </div>
    </Card>
  );
}
