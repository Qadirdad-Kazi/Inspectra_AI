/** Activity stubs — replace with real worker dispatch. */
export async function routeTargetActivity(_scanId: string): Promise<string> {
  return 'web';
}

export async function dispatchWorkerActivity(_input: {
  scanId: string;
  target: string;
}): Promise<{ dispatched: boolean }> {
  return { dispatched: false };
}
