import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

export type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost';
  }
>;

export function Button({ variant = 'primary', children, ...rest }: ButtonProps) {
  return (
    <button type="button" data-variant={variant} {...rest}>
      {children}
    </button>
  );
}
