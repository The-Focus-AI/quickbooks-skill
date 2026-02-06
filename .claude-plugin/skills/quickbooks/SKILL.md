---
name: quickbooks
description: This skill should be used when the user asks to "query quickbooks", "list customers", "list vendors", "list invoices", "get transactions", "check quickbooks", "quickbooks data", "accounting data", "list bills", "list deposits", "list purchases", "time activities", "list employees", "list accounts", or mentions QuickBooks Online operations. Provides read-only QuickBooks Online API integration.
version: 1.0.0
---

# QuickBooks Skill

Read-only access to QuickBooks Online data including customers, vendors, invoices, bills, purchases, deposits, time activities, and more.

## First-Time Setup

1. Run `npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts setup` to see setup instructions
2. Create credentials file at `.claude/quickbooks-skill.local.json`
3. Run `npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts refresh` to get access token
4. Run `npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts check` to verify connection

Tokens are stored per-project in `.claude/quickbooks-skill.local.json`.

## Commands

### Connection Management

```bash
# Display setup instructions
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts setup

# Check connection status and company info
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts check

# Refresh access token (tokens expire after 1 hour)
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts refresh
```

### Query Entities

All query commands support date filtering and pagination.

```bash
# List customers
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts customers
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts customers --start=2024-01-01 --end=2024-12-31

# List vendors
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts vendors

# List employees
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts employees

# List invoices
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts invoices --start=2024-01-01
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts invoices --query-by=TxnDate

# List bills
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts bills --start=2024-01-01

# List purchases (checks, expenses, etc.)
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts purchases --start=2024-01-01

# List deposits
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts deposits --start=2024-01-01

# List payments
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts payments --start=2024-01-01

# List time activities
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts timeactivities --start=2024-01-01

# List accounts (chart of accounts)
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts accounts

# List items (products/services)
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts items

# List estimates
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts estimates --start=2024-01-01

# List sales receipts
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts salesreceipts --start=2024-01-01

# List credit memos
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts creditmemos --start=2024-01-01

# List journal entries
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts journalentries --start=2024-01-01
```

### Get Specific Records

```bash
# Get a specific customer
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts get Customer 123

# Get a specific invoice
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts get Invoice 456

# Get a specific purchase
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts get Purchase 789
```

### Get Reference Maps

```bash
# Get Account ID to name mapping
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts refs Account

# Get Customer ID to name mapping
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts refs Customer

# Get Vendor ID to name mapping
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts refs Vendor
```

## Query Options

| Option | Description | Example |
|--------|-------------|---------|
| `--start=DATE` | Start date filter (YYYY-MM-DD) | `--start=2024-01-01` |
| `--end=DATE` | End date filter (YYYY-MM-DD) | `--end=2024-12-31` |
| `--query-by=FIELD` | Date field to filter on | `--query-by=TxnDate` |
| `--where=CONDITION` | Additional WHERE clause | `--where="Active = true"` |
| `--max=N` | Max results per page (default: 1000) | `--max=100` |

## Date Fields

- `MetaData.LastUpdatedTime` - When record was last modified (default)
- `TxnDate` - Transaction date (for transactions)
- `MetaData.CreateTime` - When record was created

## Supported Entities

| Entity | Command | Has TxnDate |
|--------|---------|-------------|
| Customer | `customers` | No |
| Vendor | `vendors` | No |
| Employee | `employees` | No |
| Account | `accounts` | No |
| Item | `items` | No |
| Invoice | `invoices` | Yes |
| Bill | `bills` | Yes |
| Purchase | `purchases` | Yes |
| Deposit | `deposits` | Yes |
| Payment | `payments` | Yes |
| TimeActivity | `timeactivities` | Yes |
| Estimate | `estimates` | Yes |
| SalesReceipt | `salesreceipts` | Yes |
| CreditMemo | `creditmemos` | Yes |
| JournalEntry | `journalentries` | Yes |

## Output

All commands return JSON with `success` and `data` fields.

```json
{
  "success": true,
  "data": {
    "results": [...],
    "count": 42,
    "entity": "Customer"
  }
}
```

## Help

```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/quickbooks.ts --help
```
