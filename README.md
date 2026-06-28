# Orbit Points

## Cross-project navigation

Set these public environment variables to link the three deployed UIs:

```env
NEXT_PUBLIC_POINTS_URL=https://points.your-domain.com
NEXT_PUBLIC_QUERY_URL=https://query.your-domain.com
NEXT_PUBLIC_GUARD_URL=https://guard.your-domain.com
```

TRON points dashboard with three Solidity contracts, a wallet-authenticated
frontend, and a separate administrator gateway.

## Components

- `contracts/PointsStorage.sol` stores points, streaks, invitations, rebates,
  administrators, authorized contracts, and the user registry.
- `contracts/TaskVerify.sol` settles a daily task and points atomically.
  `finishTaskAndStreakAtom` also updates check-in streak state in that same
  transaction.
- `contracts/InviteRebate.sol` awards invitation rebates through
  `PointsStorage`.
- The Next.js frontend supports TronLink and TokenPocket TRON wallets. It signs
  a one-time challenge and never signs a contract write transaction.
- `../gateway-server` owns the administrator signer and exposes the frontend
  and Telegram APIs.

## Validate

```powershell
npm.cmd run contracts:check
npm.cmd run build
```

## Local frontend

Copy `.env.example` to `.env.local`, then:

```powershell
npm.cmd run dev
```

## Nile deployment

Copy `.env.deploy.example` to a private environment file and load those
variables without committing the file. Then run:

```powershell
tronbox migrate --network nile --reset
```

Deployment order and cross-contract authorization are handled by
`migrations/1_deploy_contracts.js`. Copy the three printed contract addresses
to the gateway environment.

Never put `TRON_PRIVATE_KEY` in a frontend or committed environment file.
