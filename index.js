import expressPkg from "express";
import { google } from "googleapis";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const express = expressPkg.default;
const app = express();
app.use(express.json());

const auth = new google.auth.GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  credentials: JSON.parse(fs.readFileSync("credentials.json", "utf-8"))
});

app.post("/", async (req, res) => {
  console.log("===== Incoming Request =====");
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);

  const { action, lender_name, loan_data } = req.body;

  if (!action) {
    console.log("❌ Missing 'action'");
    return res.status(400).send("❌ Missing 'action'");
  }

  if (action !== "updateLender") {
    console.log("❌ Invalid action:", action);
    return res.status(400).send("❌ Invalid action");
  }

  if (!lender_name) {
    console.log("❌ Missing 'lender_name'");
    return res.status(400).send("❌ Missing lender_name");
  }

  if (!Array.isArray(loan_data)) {
    console.log("❌ 'loan_data' is not an array");
    return res.status(400).send("❌ 'loan_data' must be an array");
  }

  console.log("✅ Payload validated. Proceeding to update sheet...");

  try {
    const sheets = google.sheets({ version: "v4", auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

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

    console.log(`✅ Updated tab '${lender_name}'`);
    res.send(`✅ '${lender_name}' updated successfully`);
  } catch (err) {
    console.log("❌ Google Sheets API Error:", err.message);
    res.status(500).send("❌ Error: " + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server listening on port ${PORT}`));
