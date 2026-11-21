import { bundleWorkflowCode } from '@temporalio/worker';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

async function bundle() {
  try {
    console.log('Pre-bundling Temporal workflow code for production...');
    const workflowsPath = require.resolve('../temporal/workflows');
    const { code } = await bundleWorkflowCode({
      workflowsPath,
    });

    // Write directly into the directory where compiled workflows reside
    const outDir = path.dirname(workflowsPath);
    await mkdir(outDir, { recursive: true });
    const bundlePath = path.join(outDir, 'workflow-bundle.js');
    await writeFile(bundlePath, code, 'utf-8');
    console.log(`Successfully generated workflow bundle at ${bundlePath}`);
  } catch (err) {
    console.error('Failed to pre-bundle workflows:', err);
    process.exit(1);
  }
}

bundle();
