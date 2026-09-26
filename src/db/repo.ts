import { eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import { students, attendance, marks, feedback, riskAnalysis, recommendations, users } from './schema.ts';
import fs from 'fs';

// Helper to seed initial data from CSV if PostgreSQL tables are empty
export async function seedInitialDataIfEmpty() {
  try {
    const studentCount = await db.select({ count: sql<number>`count(*)` }).from(students);
    const count = Number(studentCount[0]?.count || 0);

    if (count === 0 && fs.existsSync("students.csv")) {
      console.log("Seeding PostgreSQL tables from initial datasets...");
      
      const parseCsvSimple = (filepath: string) => {
        if (!fs.existsSync(filepath)) return [];
        const content = fs.readFileSync(filepath, "utf-8");
        const lines = content.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) return [];
        const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ''));
        const records: Record<string, string>[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ''));
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            row[h] = values[idx] !== undefined ? values[idx] : "";
          });
          records.push(row);
        }
        return records;
      };

      // 1. Students
      const rawStudents = parseCsvSimple("students.csv");
      for (const s of rawStudents) {
        if (s.StudentID && s.Name) {
          await db.insert(students).values({
            studentId: s.StudentID,
            name: s.Name,
            department: s.Department || 'BCA-AI&DA',
            semester: s.Semester || '1',
            email: s.Email || `${s.StudentID.toLowerCase()}@campus.edu`
          }).onConflictDoNothing();
        }
      }

      // 2. Attendance
      const rawAttendance = parseCsvSimple("attendance.csv");
      for (const a of rawAttendance) {
        if (a.RecordID && a.StudentID) {
          await db.insert(attendance).values({
            recordId: a.RecordID,
            studentId: a.StudentID,
            totalClasses: parseInt(a.TotalClasses, 10) || 100,
            classesAttended: parseInt(a.ClassesAttended, 10) || 85,
            attendancePercentage: String(parseFloat(a.AttendancePercentage) || 85.00)
          }).onConflictDoNothing();
        }
      }

      // 3. Marks
      const rawMarks = parseCsvSimple("marks.csv");
      for (const m of rawMarks) {
        if (m.RecordID && m.StudentID) {
          await db.insert(marks).values({
            recordId: m.RecordID,
            studentId: m.StudentID,
            subject: m.Subject || 'Python',
            internalMarks: String(parseFloat(m.InternalMarks) || 35),
            examMarks: String(parseFloat(m.ExamMarks) || 40),
            totalMarks: String(parseFloat(m.TotalMarks) || 75)
          }).onConflictDoNothing();
        }
      }

      // 4. Feedback
      const rawFeedback = parseCsvSimple("feedback.csv");
      for (const f of rawFeedback) {
        if (f.FeedbackID && f.StudentID) {
          await db.insert(feedback).values({
            feedbackId: f.FeedbackID,
            studentId: f.StudentID,
            timestamp: f.Timestamp || new Date().toISOString(),
            feedbackText: f.FeedbackText || '',
            sentiment: f.Sentiment || 'Neutral',
            category: f.Category || 'General',
            extractedKeywords: f.ExtractedKeywords || ''
          }).onConflictDoNothing();
        }
      }

      // 5. Risk Analysis
      const rawRisk = parseCsvSimple("risk_analysis.csv");
      for (const r of rawRisk) {
        if (r.AnalysisID && r.StudentID) {
          await db.insert(riskAnalysis).values({
            analysisId: r.AnalysisID,
            studentId: r.StudentID,
            calculatedScore: String(parseFloat(r.CalculatedScore) || 15),
            riskLevel: r.RiskLevel || 'Low Risk',
            dateEvaluated: r.DateEvaluated || new Date().toISOString()
          }).onConflictDoNothing();
        }
      }

      // 6. Recommendations
      const rawRecs = parseCsvSimple("recommendations.csv");
      for (const rc of rawRecs) {
        if (rc.RecID && rc.StudentID) {
          await db.insert(recommendations).values({
            recId: rc.RecID,
            studentId: rc.StudentID,
            riskLevel: rc.RiskLevel || 'Low Risk',
            recommendedAction: rc.RecommendedAction || 'Standard Mentoring',
            status: rc.Status || 'Pending'
          }).onConflictDoNothing();
        }
      }

      console.log("PostgreSQL seeding completed successfully!");
    }
  } catch (err) {
    console.error("Error during initial data seeding:", err);
  }
}

// Data fetching helper
export async function getAllCampusData() {
  try {
    const studentRows = await db.select().from(students);
    const attendanceRows = await db.select().from(attendance);
    const marksRows = await db.select().from(marks);
    const feedbackRows = await db.select().from(feedback);
    const riskRows = await db.select().from(riskAnalysis);
    const recRows = await db.select().from(recommendations);

    // Format for existing frontend interface
    return {
      students: studentRows.map(s => ({
        StudentID: s.studentId,
        Name: s.name,
        Department: s.department,
        Semester: s.semester,
        Email: s.email
      })),
      attendance: attendanceRows.map(a => ({
        RecordID: a.recordId,
        StudentID: a.studentId,
        TotalClasses: String(a.totalClasses),
        ClassesAttended: String(a.classesAttended),
        AttendancePercentage: String(a.attendancePercentage)
      })),
      marks: marksRows.map(m => ({
        RecordID: m.recordId,
        StudentID: m.studentId,
        Subject: m.subject,
        InternalMarks: String(m.internalMarks),
        ExamMarks: String(m.examMarks),
        TotalMarks: String(m.totalMarks)
      })),
      feedback: feedbackRows.map(f => ({
        FeedbackID: f.feedbackId,
        StudentID: f.studentId,
        Timestamp: f.timestamp,
        FeedbackText: f.feedbackText,
        Sentiment: f.sentiment,
        Category: f.category,
        ExtractedKeywords: f.extractedKeywords
      })),
      riskAnalysis: riskRows.map(r => ({
        AnalysisID: r.analysisId,
        StudentID: r.studentId,
        CalculatedScore: String(r.calculatedScore),
        RiskLevel: r.riskLevel,
        DateEvaluated: r.dateEvaluated
      })),
      recommendations: recRows.map(rc => ({
        RecID: rc.recId,
        StudentID: rc.studentId,
        RiskLevel: rc.riskLevel,
        RecommendedAction: rc.recommendedAction,
        Status: rc.status
      }))
    };
  } catch (error) {
    console.error("Error loading campus data from PostgreSQL:", error);
    throw new Error("Failed to load campus records from database", { cause: error });
  }
}
