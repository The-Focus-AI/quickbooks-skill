/**
 * QuickBooks Online API client (read-only)
 */

import { getValidAccessToken } from "./auth.js";

const MINOR_VERSION = 75;
const MAX_RESULTS_PER_PAGE = 1000;

// ============================================================================
// Types
// ============================================================================

export interface QueryOptions {
  start?: string;      // Start date (YYYY-MM-DD)
  end?: string;        // End date (YYYY-MM-DD)
  queryBy?: string;    // Date field to filter on (default: MetaData.LastUpdatedTime)
  where?: string;      // Additional WHERE clause
  maxResults?: number; // Max results per page (default: 1000)
}

export interface CompanyInfo {
  CompanyName: string;
  LegalName?: string;
  CompanyAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
  };
  Email?: {
    Address?: string;
  };
  Phone?: {
    FreeFormNumber?: string;
  };
}

// ============================================================================
// API Client
// ============================================================================

function getApiUrl(realmId: string): string {
  return `https://quickbooks.api.intuit.com/v3/company/${realmId}/query?minorversion=${MINOR_VERSION}`;
}

function getEntityUrl(realmId: string, entity: string, id: string): string {
  return `https://quickbooks.api.intuit.com/v3/company/${realmId}/${entity.toLowerCase()}/${id}?minorversion=${MINOR_VERSION}`;
}

function getCompanyInfoUrl(realmId: string): string {
  return `https://quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}?minorversion=${MINOR_VERSION}`;
}

function formatDateForQuery(date: string, isEnd: boolean = false): string {
  // If it's already a full datetime, use it
  if (date.includes("T")) {
    return `'${date}'`;
  }
  // Otherwise, add time component
  const time = isEnd ? "23:59:59Z" : "00:00:00Z";
  return `'${date}T${time}'`;
}

/**
 * Query entities from QuickBooks with pagination
 */
export async function query(
  entity: string,
  options: QueryOptions = {}
): Promise<unknown[]> {
  const { accessToken, realmId } = await getValidAccessToken();
  const apiUrl = getApiUrl(realmId);

  const {
    start,
    end,
    queryBy = "MetaData.LastUpdatedTime",
    where,
    maxResults = MAX_RESULTS_PER_PAGE,
  } = options;

  // Build WHERE clause
  const conditions: string[] = [];

  if (start) {
    conditions.push(`${queryBy} >= ${formatDateForQuery(start, false)}`);
  }

  if (end) {
    conditions.push(`${queryBy} <= ${formatDateForQuery(end, true)}`);
  }

  if (where) {
    conditions.push(where);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Determine ORDER BY based on entity type
  // Transactions have TxnDate, others don't
  const transactionEntities = [
    "Invoice", "Bill", "Purchase", "Deposit", "Payment",
    "TimeActivity", "Estimate", "SalesReceipt", "CreditMemo", "JournalEntry"
  ];
  const orderBy = transactionEntities.includes(entity)
    ? "ORDER BY TxnDate DESC, Id DESC"
    : "ORDER BY Id DESC";

  const allResults: unknown[] = [];
  let startPosition = 1;

  while (true) {
    const sql = `SELECT * FROM ${entity} ${whereClause} ${orderBy} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
        "Content-Type": "application/text",
      },
      body: sql,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`QuickBooks API error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    const results = data.QueryResponse?.[entity] || [];

    allResults.push(...results);

    // Check if we got all results or need to paginate
    if (results.length < maxResults) {
      break;
    }

    startPosition += results.length;
  }

  return allResults;
}

/**
 * Get a specific entity by ID
 */
export async function getById(entity: string, id: string): Promise<unknown> {
  const { accessToken, realmId } = await getValidAccessToken();
  const url = getEntityUrl(realmId, entity, id);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`QuickBooks API error: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const data = await response.json();
  return data[entity];
}

/**
 * Get reference maps (ID to FullyQualifiedName) for entities
 */
export async function getReferenceMaps(
  entityType: "Account" | "Customer" | "Vendor"
): Promise<Record<string, string>> {
  const { accessToken, realmId } = await getValidAccessToken();
  const apiUrl = getApiUrl(realmId);

  const refMap: Record<string, string> = {};
  let startPosition = 1;

  while (true) {
    const sql = `SELECT Id, FullyQualifiedName FROM ${entityType} STARTPOSITION ${startPosition} MAXRESULTS ${MAX_RESULTS_PER_PAGE}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
        "Content-Type": "application/text",
      },
      body: sql,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`QuickBooks API error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    const refs = data.QueryResponse?.[entityType] || [];

    if (refs.length === 0) {
      break;
    }

    for (const ref of refs) {
      if (ref.Id && ref.FullyQualifiedName) {
        refMap[ref.Id] = ref.FullyQualifiedName;
      }
    }

    if (refs.length < MAX_RESULTS_PER_PAGE) {
      break;
    }

    startPosition += refs.length;
  }

  return refMap;
}

/**
 * Check connection and get company info
 */
export async function checkConnection(): Promise<{
  connected: boolean;
  companyInfo?: CompanyInfo;
  realmId?: string;
  error?: string;
}> {
  try {
    const { accessToken, realmId } = await getValidAccessToken();
    const url = getCompanyInfoUrl(realmId);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        connected: false,
        error: `API error: ${response.status} ${response.statusText}\n${errorText}`,
      };
    }

    const data = await response.json();
    const companyInfo = data.CompanyInfo as CompanyInfo;

    return {
      connected: true,
      companyInfo,
      realmId,
    };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
