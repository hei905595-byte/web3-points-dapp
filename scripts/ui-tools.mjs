import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import pixelmatch from "pixelmatch";
import { chromium } from "playwright-core";
import { PNG } from "pngjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactsRoot = path.join(root, "ui-artifacts");
const directories = {
  screenshots: path.join(artifactsRoot, "screenshots"),
  baselines: path.join(artifactsRoot, "baselines"),
  current: path.join(artifactsRoot, "current"),
  diffs: path.join(artifactsRoot, "diffs"),
};

const browserCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

function parseArgs(values) {
  const args = {
    action: values[0] ?? "help",
    url: "http://localhost:3000",
    name: "home",
    width: 1440,
    height: 900,
    threshold: 0.1,
    wait: 800,
  };

  for (let index = 1; index < values.length; index += 1) {
    const key = values[index];
    const value = values[index + 1];
    if (!key.startsWith("--") || value === undefined) continue;

    const normalizedKey = key.slice(2);
    if (normalizedKey in args) {
      args[normalizedKey] = ["width", "height", "threshold", "wait"].includes(
        normalizedKey,
      )
        ? Number(value)
        : value;
      index += 1;
    }
  }

  return args;
}

function ensureDirectories() {
  for (const directory of Object.values(directories)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function browserPath() {
  const executablePath = browserCandidates.find((candidate) =>
    fs.existsSync(candidate),
  );

  if (!executablePath) {
    throw new Error(
      "Chrome or Edge was not found. Set CHROME_PATH to a browser executable.",
    );
  }

  return executablePath;
}

function screenshotPath(directory, name, fullPage) {
  return path.join(directory, `${name}${fullPage ? "-full" : ""}.png`);
}

async function capture(args, directory, fullPage) {
  ensureDirectories();

  const browser = await chromium.launch({
    executablePath: browserPath(),
    headless: true,
  });

  try {
    const page = await browser.newPage({
      deviceScaleFactor: 1,
      viewport: {
        width: args.width,
        height: args.height,
      },
    });

    await page.goto(args.url, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.waitForTimeout(args.wait);

    const output = screenshotPath(directory, args.name, fullPage);
    await page.screenshot({
      animations: "disabled",
      fullPage,
      path: output,
    });

    console.log(output);
    return output;
  } finally {
    await browser.close();
  }
}

function comparePng(baselinePath, currentPath, diffPath, threshold) {
  if (!fs.existsSync(baselinePath)) {
    throw new Error(`Baseline does not exist: ${baselinePath}`);
  }

  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  const current = PNG.sync.read(fs.readFileSync(currentPath));

  if (
    baseline.width !== current.width ||
    baseline.height !== current.height
  ) {
    throw new Error(
      `Image sizes differ: baseline ${baseline.width}x${baseline.height}, current ${current.width}x${current.height}.`,
    );
  }

  const diff = new PNG({
    width: baseline.width,
    height: baseline.height,
  });
  const changedPixels = pixelmatch(
    baseline.data,
    current.data,
    diff.data,
    baseline.width,
    baseline.height,
    {
      threshold,
    },
  );

  fs.writeFileSync(diffPath, PNG.sync.write(diff));
  const totalPixels = baseline.width * baseline.height;
  const difference = (changedPixels / totalPixels) * 100;

  console.log(`Changed pixels: ${changedPixels}`);
  console.log(`Difference: ${difference.toFixed(4)}%`);
  console.log(`Diff image: ${diffPath}`);
}

async function compare(args, fullPage) {
  ensureDirectories();
  const currentPath = await capture(args, directories.current, fullPage);
  const baselinePath = screenshotPath(
    directories.baselines,
    args.name,
    fullPage,
  );
  const diffPath = screenshotPath(directories.diffs, args.name, fullPage);

  comparePng(baselinePath, currentPath, diffPath, args.threshold);
}

function printHelp() {
  console.log(`
Orbit Points UI tools

Commands:
  shot       Capture the current viewport
  full       Capture the full page
  baseline   Save a viewport baseline
  baseline-full  Save a full-page baseline
  compare    Capture and compare the viewport with its baseline
  compare-full   Capture and compare the full page with its baseline

Options:
  --url http://localhost:3000
  --name home
  --width 1440
  --height 900
  --threshold 0.1
  --wait 800
`);
}

const args = parseArgs(process.argv.slice(2));

try {
  switch (args.action) {
    case "shot":
      await capture(args, directories.screenshots, false);
      break;
    case "full":
      await capture(args, directories.screenshots, true);
      break;
    case "baseline":
      await capture(args, directories.baselines, false);
      break;
    case "baseline-full":
      await capture(args, directories.baselines, true);
      break;
    case "compare":
      await compare(args, false);
      break;
    case "compare-full":
      await compare(args, true);
      break;
    default:
      printHelp();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
