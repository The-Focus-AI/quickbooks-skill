#!/usr/bin/env npx tsx

/**
 * QuickBooks Online CLI - Read-only access to QuickBooks data
 */

import {
  SETUP_INSTRUCTIONS,
  refreshAccessToken,
  getProjectTokenPath,
  ensureGitignore,
} from "./lib/auth.js";

import {
  query,
  getById,
  getReferenceMaps,
  checkConnection,
  QueryOptions,
} from "./lib/qb-client.js";

import { output, fail, parseArgs } from "./lib/output.js";

// ============================================================================
// Entity Command Mapping
// ============================================================================

const ENTITY_COMMANDS: Record<string, string> = {
  customers: "Customer",
  vendors: "Vendor",
  employees: "Employee",
  accounts: "Account",
  items: "Item",
  invoices: "Invoice",
  bills: "Bill",
  purchases: "Purchase",
  deposits: "Deposit",
  payments: "Payment",
  timeactivities: "TimeActivity",
  estimates: "Estimate",
  salesreceipts: "SalesReceipt",
  creditmemos: "CreditMemo",
  journalentries: "JournalEntry",
};

// ============================================================================
// CLI
// ============================================================================

function printUsage(): void {
  console.log(`
QuickBooks Online CLI (Read-Only)

SETUP:
  setup                   Display setup instructions
  check                   Verify connection and show company info
  refresh                 Refresh access token

QUERY ENTITIES:
  customers               List customers
  vendors                 List vendors
  employees               List employees
  accounts                List accounts (chart of accounts)
  items                   List items (products/services)
  invoices                List invoices
  bills                   List bills
  purchases               List purchases (checks, expenses)
  deposits                List deposits
  payments                List payments
  timeactivities          List time activities
  estimates               List estimates
  salesreceipts           List sales receipts
  creditmemos             List credit memos
  journalentries          List journal entries

  Query options:
    --start=YYYY-MM-DD    Start date filter
    --end=YYYY-MM-DD      End date filter
    --query-by=FIELD      Date field to filter on (default: MetaData.LastUpdatedTime)
    --where="CONDITION"   Additional WHERE clause
    --max=N               Max results per page (default: 1000)

GET SPECIFIC RECORD:
  get <Entity> <ID>       Get a specific record by ID
                          Example: get Customer 123
                                   get Invoice 456

REFERENCE MAPS:
  refs <Entity>           Get ID-to-name mapping
                          Example: refs Account
                                   refs Customer
                                   refs Vendor

Credentials: .claude/quickbooks-skill.local.json (per-project)
`);
}

async function handleEntityQuery(entity: string, flags: Record<string, string>): Promise<void> {
  const options: QueryOptions = {};

  if (flags.start) {
    options.start = flags.start;
  }

  if (flags.end) {
    options.end = flags.end;
  }

  if (flags["query-by"]) {
    options.queryBy = flags["query-by"];
  }

  if (flags.where) {
    options.where = flags.where;
  }

  if (flags.max) {
    options.maxResults = parseInt(flags.max, 10);
  }

  const results = await query(entity, options);

  output({
    success: true,
    data: {
      entity,
      count: results.length,
      results,
    },
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();
  const { flags, positional } = parseArgs(args.slice(1));

  if (!command || command === "help" || command === "--help") {
    printUsage();
    process.exit(0);
  }

  try {
    switch (command) {
      // ── Setup & Connection ─────────────────────────────────────────────────
      case "setup": {
        console.log(SETUP_INSTRUCTIONS);
        break;
      }

      case "check": {
        const result = await checkConnection();

        if (result.connected) {
          const info = result.companyInfo;
          output({
            success: true,
            data: {
              message: "Connected to QuickBooks",
              realmId: result.realmId,
              companyName: info?.CompanyName,
              legalName: info?.LegalName,
              address: info?.CompanyAddr,
              email: info?.Email?.Address,
              phone: info?.Phone?.FreeFormNumber,
              tokenPath: getProjectTokenPath(),
            },
          });
        } else {
          fail(result.error || "Failed to connect to QuickBooks");
        }
        break;
      }

      case "refresh": {
        await ensureGitignore();
        const credentials = await refreshAccessToken();
        output({
          success: true,
          data: {
            message: "Access token refreshed",
            tokenExpiry: credentials.token_expiry,
            tokenPath: getProjectTokenPath(),
          },
        });
        break;
      }

      // ── Entity Queries ─────────────────────────────────────────────────────
      case "customers":
      case "vendors":
      case "employees":
      case "accounts":
      case "items":
      case "invoices":
      case "bills":
      case "purchases":
      case "deposits":
      case "payments":
      case "timeactivities":
      case "estimates":
      case "salesreceipts":
      case "creditmemos":
      case "journalentries": {
        const entity = ENTITY_COMMANDS[command];
        await handleEntityQuery(entity, flags);
        break;
      }

      // ── Get Specific Record ────────────────────────────────────────────────
      case "get": {
        const entity = positional[0];
        const id = positional[1];

        if (!entity || !id) {
          fail("Usage: get <Entity> <ID>\nExample: get Customer 123");
        }

        const result = await getById(entity, id);
        output({
          success: true,
          data: {
            entity,
            id,
            result,
          },
        });
        break;
      }

      // ── Reference Maps ─────────────────────────────────────────────────────
      case "refs": {
        const entityType = positional[0] as "Account" | "Customer" | "Vendor";

        if (!entityType || !["Account", "Customer", "Vendor"].includes(entityType)) {
          fail("Usage: refs <Entity>\nSupported: Account, Customer, Vendor");
        }

        const refMap = await getReferenceMaps(entityType);
        output({
          success: true,
          data: {
            entity: entityType,
            count: Object.keys(refMap).length,
            map: refMap,
          },
        });
        break;
      }

      default:
        fail(`Unknown command: ${command}\nRun with --help for usage.`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    fail(message);
  }
}

main();
