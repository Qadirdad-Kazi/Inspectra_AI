import { redirect } from 'next/navigation';

/** Legacy placeholder route — assets are created from the audit paste bar. */
export default function AssetsPlaceholderPage() {
  redirect('/audits');
}
