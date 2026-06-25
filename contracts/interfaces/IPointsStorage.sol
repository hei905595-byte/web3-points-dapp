// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IPointsStorage {
    function addPoints(address user, uint256 amount) external;

    function addStreak(address user) external;

    function addInviteRebate(address parent, uint256 amount) external;
}
