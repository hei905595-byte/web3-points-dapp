// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./common/AdminControl.sol";
import "./common/ReentrancyGuard.sol";

contract PointsStorage is AdminControl, ReentrancyGuard {
    mapping(address => uint256) public userTotalPoints;
    mapping(address => uint256) public dailyStreak;
    mapping(address => uint256) public lastStreakDayId;
    mapping(address => address) public inviter;
    mapping(address => uint256) public inviteRebateTotal;

    mapping(address => bool) public contractCallAllow;

    address[] public allUserRegister;
    mapping(address => bool) public userHasRegister;

    event PointsUpdate(
        address indexed user,
        uint256 indexed newTotal,
        uint256 changeAmount
    );
    event InviterBind(address indexed user, address indexed parent);
    event StreakUpdate(address indexed user, uint256 indexed newStreak);
    event ContractAllowUpdated(
        address indexed target,
        bool indexed enabled
    );
    event InviteRebateUpdate(
        address indexed parent,
        uint256 indexed newRebateTotal,
        uint256 rebateAmount
    );

    modifier onlyAdminOrAllowContract() {
        require(
            admins[msg.sender] || contractCallAllow[msg.sender],
            "CALLER_NOT_ALLOWED"
        );
        _;
    }

    function addPoints(
        address user,
        uint256 amount
    ) external onlyAdminOrAllowContract nonReentrant {
        _validatePointChange(user, amount);
        _registerUser(user);

        userTotalPoints[user] += amount;
        emit PointsUpdate(user, userTotalPoints[user], amount);
    }

    function subtractPoints(
        address user,
        uint256 amount
    ) external onlyAdminOrAllowContract nonReentrant {
        _validatePointChange(user, amount);
        require(userTotalPoints[user] >= amount, "INSUFFICIENT_POINTS");

        userTotalPoints[user] -= amount;
        emit PointsUpdate(user, userTotalPoints[user], amount);
    }

    function addStreak(
        address user
    ) external onlyAdminOrAllowContract nonReentrant {
        require(user != address(0), "ZERO_USER");
        _registerUser(user);

        uint256 dayId = block.timestamp / 1 days;
        uint256 previousDayId = lastStreakDayId[user];
        require(previousDayId != dayId, "STREAK_ALREADY_UPDATED");

        if (previousDayId != 0 && previousDayId + 1 == dayId) {
            dailyStreak[user] += 1;
        } else {
            dailyStreak[user] = 1;
        }
        lastStreakDayId[user] = dayId;

        emit StreakUpdate(user, dailyStreak[user]);
    }

    function bindInviter(
        address user,
        address parent
    ) external onlyAdminOrAllowContract nonReentrant {
        require(user != address(0) && parent != address(0), "ZERO_ADDRESS");
        require(user != parent, "SELF_INVITE");
        require(inviter[user] == address(0), "INVITER_ALREADY_BOUND");

        address cursor = parent;
        while (cursor != address(0)) {
            require(cursor != user, "INVITE_CYCLE");
            cursor = inviter[cursor];
        }

        inviter[user] = parent;
        _registerUser(user);
        _registerUser(parent);
        emit InviterBind(user, parent);
    }

    // InviteRebate uses this entry so total points and rebate statistics
    // are updated atomically in the same cross-contract transaction.
    function addInviteRebate(
        address parent,
        uint256 amount
    ) external onlyAdminOrAllowContract nonReentrant {
        _validatePointChange(parent, amount);
        _registerUser(parent);

        userTotalPoints[parent] += amount;
        inviteRebateTotal[parent] += amount;

        emit PointsUpdate(parent, userTotalPoints[parent], amount);
        emit InviteRebateUpdate(
            parent,
            inviteRebateTotal[parent],
            amount
        );
    }

    function setContractAllow(
        address target,
        bool status
    ) external onlyAdmin {
        require(target != address(0), "ZERO_ADDRESS");
        require(target.code.length > 0, "TARGET_NOT_CONTRACT");

        contractCallAllow[target] = status;
        emit ContractAllowUpdated(target, status);
    }

    function getUserTotalPoints(
        address user
    ) public view returns (uint256) {
        return userTotalPoints[user];
    }

    function getUserStreak(address user) public view returns (uint256) {
        return dailyStreak[user];
    }

    function getUserInviter(address user) public view returns (address) {
        return inviter[user];
    }

    function getUserInviteRebate(
        address user
    ) public view returns (uint256) {
        return inviteRebateTotal[user];
    }

    function getAllUserList() public view returns (address[] memory) {
        return allUserRegister;
    }

    function getUserListPage(
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory users) {
        uint256 length = allUserRegister.length;
        if (offset >= length || limit == 0) {
            return new address[](0);
        }

        uint256 end = offset + limit;
        if (end > length) {
            end = length;
        }

        users = new address[](end - offset);
        for (uint256 i = offset; i < end; ++i) {
            users[i - offset] = allUserRegister[i];
        }
    }

    function getUserCount() external view returns (uint256) {
        return allUserRegister.length;
    }

    function _validatePointChange(
        address user,
        uint256 amount
    ) private pure {
        require(user != address(0), "ZERO_USER");
        require(amount > 0, "ZERO_AMOUNT");
    }

    function _registerUser(address user) private {
        if (!userHasRegister[user]) {
            userHasRegister[user] = true;
            allUserRegister.push(user);
        }
    }
}
