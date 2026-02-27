import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Mail, Calendar, Target, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDisplayDate } from "@/lib/date-utils";
import {
  mapLegacyPackage,
  getPackageBadgeColor,
  calculateEndDate,
} from "@/lib/coach-utils";

interface ClientDetailsSheetProps {
  client: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenDashboard: (clientId: string) => void;
}

export function ClientDetailsSheet({
  client,
  open,
  onOpenChange,
  onOpenDashboard,
}: ClientDetailsSheetProps) {
  if (!client) return null;

  const pkg = mapLegacyPackage(client.package_type);
  const endDate = calculateEndDate(
    client.package_start_date,
    client.package_duration
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="pb-4">
          <SheetTitle>Client Details</SheetTitle>
          <SheetDescription>
            View profile and program information
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] pr-4">
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={client.avatar_url} />
                <AvatarFallback className="text-lg font-bold">
                  {client.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-bold">
                  {client.full_name || "Unknown"}
                </h3>
                <p className="text-sm text-muted-foreground">{client.email}</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-1 capitalize",
                    getPackageBadgeColor(pkg)
                  )}
                >
                  {pkg} Package
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Contact Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Contact
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{client.email || "No email"}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.country && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Location:</span>
                    <span>{client.country}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Program Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Program
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {client.package_start_date
                        ? formatDisplayDate(client.package_start_date)
                        : "Not started"}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">End Date</p>
                  <p className="text-sm font-medium">
                    {endDate || "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-sm font-medium">
                    {client.package_duration
                      ? `${client.package_duration} months`
                      : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p className="text-sm font-medium">
                    {client.created_at
                      ? formatDisplayDate(client.created_at)
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Goals & Health */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Goals & Health
              </h4>
              <div className="space-y-2">
                {client.primary_goal && (
                  <div className="flex items-start gap-2 text-sm">
                    <Target className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Primary Goal
                      </p>
                      <p className="font-medium">{client.primary_goal}</p>
                    </div>
                  </div>
                )}
                {client.injuries && (
                  <div className="flex items-start gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Injuries</p>
                      <p>{client.injuries}</p>
                    </div>
                  </div>
                )}
                {client.medical_conditions && (
                  <div className="flex items-start gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Medical Conditions
                      </p>
                      <p>{client.medical_conditions}</p>
                    </div>
                  </div>
                )}
                {!client.primary_goal &&
                  !client.injuries &&
                  !client.medical_conditions && (
                    <p className="text-sm text-muted-foreground">
                      No goals or health notes on file.
                    </p>
                  )}
              </div>
            </div>

            <Separator />

            {/* Open Dashboard Button */}
            <Button
              className="w-full"
              onClick={() => {
                onOpenDashboard(client.id);
                onOpenChange(false);
              }}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Open Full Dashboard
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
