const fs = require("fs");
const path = require("path");
const os = require("os");

const tronBoxRoot =
  process.env.TRONBOX_ROOT ||
  path.join(
    process.env.APPDATA || "",
    "npm",
    "node_modules",
    "tronbox",
  );
const { getWrapper } = require(path.join(
  tronBoxRoot,
  "build",
  "components",
  "TronSolc.js",
));

const contractsDirectory = path.resolve(__dirname, "..", "contracts");
const sources = {};

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(fullPath);
    else if (entry.name.endsWith(".sol")) {
      sources[
        path.relative(contractsDirectory, fullPath).replace(/\\/g, "/")
      ] = { content: fs.readFileSync(fullPath, "utf8") };
    }
  }
}

collect(contractsDirectory);

const compiler = getWrapper({
  networks: {},
  compilers: { solc: { version: "0.8.26" } },
  logger: console,
});
const output = JSON.parse(
  compiler.compile(
    JSON.stringify({
      language: "Solidity",
      sources,
      settings: {
        optimizer: { enabled: true, runs: 200 },
        outputSelection: {
          "*": { "*": ["abi", "evm.bytecode.object"] },
        },
      },
    }),
  ),
);

for (const error of output.errors || []) {
  console.log(error.formattedMessage);
}
if ((output.errors || []).some((error) => error.severity === "error")) {
  process.exit(1);
}

for (const contracts of Object.values(output.contracts || {})) {
  for (const [name, artifact] of Object.entries(contracts)) {
    if (artifact.evm.bytecode.object) {
      console.log(
        `${name}: ${artifact.abi.length} ABI entries, ` +
          `${artifact.evm.bytecode.object.length / 2} byte deployment code`,
      );
    }
  }
}
