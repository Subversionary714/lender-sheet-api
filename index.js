import express from "express";
import { google } from "googleapis";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Auth with Google service account
const auth = new google.auth.GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  credentials: JSON.parse(fs.readFileSync("credentials.json", "utf-8"))
});

app.post("/", async (req, res) => {
  console.log("===== Incoming Request =====");
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);

  const { action, lender_name, loan_data } = req.body;

  if (!action || action !== "updateLender") {
    console.log("❌ Invalid or missing 'action'");
    return res.status(400).send("❌ Missing or invalid 'action'");
  }

  if (!lender_name || !Array.isArray(loan_data)) {
    console.log("❌ Missing 'lender_name' or 'loan_data' invalid");
    return res.status(400).send("❌ Missing lender_name or loan_data");
  }

  const header = [
    "Loan Type", "Program Name", "Min FICO", "Max LTV", "Min Loan Amount", "Max Loan Amount",
    "Occupancy", "Property Type", "DTI Limit", "MI Requirement", "Prepayment Penalty",
    "Reserve Requirement", "Min DSCR", "Notes / Highlights", "Product Source"
  ];

  try {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Step 1: Check if the sheet exists
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = spreadsheet.data.sheets.some(
      (s) => s.properties.title === lender_name
    );

    // Step 2: Create sheet if it doesn't exist
    if (!sheetExists) {
      console.log(`ℹ️ Sheet '${lender_name}' not found. Creating...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: lender_name
                }
              }
            }
          ]
        }
      });
    }

    // Step 3: Write header + data
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${lender_name}'!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [header, ...loan_data]
      }
    });

    console.log(`✅ '${lender_name}' updated successfully`);
    res.send(`✅ '${lender_name}' updated successfully`);
  } catch (err) {
    console.error("❌ Google Sheets API Error:", err.message);
    res.status(500).send("❌ Error: " + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server listening on port ${PORT}`));
