// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./common/AdminControl.sol";
import "./common/ReentrancyGuard.sol";
import "./interfaces/IPointsStorage.sol";

contract InviteRebate is AdminControl, ReentrancyGuard {
    address public immutable pointsStorageAddr;

    event RebateSend(
        address indexed parent,
        address indexed invitee,
        uint256 rebatePoint
    );

    constructor(address _pointsStorage) {
        require(_pointsStorage != address(0), "ZERO_POINTS_STORAGE");
        require(_pointsStorage.code.length > 0, "INVALID_POINTS_STORAGE");
        pointsStorageAddr = _pointsStorage;
    }

    function giveRebate(
        address parent,
        address invitee,
        uint256 rebateAmount
    ) external onlyAdmin nonReentrant {
        require(parent != address(0), "ZERO_PARENT");
        require(invitee != address(0), "ZERO_INVITEE");
        require(parent != invitee, "SELF_REBATE");
        require(rebateAmount > 0, "ZERO_AMOUNT");

        IPointsStorage(pointsStorageAddr).addInviteRebate(
            parent,
            rebateAmount
        );

        emit RebateSend(parent, invitee, rebateAmount);
    }
}
