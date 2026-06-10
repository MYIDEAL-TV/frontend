import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// VITE_API_URL should point to your backend
const API_URL = import.meta.env.VITE_API_URL;

export const NicknameModal = ({ isOpen, onClose, onConfirm, userEmail }) => {
  const { toast } = useToast();
  const [nickname, setNickname] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const verifyNickname = async () => {
    if (!nickname.trim()) return;
    setIsChecking(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(
        `${API_URL}/api/admin/subscriptions/check-nickname?email=${encodeURIComponent(
          userEmail
        )}&nickname=${encodeURIComponent(nickname)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await res.json();
      setIsAvailable(data.isAvailable);
      if (!data.isAvailable) {
        toast({
          title: "Unavailable",
          description: "You already have a subscription with this name.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to verify nickname." });
    } finally {
      setIsChecking(false);
    }
  };

  const handleConfirm = () => {
    if (isAvailable) {
      onConfirm(nickname.trim());
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Name Your Subscription</DialogTitle>
          <DialogDescription>
            Give this subscription a unique nickname (e.g., "Villa Master
            Bedroom", "Lobby TV") so you can easily identify it later.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 mt-4">
          <Input
            placeholder="Enter nickname..."
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setIsAvailable(null);
            }}
          />
          <Button
            onClick={verifyNickname}
            disabled={isChecking || !nickname.trim()}
            variant="secondary"
          >
            {isChecking ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              "Verify"
            )}
          </Button>
        </div>
        {isAvailable === true && (
          <p className="text-sm text-green-600 flex items-center mt-2">
            <Check className="h-4 w-4 mr-1" /> Available
          </p>
        )}
        {isAvailable === false && (
          <p className="text-sm text-red-600 flex items-center mt-2">
            <X className="h-4 w-4 mr-1" /> Name in use
          </p>
        )}

        <Button
          className="w-full mt-4"
          onClick={handleConfirm}
          disabled={!isAvailable}
        >
          Confirm & Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
};
