import { cn } from '@/lib/utils';

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'outline' | 'success' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        'border-border bg-slate-50 text-slate-700',
        className,
      )}
      {...props}
    />
  );
}
