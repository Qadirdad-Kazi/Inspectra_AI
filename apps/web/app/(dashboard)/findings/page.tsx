import { redirect } from 'next/navigation';

/** Legacy placeholder route — findings live on each audit report. */
export default function FindingsPlaceholderPage() {
  redirect('/audits');
}
