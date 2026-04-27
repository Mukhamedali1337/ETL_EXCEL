const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

function main() {
  const outPath =
    process.argv[2] ||
    path.join(process.cwd(), "sample_training_records.xlsx");

  const headers = [
    "employee_id",
    "full_name",
    "email",
    "course_code",
    "course_name",
    "completion_date",
    "score"
  ];

  const rows = [
    {
      employee_id: "E001",
      full_name: "Ivan Ivanov",
      email: "ivan.ivanov@example.com",
      course_code: "SAFE-101",
      course_name: "Safety Basics",
      completion_date: "2026-04-01",
      score: 95
    },
    {
      employee_id: "E002",
      full_name: "Aida Nur",
      email: "aida.nur@example.com",
      course_code: "EXCEL-201",
      course_name: "Excel for Analysts",
      completion_date: "2026-04-02",
      score: 88
    }
  ];

  const worksheet = xlsx.utils.json_to_sheet(rows, { header: headers });
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "TrainingRecords");
  xlsx.writeFile(workbook, outPath);

  const stat = fs.statSync(outPath);
  process.stdout.write(
    `Generated: ${outPath}\nSize: ${stat.size} bytes\n`
  );
}

main();
