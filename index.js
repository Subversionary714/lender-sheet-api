import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import fs from 'fs';
import { google } from 'googleapis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

const HEADERS = [
  "Loan Type", "Program Name", "Min FICO", "Max LTV", "Min Loan Amount", "Max Loan Amount",
  "Occupancy", "Property Type", "DTI Limit", "MI Requirement", "Prepayment Penalty",
  "Reserve Requirement", "Min DSCR", "Notes / Highlights", "Product Source"
];

const SHEET_ID = process.env.SHEET_ID;
const CREDENTIALS = JSON.parse(fs.readFileSync('credentials.json', 'utf8'));

const auth = new google.auth.GoogleAuth({
  credentials: CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

app.post('/', async (req, res) => {
  try {
    const { action, lender_name, loan_data } = req.body;

    if (action !== 'updateLender' || !lender_name || !Array.isArray(loan_data)) {
      return res.status(400).send('❌ Invalid payload');
    }

    const sheetTitle = lender_name;

    // Check existing sheets
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const sheetExists = spreadsheet.data.sheets.some(sheet => sheet.properties.title === sheetTitle);

    if (!sheetExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetTitle,
                },
              },
            },
          ],
        },
      });
    }

    // Clear the sheet
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: `${sheetTitle}!A1:Z1000`,
    });

    // Add headers and data
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${sheetTitle}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [HEADERS],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${sheetTitle}!A2`,
      valueInputOption: 'RAW',
      requestBody: {
        values: loan_data,
      },
    });

    res.status(200).send(`✅ '${lender_name}' updated successfully`);
  } catch (error) {
    console.error('❌ Google Sheets API Error:', error.message);
    res.status(500).send(`❌ Google Sheets API Error: ${error.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
