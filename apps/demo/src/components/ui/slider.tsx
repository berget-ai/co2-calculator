import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  Omit<React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>, 'value' | 'onValueChange'> & {
    label?: string
    displayValue?: string
    value?: number
    onValueChange?: (value: number) => void
  }
>(({ className, label, displayValue, value, onValueChange, ...props }, ref) => (
  <div style={{ width: '100%' }}>
    {label && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <label style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>{label}</label>
        {displayValue && (
          <span style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: '#52B788' }}>{displayValue}</span>
        )}
      </div>
    )}
    <SliderPrimitive.Root
      ref={ref}
      value={value !== undefined ? [value] : undefined}
      onValueChange={(values) => onValueChange?.(values[0])}
      style={{ 
        position: 'relative', 
        display: 'flex', 
        width: '100%', 
        touchAction: 'none',
        userSelect: 'none',
        alignItems: 'center'
      }}
      {...props}
    >
      <SliderPrimitive.Track style={{ 
        position: 'relative', 
        height: '0.5rem', 
        width: '100%', 
        flexGrow: 1,
        overflow: 'hidden', 
        borderRadius: '9999px', 
        backgroundColor: 'rgba(255,255,255,0.1)' 
      }}>
        <SliderPrimitive.Range style={{ position: 'absolute', height: '100%', backgroundColor: '#52B788' }} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb style={{ 
        display: 'block', 
        height: '1.25rem', 
        width: '1.25rem', 
        borderRadius: '50%', 
        border: '2px solid #52B788', 
        backgroundColor: '#0A0A0A',
        cursor: 'pointer'
      }} />
    </SliderPrimitive.Root>
  </div>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
