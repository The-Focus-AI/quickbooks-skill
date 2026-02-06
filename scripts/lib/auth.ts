/**
 * OAuth 2.0 token management for QuickBooks Online
 */

import path from "node:path";
import fs from "node:fs/promises";

// ============================================================================
// Configuration
// ============================================================================

const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

// Project-local token storage
const PROJECT_TOKEN_DIR = ".claude";
const PROJECT_TOKEN_FILE = "quickbooks-skill.local.json";

export function getProjectTokenPath(): string {
  return path.join(process.cwd(), PROJECT_TOKEN_DIR, PROJECT_TOKEN_FILE);
}

// ============================================================================
// Credentials Interface
// ============================================================================

export interface QBCredentials {
  client_id: string;
  client_secret: string;
  realm_id: string;
  access_token?: string;
  refresh_token: string;
  token_expiry?: string;
}

// ============================================================================
// Setup Instructions
// ============================================================================

export const SETUP_INSTRUCTIONS = `
================================================================================
                    QUICKBOOKS SKILL - FIRST TIME SETUP
================================================================================

This skill needs QuickBooks OAuth credentials to access QuickBooks Online data.

CREDENTIALS FILE (per-project, stores tokens):
  .claude/quickbooks-skill.local.json (in your project directory)

STEP 1: Create a QuickBooks App
-------------------------------
1. Go to: https://developer.intuit.com/
2. Sign in with your Intuit account
3. Click "Dashboard" and then "Create an app"
4. Select "QuickBooks Online and Payments"
5. Give your app a name (e.g., "Claude QuickBooks Skill")
6. Click "Create app"

STEP 2: Get OAuth Credentials
-----------------------------
1. In your app dashboard, go to "Keys & OAuth"
2. Under "Production" (or "Development" for testing):
   - Copy the "Client ID"
   - Copy the "Client Secret"

STEP 3: Authorize and Get Tokens
--------------------------------
1. In the Intuit developer portal, go to your app's "OAuth 2.0 Playground"
   (or use their "API Explorer")
2. Click "Connect to QuickBooks"
3. Select your QuickBooks company and authorize
4. After authorization, note:
   - The "Realm ID" (Company ID) shown in the URL or response
   - The "Refresh Token" from the token response

STEP 4: Create Credentials File
-------------------------------
Create a file at: .claude/quickbooks-skill.local.json

{
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "realm_id": "YOUR_REALM_ID",
  "refresh_token": "YOUR_REFRESH_TOKEN"
}

STEP 5: Get Access Token
------------------------
Run: npx tsx scripts/quickbooks.ts refresh

This will exchange your refresh token for an access token and save it
to your credentials file.

STEP 6: Verify Connection
-------------------------
Run: npx tsx scripts/quickbooks.ts check

This will show your company info if everything is configured correctly.

================================================================================
IMPORTANT NOTES:
- Access tokens expire after 1 hour - use 'refresh' command to get a new one
- Refresh tokens expire after 100 days - re-authorize if needed
- Keep your credentials file secure (it's gitignored by default)
- This skill provides READ-ONLY access to QuickBooks data
================================================================================
`;

// ============================================================================
// Token Management
// ============================================================================

export async function loadCredentials(): Promise<QBCredentials> {
  const tokenPath = getProjectTokenPath();

  try {
    const content = await fs.readFile(tokenPath, "utf-8");
    const data = JSON.parse(content);

    if (!data.client_id || !data.client_secret || !data.realm_id || !data.refresh_token) {
      throw new Error(
        `Missing required fields in credentials file.\n` +
        `Required: client_id, client_secret, realm_id, refresh_token\n` +
        `File: ${tokenPath}`
      );
    }

    return data as QBCredentials;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Credentials file not found at: ${tokenPath}\n\n` +
        `Run: npx tsx scripts/quickbooks.ts setup\n\n` +
        `For setup instructions.`
      );
    }
    throw err;
  }
}

export async function saveCredentials(credentials: QBCredentials): Promise<void> {
  const tokenPath = getProjectTokenPath();
  const tokenDir = path.dirname(tokenPath);

  // Ensure .claude directory exists
  await fs.mkdir(tokenDir, { recursive: true });

  await fs.writeFile(tokenPath, JSON.stringify(credentials, null, 2));
}

export async function refreshAccessToken(): Promise<QBCredentials> {
  const credentials = await loadCredentials();

  const auth = Buffer.from(`${credentials.client_id}:${credentials.client_secret}`).toString("base64");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: credentials.refresh_token,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error(`Token refresh response missing access_token: ${JSON.stringify(data)}`);
  }

  // Calculate expiry (tokens last 1 hour)
  const expiryDate = new Date(Date.now() + (data.expires_in || 3600) * 1000);

  const updatedCredentials: QBCredentials = {
    ...credentials,
    access_token: data.access_token,
    refresh_token: data.refresh_token || credentials.refresh_token,
    token_expiry: expiryDate.toISOString(),
  };

  await saveCredentials(updatedCredentials);

  return updatedCredentials;
}

export async function getValidAccessToken(): Promise<{ accessToken: string; realmId: string }> {
  let credentials = await loadCredentials();

  // Check if we have an access token and it's not expired
  if (credentials.access_token && credentials.token_expiry) {
    const expiry = new Date(credentials.token_expiry);
    const now = new Date();

    // Refresh if token expires in less than 5 minutes
    if (expiry.getTime() - now.getTime() > 5 * 60 * 1000) {
      return {
        accessToken: credentials.access_token,
        realmId: credentials.realm_id,
      };
    }
  }

  // Need to refresh the token
  credentials = await refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Failed to get access token after refresh");
  }

  return {
    accessToken: credentials.access_token,
    realmId: credentials.realm_id,
  };
}

export async function ensureGitignore(): Promise<void> {
  const gitignorePath = path.join(process.cwd(), ".gitignore");
  const pattern = ".claude/*.local.*";

  try {
    const content = await fs.readFile(gitignorePath, "utf-8");
    if (content.includes(pattern)) {
      return; // Already configured
    }
    // Append the pattern
    const newContent = content.endsWith("\n")
      ? content + `\n# QuickBooks skill tokens (per-project auth)\n${pattern}\n`
      : content + `\n\n# QuickBooks skill tokens (per-project auth)\n${pattern}\n`;
    await fs.writeFile(gitignorePath, newContent);
    console.error(`Added ${pattern} to .gitignore`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      // No .gitignore, create one
      await fs.writeFile(gitignorePath, `# QuickBooks skill tokens (per-project auth)\n${pattern}\n`);
      console.error(`Created .gitignore with ${pattern}`);
    } else {
      throw err;
    }
  }
}
