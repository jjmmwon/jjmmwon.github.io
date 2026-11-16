import { compileCV } from './lib/cv.mjs';

try {
  const output = await compileCV();
  console.log(`CV compiled → ${output}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
