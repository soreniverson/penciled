import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none",
  {
    variants: {
      variant: {
        // Primary CTA: white bg, dark text, no border
        default:
          "bg-[#ffffff] text-[#0a0a0a] hover:bg-[#e5e5e5] border-none font-medium",
        // Destructive: red variant
        destructive:
          "bg-destructive text-white hover:bg-destructive/90",
        // Outline/Secondary: transparent bg, subtle border, muted text
        outline:
          "bg-transparent text-[#a3a3a3] border border-[#262626] hover:bg-[#1a1a1a] hover:border-[#333333] hover:text-[#e5e5e5]",
        // Secondary: similar to outline
        secondary:
          "bg-transparent text-[#a3a3a3] border border-[#262626] hover:bg-[#1a1a1a] hover:border-[#333333] hover:text-[#e5e5e5]",
        // Ghost: no border, subtle text, hover reveals
        ghost:
          "bg-transparent text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-[#e5e5e5]",
        // Link: text only with underline
        link: "text-[#a3a3a3] underline-offset-4 hover:underline hover:text-[#e5e5e5]",
        // Text button: minimal, no background
        text:
          "bg-transparent text-[#525252] hover:text-[#a3a3a3] disabled:text-[#333333]",
        // Success: green accent for positive actions
        success:
          "bg-transparent text-[#22c55e] border border-[#22c55e66] hover:bg-[#22c55e26] hover:text-[#22c55e]",
      },
      size: {
        // Default: padding 0.375rem 0.75rem, font 0.75rem
        default: "h-9 px-3 py-1.5 text-xs",
        sm: "h-8 px-3 text-xs gap-1.5",
        lg: "h-10 px-4 text-sm",
        // Icon buttons: 32x32 or 28x28
        icon: "size-8 p-0",
        "icon-sm": "size-7 p-0",
        "icon-lg": "size-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
