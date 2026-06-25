const PointsStorage = artifacts.require("PointsStorage");
const TaskVerify = artifacts.require("TaskVerify");
const InviteRebate = artifacts.require("InviteRebate");

function configuredTaskPoints() {
  return [
    [process.env.TASK_DAILY_CHECK_IN_ID || "1", process.env.TASK_DAILY_CHECK_IN_POINTS],
    [process.env.TASK_DAILY_TASKS_ID || "2", process.env.TASK_DAILY_TASKS_POINTS],
    [process.env.TASK_INVITE_FRIENDS_ID || "3", process.env.TASK_INVITE_FRIENDS_POINTS],
    [process.env.TASK_VIEW_LEADERBOARD_ID || "4", process.env.TASK_VIEW_LEADERBOARD_POINTS],
  ].filter(([, points]) => points !== undefined && points !== "");
}

module.exports = async function deployContracts(deployer) {
  await deployer.deploy(PointsStorage);
  const points = await PointsStorage.deployed();

  await deployer.deploy(TaskVerify, points.address);
  const tasks = await TaskVerify.deployed();

  await deployer.deploy(InviteRebate, points.address);
  const rebates = await InviteRebate.deployed();

  await points.setContractAllow(tasks.address, true);
  await points.setContractAllow(rebates.address, true);

  for (const [taskId, point] of configuredTaskPoints()) {
    await tasks.setTaskPoint(taskId, point);
  }

  console.log("POINTS_STORAGE_ADDRESS=" + points.address);
  console.log("TASK_VERIFY_ADDRESS=" + tasks.address);
  console.log("INVITE_REBATE_ADDRESS=" + rebates.address);
};
