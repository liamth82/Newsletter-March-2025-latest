import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (date: Date) => void;
}

export function ScheduleDialog({
  open,
  onOpenChange,
  onSchedule,
}: ScheduleDialogProps) {
  const [date, setDate] = useState<Date>();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Newsletter</DialogTitle>
          <DialogDescription>
            Select a date when you want your newsletter to be sent.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={() => date && onSchedule(date)}
            disabled={!date}
          >
            Confirm Schedule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}