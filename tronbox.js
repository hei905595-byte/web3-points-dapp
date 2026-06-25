module.exports = {
  contracts_directory: "./contracts",
  contracts_build_directory: "./build/contracts",
  compilers: {
    solc: {
      version: "0.8.26",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
  networks: {
    nile: {
      privateKey: process.env.TRON_PRIVATE_KEY,
      fullHost: process.env.TRON_FULL_HOST || "https://nile.trongrid.io",
      network_id: "*",
      feeLimit: Number(process.env.TRON_FEE_LIMIT || 150000000),
    },
    mainnet: {
      privateKey: process.env.TRON_PRIVATE_KEY,
      fullHost: process.env.TRON_FULL_HOST || "https://api.trongrid.io",
      network_id: "*",
      feeLimit: Number(process.env.TRON_FEE_LIMIT || 150000000),
    },
  },
};
