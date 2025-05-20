import express from "express";
import { google } from "googleapis";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const auth = new google.auth.GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  credentials: JSON.parse(fs.readFileSync("credentials.json", "utf-8"))
});

app.post("/", async (req, res) => {
  const { action, lender_name, loan_data } = req.body;

  if (action !== "updateLender" || !Array.isArray(loan_data)) {
    return res.status(400).send("❌ Invalid payload");
  }

  try {
    const sheets = google.sheets({ version: "v4", auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    // Try to clear and recreate the sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: { title: lender_name }
          }
        }]
      }
    }).catch(() => {}); // If sheet exists, ignore

    const header = [
      "Loan Type", "Program Name", "Min FICO", "Max LTV", "Min Loan Amount", "Max Loan Amount",
      "Occupancy", "Property Type", "DTI Limit", "MI Requirement", "Prepayment Penalty",
      "Reserve Requirement", "Min DSCR", "Notes / Highlights", "Product Source"
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${lender_name}'!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [header, ...loan_data]
      }
    });

    res.send(`✅ '${lender_name}' updated successfully`);
  } catch (err) {
    res.status(500).send("❌ Error: " + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server listening on port ${PORT}`));
