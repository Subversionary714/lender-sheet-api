app.post("/", async (req, res) => {
  console.log("===== Incoming Request =====");
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);

  const { action, lender_name, loan_data } = req.body;

  // Granular validation logs
  if (!action) {
    console.log("❌ Missing 'action' field");
    return res.status(400).send("❌ Missing 'action'");
  }

  if (action !== "updateLender") {
    console.log("❌ Unexpected 'action' value:", action);
    return res.status(400).send("❌ Invalid action");
  }

  if (!lender_name) {
    console.log("❌ Missing 'lender_name'");
    return res.status(400).send("❌ Missing lender_name");
  }

  if (!Array.isArray(loan_data)) {
    console.log("❌ loan_data is not an array");
    return res.status(400).send("❌ loan_data must be an array of arrays");
  }

  console.log("✅ Payload validated. Proceeding to update sheet...");

  // [your Sheets logic here...]

  res.send(`✅ '${lender_name}' updated successfully`);
});
