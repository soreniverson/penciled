import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-lg border border-[#1a1a1a] bg-transparent px-3 py-1 text-sm text-[#e5e5e5] placeholder:text-[#404040] transition-colors duration-150 outline-none",
        "focus:border-[#404040] focus-visible:ring-2 focus-visible:ring-[#525252] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#e5e5e5]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
