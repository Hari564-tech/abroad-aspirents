import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import { REJECT_REASONS } from "@/lib/documents";
import { useAppStore } from "@/lib/store";
import type { StudentDocument } from "@/lib/types";
import { toast } from "sonner";

export function DocumentRejectModal({
  open,
  onOpenChange,
  document,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  document: StudentDocument | null;
}) {
  const reject = useAppStore((s) => s.rejectDocument);
  const [reason, setReason] = useState<string>(REJECT_REASONS[1]);
  const [note, setNote] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject document</DialogTitle>
          <DialogDescription>The student will see the reason and can upload a replacement.</DialogDescription>
        </DialogHeader>
        <FormField label="Reason" required>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REJECT_REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Additional note">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (!document) return;
              reject(document.id, reason, note.trim() || undefined);
              toast.success("Document rejected");
              onOpenChange(false);
              setNote("");
            }}
          >
            Reject document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
