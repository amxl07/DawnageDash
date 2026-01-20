import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import logoUrl from "@assets/dashboard_1762285477469.png";
import { Mail, Loader2, User, Phone, Lock, Key, Eye, EyeOff, ArrowRight, ArrowLeft, Search, Check, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { allCountryCodes, getCodeByCountry } from "@/lib/countryCodes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<typeof allCountryCodes[0] | null>(null);
  const [countryCode, setCountryCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isCoachSignup, setIsCoachSignup] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  const [showVerificationMessage, setShowVerificationMessage] = useState(false);

  // Wizard Step: 1 for Identity, 2 for Security
  const [step, setStep] = useState(1);

  const { toast } = useToast();
  const { user } = useAuth();

  // Memoized filtered countries for performance
  const filteredCountries = useMemo(() => {
    if (!countrySearch) return allCountryCodes;
    const search = countrySearch.toLowerCase();
    return allCountryCodes.filter(c =>
      c.country.toLowerCase().includes(search) ||
      c.code.includes(search)
    );
  }, [countrySearch]);

  useEffect(() => {
    if (user && !showVerificationMessage) {
      setLocation("/");
    }
  }, [user, setLocation, showVerificationMessage]);

  // Reset step when toggling between Login/Signup
  useEffect(() => {
    setStep(1);
    setShowVerificationMessage(false);
  }, [isSignUp]);

  const handleNextStep = () => {
    // Validate Step 1
    if (!fullName.trim()) {
      toast({ title: "Name required", description: "Please enter your full name", variant: "destructive" });
      return;
    }
    if (!selectedCountry) {
      toast({ title: "Country required", description: "Please select your country", variant: "destructive" });
      return;
    }
    if (!phoneNumber.trim()) {
      toast({ title: "Phone required", description: "Please enter your phone number", variant: "destructive" });
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        if (password !== confirmPassword) throw new Error("Passwords do not match");

        const coachAccessKey = import.meta.env.VITE_COACH_ACCESS_KEY;
        if (isCoachSignup && (!coachAccessKey || accessKey !== coachAccessKey)) {
          throw new Error("Invalid Coach Access Key");
        }

        const fullPhoneNumber = `${countryCode}${phoneNumber}`;

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone_number: fullPhoneNumber,
              country: selectedCountry?.country || '',
              role: isCoachSignup ? 'coach' : 'client',
            }
          }
        });

        if (error) throw error;

        toast({
          title: "Success! Please check your email.",
          description: "We've sent a verification link to your inbox.",
        });

        setShowVerificationMessage(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({ title: "Welcome back!", description: "Successfully logged in." });
        setLocation("/");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showVerificationMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <div className="fixed inset-0 z-0 opacity-10 pointer-events-none pattern-grid-lg" />
        <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />

        <Card className="w-full max-w-md p-6 sm:p-8 space-y-6 sm:space-y-8 relative z-10 shadow-2xl border-primary/10 rounded-3xl bg-background/80 backdrop-blur-xl overflow-hidden">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
            <p className="text-muted-foreground">
              We've sent a verification link to <span className="font-semibold text-foreground">{email}</span>. Please check your inbox and confirm your email to access the dashboard.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => setIsSignUp(false)}
              className="w-full h-12 text-base font-semibold rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all"
            >
              Back to Login
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Didn't receive the email? Check your spam folder or try signing up again.
            </p>
          </div>
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

          <motion.div
            key={isSignUp ? "signup-headers" : "login-headers"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1"
          >
            <h1 className="text-3xl font-bold tracking-tight">
              {isSignUp ? (step === 1 ? "Let's get started" : "Secure your account") : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSignUp
                ? (step === 1 ? "Tell us a bit about yourself" : "Create your credentials")
                : "Enter your credentials to access your account"}
            </p>
          </motion.div>
        </div>

        {isSignUp && (
          <Tabs
            defaultValue="client"
            value={isCoachSignup ? "coach" : "client"}
            onValueChange={(v) => setIsCoachSignup(v === "coach")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 rounded-2xl h-12 bg-muted/50 p-1">
              <TabsTrigger value="client" className="rounded-xl text-sm font-medium transition-all">Client</TabsTrigger>
              <TabsTrigger value="coach" className="rounded-xl text-sm font-medium transition-all">Coach</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <AnimatePresence mode="wait">
            {isSignUp && step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 h-12 rounded-2xl bg-muted/30 border-0 focus-visible:ring-primary/20"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Country Selection - Searchable Combobox */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Country</Label>
                  <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryOpen}
                        className="w-full h-12 justify-between rounded-2xl bg-muted/30 border-0 hover:bg-muted/50 px-4"
                      >
                        {selectedCountry ? (
                          <span className="flex items-center gap-3">
                            <span className="text-xl">{selectedCountry.flag}</span>
                            <span className="font-medium">{selectedCountry.country}</span>
                            <span className="text-muted-foreground text-sm">({selectedCountry.code})</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Select your country...</span>
                        )}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-2xl" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search country or code..."
                          value={countrySearch}
                          onValueChange={setCountrySearch}
                          className="h-11"
                        />
                        <CommandList className="max-h-[280px]">
                          <CommandEmpty>No country found.</CommandEmpty>
                          <CommandGroup>
                            {filteredCountries.slice(0, 50).map((item) => (
                              <CommandItem
                                key={`${item.country}-${item.code}`}
                                value={`${item.country} ${item.code}`}
                                onSelect={() => {
                                  setSelectedCountry(item);
                                  setCountryCode(item.code);
                                  setCountryOpen(false);
                                  setCountrySearch("");
                                }}
                                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                              >
                                <span className="text-xl">{item.flag}</span>
                                <span className="flex-1 font-medium">{item.country}</span>
                                <span className="text-muted-foreground text-sm font-mono">{item.code}</span>
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    selectedCountry?.country === item.country
                                      ? "opacity-100 text-primary"
                                      : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* WhatsApp Number - Full Width */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">WhatsApp Number</Label>
                  <div className="flex gap-2">
                    {/* Country Code Edit - Auto populated but editable */}
                    <div className="relative flex items-center h-12 rounded-2xl bg-muted/30 border-0 shrink-0 min-w-[70px] w-[80px] focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                      <Input
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="h-full w-full bg-transparent border-0 focus-visible:ring-0 px-2 font-mono font-medium text-sm text-center"
                        placeholder="+00"
                      />
                    </div>
                    <div className="relative flex-1">
                      <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        className="pl-10 h-12 rounded-2xl bg-muted/30 border-0 focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We'll use this to connect you with your AI coach on WhatsApp
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full h-12 text-base font-semibold rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all mt-4"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            ) : (
              // Step 2 or Login View
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: isSignUp ? 20 : 0 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 rounded-2xl bg-muted/30 border-0 focus-visible:ring-primary/20"
                      required
                      autoFocus={!isSignUp}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    {!isSignUp && (
                      <a href="#" className="text-xs text-primary hover:underline font-medium">Forgot?</a>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={isSignUp ? "Create a password" : "Enter your password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 rounded-2xl bg-muted/30 border-0 focus-visible:ring-primary/20"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 h-12 rounded-2xl bg-muted/30 border-0 focus-visible:ring-primary/20"
                        required
                        minLength={6}
                      />
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-500 font-medium">Passwords do not match</p>
                    )}
                  </div>
                )}

                {isSignUp && isCoachSignup && (
                  <div className="p-4 bg-primary/5 rounded-2xl space-y-3 border border-primary/10">
                    <div className="space-y-2">
                      <Label htmlFor="accessKey" className="text-primary font-semibold text-xs uppercase tracking-wider">Coach Access Key</Label>
                      <div className="relative">
                        <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="accessKey"
                          type="password"
                          placeholder="Verification Key"
                          value={accessKey}
                          onChange={(e) => setAccessKey(e.target.value)}
                          className="pl-10 h-11 rounded-xl bg-background border-primary/20 focus-visible:ring-primary/30"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  {isSignUp && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      className="h-12 w-14 rounded-2xl border-2"
                      title="Back"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                  )}
                  <Button
                    type="submit"
                    size="lg"
                    className="flex-1 h-12 text-base font-semibold rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all"
                    disabled={isLoading || (isSignUp && password !== confirmPassword)}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      isSignUp ? "Create My Account" : "Sign In to Dawnage"
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <div className="text-center space-y-4 pt-2">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background/80 backdrop-blur-xl px-4 text-muted-foreground font-medium">
                Or
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full h-12 rounded-2xl hover:bg-muted/50 transition-colors"
          >
            {isSignUp ? (
              <p className="text-sm">
                Already have an account? <span className="text-primary font-bold ml-1">Sign in</span>
              </p>
            ) : (
              <p className="text-sm">
                New to Dawnage? <span className="text-primary font-bold ml-1">Create an account</span>
              </p>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
