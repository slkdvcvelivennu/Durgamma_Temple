# Google Sheets + Apps Script setup

1. Create a Google Sheet named Durgamma Temple Finance.
2. Create a tab named Transactions.
3. Put these headers in row 1: ID | Date | Type | Description | Category | Payment | Amount
4. Enter Income or Expenditure in Type.
5. Keep the Sheet private.

## Apps Script

Open Extensions -> Apps Script from the Sheet. Replace the default code with google-apps-script/Code.gs. Replace PASTE_YOUR_GOOGLE_SHEET_ID_HERE with the ID from the Sheet URL.

Then choose Deploy -> New deployment -> Web app.
- Execute as: Me
- Who has access: Anyone

Copy the /exec URL and put it into config.js as APPS_SCRIPT_URL.
Optionally put the private Sheet URL into ADMIN_SHEET_URL.

Google documents that Apps Script web apps can execute as the deploying account and can be deployed as browser-accessible web apps: https://developers.google.com/apps-script/guides/web

The public portal reads transaction data only. Your Google account remains the owner/editor of the private Sheet. The current public UI does not send write credentials to the browser.
