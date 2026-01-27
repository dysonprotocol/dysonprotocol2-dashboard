---
title: API Overview
order: 1
---

# API Overview

Dyson Protocol exposes a REST API for interacting with the blockchain.

## Base URL

```
https://api.dysonprotocol.com
```

## Authentication

Most read operations don't require authentication. Write operations require signing with your wallet.

## Endpoints

### Scripts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dysonprotocol/script/{address}` | Get script by address |
| POST | `/dysonprotocol/script/run` | Execute a script |

### Storage

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dysonprotocol/storage/{address}/{key}` | Get storage value |

## Example Request

```bash
curl https://api.dysonprotocol.com/dysonprotocol/script/dys1abc123
```

## Response Format

All responses are JSON:

```json
{
  "script": {
    "address": "dys1abc123",
    "code": "def main(): return {}",
    "creator": "dys1xyz789"
  }
}
```
