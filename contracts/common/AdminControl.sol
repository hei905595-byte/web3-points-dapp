// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

abstract contract AdminControl {
    mapping(address => bool) public admins;
    address[] public adminAddressList;

    event AdminUpdated(address indexed account, bool indexed enabled);

    modifier onlyAdmin() {
        require(admins[msg.sender], "ADMIN_ONLY");
        _;
    }

    constructor() {
        admins[msg.sender] = true;
        adminAddressList.push(msg.sender);
        emit AdminUpdated(msg.sender, true);
    }

    function addAdmin(address account) external onlyAdmin {
        require(account != address(0), "ZERO_ADDRESS");
        require(!admins[account], "ALREADY_ADMIN");

        admins[account] = true;
        adminAddressList.push(account);
        emit AdminUpdated(account, true);
    }

    function removeAdmin(address account) external onlyAdmin {
        require(admins[account], "NOT_ADMIN");
        require(adminAddressList.length > 1, "LAST_ADMIN");

        admins[account] = false;

        uint256 length = adminAddressList.length;
        for (uint256 i = 0; i < length; ++i) {
            if (adminAddressList[i] == account) {
                adminAddressList[i] = adminAddressList[length - 1];
                adminAddressList.pop();
                break;
            }
        }

        emit AdminUpdated(account, false);
    }

    function getAdminList() external view returns (address[] memory) {
        return adminAddressList;
    }
}
