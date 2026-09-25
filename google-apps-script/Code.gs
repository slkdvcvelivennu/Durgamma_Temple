const SHEET_ID = "PASTE_YOUR_GOOGLE_SHEET_ID_HERE";
const SHEET_NAME = "Transactions";

function doGet(e) {
  const callback = e && e.parameter && e.parameter.callback;
  const payload = { ok: true, transactions: getTransactions_() };
  const json = JSON.stringify(payload);
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + json + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function getTransactions_() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("Transactions sheet not found.");
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  return values.slice(1).filter(row => row[0] !== "").map((row, i) => ({
    id: String(row[0] || (i + 1)),
    date: formatDate_(row[1]),
    type: String(row[2]).toLowerCase() === "expenditure" ? "expense" : String(row[2]).toLowerCase(),
    description: String(row[3] || ""),
    category: String(row[4] || "Other"),
    payment: String(row[5] || "Cash"),
    amount: Number(row[6]) || 0
  }));
}

function formatDate_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  return String(value || "").slice(0, 10);
}
