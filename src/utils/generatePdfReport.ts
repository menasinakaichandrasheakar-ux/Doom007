import { jsPDF } from "jspdf";
import { CampusDataState, VisitorProfile } from "../types";

export interface ReportOptions {
  generatedBy?: VisitorProfile | null;
  institutionName?: string;
  departmentFilter?: string;
}

export function generateCampusRiskPdfReport(
  data: CampusDataState,
  options: ReportOptions = {}
): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  // Helper for page break check
  const checkPageBreak = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeaderStrip();
    }
  };

  const drawHeaderStrip = () => {
    doc.setFillColor(26, 26, 26); // #1a1a1a
    doc.rect(margin, y, contentWidth, 1.2, "F");
    y += 4;
  };

  // 1. Report Title Header Block
  doc.setFillColor(26, 26, 26);
  doc.rect(margin, y, contentWidth, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("PRESENT SIR | CAMPUS OS", margin + 4, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("ACADEMIC RISK & ATTENDANCE AUDIT REPORT", margin + 4, y + 14);
  doc.text("STU_SYS_VER_4.0", margin + 4, y + 18);

  const reportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  doc.setFontSize(8);
  doc.text(`Generated: ${reportDate}`, pageWidth - margin - 4, y + 8, { align: "right" });
  const auditor = options.generatedBy ? `${options.generatedBy.name} (${options.generatedBy.role})` : "Campus Administrator";
  doc.text(`Auditor: ${auditor}`, pageWidth - margin - 4, y + 14, { align: "right" });
  doc.text("Confidential / Institutional Use", pageWidth - margin - 4, y + 18, { align: "right" });

  y += 28;

  // 2. Executive Metrics Cards
  const totalStudents = data.students.length;
  
  // Attendance metrics
  const attendanceVals = data.attendance
    .map(a => parseFloat(a.AttendancePercentage))
    .filter(n => !isNaN(n));
  const avgAttendance = attendanceVals.length > 0
    ? (attendanceVals.reduce((acc, curr) => acc + curr, 0) / attendanceVals.length).toFixed(1)
    : "0.0";

  const lowAttendanceRecords = data.attendance.filter(a => {
    const val = parseFloat(a.AttendancePercentage);
    return !isNaN(val) && val < 75;
  });

  const highRiskStudents = data.riskAnalysis.filter(
    r => r.RiskLevel === "High Risk" || r.RiskLevel === "Support Required"
  );
  const moderateRiskStudents = data.riskAnalysis.filter(
    r => r.RiskLevel === "Moderate Risk"
  );
  const pendingInterventions = data.recommendations.filter(
    r => r.Status === "Pending"
  );

  // Metrics Grid (4 columns)
  const cardWidth = (contentWidth - 6) / 4;
  const cardHeight = 16;
  const metrics = [
    { label: "TOTAL STUDENTS", value: `${totalStudents}`, color: [26, 26, 26] },
    { label: "AVG ATTENDANCE", value: `${avgAttendance}%`, color: parseFloat(avgAttendance) < 75 ? [225, 29, 72] : [13, 148, 136] },
    { label: "DEFICIT ATTENDANCE (<75%)", value: `${lowAttendanceRecords.length}`, color: lowAttendanceRecords.length > 0 ? [225, 29, 72] : [26, 26, 26] },
    { label: "HIGH RISK FLAGS", value: `${highRiskStudents.length}`, color: highRiskStudents.length > 0 ? [225, 29, 72] : [26, 26, 26] },
  ];

  metrics.forEach((m, idx) => {
    const cx = margin + idx * (cardWidth + 2);
    doc.setFillColor(248, 247, 244); // #f8f7f4
    doc.rect(cx, y, cardWidth, cardHeight, "F");
    doc.setDrawColor(26, 26, 26);
    doc.setLineWidth(0.3);
    doc.rect(cx, y, cardWidth, cardHeight, "D");

    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(m.label, cx + 2.5, y + 4.5);

    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(m.value, cx + 2.5, y + 12);
  });

  y += cardHeight + 8;

  // 3. Section: Low Attendance Warning & Deficit Register (<75%)
  checkPageBreak(30);
  doc.setFillColor(26, 26, 26);
  doc.rect(margin, y, contentWidth, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("1. ATTENDANCE DEFICIT & SHORTAGE REGISTER (< 75% MANDATORY THRESHOLD)", margin + 3, y + 4.2);
  y += 8;

  if (lowAttendanceRecords.length === 0) {
    doc.setTextColor(70, 70, 70);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.text("No students currently fall below the mandatory 75% attendance threshold.", margin + 2, y + 4);
    y += 10;
  } else {
    // Table Header
    doc.setFillColor(235, 235, 230);
    doc.rect(margin, y, contentWidth, 5.5, "F");
    doc.setDrawColor(26, 26, 26);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, contentWidth, 5.5, "D");

    doc.setTextColor(26, 26, 26);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("ID", margin + 2, y + 3.8);
    doc.text("STUDENT NAME", margin + 22, y + 3.8);
    doc.text("DEPARTMENT", margin + 70, y + 3.8);
    doc.text("ATTENDED / TOTAL", margin + 115, y + 3.8);
    doc.text("PERCENTAGE", margin + 155, y + 3.8);
    doc.text("STATUS", margin + contentWidth - 4, y + 3.8, { align: "right" });
    y += 5.5;

    // Table Rows
    lowAttendanceRecords.forEach((rec, i) => {
      checkPageBreak(7);
      const student = data.students.find(s => s.StudentID === rec.StudentID);
      const studentName = student ? student.Name : "Unknown";
      const dept = student ? student.Department : "CSE";

      if (i % 2 === 1) {
        doc.setFillColor(250, 250, 248);
        doc.rect(margin, y, contentWidth, 5.2, "F");
      }
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.1);
      doc.line(margin, y + 5.2, margin + contentWidth, y + 5.2);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(26, 26, 26);

      doc.text(rec.StudentID, margin + 2, y + 3.8);
      doc.text(studentName.substring(0, 26), margin + 22, y + 3.8);
      doc.text(dept, margin + 70, y + 3.8);
      doc.text(`${rec.ClassesAttended} / ${rec.TotalClasses}`, margin + 115, y + 3.8);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(225, 29, 72);
      doc.text(`${rec.AttendancePercentage}%`, margin + 155, y + 3.8);
      doc.text("DEFICIT", margin + contentWidth - 4, y + 3.8, { align: "right" });

      y += 5.2;
    });

    y += 6;
  }

  // 4. Section: Academic Risk Analysis & Interventions
  checkPageBreak(35);
  doc.setFillColor(26, 26, 26);
  doc.rect(margin, y, contentWidth, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("2. MULTI-FACTOR RISK CLASSIFICATION & INTERVENTION PIPELINE", margin + 3, y + 4.2);
  y += 8;

  // Table Header for Risk
  doc.setFillColor(235, 235, 230);
  doc.rect(margin, y, contentWidth, 5.5, "F");
  doc.setDrawColor(26, 26, 26);
  doc.setLineWidth(0.2);
  doc.rect(margin, y, contentWidth, 5.5, "D");

  doc.setTextColor(26, 26, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("ID", margin + 2, y + 3.8);
  doc.text("STUDENT NAME", margin + 22, y + 3.8);
  doc.text("CALC SCORE", margin + 75, y + 3.8);
  doc.text("RISK LEVEL", margin + 105, y + 3.8);
  doc.text("RECOMMENDED ACTION", margin + 138, y + 3.8);
  y += 5.5;

  const relevantRisks = data.riskAnalysis.filter(
    r => r.RiskLevel === "High Risk" || r.RiskLevel === "Support Required" || r.RiskLevel === "Moderate Risk"
  );

  if (relevantRisks.length === 0) {
    doc.setTextColor(70, 70, 70);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.text("All students evaluated are in Low Risk / Stable academic standing.", margin + 2, y + 4);
    y += 10;
  } else {
    relevantRisks.forEach((risk, i) => {
      checkPageBreak(7);
      const student = data.students.find(s => s.StudentID === risk.StudentID);
      const studentName = student ? student.Name : "Student";
      const rec = data.recommendations.find(r => r.StudentID === risk.StudentID);
      const actionText = rec ? rec.RecommendedAction : "Academic Counseling & Follow-up";

      if (i % 2 === 1) {
        doc.setFillColor(250, 250, 248);
        doc.rect(margin, y, contentWidth, 5.2, "F");
      }
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.1);
      doc.line(margin, y + 5.2, margin + contentWidth, y + 5.2);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(26, 26, 26);

      doc.text(risk.StudentID, margin + 2, y + 3.8);
      doc.text(studentName.substring(0, 26), margin + 22, y + 3.8);
      doc.text(`${risk.CalculatedScore} / 100`, margin + 75, y + 3.8);

      // Color badge for risk level
      doc.setFont("helvetica", "bold");
      if (risk.RiskLevel === "High Risk" || risk.RiskLevel === "Support Required") {
        doc.setTextColor(225, 29, 72);
      } else {
        doc.setTextColor(217, 119, 6);
      }
      doc.text(risk.RiskLevel, margin + 105, y + 3.8);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(70, 70, 70);
      doc.text(actionText.substring(0, 32), margin + 138, y + 3.8);

      y += 5.2;
    });

    y += 6;
  }

  // 5. Section: Academic Marks & Performance Audit
  const failedMarks = data.marks.filter(m => {
    const total = parseFloat(m.TotalMarks);
    return !isNaN(total) && total < 40;
  });

  checkPageBreak(30);
  doc.setFillColor(26, 26, 26);
  doc.rect(margin, y, contentWidth, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`3. ACADEMIC EVALUATION & REMEDIAL SUBJECT ALERTS (${failedMarks.length} SUBJECT DEFICITS)`, margin + 3, y + 4.2);
  y += 8;

  if (failedMarks.length === 0) {
    doc.setTextColor(70, 70, 70);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.text("No failing marks (<40) recorded across all course evaluations.", margin + 2, y + 4);
    y += 10;
  } else {
    // Table Header for Marks
    doc.setFillColor(235, 235, 230);
    doc.rect(margin, y, contentWidth, 5.5, "F");
    doc.setDrawColor(26, 26, 26);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, contentWidth, 5.5, "D");

    doc.setTextColor(26, 26, 26);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("STUDENT ID", margin + 2, y + 3.8);
    doc.text("STUDENT NAME", margin + 25, y + 3.8);
    doc.text("SUBJECT CODE / TITLE", margin + 75, y + 3.8);
    doc.text("INTERNAL (30)", margin + 125, y + 3.8);
    doc.text("EXAM (70)", margin + 150, y + 3.8);
    doc.text("TOTAL (100)", margin + contentWidth - 4, y + 3.8, { align: "right" });
    y += 5.5;

    failedMarks.slice(0, 10).forEach((m, i) => {
      checkPageBreak(7);
      const student = data.students.find(s => s.StudentID === m.StudentID);
      const studentName = student ? student.Name : "Student";

      if (i % 2 === 1) {
        doc.setFillColor(250, 250, 248);
        doc.rect(margin, y, contentWidth, 5.2, "F");
      }
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.1);
      doc.line(margin, y + 5.2, margin + contentWidth, y + 5.2);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(26, 26, 26);

      doc.text(m.StudentID, margin + 2, y + 3.8);
      doc.text(studentName.substring(0, 24), margin + 25, y + 3.8);
      doc.text(m.Subject.substring(0, 26), margin + 75, y + 3.8);
      doc.text(m.InternalMarks, margin + 125, y + 3.8);
      doc.text(m.ExamMarks, margin + 150, y + 3.8);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(225, 29, 72);
      doc.text(`${m.TotalMarks} (FAIL)`, margin + contentWidth - 4, y + 3.8, { align: "right" });

      y += 5.2;
    });
    y += 6;
  }

  // 6. Summary Recommendations and Next Steps
  checkPageBreak(25);
  doc.setFillColor(248, 247, 244);
  doc.rect(margin, y, contentWidth, 18, "F");
  doc.setDrawColor(26, 26, 26);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, 18, "D");

  doc.setTextColor(26, 26, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("INSTITUTIONAL ACTION PROTOCOL", margin + 3, y + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  doc.text(
    "1. Immediate parent-teacher notifications triggered for all students with attendance under 75% threshold.",
    margin + 3,
    y + 8.5
  );
  doc.text(
    `2. Remedial coaching sessions scheduled for ${failedMarks.length} subjects with failing evaluations.`,
    margin + 3,
    y + 12.5
  );
  doc.text(
    `3. Faculty mentors assigned to all ${highRiskStudents.length} high-risk students to monitor weekly progress.`,
    margin + 3,
    y + 16.5
  );

  y += 24;

  // Add Page Numbers & Footer across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(26, 26, 26);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text("Present Sir Smart Campus Monitoring System &bull; Generated from Live Storage", margin, pageHeight - 6);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
  }

  // Download the PDF file
  const fileName = `Present_Sir_Campus_Audit_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
