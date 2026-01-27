---
title: Getting Started
order: 2
---

# Getting Started

This guide will help you get started with Dyson Protocol.

## Prerequisites

- A Keplr wallet
- Some DYS tokens for gas fees

## Connecting Your Wallet

1. Install the [Keplr browser extension](https://www.keplr.app/)
2. Create or import a wallet
3. Click "Connect Wallet" in the dashboard

## Your First Script

Navigate to your address page and click on "Script" to create your first on-chain Python script.

```python
def main(name: str = "World"):
    """A simple greeting script."""
    return {"greeting": f"Hello, {name}!"}
```

## Next Steps

- Explore the [API Reference](/docs/api/overview)
- Learn about [scheduled tasks](/docs/api/tasks)
