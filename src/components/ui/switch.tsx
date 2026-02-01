"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors duration-150 outline-none",
        "data-[state=unchecked]:bg-[#262626]",
        "data-[state=checked]:bg-[#ffffff]",
        "focus-visible:ring-2 focus-visible:ring-[#525252] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full transition-transform duration-150",
          "data-[state=unchecked]:translate-x-0.5 data-[state=unchecked]:bg-[#737373]",
          "data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-[#0a0a0a]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
