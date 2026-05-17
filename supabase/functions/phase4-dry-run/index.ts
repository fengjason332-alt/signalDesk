import { createPhase4DryRunHandler } from '../../../src/lib/content/phase4DryRun';

export { createPhase4DryRunHandler } from '../../../src/lib/content/phase4DryRun';

export const handler = createPhase4DryRunHandler();

const denoGlobal = globalThis as typeof globalThis & {
  Deno?: {
    serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  };
};

if (denoGlobal.Deno?.serve) {
  denoGlobal.Deno.serve(handler);
}
