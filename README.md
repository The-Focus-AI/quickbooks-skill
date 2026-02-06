# QuickBooks Skill for Claude Code

Read-only access to QuickBooks Online data from Claude Code.

## Features

- Query customers, vendors, employees, accounts, and items
- Query transactions: invoices, bills, purchases, deposits, payments
- Query time activities, estimates, sales receipts, credit memos, journal entries
- Date filtering with configurable date fields
- Automatic pagination for large result sets
- OAuth 2.0 token management with automatic refresh

## Installation

This plugin is installed at `~/.claude/plugins/quickbooks-skill/`.

Install dependencies:

```bash
cd ~/.claude/plugins/quickbooks-skill
npm install
```

## Setup

### 1. Create a QuickBooks App

1. Go to https://developer.intuit.com/
2. Sign in with your Intuit account
3. Click "Dashboard" and then "Create an app"
4. Select "QuickBooks Online and Payments"
5. Name your app (e.g., "Claude QuickBooks Skill")
6. Click "Create app"

### 2. Get OAuth Credentials

1. In your app dashboard, go to "Keys & OAuth"
2. Under "Production" (or "Development" for testing):
   - Copy the **Client ID**
   - Copy the **Client Secret**

### 3. Authorize and Get Tokens

1. In the Intuit developer portal, use the "OAuth 2.0 Playground" or "API Explorer"
2. Click "Connect to QuickBooks"
3. Select your QuickBooks company and authorize
4. Note the following from the response:
   - **Realm ID** (Company ID) - shown in the URL or response
   - **Refresh Token** - from the token response

### 4. Create Credentials File

Create `.claude/quickbooks-skill.local.json` in your project directory:

```json
{
  "client_id": "ABxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "client_secret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "realm_id": "123456789012345",
  "refresh_token": "AB11xxxx..."
}
```

### 5. Get Access Token

```bash
npx tsx ~/.claude/plugins/quickbooks-skill/scripts/quickbooks.ts refresh
```

This exchanges your refresh token for an access token and saves it to your credentials file.

### 6. Verify Connection

```bash
npx tsx ~/.claude/plugins/quickbooks-skill/scripts/quickbooks.ts check
```

This displays your company info if everything is configured correctly.

## Usage

### List Entities

```bash
# Customers
npx tsx scripts/quickbooks.ts customers

# Invoices from this year
npx tsx scripts/quickbooks.ts invoices --start=2024-01-01

# Purchases by transaction date
npx tsx scripts/quickbooks.ts purchases --start=2024-01-01 --query-by=TxnDate

# Bills with additional filter
npx tsx scripts/quickbooks.ts bills --where="Balance > 0"
```

### Get Specific Record

```bash
npx tsx scripts/quickbooks.ts get Customer 123
npx tsx scripts/quickbooks.ts get Invoice 456
```

### Get Reference Maps

```bash
npx tsx scripts/quickbooks.ts refs Account
npx tsx scripts/quickbooks.ts refs Customer
npx tsx scripts/quickbooks.ts refs Vendor
```

## Query Options

| Option | Description |
|--------|-------------|
| `--start=YYYY-MM-DD` | Start date filter |
| `--end=YYYY-MM-DD` | End date filter |
| `--query-by=FIELD` | Date field to filter on (default: `MetaData.LastUpdatedTime`) |
| `--where="CONDITION"` | Additional WHERE clause |
| `--max=N` | Max results per page (default: 1000) |

## Date Fields

- `MetaData.LastUpdatedTime` - When record was last modified (default)
- `TxnDate` - Transaction date (for transactions)
- `MetaData.CreateTime` - When record was created

## Supported Entities

| Entity | Command |
|--------|---------|
| Customer | `customers` |
| Vendor | `vendors` |
| Employee | `employees` |
| Account | `accounts` |
| Item | `items` |
| Invoice | `invoices` |
| Bill | `bills` |
| Purchase | `purchases` |
| Deposit | `deposits` |
| Payment | `payments` |
| TimeActivity | `timeactivities` |
| Estimate | `estimates` |
| SalesReceipt | `salesreceipts` |
| CreditMemo | `creditmemos` |
| JournalEntry | `journalentries` |

## Token Management

- **Access tokens** expire after 1 hour - use `refresh` command to get a new one
- **Refresh tokens** expire after 100 days - re-authorize through Intuit portal if needed
- Tokens are stored in `.claude/quickbooks-skill.local.json` (gitignored by default)

## Security

- This skill provides **read-only** access to QuickBooks data
- Keep your credentials file secure
- The credentials file is automatically added to `.gitignore`

## Troubleshooting

### "Token not found" Error

Create the credentials file as described in Setup step 4.

### "Token refresh failed" Error

Your refresh token may have expired. Re-authorize through the Intuit developer portal.

### "API error: 401 Unauthorized"

Run `npx tsx scripts/quickbooks.ts refresh` to get a new access token.

## License

MIT
