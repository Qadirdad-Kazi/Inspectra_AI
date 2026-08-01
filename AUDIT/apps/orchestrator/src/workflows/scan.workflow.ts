/** Temporal workflow stub for end-to-end scans. */
export async function scanWorkflowStub(_input: { scanId: string }): Promise<{ ok: boolean }> {
  return { ok: true };
}

scanWorkflowStub.name = 'scanWorkflow';
