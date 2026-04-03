import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, UserPlus, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";

interface AssignTemplateToClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (clientIds: string[]) => Promise<void>;
  templateType: 'workout' | 'meal';
  templateLabel: string;
}

function parseActivePlan(json: string | null, type: 'workout' | 'meal'): string {
  if (!json) return 'No active plan';
  try {
    const parsed = JSON.parse(json);
    if (type === 'workout') {
      const parts = [parsed.level, parsed.workoutType?.replace(/_/g, ' ')].filter(Boolean);
      if (parsed.daysPerWeek) parts.push(`${parsed.daysPerWeek}-Day`);
      return parts.length > 0 ? parts.join(' - ') : 'No active plan';
    }
    const parts = [parsed.calories ? `${parsed.calories} Cal` : null, parsed.dietType].filter(Boolean);
    return parts.length > 0 ? parts.join(' - ') : 'No active plan';
  } catch {
    return 'No active plan';
  }
}

export function AssignTemplateToClientsDialog({
  open, onOpenChange, onConfirm, templateType, templateLabel,
}: AssignTemplateToClientsDialogProps) {
  const { user, viewedCoachId } = useAuth();
  const effectiveCoachId = viewedCoachId || user?.id;
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const { data: clients, isLoading } = useQuery({
    queryKey: ['coachClients', effectiveCoachId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, active_workout_plan, active_meal_plan')
        .eq('coach_id', effectiveCoachId!)
        .eq('role', 'client')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!effectiveCoachId,
  });

  const filteredClients = (clients || []).filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return c.full_name?.toLowerCase().includes(query) || c.email?.toLowerCase().includes(query);
  });

  const toggleClient = (clientId: string) => {
    setSelectedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedClients.size === filteredClients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(filteredClients.map(c => c.id)));
    }
  };

  const handleConfirm = async () => {
    if (selectedClients.size === 0) return;
    setIsAssigning(true);
    try {
      await onConfirm(Array.from(selectedClients));
      setSelectedClients(new Set());
      setSearchQuery("");
      onOpenChange(false);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedClients(new Set());
      setSearchQuery("");
    }
    onOpenChange(newOpen);
  };

  const planField = templateType === 'workout' ? 'active_workout_plan' : 'active_meal_plan';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Assign Template
          </DialogTitle>
          <DialogDescription>
            Assign <span className="font-medium text-foreground">{templateLabel}</span> to selected clients.
            Their existing {templateType} plan will be replaced.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No clients match your search" : "No clients assigned to you"}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-1">
                <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                  {selectedClients.size === filteredClients.length ? "Deselect All" : "Select All"}
                </button>
                <span className="text-xs text-muted-foreground">
                  {selectedClients.size} selected
                </span>
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-1">
                <div className="space-y-1">
                  {filteredClients.map((client) => (
                    <label
                      key={client.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedClients.has(client.id)}
                        onCheckedChange={() => toggleClient(client.id)}
                      />
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                          {client.full_name?.charAt(0) || "U"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {client.full_name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {parseActivePlan(client[planField], templateType)}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedClients.size === 0 || isAssigning}>
            {isAssigning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Assign to {selectedClients.size} Client{selectedClients.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
