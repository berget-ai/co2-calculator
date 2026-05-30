import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    label?: string
    displayValue?: string
  }
>(({ className, label, displayValue, ...props }, ref) => (
  <div className="w-full">
    {label && (
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm text-[rgba(255,255,255,0.8)]">{label}</label>
        {displayValue && (
          <span className="text-sm font-mono text-[#52B788]">{displayValue}</span>
        )}
      </div>
    )}
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-[rgba(255,255,255,0.1)]">
        <SliderPrimitive.Range className="absolute h-full bg-[#52B788]" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-[#52B788] bg-[#0A0A0A] ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52B788] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer hover:bg-[#52B788]/20" />
    </SliderPrimitive.Root>
  </div>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
