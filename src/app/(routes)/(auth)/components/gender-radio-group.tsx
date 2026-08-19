import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const options = [
  { id: "male", label: "Male", value: false },
  { id: "female", label: "Female", value: true },
];

export function GenderRadioGroup({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <RadioGroup
      value={String(value)}
      onValueChange={(val) => onChange(val === "true")}
      className="grid grid-cols-3 gap-4"
    >
      {options.map((opt) => (
        <div
          key={opt.id}
          className={cn(
            "mt-2 flex items-center space-x-2 border px-4 py-2 transition-all duration-300",
            value === opt.value
              ? "border-ion bg-ion/10 text-space-ivory"
              : "border-space-line-soft text-space-muted hover:border-ion-line",
          )}
        >
          <RadioGroupItem
            id={opt.id}
            value={String(opt.value)}
            className="peer sr-only"
          />
          <Label
            htmlFor={opt.id}
            className="mx-auto flex w-full cursor-pointer items-center justify-center text-sm font-medium transition-all duration-300"
          >
            {opt.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
