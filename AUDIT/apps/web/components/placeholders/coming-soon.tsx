import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ComingSoonPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted">
          This module is intentionally empty in the SaaS-core release. Authentication, organizations,
          billing, notifications, settings, and admin are fully wired — audit engines land next.
        </CardContent>
      </Card>
    </div>
  );
}
