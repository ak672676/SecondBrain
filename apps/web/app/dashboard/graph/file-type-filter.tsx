"use client";

const TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  md: "Markdown",
  txt: "Text",
  docx: "Word",
  csv: "CSV",
};

interface FileTypeFilterProps {
  types: string[];
  activeTypes: Set<string>;
  colors: Record<string, string>;
  onChange: (types: Set<string>) => void;
}

export function FileTypeFilter({
  types,
  activeTypes,
  colors,
  onChange,
}: FileTypeFilterProps) {
  function toggle(type: string) {
    const next = new Set(activeTypes);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    onChange(next);
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-muted-foreground">Filter:</span>
      {types.map((type) => (
        <label key={type} className="flex items-center gap-1.5 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={activeTypes.has(type)}
            onChange={() => toggle(type)}
            className="rounded"
          />
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: colors[type] || "#6b7280" }}
          />
          {TYPE_LABELS[type] || type}
        </label>
      ))}
    </div>
  );
}
