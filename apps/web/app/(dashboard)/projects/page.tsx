import { redirect } from 'next/navigation';

/** Legacy placeholder route — audits are live; send users to the real product. */
export default function ProjectsPlaceholderPage() {
  redirect('/audits');
}
