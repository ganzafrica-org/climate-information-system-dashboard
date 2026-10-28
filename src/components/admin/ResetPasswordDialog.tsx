import { useState } from "react";
import { Check, Copy, KeyRound, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import type { User } from "@/lib/api";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export default function ResetPasswordDialog({ open, onOpenChange, user }: ResetPasswordDialogProps) {
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const close = (next: boolean) => {
    if (!next) {
      setPassword(null);
      setCopied(false);
    }
    onOpenChange(next);
  };

  const reset = async () => {
    try {
      setBusy(true);
      const result = await api.resetUserPassword(user.id);
      setPassword(result.temporaryPassword);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to reset password");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success("Password copied");
    } catch {
      toast.error("Could not copy the password");
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-[#147677]" />
            Reset password
          </DialogTitle>
          <DialogDescription>
            Reset password for {user.email || user.username}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-slate-600">
          Ask them to change this password for security purposes.
        </p>

        {password && (
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-[#f3fafa] px-3 py-2 font-mono text-sm text-slate-900 break-all">
              {password}
            </code>
            <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy password">
              {copied ? <Check className="h-4 w-4 text-[#147677]" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        )}

        <DialogFooter>
          {password ? (
            <Button type="button" className="bg-[#147677] text-white hover:bg-[#0f5f60]" onClick={() => close(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => close(false)} disabled={busy}>Cancel</Button>
              <Button type="button" className="bg-[#147677] text-white hover:bg-[#0f5f60]" onClick={reset} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset password"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
