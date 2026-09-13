const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require("docx");

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          text: "Proposal: Handling Revisions to Recorded Transactions",
          heading: HeadingLevel.TITLE,
        }),
        new Paragraph({
          text: "Editing a recorded transaction (such as a fee collection receipt) is one of the most sensitive features in any management software. We need to carefully consider the implications and decide on the best approach.",
          spacing: { before: 200, after: 200 },
        }),
        new Paragraph({
          text: "1. The Implications (The Challenges of Editing)",
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "The Audit Trail & Printed Receipts: ", bold: true }),
            new TextRun(
              "When a payment is recorded, a Receipt Number is generated. The student might already have a printed copy or SMS of this receipt. If you edit the amount or date in the system later, the physical receipt they hold will no longer match the system. This breaks the audit trail."
            ),
          ],
          bullet: { level: 0 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Fee Component Allocations: ", bold: true }),
            new TextRun(
              "When you collect a fee (e.g., Rs.5,000), the system automatically splits that money into specific fee components (e.g., Rs.3,000 to Tuition, Rs.2,000 to Transport). If you later edit the total amount down to Rs.4,000, the system does not know which component to deduct the Rs.1,000 from. Re-allocating this mathematically is very complex."
            ),
          ],
          bullet: { level: 0 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Reporting: ", bold: true }),
            new TextRun(
              "Changing a date retroactively alters the Daily Collection Reports from past days, which might have already been submitted to management."
            ),
          ],
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: "2. The Proposed Approaches",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400 },
        }),
        new Paragraph({
          text: "Option A: \"Void & Re-enter\" (Highly Recommended Approach)",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          text: "Instead of an \"Edit\" button, we build a \"Cancel / Delete Receipt\" button (restricted to Managers/Admins).",
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "How it works: ", bold: true }),
            new TextRun("It deletes the incorrect transaction and its allocations, restoring the student's pending balance. You then quickly record a fresh, correct payment."),
          ],
          bullet: { level: 0 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Pros: ", bold: true }),
            new TextRun("100% mathematically safe. No broken allocations. This is the standard practice in strict accounting software."),
          ],
          bullet: { level: 0 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Cons: ", bold: true }),
            new TextRun("You have to re-enter the payment details from scratch."),
          ],
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: "Option B: \"Safe Edit\" (Metadata Only)",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200 },
        }),
        new Paragraph({
          text: "We allow an Edit button, but we restrict what can be edited.",
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "How it works: ", bold: true }),
            new TextRun("You can edit the Date, Payment Mode (Cash vs Bank), and Transaction Number. You cannot edit the Total Amount or the Student."),
          ],
          bullet: { level: 0 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Pros: ", bold: true }),
            new TextRun("Fixes 90% of clerical mistakes (e.g., selecting Cash instead of Bank, or forgetting to enter the UTR number) without breaking the complex fee math."),
          ],
          bullet: { level: 0 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Cons: ", bold: true }),
            new TextRun("If you accidentally entered Rs.50,000 instead of Rs.5,000, you would still have to delete it and re-enter it."),
          ],
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: "Recommendation",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200 },
        }),
        new Paragraph({
          text: "Combining Option A (Delete & Re-enter) with Option B (Editing only the Date/Mode/Reference) is usually the sweet spot for schools and institutes. It provides the flexibility to fix simple typos, while maintaining strict financial integrity for amounts.",
        })
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("c:/Users/vamsi/Desktop/Transaction_Edit_Proposal.docx", buffer);
  console.log("Document created successfully");
});
