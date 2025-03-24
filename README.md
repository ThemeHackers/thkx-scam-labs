---

# EnhancedMaliciousTHKXFaucet

A **malicious** Ethereum smart contract designed to **drain THKX tokens** from unsuspecting users under the guise of a token faucet. This contract tricks users into approving it to spend their THKX tokens and allows the contract owner to **drain** all victims' balances.

---

## 🚨 WARNING

This contract is **malicious** and for **educational or auditing purposes only**. Do not deploy, interact with, or replicate this code for unethical or illegal activities.

---

## Features

- Collects a list of victims who interact with the faucet.
- Drains approved THKX tokens from victims.
- Owner-controlled pausing, destruction, and safe address configuration.
- Auto-destroys after draining from 100 victims.
- Emits events for monitoring victims and draining activities.

---

## Contract Details

### Deployment

```solidity
constructor(address _thkxToken)
```
- `_thkxToken`: Address of the THKX token (ERC20) to target.
- The deployer becomes the `owner` and the `safeAddress` (recipient of drained tokens and ETH).

---

## Key Variables

- `owner`: Owner of the contract (attacker).
- `safeAddress`: Address where drained tokens and ETH are sent.
- `thkxToken`: ERC20 token interface (THKX token).
- `victimCount`: Number of unique victims.
- `MAX_VICTIMS`: Max victims before auto-destruction (`100`).
- `victims`: List of victim addresses.
- `drainedAmount`: Mapping to track how much was drained from each victim.
- `isPaused`: Contract pause flag.
- `isDestroyed`: Destruction flag.

---

## Functions

### Public Victim Function

#### `claimFreeTHKX()`

- Victims call this to "claim" tokens.
- Contract checks balance and allowance.
- Victim is added to `victims` list.
- Emits `VictimApproved`.
- Triggers `autoDestroy()` if `MAX_VICTIMS` reached.

---

### Owner-Only Functions

#### `drainAllVictims()`

- Drains all tokens from all victims.
- Emits `TokensDrained` on success or `DrainFailed` on error.

#### `drainVictim(address victim)`

- Drains tokens from a specific victim.
- Emits events on success or failure.

#### `updateToken(address _newToken)`

- Updates target token (e.g., switch from THKX to another ERC20).
- Emits `TokenUpdated`.

#### `togglePause()`

- Toggles pause state.
- Affects `claimFreeTHKX`.

#### `destroyNow()`

- Destroys contract (sets `isDestroyed = true`).
- Transfers any ETH balance to `safeAddress`.
- Emits `ContractDestroyed`.

#### `setSafeAddress(address payable newSafeAddress)`

- Updates `safeAddress`.

#### `getVictims()`, `getVictimList()`

- Returns list of victims.

#### `getTotalDrained()`

- Returns total THKX drained across all victims.

#### `getVictimBalance(address victim)`

- Checks approved allowance from a victim.

#### `resetVictimDrainedAmount(address victim)`

- Resets tracked drain amount for a victim.
- Emits `VictimReset`.

---

### Miscellaneous

#### `checkEligibility()`

- Always returns `true`. Dummy function for disguising legitimacy.

#### `receive() external payable`

- Accepts ETH and forwards to `safeAddress`.

---

## Events

- `TokensDrained(address victim, uint256 amount)`
- `VictimApproved(address victim)`
- `DrainFailed(address victim, uint256 allowance, string reason)`
- `TokenUpdated(address oldToken, address newToken)`
- `ContractDestroyed(uint256 victimCount)`
- `VictimReset(address victim)`

---

## Disclaimer

> This contract is **intended for research, auditing, or testing purposes only**. Misuse can lead to legal consequences. Use responsibly.

---
