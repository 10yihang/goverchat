import serviceData from "@/data/service_items.json"

interface HallsFilterProps {
  value: string
  onChange: (slug: string) => void
}

const SERVICE_OPTIONS = [
  { slug: "", label: "全部业务" },
  ...serviceData.items.map((item) => ({ slug: item.slug, label: item.title })),
]

export function HallsFilter({ value, onChange }: HallsFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SERVICE_OPTIONS.map((opt) => {
        const isActive = value === opt.slug
        return (
          <button
            key={opt.slug}
            type="button"
            onClick={() => onChange(opt.slug)}
            className="rounded-full border px-3 py-1 text-xs font-medium transition-all"
            style={
              isActive
                ? {
                    background: "var(--color-primary)",
                    color: "var(--color-primary-foreground)",
                    borderColor: "var(--color-primary)",
                  }
                : {
                    background: "var(--color-card)",
                    color: "var(--color-foreground)",
                    borderColor: "var(--color-border)",
                  }
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
