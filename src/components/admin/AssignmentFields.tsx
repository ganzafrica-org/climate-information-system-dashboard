import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AGRONOMIST_SECTORS,
  type AssignmentLevel,
} from "@/lib/assignment";

type AssignmentFieldsProps = {
  role: "admin" | "agronomist";
  assignmentLevel: AssignmentLevel | "";
  sectorName: string;
  onAssignmentLevelChange: (value: AssignmentLevel) => void;
  onSectorNameChange: (value: string) => void;
  disabled?: boolean;
};

export default function AssignmentFields({
  role,
  assignmentLevel,
  sectorName,
  onAssignmentLevelChange,
  onSectorNameChange,
  disabled,
}: AssignmentFieldsProps) {
  if (role !== "agronomist") return null;

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="assignment-level">Coverage</Label>
        <Select
          value={assignmentLevel || undefined}
          onValueChange={(value: AssignmentLevel) => onAssignmentLevelChange(value)}
          disabled={disabled}
        >
          <SelectTrigger id="assignment-level">
            <SelectValue placeholder="District or one sector" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="district">District</SelectItem>
            <SelectItem value="sector">Sector</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500">
          District covers every sector in Musanze. Sector covers one sector only.
        </p>
      </div>

      {assignmentLevel === "sector" && (
        <div className="space-y-2">
          <Label htmlFor="assignment-sector">Sector</Label>
          <Select
            value={sectorName || undefined}
            onValueChange={onSectorNameChange}
            disabled={disabled}
          >
            <SelectTrigger id="assignment-sector">
              <SelectValue placeholder="Select a sector" />
            </SelectTrigger>
            <SelectContent>
              {AGRONOMIST_SECTORS.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
}
