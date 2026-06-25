// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./common/AdminControl.sol";
import "./common/ReentrancyGuard.sol";
import "./interfaces/IPointsStorage.sol";

contract TaskVerify is AdminControl, ReentrancyGuard {
    mapping(address => mapping(uint256 => uint256))
        public userTaskFinishDayId;
    mapping(uint256 => uint256) public taskPointConfig;

    address public immutable pointsStorageAddr;

    event TaskFinish(
        address indexed user,
        uint256 indexed taskId,
        uint256 getPoint
    );
    event TaskPointUpdated(
        uint256 indexed taskId,
        uint256 indexed point
    );

    constructor(address _pointsStorage) {
        require(_pointsStorage != address(0), "ZERO_POINTS_STORAGE");
        require(_pointsStorage.code.length > 0, "INVALID_POINTS_STORAGE");
        pointsStorageAddr = _pointsStorage;
    }

    function finishTaskAtom(
        address user,
        uint256 taskId
    ) external onlyAdmin nonReentrant {
        _finishTask(user, taskId, false);
    }

    function finishTaskAndStreakAtom(
        address user,
        uint256 taskId
    ) external onlyAdmin nonReentrant {
        _finishTask(user, taskId, true);
    }

    function _finishTask(
        address user,
        uint256 taskId,
        bool updateStreak
    ) private {
        require(user != address(0), "ZERO_USER");

        uint256 point = taskPointConfig[taskId];
        require(point > 0, "TASK_NOT_CONFIGURED");

        uint256 dayId = block.timestamp / 1 days;
        require(
            userTaskFinishDayId[user][taskId] != dayId,
            "TASK_ALREADY_FINISHED"
        );

        userTaskFinishDayId[user][taskId] = dayId;
        IPointsStorage(pointsStorageAddr).addPoints(user, point);
        if (updateStreak) {
            IPointsStorage(pointsStorageAddr).addStreak(user);
        }

        emit TaskFinish(user, taskId, point);
    }

    function setTaskPoint(
        uint256 taskId,
        uint256 point
    ) external onlyAdmin {
        taskPointConfig[taskId] = point;
        emit TaskPointUpdated(taskId, point);
    }

    function checkTaskCompleted(
        address user,
        uint256 taskId
    ) public view returns (bool) {
        uint256 dayId = block.timestamp / 1 days;
        return userTaskFinishDayId[user][taskId] == dayId;
    }

    function getTaskPoint(uint256 taskId) public view returns (uint256) {
        return taskPointConfig[taskId];
    }
}
