import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadToFile(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url} (${res.status})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  await writeFile(outPath, new Uint8Array(arrayBuffer));
}

async function main() {
  const wasmSrc = path.join(
    projectRoot,
    "node_modules",
    "@mediapipe",
    "tasks-vision",
    "wasm"
  );
  const wasmDest = path.join(projectRoot, "public", "mediapipe", "wasm");

  await mkdir(wasmDest, { recursive: true });
  await cp(wasmSrc, wasmDest, { recursive: true, force: true });

  const modelsDir = path.join(projectRoot, "public", "mediapipe", "models");
  await mkdir(modelsDir, { recursive: true });

  const handModelPath = path.join(modelsDir, "hand_landmarker.task");
  if (!(await exists(handModelPath))) {
    await downloadToFile(
      "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      handModelPath
    );
  } else {
    // Touch-read to ensure the file is readable (helps surface odd FS issues early)
    await readFile(handModelPath);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

