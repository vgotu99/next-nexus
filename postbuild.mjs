import { promises as fs } from 'fs';
import path from 'path';

const findDependentChunks = async (
  filesToScan,
  distDir,
  allDependencies = new Set()
) => {
  const findImports = async filePath => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const importRegex = /from "\.\.\/(chunk-[^\s"]+\.js)"/g;
      return [...content.matchAll(importRegex)].map(match =>
        path.join(distDir, match[1])
      );
    } catch {
      return [];
    }
  };

  const newDeps = (await Promise.all(filesToScan.map(findImports)))
    .flat()
    .filter(dep => !allDependencies.has(dep));

  if (newDeps.length === 0) {
    return allDependencies;
  }

  newDeps.forEach(dep => allDependencies.add(dep));
  return findDependentChunks(newDeps, distDir, allDependencies);
};

const addUseClientBanner = async filePath => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    if (!content.trim().startsWith("'use client'")) {
      console.log(
        `  -> Adding 'use client' to chunk: ${path.relative(process.cwd(), filePath)}`
      );
      await fs.writeFile(filePath, "'use client';\n" + content);
    }
  } catch (error) {
    console.warn(`  -> Could not process file ${filePath}:`, error);
  }
};

const cleanupDirectory = async dirPath => {
  try {
    await fs.access(dirPath);
    console.log(
      `  -> Removing temporary directory: ${path.relative(process.cwd(), dirPath)}`
    );
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.error(`  -> Could not remove directory ${dirPath}:`, error);
  }
};

const run = async () => {
  console.log('Running post-build script...');
  const distDir = path.resolve(process.cwd(), 'dist');
  const entryPointPaths = [path.join(distDir, 'internal-client', 'index.js')];

  try {
    const existingEntryPoints = (
      await Promise.all(
        entryPointPaths.map(async p => {
          try {
            await fs.access(p);
            return p;
          } catch {
            return null;
          }
        })
      )
    ).filter(Boolean);

    if (existingEntryPoints.length === 0) {
      console.log('No client entry points found. Exiting post-build script.');
      return;
    }

    const chunks = await findDependentChunks(existingEntryPoints, distDir);
    await Promise.all([...chunks].map(addUseClientBanner));
    await Promise.all([
      cleanupDirectory(path.join(distDir, 'internal-client')),
      cleanupDirectory(path.join(distDir, 'internal')),
    ]);

    console.log('Post-build script finished successfully.');
  } catch (error) {
    console.error('Error during post-build script:', error);
    process.exit(1);
  }
};

run();
