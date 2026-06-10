import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { ApiDebugResult, formatJSON } from "@/utils/apiDebugger";
import { toast } from "sonner";

interface ApiDebugDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: ApiDebugResult | null;
}

export function ApiDebugDialog({ isOpen, onClose, data }: ApiDebugDialogProps) {
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedModified, setCopiedModified] = useState(false);

  if (!data) return null;

  const handleCopy = async (text: string, type: 'original' | 'modified') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'original') {
        setCopiedOriginal(true);
        setTimeout(() => setCopiedOriginal(false), 2000);
      } else {
        setCopiedModified(true);
        setTimeout(() => setCopiedModified(false), 2000);
      }
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const originalJSON = data.original ? formatJSON(data.original) : '';
  const modifiedJSON = data.modified ? formatJSON(data.modified) : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            API Debug Results
            {data.success ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
          </DialogTitle>
          <DialogDescription className="text-sm space-y-1">
            <div><strong>Endpoint:</strong> {data.endpoint}</div>
            <div><strong>Attribute Path:</strong> {data.attributePath}</div>
          </DialogDescription>
        </DialogHeader>

        {!data.success && data.error && (
          <Alert variant="destructive">
            <AlertDescription>{data.error}</AlertDescription>
          </Alert>
        )}

        {data.success && (
          <div className="grid grid-cols-2 gap-4 overflow-auto flex-1">
            {/* Original Payload */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Original Payload</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(originalJSON, 'original')}
                >
                  {copiedOriginal ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto flex-1 font-mono">
                {originalJSON}
              </pre>
            </div>

            {/* Modified Payload */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Modified Payload</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(modifiedJSON, 'modified')}
                >
                  {copiedModified ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto flex-1 font-mono">
                {modifiedJSON}
              </pre>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
