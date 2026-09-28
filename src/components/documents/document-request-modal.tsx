import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { DOCUMENT_TYPE_CATALOG } from "@/lib/documents";
import { useAppStore } from "@/lib/store";
import type { Student } from "@/lib/types";
import { toast } from "sonner";

export function DocumentRequestModal({
  open,
  onOpenChange,
  student,
  defaultType,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  student: Student;
  defaultType?: string;
}) {
  const request = useAppStore((s) => s.requestDocument);
  const [type, setType] = useState(defaultType ?? "Transcript");
  const [required, setRequired] = useState(true);
  const [priority, setPriority] = useState<"high" | "normal" | "optional">("high");
  const [due, setDue] = useState("");
  const [instruction, setInstruction] = useState("Please upload the latest official transcript.");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v && defaultType) setType(defaultType);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request document</DialogTitle>
          <DialogDescription>The request appears in the student document portal.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FormField label="Document">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPE_CATALOG.map((d) => (
                  <SelectItem key={d.type} value={d.type}>
                    {d.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <label className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
            Required
            <Switch
              checked={required}
              onCheckedChange={(v) => {
                setRequired(!!v);
                setPriority(v ? "high" : "optional");
              }}
            />
          </label>
          <FormField label="Priority">
            <Select value={priority} onValueChange={(v) => setPriority(v as "high" | "normal" | "optional")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="optional">Optional</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Due date">
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </FormField>
          <FormField label="Student instruction">
            <Textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={3} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              request({
                studentId: student.id,
                type,
                required,
                priority,
                dueDate: due ? new Date(due).toISOString() : undefined,
                studentInstruction: instruction.trim() || undefined,
              });
              toast.success("Request sent");
              onOpenChange(false);
            }}
          >
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
