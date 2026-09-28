import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type FilterOption = string | { value: string; label: string };

function normalize(option: FilterOption) {
  return typeof option === "string" ? { value: option, label: option } : option;
}

export function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  allLabel = "All",
  includeAll = true,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: readonly FilterOption[];
  allLabel?: string;
  includeAll?: boolean;
  className?: string;
}) {
  const items = options.map(normalize);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? "w-[160px]"} aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">{allLabel}</SelectItem>}
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
