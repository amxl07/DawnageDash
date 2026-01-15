import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/useOnboarding";
import { CheckCircle2, ArrowRight, Play, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Video components
const YouTubeEmbed = ({ videoId, title }: { videoId: string; title: string }) => (
    <div className="relative w-full pb-[56.25%] rounded-xl overflow-hidden shadow-lg border border-border bg-black">
        <iframe
            src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
            title={title}
            className="absolute top-0 left-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
        />
    </div>
);

export function OnboardingFlow() {
    const { step, updateStep, isUpdating } = useOnboarding();
    const [localStep, setLocalStep] = useState(step);

    // Sync local step with server step
    useEffect(() => {
        setLocalStep(step);
    }, [step]);

    const handleNext = async () => {
        const nextStep = localStep + 1;
        setLocalStep(nextStep); // Optimistic update
        await updateStep(nextStep);
    };

    const WhatsAppCard = () => (
        <div className="flex flex-col items-center text-center space-y-6 pt-4">
            <div className="w-20 h-20 rounded-2xl bg-green-500 flex items-center justify-center shadow-lg animate-pulse">
                <MessageCircle className="w-10 h-10 text-white" />
            </div>

            <div className="space-y-2">
                <h3 className="text-2xl font-bold text-green-900 dark:text-green-100">Activate Your AI Coach</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                    Connect with us on WhatsApp for 24/7 instant coaching, nutrition logging, and daily motivation.
                </p>
                <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-3 rounded-lg text-sm text-amber-800 dark:text-amber-200 font-medium">
                    ⚠️ IMPORTANT: Only activate this on the start date of your plan.
                </div>
            </div>

            <Button
                size="lg"
                className="w-full sm:w-auto bg-[#25D366] hover:bg-[#128C7E] text-white font-bold text-lg px-8 py-6 rounded-full shadow-xl transition-all transform hover:scale-105"
                onClick={() => {
                    const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || "918075054992";
                    const message = import.meta.env.VITE_WHATSAPP_DEFAULT_MESSAGE || "Hi! I want to activate my Dawnage AI fitness assistant.";
                    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, "_blank");
                    handleNext(); // Complete onboarding on click
                }}
            >
                <MessageCircle className="w-6 h-6 mr-2" />
                Activate on WhatsApp
            </Button>
        </div>
    );

    if (localStep >= 3) return null; // Should be handled by parent, but safety check

    return (
        <div className="w-full max-w-4xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Card className="overflow-hidden border-2 border-primary/10 shadow-2xl bg-gradient-to-br from-card to-secondary/20">

                {/* Progress Bar */}
                <div className="flex w-full h-2 bg-secondary">
                    <div className={cn("h-full bg-primary transition-all duration-500 ease-out", localStep === 0 && "w-[33%]", localStep === 1 && "w-[66%]", localStep === 2 && "w-[100%]")} />
                </div>

                <div className="p-6 md:p-8 lg:p-10 space-y-8">

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                                    {localStep + 1}
                                </span>
                                {localStep === 0 && "Welcome to Dawnage"}
                                {localStep === 1 && "How It Works"}
                                {localStep === 2 && "Final Step"}
                            </h2>
                            <p className="text-muted-foreground ml-10">
                                {localStep === 0 && "Watch this quick intro to get started"}
                                {localStep === 1 && "Understand your personalized plan"}
                                {localStep === 2 && "Connect your dedicated AI assistant"}
                            </p>
                        </div>

                        <div className="text-sm font-medium text-muted-foreground hidden sm:block">
                            {localStep < 2 ? "Step " + (localStep + 1) + " of 3" : "Final Step"}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="min-h-[400px] flex flex-col justify-center">
                        {localStep === 0 && (
                            <div className="space-y-6">
                                <YouTubeEmbed videoId="QX3_LQxnMXI" title="Dawnage Introduction" />
                            </div>
                        )}

                        {localStep === 1 && (
                            <div className="space-y-6">
                                <YouTubeEmbed videoId="zmyQxmksUuc" title="How Dawnage Works" />
                            </div>
                        )}

                        {localStep === 2 && <WhatsAppCard />}
                    </div>

                    {/* Footer / Navigation */}
                    {localStep < 2 && (
                        <div className="flex justify-end pt-4 border-t">
                            <Button
                                size="lg"
                                onClick={handleNext}
                                disabled={isUpdating}
                                className="group text-lg px-8"
                            >
                                Continue Next
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
