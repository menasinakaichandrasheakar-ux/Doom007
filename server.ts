import express from "express";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { createServer as createViteServer } from "vite";
import { eq } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";
import { db } from "./src/db/index.ts";
import { students, attendance, marks, feedback, riskAnalysis, recommendations, users } from "./src/db/schema.ts";
import { seedInitialDataIfEmpty, getAllCampusData } from "./src/db/repo.ts";
import { optionalAuth, AuthRequest } from "./src/middleware/auth.ts";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(optionalAuth);

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Trigger initial seed on startup
seedInitialDataIfEmpty().catch(err => console.error("Initial DB seed warning:", err));

// -------------------------------------------------------------
// API ROUTES (Backed by Cloud SQL PostgreSQL + Drizzle ORM)
// -------------------------------------------------------------

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database: "PostgreSQL (Cloud SQL)",
    time: new Date().toISOString()
  });
});

// Get all campus data across all tables
app.get("/api/data", async (req, res) => {
  try {
    const data = await getAllCampusData();
    res.json(data);
  } catch (err: any) {
    console.error("GET /api/data error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch campus dataset." });
  }
});

// Student Management CRUD
app.post("/api/students", async (req: AuthRequest, res) => {
  try {
    const student_id = String(req.body.student_id || req.body.StudentID || "").trim();
    const name = String(req.body.name || req.body.Name || "").trim();
    const department = String(req.body.department || req.body.Department || "Computer Science").trim();
    const semester = String(req.body.semester || req.body.Semester || "1").trim();
    const email = String(req.body.email || req.body.Email || "").trim();
    const action = String(req.body.action || "add").trim();

    if (action === "delete") {
      await db.delete(students).where(eq(students.studentId, student_id));
      const freshData = await getAllCampusData();
      return res.json({ success: true, message: `Student ${student_id} removed.`, students: freshData.students });
    }

    if (!student_id || !name || !email) {
      return res.status(400).json({ error: "Student ID, Name, and Email are required fields." });
    }

    const existing = await db.select().from(students).where(eq(students.studentId, student_id));

    if (action === "update") {
      if (existing.length === 0) {
        return res.status(404).json({ error: `Student '${student_id}' not found in records.` });
      }
      await db.update(students)
        .set({
          name,
          department,
          semester: semester || "1",
          email
        })
        .where(eq(students.studentId, student_id));
    } else {
      // Add
      if (existing.length > 0) {
        return res.status(409).json({ error: `Duplicate Student ID: '${student_id}' already exists in the directory.` });
      }
      await db.insert(students).values({
        studentId: student_id,
        name,
        department,
        semester: semester || "1",
        email
      });

      // Also create initial attendance and risk analysis records
      const recordId = `ATT${Date.now().toString().slice(-4)}`;
      await db.insert(attendance).values({
        recordId,
        studentId: student_id,
        totalClasses: 100,
        classesAttended: 85,
        attendancePercentage: "85.00"
      }).onConflictDoNothing();

      const analysisId = `RSK${Date.now().toString().slice(-4)}`;
      const now = new Date().toISOString().replace("T", " ").substring(0, 16);
      await db.insert(riskAnalysis).values({
        analysisId,
        studentId: student_id,
        calculatedScore: "15.00",
        riskLevel: "Low Risk",
        dateEvaluated: now
      }).onConflictDoNothing();
    }

    const freshData = await getAllCampusData();
    res.json({
      success: true,
      message: `Student '${name}' (${student_id}) successfully ${action === "update" ? "updated" : "enrolled"}.`,
      student: { StudentID: student_id, Name: name, Department: department, Semester: semester, Email: email },
      students: freshData.students
    });
  } catch (err: any) {
    console.error("POST /api/students error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Record Attendance
app.post("/api/attendance", async (req, res) => {
  try {
    const student_id = String(req.body.student_id || req.body.StudentID || "").trim();
    const total_classes = req.body.total_classes || req.body.TotalClasses;
    const classes_attended = req.body.classes_attended || req.body.ClassesAttended;
    const total = parseInt(total_classes, 10);
    const attended = parseInt(classes_attended, 10);

    if (isNaN(total) || isNaN(attended) || total < 0 || attended < 0) {
      return res.status(400).json({ error: "Total and attended classes must be positive numbers." });
    }
    if (attended > total) {
      return res.status(400).json({ error: "Classes attended cannot exceed total classes." });
    }

    const percentage = total > 0 ? ((attended / total) * 100).toFixed(2) : "0.00";
    const existing = await db.select().from(attendance).where(eq(attendance.studentId, student_id));

    if (existing.length > 0) {
      await db.update(attendance)
        .set({
          totalClasses: total,
          classesAttended: attended,
          attendancePercentage: percentage,
          updatedAt: new Date()
        })
        .where(eq(attendance.studentId, student_id));
    } else {
      const recordId = `ATT${Date.now().toString().slice(-4)}`;
      await db.insert(attendance).values({
        recordId,
        studentId: student_id,
        totalClasses: total,
        classesAttended: attended,
        attendancePercentage: percentage
      });
    }

    res.json({ success: true, percentage });
  } catch (err: any) {
    console.error("POST /api/attendance error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Record Marks
app.post("/api/marks", async (req, res) => {
  try {
    const student_id = String(req.body.student_id || req.body.StudentID || "").trim();
    const subject = String(req.body.subject || req.body.Subject || "").trim();
    const internal_marks = req.body.internal_marks || req.body.InternalMarks;
    const exam_marks = req.body.exam_marks || req.body.ExamMarks;
    const im = parseFloat(internal_marks);
    const em = parseFloat(exam_marks);

    if (isNaN(im) || isNaN(em) || im < 0 || im > 50 || em < 0 || em > 50) {
      return res.status(400).json({ error: "Internal and Exam marks must each be between 0 and 50." });
    }

    const total = (im + em).toFixed(2);
    const existing = await db.select().from(marks).where(
      eq(marks.studentId, student_id)
    );

    const match = existing.find(r => r.subject.toLowerCase() === subject.toLowerCase());

    if (match) {
      await db.update(marks)
        .set({
          internalMarks: im.toFixed(2),
          examMarks: em.toFixed(2),
          totalMarks: total,
          updatedAt: new Date()
        })
        .where(eq(marks.recordId, match.recordId));
    } else {
      const recordId = `MRK${Date.now().toString().slice(-4)}`;
      await db.insert(marks).values({
        recordId,
        studentId: student_id,
        subject,
        internalMarks: im.toFixed(2),
        examMarks: em.toFixed(2),
        totalMarks: total
      });
    }

    res.json({ success: true, totalMarks: total });
  } catch (err: any) {
    console.error("POST /api/marks error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Record Feedback
app.post("/api/feedback", async (req, res) => {
  try {
    const student_id = String(req.body.student_id || req.body.StudentID || "").trim();
    const feedback_text = String(req.body.feedback_text || req.body.FeedbackText || "").trim();
    const sentiment = String(req.body.sentiment || req.body.Sentiment || "Neutral").trim();
    const category = String(req.body.category || req.body.Category || "General").trim();
    const extracted_keywords = String(req.body.extracted_keywords || req.body.ExtractedKeywords || "").trim();

    if (!student_id || !feedback_text) {
      return res.status(400).json({ error: "Student ID and feedback text required." });
    }

    const feedbackId = `FB${Date.now().toString().slice(-4)}`;
    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 16);

    await db.insert(feedback).values({
      feedbackId,
      studentId: student_id,
      timestamp,
      feedbackText: feedback_text,
      sentiment,
      category,
      extractedKeywords: extracted_keywords
    });

    res.json({ success: true, feedbackId });
  } catch (err: any) {
    console.error("POST /api/feedback error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update Recommendation Status
app.post("/api/recommendations/status", async (req, res) => {
  try {
    const { rec_id, status } = req.body;
    await db.update(recommendations)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(recommendations.recId, rec_id));

    res.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/recommendations/status error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Execute Python Verification Suite
app.post("/api/run-python-test", (req, res) => {
  exec("python3 main.py --test", (error, stdout, stderr) => {
    res.json({
      success: !error,
      output: stdout || stderr,
      error: error ? error.message : null
    });
  });
});

// Retrieve Python files source code for the Desktop Code & Architecture inspector
app.get("/api/python-files", (req, res) => {
  try {
    const files = ["main.py", "models.py", "nlp_engine.py", "analytics.py", "gui.py", "requirements.txt", "README.md"];
    const fileContents: Record<string, string> = {};
    for (const f of files) {
      if (fs.existsSync(f)) {
        fileContents[f] = fs.readFileSync(f, "utf-8");
      }
    }
    res.json({ files: fileContents });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper for resilient Gemini API execution with retry and fallback across models
async function generateGeminiContentWithFallback(
  ai: GoogleGenAI,
  preferredModel: string,
  contents: any[],
  systemInstruction: string,
  temperature = 0.7
): Promise<{ text: string; modelUsed: string }> {
  // Candidate fallback order
  const modelCandidates = [
    preferredModel,
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.1-pro-preview"
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  let lastError: any = null;

  for (const modelName of modelCandidates) {
    // Try up to 2 attempts per model with short jittered delay for 503/429
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature,
          },
        });

        if (response && response.text) {
          return { text: response.text, modelUsed: modelName };
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("high demand") ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED");

        console.warn(`[Gemini API] Attempt ${attempt} on model '${modelName}' encountered: ${errMsg}`);

        if (isTransient && attempt < 2) {
          // Wait 600ms-1200ms before retrying same model
          const delayMs = 600 * attempt + Math.floor(Math.random() * 400);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          // Move on to fallback model
          break;
        }
      }
    }
  }

  throw lastError || new Error("All Gemini model endpoints are currently experiencing high demand. Please try again shortly.");
}

// Gemini Multi-turn Chat Endpoint for Communication & Counseling
app.post("/api/chat", async (req, res) => {
  try {
    const {
      messages = [],
      roleType = "counselor",
      customInstruction = "",
      model = "gemini-3.8-flash",
      includeCampusContext = true
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array with at least one message is required." });
    }

    // Role definitions
    const roleInstructions: Record<string, string> = {
      counselor: `You are the Lead Academic Advisor & Student Counselor for the "Present Sir Smart Campus Monitoring System".
Your role is to offer constructive, empathetic communication, analyze student risk factors, suggest customized remedial learning schedules, encourage students who have low attendance or marks, and guide faculty on mentoring strategies. Maintain an encouraging, respectful, and structured academic tone.`,
      communicator: `You are the Official Campus Communications & Administration Officer for the "Present Sir Smart Campus System".
Your role is to draft high-priority institutional communications: parent notification letters regarding attendance shortages (<75% mandatory threshold), official SMS alerts, department warnings, faculty circulars, and academic probation notifications. Write in a clear, professional, authoritative yet courteous administrative style with standard academic letter/notice headers.`,
      mentor: `You are the Senior Peer Mentor & Academic Tutor for university engineering and science students.
Your role is to break down difficult concepts (e.g., Computer Science, Algorithms, Mathematics, Electronics), suggest study hacks, draft tailored 2-week exam recovery plans for students who failed internal or semester exams, and provide clear learning roadmaps.`,
      analyst: `You are the Campus Data & Risk Intelligence Analyst.
Your role is to analyze campus-wide trends, explain multi-factor risk scores (calculated from 35% Attendance, 35% Marks, 20% Feedback Polarity, 10% Grievance Frequency), identify students needing urgent intervention, and recommend administrative resource allocations.`
    };

    const baseRoleInstruction = roleInstructions[roleType] || roleInstructions.counselor;

    // Build context string from live database if requested
    let campusContext = "";
    if (includeCampusContext) {
      try {
        const campusData = await getAllCampusData();
        const totalStudents = campusData.students.length;
        const lowAttendance = campusData.attendance.filter(
          (a) => parseFloat(a.AttendancePercentage || "0") < 75
        );
        const highRisk = campusData.riskAnalysis.filter(
          (r) => r.RiskLevel === "High Risk" || r.RiskLevel === "Support Required"
        );
        const failingMarks = campusData.marks.filter(
          (m) => parseFloat(m.TotalMarks || "0") < 40
        );

        // Summarize sample students for accurate lookup
        const studentSummaries = campusData.students.slice(0, 15).map((s) => {
          const att = campusData.attendance.find((a) => a.StudentID === s.StudentID);
          const rsk = campusData.riskAnalysis.find((r) => r.StudentID === s.StudentID);
          const mrk = campusData.marks.filter((m) => m.StudentID === s.StudentID);
          return `${s.StudentID}: ${s.Name} (${s.Department}, Sem ${s.Semester}) | Att: ${att?.AttendancePercentage || "N/A"}% | Risk: ${rsk?.RiskLevel || "N/A"} (Score ${rsk?.CalculatedScore || "N/A"}) | Marks: [${mrk.map((m) => `${m.Subject}:${m.TotalMarks}`).join(", ")}]`;
        });

        campusContext = `\n\n--- CURRENT LIVE CAMPUS DATA CONTEXT ---
Enrolled Students: ${totalStudents}
Students with Attendance Deficit (<75%): ${lowAttendance.length} (Students: ${lowAttendance.map((a) => a.StudentID).join(", ")})
Students at High Risk / Support Required: ${highRisk.length} (Students: ${highRisk.map((r) => `${r.StudentID} (${r.RiskLevel}, Score: ${r.CalculatedScore})`).join(", ")})
Failing Course Evaluations (<40 marks): ${failingMarks.length} records
Sample Student Directory Context:
${studentSummaries.join("\n")}
--- END CAMPUS CONTEXT ---`;
      } catch (dbErr) {
        console.warn("Could not attach campus context to chat:", dbErr);
      }
    }

    const fullSystemInstruction = `${baseRoleInstruction}
${customInstruction ? `\nAdditional User Guidance: ${customInstruction}` : ""}
${campusContext}

Formatting Guidelines:
- Use clean Markdown with clear headings, bullet points, and bold text for readability.
- When drafting letters or notices, include placeholders like [Student Name], [Date], [Parent Name], [HOD Signature] or fill them from the campus data if the student is specified.
- Keep advice actionable, structured, and easy to copy and share for institutional communication.`;

    // Map messages to Gemini contents format
    // Ensure roles alternate user / model properly and format parts
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: String(m.text || m.content || "").trim() }],
    })).filter((c: any) => c.parts[0].text.length > 0);

    if (contents.length === 0) {
      return res.status(400).json({ error: "No valid message contents provided." });
    }

    // Determine requested model to use
    let requestedModel = "gemini-3.8-flash";
    if (
      model === "gemini-3.8-flash" ||
      model === "gemini-3.1-pro-preview" ||
      model === "gemini-3.1-flash-lite" ||
      model === "gemini-flash-latest" ||
      model === "gemini-3.5-flash"
    ) {
      requestedModel = model;
    }

    const ai = getGeminiClient();

    const { text: replyText, modelUsed } = await generateGeminiContentWithFallback(
      ai,
      requestedModel,
      contents,
      fullSystemInstruction,
      0.7
    );

    res.json({
      reply: replyText || "I apologize, but I could not generate a response. Please try again.",
      model: modelUsed,
      roleType,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("POST /api/chat error:", err);
    let userFriendlyMessage = err.message || "An error occurred while communicating with Gemini.";
    if (userFriendlyMessage.includes("503") || userFriendlyMessage.includes("UNAVAILABLE") || userFriendlyMessage.includes("high demand")) {
      userFriendlyMessage = "The AI model is experiencing high demand. Automatic retries were attempted; please tap Retry in a moment.";
    }
    res.status(500).json({
      error: userFriendlyMessage,
    });
  }
});

// -------------------------------------------------------------
// VITE MIDDLEWARE SETUP
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Campus Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
