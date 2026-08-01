import type { PropsWithChildren } from 'react';

export function Card({ children }: PropsWithChildren) {
  return <div data-component="card">{children}</div>;
}

export function CardHeader({ children }: PropsWithChildren) {
  return <div data-component="card-header">{children}</div>;
}

export function CardBody({ children }: PropsWithChildren) {
  return <div data-component="card-body">{children}</div>;
}
