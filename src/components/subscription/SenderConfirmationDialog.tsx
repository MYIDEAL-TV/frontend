import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SenderConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (senderName: string, senderEmail: string) => void;
  defaultName: string;
  defaultEmail: string;
}

export function SenderConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  defaultName,
  defaultEmail,
}: SenderConfirmationDialogProps) {
  const { t } = useTranslation("subscription");
  const [senderName, setSenderName] = useState(defaultName);
  const [senderEmail, setSenderEmail] = useState(defaultEmail);

  // Update local state when defaults change (e.g., when dialog opens)
  useEffect(() => {
    setSenderName(defaultName);
    setSenderEmail(defaultEmail);
  }, [defaultName, defaultEmail, open]);

  const handleConfirm = () => {
    onConfirm(senderName, senderEmail);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CheckCircle className="h-6 w-6 text-purple-500" />
            {t("signatureOptions.approverFlow.confirmDialog.title", "Confirm Sender Details")}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {t("signatureOptions.approverFlow.confirmDialog.description",
              "Review and update your sender information before initiating the approval workflow. This information will be used as the document sender and internal approver.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sender-name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t("signatureOptions.approverFlow.confirmDialog.senderName", "Sender Name")}
            </Label>
            <Input
              id="sender-name"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder={t("signatureOptions.approverFlow.confirmDialog.namePlaceholder", "Enter your full name")}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sender-email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {t("signatureOptions.approverFlow.confirmDialog.senderEmail", "Sender Email")}
            </Label>
            <Input
              id="sender-email"
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder={t("signatureOptions.approverFlow.confirmDialog.emailPlaceholder", "Enter your email")}
              className="w-full"
            />
          </div>

          <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-200">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Review Mode:</strong> You will be able to see and verify the document
              before the customer receives the SMS/Email invite.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("common:buttons.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!senderName.trim() || !senderEmail.trim()}
            className="bg-purple-500 hover:bg-purple-600"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {t("signatureOptions.approverFlow.confirmDialog.confirm", "Confirm & Continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
