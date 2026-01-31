import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[80px] w-full min-w-0 rounded-lg border border-[#1a1a1a] bg-transparent px-3 py-2 text-sm text-[#e5e5e5] placeholder:text-[#404040] transition-colors duration-150 outline-none resize-none",
        "focus:border-[#262626]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
