# Orbit Points

Orbit Points is a responsive Next.js Web3 dashboard designed for direct Vercel deployment.

## Features

- Dark glassmorphism dashboard with responsive desktop and mobile navigation
- MetaMask and TokenPocket injected wallet support
- SSR-safe wallet detection with delayed TokenPocket provider polling
- Frontend-only mock Points and Tasks stored in localStorage
- No frontend API requests, signature requests, database, or chain interaction
- Reserved `checkAddressBalance()` and `VerifyModal` interfaces

## Local development

```powershell
npm.cmd install
npm.cmd run dev
```

Open <http://localhost:3000>.

## Vercel

Import the repository into Vercel and deploy with the default Next.js settings.
