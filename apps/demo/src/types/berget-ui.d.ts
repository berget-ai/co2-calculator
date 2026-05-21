declare module '@berget/ui' {
  import * as React from 'react';
  import { type VariantProps } from 'class-variance-authority';

  // Card
  export const Card: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & { variant?: 'highlight' | 'glass' | 'solid' } & React.RefAttributes<HTMLDivElement>>;
  export const CardHeader: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
  export const CardTitle: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLHeadingElement> & React.RefAttributes<HTMLHeadingElement>>;
  export const CardDescription: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLParagraphElement> & React.RefAttributes<HTMLParagraphElement>>;
  export const CardContent: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
  export const CardFooter: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;

  // Button
  export const Button: React.ForwardRefExoticComponent<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string, size?: string, asChild?: boolean } & React.RefAttributes<HTMLButtonElement>>;

  // Input
  export const Input: React.ForwardRefExoticComponent<React.InputHTMLAttributes<HTMLInputElement> & React.RefAttributes<HTMLInputElement>>;

  // Select
  export const Select: React.ForwardRefExoticComponent<React.SelectHTMLAttributes<HTMLSelectElement> & React.RefAttributes<HTMLSelectElement>>;

  // Badge
  export const Badge: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & { variant?: string } & React.RefAttributes<HTMLDivElement>>;

  // Layout
  export const Container: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & { size?: 'sm' | 'md' | 'lg' | 'xl' } & React.RefAttributes<HTMLDivElement>>;
  export const Stack: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & { direction?: 'row' | 'column', gap?: number } & React.RefAttributes<HTMLDivElement>>;

  // Effects
  export const GradientBackground: React.FC<{ children: React.ReactNode }>;

  // Utilities
  export function cn(...inputs: (string | undefined | null | false)[]): string;
}
