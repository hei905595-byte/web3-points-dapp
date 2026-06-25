# TRON points contracts

Solidity version: `0.8.23`

## Deployment order

1. Deploy `PointsStorage`.
2. Deploy `TaskVerify`, passing the deployed `PointsStorage` address.
3. Deploy `InviteRebate`, passing the deployed `PointsStorage` address.
4. As a `PointsStorage` admin, call:
   - `setContractAllow(taskVerifyAddress, true)`
   - `setContractAllow(inviteRebateAddress, true)`
5. Add the backend signer to each contract with `addAdmin`.
6. Verify the backend signer, then optionally remove the deployer with
   `removeAdmin`. A contract always retains at least one administrator.
7. Configure tasks with `TaskVerify.setTaskPoint(taskId, point)`.

The child contracts cannot authorize themselves during construction. Contract
authorization must be performed by a current `PointsStorage` administrator
after deployment.

## Backend write calls

- Award arbitrary points: `PointsStorage.addPoints(userHex, amount)`
- Deduct points: `PointsStorage.subtractPoints(userHex, amount)`
- Update check-in streak: `PointsStorage.addStreak(userHex)`
- Bind invitation: `PointsStorage.bindInviter(userHex, parentHex)`
- Complete daily task atomically:
  `TaskVerify.finishTaskAtom(userHex, taskId)`
- Complete daily check-in, award points, and update streak atomically:
  `TaskVerify.finishTaskAndStreakAtom(userHex, taskId)`
- Award invitation rebate:
  `InviteRebate.giveRebate(parentHex, inviteeHex, amount)`

Before encoding calls, convert TRON Base58 addresses to Solidity hex addresses
in the backend. With TronWeb, use `tronWeb.address.toHex(base58Address)`.

## Read calls for frontend and Telegram

- `PointsStorage.getUserTotalPoints(user)`
- `PointsStorage.getUserStreak(user)`
- `PointsStorage.getUserInviter(user)`
- `PointsStorage.getUserInviteRebate(user)`
- `TaskVerify.checkTaskCompleted(user, taskId)`
- `TaskVerify.getTaskPoint(taskId)`

For leaderboard synchronization, prefer `getUserCount()` plus paginated
`getUserListPage(offset, limit)`. `getAllUserList()` is retained for interface
compatibility but can exceed RPC response limits as the user count grows.

## Important integration behavior

- A task with zero configured points is disabled and cannot be completed.
- `finishTaskAtom` marks and awards in one transaction. If the points call
  fails, the task marker also rolls back.
- `addStreak` can run once per UTC day. It increments only on consecutive UTC
  days; otherwise it resets the streak to one.
- `giveRebate` updates both total points and cumulative invitation rebate in
  one transaction.
- Rebate eligibility and duplicate-rebate prevention remain backend business
  rules. The contract records the supplied result but cannot verify an
  off-chain social task by itself.
