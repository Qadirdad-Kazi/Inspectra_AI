/** Temporal workflow stub for report generation. */
export async function reportWorkflowStub(_input: { scanId: string }): Promise<{ ok: boolean }> {
  return { ok: true };
}

reportWorkflowStub.name = 'reportWorkflow';
