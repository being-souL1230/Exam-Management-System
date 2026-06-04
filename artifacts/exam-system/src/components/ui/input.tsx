import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const isSearch = type === "search"

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          isSearch &&
            "rounded-xl border-none bg-muted/70 shadow-[inset_2px_5px_10px_rgba(0,0,0,0.18)] transition-all duration-300 ease-in-out focus-visible:ring-0 focus-visible:bg-background focus-visible:scale-[1.02] focus-visible:shadow-[0_10px_28px_rgba(15,23,42,0.14)]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
