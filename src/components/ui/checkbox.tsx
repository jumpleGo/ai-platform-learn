"use client"

import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

// Чекбокс на нативном input — доступность и клавиатура бесплатно, без новых зависимостей
function Checkbox({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <span className="relative inline-flex shrink-0">
      <input
        type="checkbox"
        data-slot="checkbox"
        className={cn(
          "peer size-[18px] cursor-pointer appearance-none rounded-[5px] border border-input bg-transparent outline-none transition-colors",
          "checked:border-primary checked:bg-primary",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
      <Check
        className="pointer-events-none absolute inset-0 m-auto size-3 scale-50 stroke-[3] text-primary-foreground opacity-0 transition peer-checked:scale-100 peer-checked:opacity-100"
        aria-hidden
      />
    </span>
  )
}

export { Checkbox }
