import React, { useState, useEffect } from "react";
import {
  Users,
  CalendarCheck,
  GraduationCap,
  MessageSquare,
  Cpu,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Code2,
  Play,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  ShieldAlert,
  LayoutGrid,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  X,
  Menu,
  LogOut,
  UserCheck,
  FileText,
  Download,
  FileDown,
  Bot,
  MessageSquareText
} from "lucide-react";
import { Student, AttendanceRecord, MarksRecord, FeedbackRecord, RiskAnalysisRecord, RecommendationRecord, CampusDataState, VisitorProfile } from "./types";
import { analyzeFeedbackClient } from "./nlpClient";
import EntryPage from "./components/EntryPage";
import { generateCampusRiskPdfReport } from "./utils/generatePdfReport";
import GeminiChatCommunicator from "./components/GeminiChatCommunicator";

export default function App() {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [hubFilter, setHubFilter] = useState<"all" | "core" | "ai">("all");
  const [sideTaskbarOpen, setSideTaskbarOpen] = useState<boolean>(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const [miniLauncherOpen, setMiniLauncherOpen] = useState<boolean>(false);
  const [floatingChatOpen, setFloatingChatOpen] = useState<boolean>(false);
  const [pdfToast, setPdfToast] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<VisitorProfile | null>(() => {
    try {
      const saved = localStorage.getItem("campus_visitor_profile");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [data, setData] = useState<CampusDataState>({
    students: [],
    attendance: [],
    marks: [],
    feedback: [],
    riskAnalysis: [],
    recommendations: []
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshSuccess, setRefreshSuccess] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTimetableDay, setActiveTimetableDay] = useState<number>(1);
  const [deckMode, setDeckMode] = useState<"stacked" | "flow">("stacked");

  // Modals & Panels
  const [pythonModalOpen, setPythonModalOpen] = useState<boolean>(false);
  const [pythonFiles, setPythonFiles] = useState<Record<string, string>>({});
  const [selectedPythonFile, setSelectedPythonFile] = useState<string>("main.py");
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [testing, setTesting] = useState<boolean>(false);

  const scrollTaskbar = (direction: "left" | "right") => {
    const el = document.getElementById("taskbar-scroll-container");
    if (el) {
      el.scrollBy({ left: direction === "left" ? -280 : 280, behavior: "smooth" });
    }
  };

  // Tab 1 Form State
  const [studentForm, setStudentForm] = useState({
    StudentID: "",
    Name: "",
    Department: "Computer Science",
    Semester: "4",
    Email: ""
  });
  const [isEditingStudent, setIsEditingStudent] = useState<boolean>(false);
  const [studentBanner, setStudentBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [savingStudent, setSavingStudent] = useState<boolean>(false);

  // Helper to suggest next Student ID
  const getNextStudentId = () => {
    const existingNums = data.students
      .map(s => {
        const m = (s.StudentID || "").match(/\d+/);
        return m ? parseInt(m[0], 10) : 0;
      })
      .filter(n => n > 0);
    const max = existingNums.length > 0 ? Math.max(...existingNums) : 100;
    return `S${max + 1}`;
  };

  // Tab 2 Form State
  const [attendanceForm, setAttendanceForm] = useState({
    StudentID: "",
    TotalClasses: "100",
    ClassesAttended: "80"
  });
  const [attendanceBanner, setAttendanceBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Tab 3 Form State
  const [marksForm, setMarksForm] = useState({
    StudentID: "",
    Subject: "",
    InternalMarks: "35",
    ExamMarks: "38"
  });
  const [marksBanner, setMarksBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Tab 4 Form State
  const [feedbackForm, setFeedbackForm] = useState({
    StudentID: "",
    FeedbackText: ""
  });
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Tab 5 Live NLP Tester
  const [liveNlpText, setLiveNlpText] = useState<string>(
    "The lab computers are broken and wifi disconnects constantly during assignment submissions."
  );

  // Fetch all CSV data from API
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/data?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.students.length > 0 && !attendanceForm.StudentID) {
          setAttendanceForm(prev => ({ ...prev, StudentID: json.students[0].StudentID }));
          setMarksForm(prev => ({ ...prev, StudentID: json.students[0].StudentID }));
          setFeedbackForm(prev => ({ ...prev, StudentID: json.students[0].StudentID }));
        }
        setRefreshSuccess(true);
        setTimeout(() => setRefreshSuccess(false), 2000);
      }
    } catch (e) {
      console.error("Failed to load campus data:", e);
    } finally {
      setTimeout(() => setLoading(false), 450);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch Python files
  const fetchPythonFiles = async () => {
    try {
      const res = await fetch("/api/python-files");
      if (res.ok) {
        const json = await res.json();
        setPythonFiles(json.files);
      }
    } catch (e) {
      console.error("Failed to load python files:", e);
    }
  };

  const handleRunPythonTest = async () => {
    try {
      setTesting(true);
      setTestOutput("Executing 'python3 main.py --test' verification suite...");
      const res = await fetch("/api/run-python-test", { method: "POST" });
      const json = await res.json();
      setTestOutput(json.output || (json.error ? `Error: ${json.error}` : "Done"));
      fetchData(); // reload updated CSVs
    } catch (e: any) {
      setTestOutput(`Execution error: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  // Student CRUD
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentBanner(null);

    const sId = (studentForm.StudentID.trim() || getNextStudentId()).toUpperCase();
    const sName = studentForm.Name.trim();
    const sEmail = studentForm.Email.trim();

    if (!sId || !sName || !sEmail) {
      setStudentBanner({ type: "error", message: "Please fill in all required fields: Student ID, Full Name, and Email." });
      return;
    }

    try {
      setSavingStudent(true);
      const action = isEditingStudent ? "update" : "add";
      const payload = {
        student_id: sId,
        StudentID: sId,
        name: sName,
        Name: sName,
        department: studentForm.Department,
        Department: studentForm.Department,
        semester: String(studentForm.Semester || "1"),
        Semester: String(studentForm.Semester || "1"),
        email: sEmail,
        Email: sEmail,
        action
      };

      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (!res.ok) {
        setStudentBanner({ type: "error", message: json.error || "Failed to save student record." });
        return;
      }

      if (json.students && Array.isArray(json.students)) {
        setData(prev => ({ ...prev, students: json.students }));
      }

      setStudentBanner({
        type: "success",
        message: json.message || (isEditingStudent ? `Updated student ${sName} (${sId}).` : `Student ${sName} (${sId}) registered and enrolled successfully!`)
      });

      setStudentForm({ StudentID: "", Name: "", Department: "Computer Science", Semester: "4", Email: "" });
      setIsEditingStudent(false);
      await fetchData();
    } catch (e: any) {
      setStudentBanner({ type: "error", message: e.message || "Network error while saving student." });
    } finally {
      setSavingStudent(false);
    }
  };

  const handleDeleteStudent = async (sid: string) => {
    setStudentBanner(null);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: sid, action: "delete" })
      });
      const json = await res.json();
      if (!res.ok) {
        setStudentBanner({ type: "error", message: json.error || "Failed to delete student." });
        return;
      }
      if (json.students && Array.isArray(json.students)) {
        setData(prev => ({ ...prev, students: json.students }));
      }
      setStudentBanner({ type: "success", message: `Student '${sid}' removed from directory.` });
      await fetchData();
    } catch (e: any) {
      setStudentBanner({ type: "error", message: e.message || "Network error while deleting student." });
    }
  };

  // Attendance Save
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttendanceBanner(null);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: attendanceForm.StudentID,
          StudentID: attendanceForm.StudentID,
          total_classes: attendanceForm.TotalClasses,
          TotalClasses: attendanceForm.TotalClasses,
          classes_attended: attendanceForm.ClassesAttended,
          ClassesAttended: attendanceForm.ClassesAttended
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setAttendanceBanner({ type: "error", message: json.error || "Failed to save attendance." });
        return;
      }
      setAttendanceBanner({ type: "success", message: `Attendance saved for student ${attendanceForm.StudentID}! Attendance: ${json.percentage}%` });
      fetchData();
    } catch (e: any) {
      setAttendanceBanner({ type: "error", message: e.message || "Failed to record attendance." });
    }
  };

  // Marks Save
  const handleSaveMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    setMarksBanner(null);
    if (!marksForm.Subject) {
      setMarksBanner({ type: "error", message: "Please enter a subject name." });
      return;
    }
    try {
      const res = await fetch("/api/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: marksForm.StudentID,
          StudentID: marksForm.StudentID,
          subject: marksForm.Subject,
          Subject: marksForm.Subject,
          internal_marks: marksForm.InternalMarks,
          InternalMarks: marksForm.InternalMarks,
          exam_marks: marksForm.ExamMarks,
          ExamMarks: marksForm.ExamMarks
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setMarksBanner({ type: "error", message: json.error || "Failed to save marks." });
        return;
      }
      setMarksBanner({ type: "success", message: `Marks recorded for ${marksForm.Subject}! Total: ${json.totalMarks}/100` });
      setMarksForm(prev => ({ ...prev, Subject: "" }));
      fetchData();
    } catch (e: any) {
      setMarksBanner({ type: "error", message: e.message || "Failed to save marks." });
    }
  };

  // Feedback Save
  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackBanner(null);
    if (!feedbackForm.FeedbackText) {
      setFeedbackBanner({ type: "error", message: "Please enter feedback text." });
      return;
    }
    const nlp = analyzeFeedbackClient(feedbackForm.FeedbackText);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: feedbackForm.StudentID,
          StudentID: feedbackForm.StudentID,
          feedback_text: feedbackForm.FeedbackText,
          FeedbackText: feedbackForm.FeedbackText,
          sentiment: nlp.sentiment,
          Sentiment: nlp.sentiment,
          category: nlp.category,
          Category: nlp.category,
          extracted_keywords: nlp.extractedKeywords,
          ExtractedKeywords: nlp.extractedKeywords
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedbackBanner({ type: "error", message: json.error || "Failed to submit feedback." });
        return;
      }
      setFeedbackBanner({
        type: "success",
        message: `Feedback saved! NLP Classification: [${nlp.category}] • Sentiment: ${nlp.sentiment} • Keywords: ${nlp.extractedKeywords}`
      });
      setFeedbackForm(prev => ({ ...prev, FeedbackText: "" }));
      fetchData();
    } catch (e: any) {
      setFeedbackBanner({ type: "error", message: e.message || "Failed to submit feedback." });
    }
  };

  // Update Recommendation Status
  const handleUpdateRecStatus = async (recId: string, status: string) => {
    try {
      await fetch("/api/recommendations/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rec_id: recId, status })
      });
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Filtered Students
  const filteredStudents = data.students.filter(s =>
    s.StudentID.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.Department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute live NLP metrics for Tab 5
  const liveNlpResult = analyzeFeedbackClient(liveNlpText);

  // Computed Analytics
  const lowAttendanceList = data.attendance.filter(a => parseFloat(a.AttendancePercentage || "0") < 75.0);
  const overallAvgAttendance = data.attendance.length > 0
    ? (data.attendance.reduce((sum, a) => sum + parseFloat(a.AttendancePercentage || "0"), 0) / data.attendance.length).toFixed(1)
    : "0.0";
  const failingMarks = data.marks.filter(m => parseFloat(m.TotalMarks || "0") < 40.0);
  const failingPercentage = data.marks.length > 0
    ? ((failingMarks.length / data.marks.length) * 100).toFixed(1)
    : "0.0";
  const negativeFeedback = data.feedback.filter(f => f.Sentiment === "Negative");
  const negFeedbackRatio = data.feedback.length > 0
    ? ((negativeFeedback.length / data.feedback.length) * 100).toFixed(1)
    : "0.0";

  const handleEnterProfile = (profile: VisitorProfile) => {
    setCurrentProfile(profile);
    try {
      localStorage.setItem("campus_visitor_profile", JSON.stringify(profile));
    } catch (e) {
      console.warn("Could not persist profile", e);
    }
    if (profile.role === "Student") {
      setAttendanceForm(prev => ({ ...prev, StudentID: profile.id }));
      setMarksForm(prev => ({ ...prev, StudentID: profile.id }));
      setFeedbackForm(prev => ({ ...prev, StudentID: profile.id }));
    }
  };

  const handleLogout = () => {
    setCurrentProfile(null);
    try {
      localStorage.removeItem("campus_visitor_profile");
    } catch (e) {
      console.warn(e);
    }
  };

  // PDF Generation Trigger
  const handleDownloadPdf = () => {
    try {
      setPdfToast("Generating summarized PDF audit report...");
      generateCampusRiskPdfReport(data, {
        generatedBy: currentProfile,
        institutionName: "Present Sir Smart Campus Monitoring System",
      });
      setTimeout(() => {
        setPdfToast("PDF report successfully downloaded!");
        setTimeout(() => setPdfToast(null), 3500);
      }, 500);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      setPdfToast("Failed to generate PDF report: " + (err?.message || "Unknown error"));
      setTimeout(() => setPdfToast(null), 4000);
    }
  };

  if (!currentProfile) {
    return (
      <EntryPage
        students={data.students}
        onEnter={handleEnterProfile}
        onRefreshData={fetchData}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-[#f8f7f4] text-[#1a1a1a] flex flex-col font-sans transition-all duration-300 w-full overflow-x-hidden ${sideTaskbarOpen ? "md:pl-64" : "md:pl-20"}`}>
      {/* Top Banner Header (Variation 3 Editorial Header) */}
      <header className="bg-[#f8f7f4]/95 text-[#1a1a1a] border-b-[1.5px] border-[#1a1a1a] sticky top-0 z-30 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-[100px] sm:min-w-[160px]">
          {/* Mobile Navigation Drawer Trigger */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden p-1.5 border-[1.5px] border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] active:scale-95 transition shrink-0 cursor-pointer"
            aria-label="Open Navigation Menu"
            title="Open Campus Options Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Editorial Brand (Centered) */}
        <div className="flex-1 flex justify-center text-center">
          <button
            onClick={() => setActiveTab(0)}
            className="text-center cursor-pointer group flex flex-col items-center justify-center"
            title="Present Sir — Return to Overview"
          >
            <div className="font-serif font-display headline-texture text-xl sm:text-2xl font-bold tracking-tight text-[#1a1a1a] group-hover:text-[#5e17eb] transition leading-none text-center">
              Academic Student Campus
            </div>
          </button>
        </div>

        {/* Space Mono Meta Navigation */}
        <div className="flex items-center justify-end gap-4 font-mono text-xs uppercase tracking-widest text-[#1a1a1a]/70 min-w-[100px] sm:min-w-[160px]">
          <span className={`cursor-pointer transition ${activeTab === 0 ? "text-[#5e17eb] font-bold underline" : "hover:text-[#5e17eb]"}`} onClick={() => setActiveTab(0)}>Dashboard</span>
          <span className={`cursor-pointer transition ${activeTab === 9 ? "text-[#5e17eb] font-bold underline" : "hover:text-[#5e17eb]"}`} onClick={() => setActiveTab(9)}>AI Chat</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 pb-24 md:pb-12">
        {/* TAB 0: ALL IN ONE OPTIONS HUB (EDITORIAL VARIATION 3 DASHBOARD) */}
        {activeTab === 0 && (
          <div className="w-full flex flex-col">
            {/* Editorial Hero Section Centered */}
            <div className="border-b-[1.5px] border-[#1a1a1a] pb-6 mb-8 text-center flex flex-col items-center justify-center">
              <h2 className="font-serif font-display headline-texture text-4xl sm:text-6xl lg:text-7xl font-bold leading-[0.92] text-[#1a1a1a] tracking-tight text-center">
                All In One<br />Present Sir.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#1a1a1a]/70 max-w-xl font-sans leading-relaxed text-center mx-auto">
                Modular Python system for academic risk assessment, sentiment classification, and automated interventions.
              </p>
            </div>

            {/* Split Editorial Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Active Modules List */}
              <div className="lg:col-span-8">
                <div className="flex items-center justify-end mb-3">
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    <button
                      onClick={() => setHubFilter("all")}
                      className={`px-2 py-0.5 border border-[#1a1a1a] transition ${hubFilter === "all" ? "bg-[#1a1a1a] text-white" : "bg-white text-[#1a1a1a] hover:bg-[#1a1a1a]/10"}`}
                    >
                      ALL (9)
                    </button>
                    <button
                      onClick={() => setHubFilter("core")}
                      className={`px-2 py-0.5 border border-[#1a1a1a] transition ${hubFilter === "core" ? "bg-[#1a1a1a] text-white" : "bg-white text-[#1a1a1a] hover:bg-[#1a1a1a]/10"}`}
                    >
                      CORE (4)
                    </button>
                    <button
                      onClick={() => setHubFilter("ai")}
                      className={`px-2 py-0.5 border border-[#1a1a1a] transition ${hubFilter === "ai" ? "bg-[#1a1a1a] text-white" : "bg-white text-[#1a1a1a] hover:bg-[#1a1a1a]/10"}`}
                    >
                      AI (5)
                    </button>
                  </div>
                </div>

                {/* Editorial Module Rows */}
                <div className="border-[1.5px] border-[#1a1a1a] bg-white divide-y divide-[#1a1a1a]/15 shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
                  {[
                    {
                      id: 1,
                      code: "01",
                      group: "core",
                      title: "Student Directory",
                      meta: "Profiles & Enrollment CRUD",
                      desc: "Registered student records, search, department filters",
                      hasAlert: false,
                      actionLabel: `Open (${data.students.length})`,
                    },
                    {
                      id: 2,
                      code: "02",
                      group: "core",
                      title: "Attendance Monitoring",
                      meta: `${overallAvgAttendance}% Average Presence`,
                      desc: 'Daily "Present Sir" roll call with 75% threshold deficit warning',
                      hasAlert: lowAttendanceList.length > 0,
                      actionLabel: lowAttendanceList.length > 0 ? `Alert (${lowAttendanceList.length})` : "Open",
                    },
                    {
                      id: 3,
                      code: "03",
                      group: "core",
                      title: "Academic Marks",
                      meta: "GPA & Evaluation Engine",
                      desc: "Internal (30) + Exam (70) score evaluators and weak subject flags",
                      hasAlert: failingMarks.length > 0,
                      actionLabel: failingMarks.length > 0 ? `Alert (${failingMarks.length})` : "Open",
                    },
                    {
                      id: 4,
                      code: "04",
                      group: "core",
                      title: "Grievance Analysis",
                      meta: "Automated NLP Processing",
                      desc: "Student complaints, facility issues, and category classifiers",
                      hasAlert: false,
                      actionLabel: `Open (${data.feedback.length})`,
                    },
                    {
                      id: 5,
                      code: "05",
                      group: "ai",
                      title: "NLP Sandbox",
                      meta: "Tokenizer & Sentiment Meter",
                      desc: "Live text tokenization, stopword removal, and polarity testing (-1 to +1)",
                      hasAlert: false,
                      actionLabel: "Open Live",
                    },
                    {
                      id: 6,
                      code: "06",
                      group: "ai",
                      title: "Risk Engine",
                      meta: "Multi-Factor Stratification",
                      desc: "Composite index: Attendance (35%), Marks (35%), Feedback (20%), Freq (10%)",
                      hasAlert: data.riskAnalysis.filter(r => r.RiskLevel === "High Risk").length > 0,
                      actionLabel: "Open Engine",
                    },
                    {
                      id: 7,
                      code: "07",
                      group: "ai",
                      title: "Recommendations",
                      meta: "Institutional Action Plans",
                      desc: "Guardian notices, peer tutoring routing, and counselor referrals",
                      hasAlert: data.recommendations.filter(r => r.Status === "Pending").length > 0,
                      actionLabel: `Open (${data.recommendations.filter(r => r.Status === "Pending").length})`,
                    },
                    {
                      id: 8,
                      code: "08",
                      group: "ai",
                      title: "Reports & Analytics",
                      meta: "Campus-Wide Aggregations",
                      desc: "Department attendance averages, marks distribution, sentiment breakdown",
                      hasAlert: false,
                      actionLabel: "Open Stats",
                    },
                    {
                      id: 9,
                      code: "09",
                      group: "ai",
                      title: "AI Communicator & Chatbot",
                      meta: "Multi-Turn Gemini Intelligence",
                      desc: "Draft parent letters, counselor check-ins, remedial schedules & risk queries",
                      hasAlert: false,
                      actionLabel: "Chat AI",
                    },
                  ]
                    .filter(opt => hubFilter === "all" || opt.group === hubFilter)
                    .map(opt => (
                      <div
                        key={opt.id}
                        id={`module-row-${opt.id}`}
                        onClick={() => setActiveTab(opt.id)}
                        className={`p-4 flex items-center justify-between cursor-pointer transition-all duration-200 group ${
                          opt.hasAlert ? "bg-[#fff1f2] hover:bg-[#ffe4e6]" : "hover:bg-[#f8f7f4] hover:pl-6"
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                          <span className="font-mono text-xs font-bold text-[#1a1a1a]/40 group-hover:text-[#5e17eb] shrink-0">
                            {opt.code}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm sm:text-base text-[#1a1a1a] group-hover:text-[#5e17eb] transition truncate">
                                {opt.title}
                              </span>
                              {opt.hasAlert && (
                                <span className="px-1.5 py-0.2 bg-rose-600 text-white font-mono text-[9px] font-bold rounded-sm uppercase shrink-0">
                                  Action Needed
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[11px] text-[#1a1a1a]/60 truncate mt-0.5">
                              {opt.meta} &bull; <span className="font-sans text-[#1a1a1a]/50">{opt.desc}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`font-mono text-xs font-bold underline shrink-0 ml-3 ${opt.hasAlert ? "text-rose-700" : "text-[#5e17eb]"}`}>
                          {opt.actionLabel} &rarr;
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Right Column: Control Panel */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="border-[1.5px] border-[#1a1a1a] bg-white p-6 shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-[#1a1a1a]/60 font-bold block mb-3">
                    Average Performance
                  </span>
                  <div className="border-[1.5px] border-[#1a1a1a] p-5 bg-[#f8f7f4]">
                    <div className="font-serif text-5xl font-bold text-[#1a1a1a] leading-none mb-1">
                      {overallAvgAttendance}%
                    </div>
                    <div className="font-mono text-xs text-[#1a1a1a]/60">
                      CSE Dept. Benchmark &bull; {data.students.length} Enrolled
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={handleDownloadPdf}
                      className="w-full py-3.5 bg-[#5e17eb] hover:bg-[#4d10c7] text-white font-mono text-xs font-bold uppercase transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      title="Generate and download summarized PDF report of campus risk and attendance statistics"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Download PDF Audit Report</span>
                    </button>
                    <button
                      onClick={() => fetchData()}
                      disabled={loading}
                      className="w-full py-3 bg-[#1a1a1a] hover:bg-[#5e17eb] text-white font-mono text-xs font-bold uppercase transition-all shadow-sm cursor-pointer mt-2.5"
                    >
                      {loading ? "Syncing Records..." : "Refresh Global Records"}
                    </button>
                    <button
                      onClick={() => setActiveTab(8)}
                      className="w-full py-3 bg-transparent border-[1.5px] border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] font-mono text-xs font-bold uppercase transition-all mt-2.5 cursor-pointer"
                    >
                      View All Reports &amp; CSVs
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: STUDENT MANAGEMENT (SEPARATE PAGE) */}
        {activeTab === 1 && (
          <div className="space-y-6">
            {/* Separate Page Subheader */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f8f7f4] p-4 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => setActiveTab(0)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] border border-[#1a1a1a] font-mono text-xs uppercase font-bold transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Main View</span>
                </button>
                <span className="text-[#1a1a1a]/30 font-mono">/</span>
                <span className="font-serif text-base sm:text-lg font-bold text-[#1a1a1a]">1. Student Directory &amp; Registration</span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-[#5e17eb] bg-[#5e17eb]/10 border border-[#5e17eb]/30 px-2.5 py-1">
                Task View &bull; {data.students.length} Total Enrolled
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form */}
              <div className="lg:col-span-4 bg-white p-5 sm:p-6 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
                <div className="flex items-center justify-between mb-1 pb-2 border-b border-[#1a1a1a]/15">
                  <h2 className="font-serif text-lg font-bold text-[#1a1a1a] flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#5e17eb]" />
                    {isEditingStudent ? "Update Student Details" : "Register Student"}
                  </h2>
                  {isEditingStudent && (
                    <span className="font-mono text-[10px] uppercase font-bold bg-amber-100 text-amber-900 border border-amber-400 px-2 py-0.5">
                      Edit Mode
                    </span>
                  )}
                </div>
                <p className="font-mono text-[11px] text-[#1a1a1a]/60 mb-4 mt-1">Unit 1 &amp; 4 CRUD operations linked to students.csv</p>

                {/* Inline Status Banner */}
                {studentBanner && (
                  <div
                    className={`p-3 mb-4 text-xs font-mono font-medium flex items-center justify-between gap-2 border-[1.5px] ${
                      studentBanner.type === "success"
                        ? "bg-emerald-50 text-emerald-900 border-emerald-600"
                        : "bg-red-50 text-red-900 border-red-600"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {studentBanner.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span>{studentBanner.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStudentBanner(null)}
                      className="text-[#1a1a1a]/40 hover:text-[#1a1a1a] font-bold ml-1 cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>
                )}

                <form onSubmit={handleSaveStudent} className="space-y-3.5 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/70">Student ID *</label>
                      {!isEditingStudent && (
                        <button
                          type="button"
                          onClick={() => setStudentForm({ ...studentForm, StudentID: getNextStudentId() })}
                          className="font-mono text-[10px] text-[#5e17eb] hover:underline font-bold cursor-pointer"
                          title="Auto-calculate the next available Student ID"
                        >
                          Auto-fill Next ID ({getNextStudentId()})
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      disabled={isEditingStudent}
                      value={studentForm.StudentID}
                      onChange={e => setStudentForm({ ...studentForm, StudentID: e.target.value.toUpperCase() })}
                      placeholder={`e.g. ${getNextStudentId()}`}
                      className="w-full px-3 py-2 bg-[#f8f7f4] border-[1.5px] border-[#1a1a1a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5e17eb] font-mono text-xs uppercase disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/70 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={studentForm.Name}
                      onChange={e => setStudentForm({ ...studentForm, Name: e.target.value })}
                      placeholder="e.g. Neha Gupta"
                      className="w-full px-3 py-2 bg-[#f8f7f4] border-[1.5px] border-[#1a1a1a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5e17eb] font-sans text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/70 mb-1">Department *</label>
                    <select
                      value={studentForm.Department}
                      onChange={e => setStudentForm({ ...studentForm, Department: e.target.value })}
                      className="w-full px-3 py-2 bg-[#f8f7f4] border-[1.5px] border-[#1a1a1a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5e17eb] font-sans text-xs"
                    >
                      <option value="Computer Science">Computer Science</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Electronics & Comm">Electronics & Comm</option>
                      <option value="Civil Engineering">Civil Engineering</option>
                      <option value="Electrical Engineering">Electrical Engineering</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/70 mb-1">Semester (1-12) *</label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={studentForm.Semester}
                        onChange={e => setStudentForm({ ...studentForm, Semester: e.target.value })}
                        className="w-full px-3 py-2 bg-[#f8f7f4] border-[1.5px] border-[#1a1a1a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5e17eb] font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/70 mb-1">Institutional Email *</label>
                    <input
                      type="email"
                      required
                      value={studentForm.Email}
                      onChange={e => setStudentForm({ ...studentForm, Email: e.target.value })}
                      placeholder="student@campus.edu"
                      className="w-full px-3 py-2 bg-[#f8f7f4] border-[1.5px] border-[#1a1a1a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5e17eb] font-sans text-xs"
                    />
                  </div>

                  <div className="pt-3 flex gap-2">
                    <button
                      id="btn-add-student"
                      type="submit"
                      disabled={savingStudent}
                      className="flex-1 bg-[#5e17eb] hover:bg-[#4d10c7] text-white font-mono text-xs font-bold uppercase py-2.5 px-4 border border-[#1a1a1a] shadow-[2px_2px_0px_rgba(26,26,26,1)] transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{savingStudent ? "Saving..." : isEditingStudent ? "Save Changes" : "Add Student"}</span>
                    </button>
                    {isEditingStudent && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingStudent(false);
                          setStudentForm({ StudentID: "", Name: "", Department: "Computer Science", Semester: "4", Email: "" });
                        }}
                        className="px-4 py-2.5 bg-white hover:bg-[#1a1a1a] hover:text-white border border-[#1a1a1a] font-mono text-xs uppercase font-bold text-[#1a1a1a] transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Table */}
              <div className="lg:col-span-8 bg-white p-5 sm:p-6 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)] flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1a1a1a]/15">
                  <div>
                    <h2 className="font-serif text-lg font-bold text-[#1a1a1a]">Enrolled Students Directory</h2>
                    <p className="font-mono text-xs text-[#1a1a1a]/60">
                      Persisted in students.csv ({data.students.length} total records)
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-[#1a1a1a]/40 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search ID or Name..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f8f7f4] border-[1.5px] border-[#1a1a1a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5e17eb] font-sans"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto border-[1.5px] border-[#1a1a1a] flex-1">
                  <table className="w-full text-xs text-left min-w-[580px]">
                    <thead className="bg-[#f8f7f4] text-[#1a1a1a] uppercase border-b-[1.5px] border-[#1a1a1a]">
                      <tr>
                        <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">ID</th>
                        <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Name</th>
                        <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Department</th>
                        <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold text-center">Sem</th>
                        <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Email</th>
                        <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a1a1a]/10">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-[#1a1a1a]/50 font-mono">
                            <p className="mb-2">No matching student records found.</p>
                            {searchQuery && (
                              <button
                                onClick={() => setSearchQuery("")}
                                className="inline-block px-3 py-1 bg-white hover:bg-[#1a1a1a] hover:text-white text-[#5e17eb] border border-[#1a1a1a] font-mono font-bold text-xs transition cursor-pointer"
                              >
                                Clear Search Query (&quot;{searchQuery}&quot;)
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map(s => (
                          <tr
                            key={s.StudentID}
                            className={`hover:bg-[#f8f7f4] transition ${
                              studentForm.StudentID === s.StudentID && isEditingStudent ? "bg-[#5e17eb]/10" : ""
                            }`}
                          >
                            <td className="px-3.5 py-2.5 font-mono font-bold text-[#5e17eb]">{s.StudentID}</td>
                            <td className="px-3.5 py-2.5 font-medium text-[#1a1a1a]">{s.Name}</td>
                            <td className="px-3.5 py-2.5 text-[#1a1a1a]/70">{s.Department}</td>
                            <td className="px-3.5 py-2.5 text-[#1a1a1a]/70 font-mono text-center">{s.Semester}</td>
                            <td className="px-3.5 py-2.5 text-[#1a1a1a]/60 font-mono text-xs">{s.Email}</td>
                            <td className="px-3.5 py-2.5 text-right space-x-2 font-mono">
                              <button
                                onClick={() => {
                                  setStudentForm({
                                    StudentID: s.StudentID,
                                    Name: s.Name,
                                    Department: s.Department,
                                    Semester: s.Semester,
                                    Email: s.Email
                                  });
                                  setIsEditingStudent(true);
                                  setStudentBanner(null);
                                }}
                                className="text-[#5e17eb] hover:underline font-bold cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(s.StudentID)}
                                className="text-red-600 hover:underline font-bold cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ATTENDANCE RECORDS (SEPARATE PAGE) */}
        {activeTab === 2 && (
          <div className="space-y-6">
            {/* Separate Page Subheader */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f8f7f4] p-4 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => setActiveTab(0)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] border border-[#1a1a1a] font-mono text-xs uppercase font-bold transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Main View</span>
                </button>
                <span className="text-[#1a1a1a]/30 font-mono">/</span>
                <span className="font-serif text-base sm:text-lg font-bold text-[#1a1a1a]">2. Attendance Monitoring &amp; Logging</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#5e17eb] text-white border border-[#1a1a1a] font-mono text-xs uppercase font-bold transition cursor-pointer shadow-[2px_2px_0px_rgba(26,26,26,1)]"
                  title="Download Attendance & Risk PDF Report"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>PDF Summary</span>
                </button>
                <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1">
                  Avg: {overallAvgAttendance}%
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-red-800 bg-red-50 border border-red-300 px-2.5 py-1">
                  {lowAttendanceList.length} Deficit Alerts
                </span>
              </div>
            </div>

            {/* Entry Box */}
            <div className="bg-white p-5 sm:p-6 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
              <h2 className="font-serif text-lg font-bold text-[#1a1a1a] mb-1 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-[#5e17eb]" />
                Attendance Monitor &amp; Percentage Logging
              </h2>
              <p className="font-mono text-xs text-[#1a1a1a]/60 mb-4">
                Calculates ((ClassesAttended / TotalClasses) * 100) and triggers automated flags if &lt; 75%.
              </p>

              {attendanceBanner && (
                <div
                  className={`p-3 mb-4 text-xs font-mono font-medium flex items-center justify-between gap-2 border-[1.5px] ${
                    attendanceBanner.type === "success"
                      ? "bg-emerald-50 text-emerald-900 border-emerald-600"
                      : "bg-red-50 text-red-900 border-red-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {attendanceBanner.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{attendanceBanner.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttendanceBanner(null)}
                    className="text-[#1a1a1a]/40 hover:text-[#1a1a1a] font-bold ml-1 cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
              )}

              <form onSubmit={handleSaveAttendance} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/70 mb-1">Select Student *</label>
                  <select
                    value={attendanceForm.StudentID}
                    onChange={e => setAttendanceForm({ ...attendanceForm, StudentID: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f8f7f4] border-[1.5px] border-[#1a1a1a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5e17eb] font-sans text-xs"
                  >
                    {data.students.map(s => (
                      <option key={s.StudentID} value={s.StudentID}>
                        {s.StudentID} - {s.Name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/70 mb-1">Total Classes *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={attendanceForm.TotalClasses}
                    onChange={e => setAttendanceForm({ ...attendanceForm, TotalClasses: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f8f7f4] border-[1.5px] border-[#1a1a1a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5e17eb] font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/70 mb-1">Classes Attended *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={attendanceForm.ClassesAttended}
                    onChange={e => setAttendanceForm({ ...attendanceForm, ClassesAttended: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f8f7f4] border-[1.5px] border-[#1a1a1a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5e17eb] font-mono text-xs"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-[#5e17eb] hover:bg-[#4d10c7] text-white font-mono text-xs font-bold uppercase py-2.5 px-4 border border-[#1a1a1a] shadow-[2px_2px_0px_rgba(26,26,26,1)] transition cursor-pointer"
                  >
                    Record Attendance
                  </button>
                </div>
              </form>
            </div>

            {/* Two tables: All Attendance and Low Attendance Alerts */}
            <div className="flex flex-col gap-6">
              {/* All Attendance */}
              <div className="bg-white p-5 sm:p-6 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1a1a1a]/15">
                  <h3 className="font-serif text-base font-bold text-[#1a1a1a]">All Attendance Records (attendance.csv)</h3>
                  <span className="font-mono text-[10px] uppercase text-[#1a1a1a]/60">{data.attendance.length} entries</span>
                </div>
                <div className="overflow-x-auto border-[1.5px] border-[#1a1a1a] max-h-96">
                  <table className="w-full text-xs text-left min-w-[520px]">
                    <thead className="bg-[#f8f7f4] text-[#1a1a1a] uppercase border-b-[1.5px] border-[#1a1a1a] sticky top-0">
                      <tr>
                        <th className="px-3 py-2.5 font-mono text-[10px] tracking-wider font-bold">Record</th>
                        <th className="px-3 py-2.5 font-mono text-[10px] tracking-wider font-bold">Student</th>
                        <th className="px-3 py-2.5 font-mono text-[10px] tracking-wider font-bold">Attended / Total</th>
                        <th className="px-3 py-2.5 font-mono text-[10px] tracking-wider font-bold text-right">Percentage</th>
                        <th className="px-3 py-2.5 font-mono text-[10px] tracking-wider font-bold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a1a1a]/10">
                      {data.attendance.map(a => {
                        const pct = parseFloat(a.AttendancePercentage || "0");
                        const isLow = pct < 75.0;
                        const studentName = data.students.find(s => s.StudentID === a.StudentID)?.Name;
                        return (
                          <tr key={a.RecordID} className={isLow ? "bg-red-50/70" : "hover:bg-[#f8f7f4] transition"}>
                            <td className="px-3 py-2.5 font-mono text-[#1a1a1a]/60">{a.RecordID}</td>
                            <td className="px-3 py-2.5 font-medium text-[#1a1a1a]">
                              {a.StudentID} {studentName && <span className="text-[#1a1a1a]/50 font-normal">({studentName})</span>}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-[#1a1a1a]/70">{a.ClassesAttended} / {a.TotalClasses}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold">
                              <span className={isLow ? "text-red-700" : "text-emerald-700"}>
                                {a.AttendancePercentage}%
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {isLow ? (
                                <span className="inline-flex items-center px-2 py-0.5 font-mono text-[10px] font-bold uppercase bg-red-100 text-red-800 border border-red-400">
                                  Deficit &lt; 75%
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 font-mono text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-400">
                                  Satisfactory
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Low Attendance Alert Table */}
              <div className="bg-white p-5 sm:p-6 border-[1.5px] border-red-600 shadow-[4px_4px_0px_rgba(220,38,38,0.15)]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-serif text-base font-bold text-red-700 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    Critical Low Attendance Alert Flags (&lt; 75%)
                  </h3>
                  <span className="bg-red-600 text-white font-mono text-[10px] font-bold uppercase px-2.5 py-0.5 border border-[#1a1a1a]">
                    {lowAttendanceList.length} Flagged
                  </span>
                </div>
                <p className="font-mono text-xs text-[#1a1a1a]/60 mb-3">
                  These students automatically trigger Attendance Counseling &amp; Guardian Notifications in Tab 7.
                </p>

                <div className="overflow-x-auto border-[1.5px] border-red-600">
                  <table className="w-full text-xs text-left min-w-[520px]">
                    <thead className="bg-red-100 text-red-900 uppercase border-b-[1.5px] border-red-600">
                      <tr>
                        <th className="px-3 py-2.5 font-mono text-[10px] tracking-wider font-bold">Student ID</th>
                        <th className="px-3 py-2.5 font-mono text-[10px] tracking-wider font-bold">Name</th>
                        <th className="px-3 py-2.5 font-mono text-[10px] tracking-wider font-bold">Attended / Total</th>
                        <th className="px-3 py-2.5 font-mono text-[10px] tracking-wider font-bold text-right">Attendance %</th>
                        <th className="px-3 py-2.5 font-mono text-[10px] tracking-wider font-bold text-center">Action Trigger</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-200">
                      {lowAttendanceList.map(a => {
                        const student = data.students.find(s => s.StudentID === a.StudentID);
                        return (
                          <tr key={a.StudentID} className="bg-red-50/50">
                            <td className="px-3 py-2.5 font-mono font-bold text-red-700">{a.StudentID}</td>
                            <td className="px-3 py-2.5 font-medium text-[#1a1a1a]">{student?.Name || "--"}</td>
                            <td className="px-3 py-2.5 font-mono text-[#1a1a1a]/70">{a.ClassesAttended} / {a.TotalClasses}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-red-600 text-sm">{a.AttendancePercentage}%</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="font-mono text-[10px] font-bold uppercase text-amber-900 bg-amber-100 border border-amber-400 px-2 py-0.5">
                                Guardian Notice Needed
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ACADEMIC MARKS (SEPARATE PAGE) */}
        {activeTab === 3 && (
          <div className="space-y-6">
            {/* Separate Page Subheader */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f8f7f4] p-4 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => setActiveTab(0)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] border border-[#1a1a1a] font-mono text-xs uppercase font-bold transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Main View</span>
                </button>
                <span className="text-[#1a1a1a]/30 font-mono">/</span>
                <span className="font-serif text-base sm:text-lg font-bold text-[#1a1a1a]">3. Academic Marks &amp; Subject Evaluations</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-[#5e17eb] bg-[#5e17eb]/10 border border-[#5e17eb]/30 px-2.5 py-1">
                  {data.marks.length} Total Evaluations
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-amber-900 bg-amber-100 border border-amber-400 px-2.5 py-1">
                  {failingMarks.length} Failing Records
                </span>
              </div>
            </div>

            <div className="bg-white p-5 sm:p-6 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
              <h2 className="font-serif text-lg font-bold text-[#1a1a1a] mb-1 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#5e17eb]" />
                Subject Evaluation &amp; Marks Entry
              </h2>
              <p className="font-mono text-xs text-[#1a1a1a]/60 mb-4">
                Internal marks (0–50) + Exam marks (0–50) = Total Marks (0–100). Passing threshold is 40%.
              </p>

              {marksBanner && (
                <div
                  className={`p-3 mb-4 text-xs font-mono font-medium flex items-center justify-between gap-2 border-[1.5px] ${
                    marksBanner.type === "success"
                      ? "bg-emerald-50 text-emerald-900 border-emerald-600"
                      : "bg-red-50 text-red-900 border-red-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {marksBanner.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{marksBanner.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMarksBanner(null)}
                    className="text-[#1a1a1a]/40 hover:text-[#1a1a1a] font-bold ml-1 cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
              )}

              <form onSubmit={handleSaveMarks} className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/70 mb-1">Student *</label>
                  <select
                    value={marksForm.StudentID}
                    onChange={e => setMarksForm({ ...marksForm, StudentID: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f8f7f4] border-[1.5px] border-[#1a1a1a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5e17eb] font-sans text-xs"
                  >
                    {data.students.map(s => (
                      <option key={s.StudentID} value={s.StudentID}>
                        {s.StudentID} - {s.Name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/70 mb-1">Subject Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cloud Computing"
                    value={marksForm.Subject}
                    onChange={e => setMarksForm({ ...marksForm, Subject: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f8f7f4] border-[1.5px] border-[#1a1a1a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5e17eb] font-sans text-xs"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/70 mb-1">Internal Marks (0-50) *</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step="0.1"
                    required
                    value={marksForm.InternalMarks}
                    onChange={e => setMarksForm({ ...marksForm, InternalMarks: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f8f7f4] border-[1.5px] border-[#1a1a1a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5e17eb] font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/70 mb-1">Exam Marks (0-50) *</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step="0.1"
                    required
                    value={marksForm.ExamMarks}
                    onChange={e => setMarksForm({ ...marksForm, ExamMarks: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f8f7f4] border-[1.5px] border-[#1a1a1a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5e17eb] font-mono text-xs"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-[#5e17eb] hover:bg-[#4d10c7] text-white font-mono text-xs font-bold uppercase py-2.5 px-4 border border-[#1a1a1a] shadow-[2px_2px_0px_rgba(26,26,26,1)] transition cursor-pointer"
                  >
                    Save Subject Marks
                  </button>
                </div>
              </form>
            </div>

            {/* Marks Table with Weak Subject Highlighter */}
            <div className="bg-white p-5 sm:p-6 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2 border-b border-[#1a1a1a]/15">
                <div>
                  <h3 className="font-serif text-base font-bold text-[#1a1a1a]">
                    Subject Marks Records &amp; Weak Subject Highlighter (marks.csv)
                  </h3>
                  <p className="font-mono text-xs text-[#1a1a1a]/60">Evaluates passing status and flags weak subjects</p>
                </div>
                <div className="flex items-center space-x-2 text-[11px] font-mono">
                  <span className="flex items-center gap-1.5 text-red-900 bg-red-100 border border-red-400 px-2 py-0.5">
                    <span className="w-1.5 h-1.5 bg-red-600"></span> Fail (&lt; 40%)
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-900 bg-amber-100 border border-amber-400 px-2 py-0.5">
                    <span className="w-1.5 h-1.5 bg-amber-600"></span> Weak (40–54%)
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-900 bg-emerald-100 border border-emerald-400 px-2 py-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-600"></span> Good (≥ 55%)
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto border-[1.5px] border-[#1a1a1a]">
                <table className="w-full text-xs text-left min-w-[620px]">
                  <thead className="bg-[#f8f7f4] text-[#1a1a1a] uppercase border-b-[1.5px] border-[#1a1a1a]">
                    <tr>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Record ID</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Student</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Subject</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold text-center">Internal (50)</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold text-center">Exam (50)</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold text-center">Total (100)</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold text-center">Academic Evaluation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]/10">
                    {data.marks.map(m => {
                      const total = parseFloat(m.TotalMarks || "0");
                      const isFail = total < 40.0;
                      const isWeak = total >= 40.0 && total < 55.0;
                      const studentName = data.students.find(s => s.StudentID === m.StudentID)?.Name;

                      return (
                        <tr
                          key={m.RecordID}
                          className={isFail ? "bg-red-50/70" : isWeak ? "bg-amber-50/60" : "hover:bg-[#f8f7f4] transition"}
                        >
                          <td className="px-3.5 py-2.5 font-mono text-[#1a1a1a]/60">{m.RecordID}</td>
                          <td className="px-3.5 py-2.5 font-medium text-[#1a1a1a]">
                            {m.StudentID} {studentName && <span className="text-[#1a1a1a]/50 font-normal">({studentName})</span>}
                          </td>
                          <td className="px-3.5 py-2.5 text-[#1a1a1a]">{m.Subject}</td>
                          <td className="px-3.5 py-2.5 font-mono text-center text-[#1a1a1a]/70">{m.InternalMarks}</td>
                          <td className="px-3.5 py-2.5 font-mono text-center text-[#1a1a1a]/70">{m.ExamMarks}</td>
                          <td className="px-3.5 py-2.5 font-mono text-center font-bold text-[#1a1a1a]">{m.TotalMarks}</td>
                          <td className="px-3.5 py-2.5 text-center">
                            {isFail ? (
                              <span className="inline-flex items-center px-2 py-0.5 font-mono text-[10px] font-bold uppercase bg-red-600 text-white border border-[#1a1a1a]">
                                FAIL - Below 40%
                              </span>
                            ) : isWeak ? (
                              <span className="inline-flex items-center px-2 py-0.5 font-mono text-[10px] font-bold uppercase bg-amber-500 text-black border border-[#1a1a1a]">
                                WEAK - Mentoring Req
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 font-mono text-[10px] font-bold uppercase bg-emerald-600 text-white border border-[#1a1a1a]">
                                PASS
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FEEDBACK & GRIEVANCE (SEPARATE PAGE) */}
        {activeTab === 4 && (
          <div className="space-y-6">
            {/* Separate Page Subheader */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f8f7f4] p-4 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => setActiveTab(0)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] border border-[#1a1a1a] font-mono text-xs uppercase font-bold transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Main View</span>
                </button>
                <span className="text-[#1a1a1a]/30 font-mono">/</span>
                <span className="font-serif text-base sm:text-lg font-bold text-[#1a1a1a]">4. Student Feedback &amp; Grievance Portal</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-sky-800 bg-sky-50 border border-sky-300 px-2.5 py-1">
                  {data.feedback.length} Submissions Logged
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-amber-900 bg-amber-100 border border-amber-400 px-2.5 py-1">
                  {negativeFeedback.length} Critical Grievances
                </span>
              </div>
            </div>

            <div className="bg-white p-5 sm:p-6 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
              <h2 className="font-serif text-lg font-bold text-[#1a1a1a] mb-1 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#5e17eb]" />
                Student Feedback &amp; Grievance Lodgement
              </h2>
              <p className="font-mono text-xs text-[#1a1a1a]/60 mb-4">
                Raw feedback text is preprocessed, tokenized, and classified into Category &amp; Sentiment using the NLP Engine.
              </p>

              {feedbackBanner && (
                <div
                  className={`p-3 mb-4 text-xs font-mono font-medium flex items-center justify-between gap-2 border-[1.5px] ${
                    feedbackBanner.type === "success"
                      ? "bg-emerald-50 text-emerald-900 border-emerald-600"
                      : "bg-red-50 text-red-900 border-red-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {feedbackBanner.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{feedbackBanner.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFeedbackBanner(null)}
                    className="text-[#1a1a1a]/40 hover:text-[#1a1a1a] font-bold ml-1 cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
              )}

              <form onSubmit={handleSaveFeedback} className="space-y-3.5 text-xs">
                <div className="w-full sm:w-64">
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/70 mb-1">Student *</label>
                  <select
                    value={feedbackForm.StudentID}
                    onChange={e => setFeedbackForm({ ...feedbackForm, StudentID: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f8f7f4] border-[1.5px] border-[#1a1a1a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5e17eb] font-sans text-xs"
                  >
                    {data.students.map(s => (
                      <option key={s.StudentID} value={s.StudentID}>
                        {s.StudentID} - {s.Name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/70 mb-1">Grievance / Feedback Description *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter student experience, complaint, or feedback..."
                    value={feedbackForm.FeedbackText}
                    onChange={e => setFeedbackForm({ ...feedbackForm, FeedbackText: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f8f7f4] border-[1.5px] border-[#1a1a1a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5e17eb] font-sans text-xs"
                  />
                </div>

                {/* Instant Live Preview of NLP classification */}
                {feedbackForm.FeedbackText.trim() && (
                  <div className="bg-[#f8f7f4] p-3.5 border-[1.5px] border-[#1a1a1a] flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/70">NLP Auto-Classification:</span>
                    <span className="bg-[#5e17eb]/10 border border-[#5e17eb]/30 text-[#5e17eb] font-mono text-[10px] uppercase font-bold px-2 py-0.5">
                      Cat: {analyzeFeedbackClient(feedbackForm.FeedbackText).category}
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 border ${
                        analyzeFeedbackClient(feedbackForm.FeedbackText).sentiment === "Positive"
                          ? "bg-emerald-100 text-emerald-900 border-emerald-400"
                          : analyzeFeedbackClient(feedbackForm.FeedbackText).sentiment === "Negative"
                          ? "bg-red-100 text-red-900 border-red-400"
                          : "bg-slate-200 text-slate-800 border-slate-400"
                      }`}
                    >
                      Sentiment: {analyzeFeedbackClient(feedbackForm.FeedbackText).sentiment}
                    </span>
                    <span className="text-[#1a1a1a]/60 font-mono text-[11px]">
                      Keywords: {analyzeFeedbackClient(feedbackForm.FeedbackText).extractedKeywords}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  className="bg-[#5e17eb] hover:bg-[#4d10c7] text-white font-mono text-xs font-bold uppercase py-2.5 px-4 border border-[#1a1a1a] shadow-[2px_2px_0px_rgba(26,26,26,1)] transition flex items-center gap-2 cursor-pointer"
                >
                  <Cpu className="w-4 h-4" />
                  <span>Submit &amp; Auto-Classify with NLP</span>
                </button>
              </form>
            </div>

            {/* Submissions History Table */}
            <div className="bg-white p-5 sm:p-6 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1a1a1a]/15">
                <h3 className="font-serif text-base font-bold text-[#1a1a1a]">
                  Feedback &amp; Grievance Logs (feedback.csv)
                </h3>
                <span className="font-mono text-[10px] uppercase text-[#1a1a1a]/60">{data.feedback.length} entries</span>
              </div>
              <div className="overflow-x-auto border-[1.5px] border-[#1a1a1a]">
                <table className="w-full text-xs text-left min-w-[650px]">
                  <thead className="bg-[#f8f7f4] text-[#1a1a1a] uppercase border-b-[1.5px] border-[#1a1a1a]">
                    <tr>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">ID</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Student</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Timestamp</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Category</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Sentiment</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Extracted Keywords</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Feedback Text</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]/10">
                    {data.feedback.map(f => {
                      const isNeg = f.Sentiment === "Negative";
                      const isPos = f.Sentiment === "Positive";
                      return (
                        <tr key={f.FeedbackID} className={isNeg ? "bg-red-50/60" : "hover:bg-[#f8f7f4] transition"}>
                          <td className="px-3.5 py-2.5 font-mono text-[#1a1a1a]/60">{f.FeedbackID}</td>
                          <td className="px-3.5 py-2.5 font-mono font-bold text-[#5e17eb]">{f.StudentID}</td>
                          <td className="px-3.5 py-2.5 text-[#1a1a1a]/60 font-mono text-xs whitespace-nowrap">{f.Timestamp}</td>
                          <td className="px-3.5 py-2.5">
                            <span className="font-mono text-[10px] uppercase font-bold text-[#1a1a1a] bg-[#f8f7f4] border border-[#1a1a1a]/20 px-2 py-0.5">
                              {f.Category}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span
                              className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase border ${
                                isNeg
                                  ? "bg-red-100 text-red-900 border-red-400"
                                  : isPos
                                  ? "bg-emerald-100 text-emerald-900 border-emerald-400"
                                  : "bg-slate-100 text-slate-800 border-slate-300"
                              }`}
                            >
                              {f.Sentiment}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-[#1a1a1a]/70 text-xs">{f.ExtractedKeywords}</td>
                          <td className="px-3.5 py-2.5 text-[#1a1a1a] font-sans max-w-md">{f.FeedbackText}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: NLP ANALYSIS VIEW (SEPARATE PAGE) */}
        {activeTab === 5 && (
          <div className="space-y-6">
            {/* Separate Page Subheader */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f8f7f4] p-4 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => setActiveTab(0)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] border border-[#1a1a1a] font-mono text-xs uppercase font-bold transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Main View</span>
                </button>
                <span className="text-[#1a1a1a]/30 font-mono">/</span>
                <span className="font-serif text-base sm:text-lg font-bold text-[#1a1a1a]">5. NLP Sentiment &amp; Text Processing Sandbox</span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-[#5e17eb] bg-[#5e17eb]/10 border border-[#5e17eb]/30 px-2.5 py-1">
                Interactive Classifier &amp; Tokenizer
              </span>
            </div>

            <div className="bg-white p-5 sm:p-6 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
              <h2 className="font-serif text-lg font-bold text-[#1a1a1a] mb-1 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#5e17eb]" />
                Live NLP Sentiment &amp; Text Processing Sandbox
              </h2>
              <p className="font-mono text-xs text-[#1a1a1a]/60 mb-4">
                Demonstrates Unit 6 text processing: lowercasing, punctuation removal, stopword filtering, polarity scoring, category matching, and critical keyword extraction.
              </p>

              <div>
                <label className="block font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/70 mb-1">
                  Type or Paste Real-Time Campus Text to Test NLP Engine:
                </label>
                <textarea
                  rows={3}
                  value={liveNlpText}
                  onChange={e => setLiveNlpText(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f8f7f4] border-[1.5px] border-[#1a1a1a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5e17eb] font-sans text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3.5">
                <span className="font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/60">Load Sample Prompts:</span>
                <button
                  onClick={() =>
                    setLiveNlpText(
                      "Professor delivered an outstanding lecture with very helpful programming tutorials and clear notes."
                    )
                  }
                  className="font-mono text-xs bg-white hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] border border-[#1a1a1a] px-3 py-1 font-bold transition cursor-pointer"
                >
                  Positive Academic
                </button>
                <button
                  onClick={() =>
                    setLiveNlpText(
                      "The hostel mess food is terrible and washrooms on the ground floor are broken and completely dirty."
                    )
                  }
                  className="font-mono text-xs bg-white hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] border border-[#1a1a1a] px-3 py-1 font-bold transition cursor-pointer"
                >
                  Negative Infrastructure
                </button>
                <button
                  onClick={() =>
                    setLiveNlpText(
                      "I am struggling with acute exam stress and anxiety and urgently need counseling guidance."
                    )
                  }
                  className="font-mono text-xs bg-white hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] border border-[#1a1a1a] px-3 py-1 font-bold transition cursor-pointer"
                >
                  Student Support Grievance
                </button>
              </div>
            </div>

            {/* NLP Engine Output Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Sentiment Card */}
              <div className="bg-white p-5 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#1a1a1a]/60">
                    Sentiment Classification
                  </span>
                  <div className="mt-2 flex items-center justify-between">
                    <span
                      className={`font-serif text-xl font-bold ${
                        liveNlpResult.sentiment === "Positive"
                          ? "text-emerald-700"
                          : liveNlpResult.sentiment === "Negative"
                          ? "text-red-700"
                          : "text-[#1a1a1a]"
                      }`}
                    >
                      {liveNlpResult.sentiment}
                    </span>
                    <span
                      className={`font-mono text-xs font-bold px-2 py-0.5 border ${
                        liveNlpResult.sentiment === "Positive"
                          ? "bg-emerald-100 text-emerald-900 border-emerald-400"
                          : liveNlpResult.sentiment === "Negative"
                          ? "bg-red-100 text-red-900 border-red-400"
                          : "bg-slate-100 text-slate-800 border-slate-300"
                      }`}
                    >
                      {liveNlpResult.polarityScore > 0 ? "+" : ""}
                      {liveNlpResult.polarityScore}
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[#1a1a1a]/10 font-mono text-[10px] text-[#1a1a1a]/50">
                  Threshold: ≥ 0.15 Pos, ≤ -0.15 Neg
                </div>
              </div>

              {/* Category Card */}
              <div className="bg-white p-5 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#1a1a1a]/60">
                    Domain Category
                  </span>
                  <div className="mt-2 font-serif text-lg font-bold text-[#5e17eb]">
                    {liveNlpResult.category}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[#1a1a1a]/10 font-mono text-[10px] text-[#1a1a1a]/50">
                  Rule-based Keyword Matching
                </div>
              </div>

              {/* Keywords Card */}
              <div className="bg-white p-5 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#1a1a1a]/60">
                    Top Concern Keywords
                  </span>
                  <div className="mt-2 font-mono text-xs font-bold text-rose-700 break-words">
                    {liveNlpResult.extractedKeywords || "--"}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[#1a1a1a]/10 font-mono text-[10px] text-[#1a1a1a]/50">
                  Priority Nouns &amp; Sentiment Verbs
                </div>
              </div>

              {/* Tokenization Card */}
              <div className="bg-white p-5 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#1a1a1a]/60">
                    Tokenization Details
                  </span>
                  <div className="mt-2 font-mono text-xs space-y-1 text-[#1a1a1a]">
                    <div>Total Tokens: <span className="font-bold">{liveNlpResult.tokens.length}</span></div>
                    <div>Content Tokens: <span className="font-bold">{liveNlpResult.contentTokens.length}</span></div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[#1a1a1a]/10 font-mono text-[10px] text-[#1a1a1a]/50">
                  English Stopwords Stripped
                </div>
              </div>
            </div>

            {/* Preprocessed Tokens Visualizer */}
            <div className="bg-white p-5 sm:p-6 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
              <h3 className="font-serif text-base font-bold text-[#1a1a1a] mb-2">Token Breakdown &amp; Stopword Filtering View</h3>
              <div className="flex flex-wrap gap-2">
                {liveNlpResult.tokens.map((token, i) => {
                  const isContent = liveNlpResult.contentTokens.includes(token);
                  return (
                    <span
                      key={i}
                      className={`px-2.5 py-1 font-mono text-xs border ${
                        isContent
                          ? "bg-[#5e17eb]/10 border-[#5e17eb] text-[#5e17eb] font-bold"
                          : "bg-[#f8f7f4] border-[#1a1a1a]/20 text-[#1a1a1a]/40 line-through"
                      }`}
                    >
                      {token}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: STUDENT RISK ANALYSIS (SEPARATE PAGE) */}
        {activeTab === 6 && (
          <div className="space-y-6">
            {/* Separate Page Subheader */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f8f7f4] p-4 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => setActiveTab(0)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] border border-[#1a1a1a] font-mono text-xs uppercase font-bold transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Main View</span>
                </button>
                <span className="text-[#1a1a1a]/30 font-mono">/</span>
                <span className="font-serif text-base sm:text-lg font-bold text-[#1a1a1a]">6. AI-Based Multi-Factor Student Risk Engine</span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-amber-900 bg-amber-100 border border-amber-400 px-2.5 py-1">
                4-Tier Stratification ({data.riskAnalysis.length} Profiles Evaluated)
              </span>
            </div>

            <div className="bg-white p-5 sm:p-6 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-lg font-bold text-[#1a1a1a] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  AI-Based Multi-Factor Student Risk Engine
                </h2>
                <p className="font-mono text-xs text-[#1a1a1a]/60 mt-1">
                  Calculates composite risk score (0–100): Attendance (35%), Academics (35%), Feedback (20%), Frequency (10%).
                </p>
              </div>

              <div className="flex items-center space-x-2.5">
                <button
                  onClick={handleDownloadPdf}
                  className="bg-[#1a1a1a] hover:bg-[#5e17eb] text-white text-xs font-mono font-bold uppercase px-3.5 py-2.5 border border-[#1a1a1a] shadow-[2px_2px_0px_rgba(26,26,26,1)] transition flex items-center gap-1.5 cursor-pointer"
                  title="Export PDF of Risk Stratification & Interventions"
                >
                  <FileText className="w-3.5 h-3.5 text-white" />
                  <span>Export Risk PDF</span>
                </button>
                <button
                  onClick={handleRunPythonTest}
                  disabled={testing}
                  className="bg-[#5e17eb] hover:bg-[#4d10c7] text-white text-xs font-mono font-bold uppercase px-4 py-2.5 border border-[#1a1a1a] shadow-[2px_2px_0px_rgba(26,26,26,1)] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
                  <span>Recompute All Student Risks</span>
                </button>
              </div>
            </div>

            {/* Risk Stratification Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 bg-emerald-50 border-[1.5px] border-emerald-600 shadow-[2px_2px_0px_rgba(26,26,26,0.05)]">
                <span className="font-serif font-bold text-emerald-950 block text-sm">Low Risk</span>
                <span className="font-mono text-[10px] text-emerald-800">Composite Score &lt; 30</span>
              </div>
              <div className="p-3.5 bg-amber-50 border-[1.5px] border-amber-500 shadow-[2px_2px_0px_rgba(26,26,26,0.05)]">
                <span className="font-serif font-bold text-amber-950 block text-sm">Moderate Risk</span>
                <span className="font-mono text-[10px] text-amber-800">30 ≤ Score &lt; 60</span>
              </div>
              <div className="p-3.5 bg-orange-50 border-[1.5px] border-orange-500 shadow-[2px_2px_0px_rgba(26,26,26,0.05)]">
                <span className="font-serif font-bold text-orange-950 block text-sm">High Risk</span>
                <span className="font-mono text-[10px] text-orange-800">60 ≤ Score &lt; 80</span>
              </div>
              <div className="p-3.5 bg-red-50 border-[1.5px] border-red-600 shadow-[2px_2px_0px_rgba(26,26,26,0.05)]">
                <span className="font-serif font-bold text-red-950 block text-sm">Support Required</span>
                <span className="font-mono text-[10px] text-red-800">Composite Score ≥ 80</span>
              </div>
            </div>

            {/* Risk Evaluations Table */}
            <div className="bg-white p-5 sm:p-6 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1a1a1a]/15">
                <h3 className="font-serif text-base font-bold text-[#1a1a1a]">
                  Calculated Risk Profiles (risk_analysis.csv)
                </h3>
                <span className="font-mono text-[10px] uppercase text-[#1a1a1a]/60">Evaluated Profiles</span>
              </div>
              <div className="overflow-x-auto border-[1.5px] border-[#1a1a1a]">
                <table className="w-full text-xs text-left min-w-[620px]">
                  <thead className="bg-[#f8f7f4] text-[#1a1a1a] uppercase border-b-[1.5px] border-[#1a1a1a]">
                    <tr>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Analysis ID</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Student</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold text-center">Score (100)</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Risk Level Badge</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold text-center">Attendance Factor</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold text-center">Academic Factor</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Date Evaluated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]/10">
                    {data.riskAnalysis.map(r => {
                      const score = parseFloat(r.CalculatedScore || "0");
                      const student = data.students.find(s => s.StudentID === r.StudentID);
                      const att = data.attendance.find(a => a.StudentID === r.StudentID);
                      const marks = data.marks.filter(m => m.StudentID === r.StudentID);
                      const failCount = marks.filter(m => parseFloat(m.TotalMarks || "0") < 40).length;

                      const isCritical = r.RiskLevel === "Support Required";
                      const isHigh = r.RiskLevel === "High Risk";
                      const isMod = r.RiskLevel === "Moderate Risk";

                      return (
                        <tr
                          key={r.AnalysisID}
                          className={
                            isCritical
                              ? "bg-red-50/70"
                              : isHigh
                              ? "bg-orange-50/60"
                              : isMod
                              ? "bg-amber-50/50"
                              : "hover:bg-[#f8f7f4] transition"
                          }
                        >
                          <td className="px-3.5 py-2.5 font-mono text-[#1a1a1a]/60">{r.AnalysisID}</td>
                          <td className="px-3.5 py-2.5 font-medium text-[#1a1a1a]">
                            <span className="font-mono font-bold text-[#5e17eb]">{r.StudentID}</span> {student && <span className="text-[#1a1a1a]/60">({student.Name})</span>}
                          </td>
                          <td className="px-3.5 py-2.5 text-center font-bold text-sm font-mono text-[#1a1a1a]">
                            {r.CalculatedScore}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span
                              className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase border border-[#1a1a1a] inline-flex items-center gap-1 ${
                                isCritical
                                  ? "bg-red-600 text-white"
                                  : isHigh
                                  ? "bg-orange-500 text-white"
                                  : isMod
                                  ? "bg-amber-500 text-black"
                                  : "bg-emerald-600 text-white"
                              }`}
                            >
                              {r.RiskLevel}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-center font-mono text-[#1a1a1a]/70">
                            {att ? `${att.AttendancePercentage}%` : "N/A"}
                          </td>
                          <td className="px-3.5 py-2.5 text-center font-mono">
                            {failCount > 0 ? (
                              <span className="text-red-700 font-bold">{failCount} Failing Subj</span>
                            ) : (
                              <span className="text-emerald-700 font-bold">No Failures</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-[#1a1a1a]/60 whitespace-nowrap">{r.DateEvaluated}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: INTELLIGENT RECOMMENDATIONS (SEPARATE PAGE) */}
        {activeTab === 7 && (
          <div className="space-y-6">
            {/* Separate Page Subheader */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f8f7f4] p-4 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => setActiveTab(0)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] border border-[#1a1a1a] font-mono text-xs uppercase font-bold transition cursor-pointer shadow-[2px_2px_0px_rgba(26,26,26,1)]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Main View</span>
                </button>
                <span className="text-[#1a1a1a]/30 font-mono">/</span>
                <span className="font-serif font-display headline-texture text-base sm:text-lg font-bold text-[#1a1a1a]">
                  7. Intelligent Institutional Recommendations
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-amber-900 bg-amber-100 border border-amber-400 px-2.5 py-1">
                  {data.recommendations.filter(r => r.Status === "Pending").length} Pending Actions
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-emerald-900 bg-emerald-100 border border-emerald-400 px-2.5 py-1">
                  {data.recommendations.filter(r => r.Status === "Completed").length} Completed
                </span>
              </div>
            </div>

            {/* Context Headline Hero */}
            <div className="bg-white p-5 sm:p-6 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-serif font-display headline-texture text-xl sm:text-2xl font-bold text-[#1a1a1a] flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                  Intelligent Institutional Recommendations &amp; Action Plans
                </h2>
                <p className="font-mono text-xs text-[#1a1a1a]/60 mt-1">
                  Automated mappings: Low Attendance &rarr; Guardian Notice | High Risk / Poor Marks &rarr; Faculty Mentor | Grievances &rarr; Support Cell.
                </p>
              </div>

              <button
                onClick={handleRunPythonTest}
                disabled={testing}
                className="bg-[#5e17eb] hover:bg-[#4d10c7] text-white text-xs font-mono font-bold uppercase px-4 py-2.5 border border-[#1a1a1a] shadow-[2px_2px_0px_rgba(26,26,26,1)] transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
                <span>Regenerate Recommendations</span>
              </button>
            </div>

            {/* Contextual Recommendation Pathways Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#f8f7f4] p-4 border-[1.5px] border-[#1a1a1a] shadow-[3px_3px_0px_rgba(26,26,26,0.06)] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-rose-700 font-bold block mb-1">
                    Path 01 &bull; Attendance
                  </span>
                  <h4 className="recommendation-title text-sm sm:text-base leading-snug">
                    Guardian Warning Notice
                  </h4>
                  <p className="text-xs text-[#1a1a1a]/70 mt-1 font-sans">
                    Automated dispatch for attendance deficits below the mandatory 75% threshold.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-[#1a1a1a]/10 font-mono text-[10px] text-[#1a1a1a]/50">
                  Trigger: &lt; 75.0% Attendance
                </div>
              </div>

              <div className="bg-[#f8f7f4] p-4 border-[1.5px] border-[#1a1a1a] shadow-[3px_3px_0px_rgba(26,26,26,0.06)] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-amber-700 font-bold block mb-1">
                    Path 02 &bull; Academics
                  </span>
                  <h4 className="recommendation-title text-sm sm:text-base leading-snug">
                    Remedial Peer Tutoring
                  </h4>
                  <p className="text-xs text-[#1a1a1a]/70 mt-1 font-sans">
                    Structured 2-week remedial schedule and mentor allocation for scores &lt; 50%.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-[#1a1a1a]/10 font-mono text-[10px] text-[#1a1a1a]/50">
                  Trigger: Marks &lt; 50.0%
                </div>
              </div>

              <div className="bg-[#f8f7f4] p-4 border-[1.5px] border-[#1a1a1a] shadow-[3px_3px_0px_rgba(26,26,26,0.06)] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-purple-700 font-bold block mb-1">
                    Path 03 &bull; Psychological
                  </span>
                  <h4 className="recommendation-title text-sm sm:text-base leading-snug">
                    Counselor Outreach Session
                  </h4>
                  <p className="text-xs text-[#1a1a1a]/70 mt-1 font-sans">
                    Confidential check-in initiated by NLP sentiment flags or high grievance frequency.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-[#1a1a1a]/10 font-mono text-[10px] text-[#1a1a1a]/50">
                  Trigger: Negative Sentiment &lt; -0.3
                </div>
              </div>

              <div className="bg-[#f8f7f4] p-4 border-[1.5px] border-[#1a1a1a] shadow-[3px_3px_0px_rgba(26,26,26,0.06)] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-700 font-bold block mb-1">
                    Path 04 &bull; Administrative
                  </span>
                  <h4 className="recommendation-title text-sm sm:text-base leading-snug">
                    Dean Clearance &amp; Mentorship
                  </h4>
                  <p className="text-xs text-[#1a1a1a]/70 mt-1 font-sans">
                    Final review and exam clearance protocol for resolved multi-factor risk profiles.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-[#1a1a1a]/10 font-mono text-[10px] text-[#1a1a1a]/50">
                  Trigger: Multi-Factor Composite Index
                </div>
              </div>
            </div>

            {/* Recommendations Table */}
            <div className="bg-white p-5 sm:p-6 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1a1a1a]/15">
                <h3 className="font-serif font-display headline-texture text-base font-bold text-[#1a1a1a]">
                  Actionable Tasks per Student ID (recommendations.csv)
                </h3>
                <span className="font-mono text-[10px] uppercase text-[#1a1a1a]/60">Intervention Queue</span>
              </div>

              <div className="overflow-x-auto border-[1.5px] border-[#1a1a1a]">
                <table className="w-full text-xs text-left min-w-[620px]">
                  <thead className="bg-[#f8f7f4] text-[#1a1a1a] uppercase border-b-[1.5px] border-[#1a1a1a]">
                    <tr>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Task ID</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Student</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Risk Level</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Recommended Action</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold text-center">Status</th>
                      <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold text-right">Update Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]/10">
                    {data.recommendations.map(rec => {
                      const isPending = rec.Status === "Pending";
                      const isInProgress = rec.Status === "In Progress";
                      const isCompleted = rec.Status === "Completed";
                      const student = data.students.find(s => s.StudentID === rec.StudentID);

                      return (
                        <tr key={rec.RecID} className="hover:bg-[#f8f7f4] transition">
                          <td className="px-3.5 py-2.5 font-mono text-[#1a1a1a]/60">{rec.RecID}</td>
                          <td className="px-3.5 py-2.5 font-medium text-[#1a1a1a]">
                            <span className="font-mono font-bold text-[#5e17eb]">{rec.StudentID}</span> {student && <span className="text-[#1a1a1a]/60">({student.Name})</span>}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-xs font-bold text-[#1a1a1a]">{rec.RiskLevel}</td>
                          <td className="px-3.5 py-2.5 text-[#1a1a1a] font-sans">{rec.RecommendedAction}</td>
                          <td className="px-3.5 py-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase border border-[#1a1a1a] ${
                                isCompleted
                                  ? "bg-emerald-600 text-white"
                                  : isInProgress
                                  ? "bg-sky-500 text-white"
                                  : "bg-amber-500 text-black"
                              }`}
                            >
                              {rec.Status}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                            {!isInProgress && !isCompleted && (
                              <button
                                onClick={() => handleUpdateRecStatus(rec.RecID, "In Progress")}
                                className="px-2.5 py-1 bg-white hover:bg-sky-600 hover:text-white text-sky-800 border border-[#1a1a1a] font-mono font-bold text-[10px] uppercase shadow-[1px_1px_0px_rgba(26,26,26,1)] transition cursor-pointer"
                              >
                                In Progress
                              </button>
                            )}
                            {!isCompleted && (
                              <button
                                onClick={() => handleUpdateRecStatus(rec.RecID, "Completed")}
                                className="px-2.5 py-1 bg-white hover:bg-emerald-600 hover:text-white text-emerald-800 border border-[#1a1a1a] font-mono font-bold text-[10px] uppercase shadow-[1px_1px_0px_rgba(26,26,26,1)] transition cursor-pointer"
                              >
                                Mark Resolved
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: ANALYTICS & REPORTS (SEPARATE PAGE) */}
        {activeTab === 8 && (
          <div className="space-y-6">
            {/* Separate Page Subheader */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f8f7f4] p-4 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => setActiveTab(0)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] border border-[#1a1a1a] font-mono text-xs uppercase font-bold transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Main View</span>
                </button>
                <span className="text-[#1a1a1a]/30 font-mono">/</span>
                <span className="font-serif text-base sm:text-lg font-bold text-[#1a1a1a]">8. Institutional Analytics &amp; Reports</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#5e17eb] hover:bg-[#4d10c7] text-white border border-[#1a1a1a] shadow-[2px_2px_0px_rgba(26,26,26,1)] text-xs font-mono font-bold uppercase transition cursor-pointer"
                  title="Generate Official Summarized PDF Audit Report"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download Official PDF</span>
                </button>
                <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-emerald-900 bg-emerald-100 border border-emerald-400 px-2.5 py-1">
                  Aggregated Summary
                </span>
              </div>
            </div>

            {/* KPI Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)] flex items-center gap-4">
                <div className="w-12 h-12 bg-[#5e17eb]/10 border border-[#5e17eb] text-[#5e17eb] flex items-center justify-center font-bold">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#1a1a1a]/60">Overall Avg Attendance</span>
                  <div className="font-serif text-2xl font-bold text-[#1a1a1a] mt-0.5">{overallAvgAttendance}%</div>
                  <span className="font-mono text-[10px] text-[#1a1a1a]/50">Institutional Baseline</span>
                </div>
              </div>

              <div className="bg-white p-5 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)] flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 border border-red-500 text-red-700 flex items-center justify-center font-bold">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#1a1a1a]/60">Failing Subject %</span>
                  <div className="font-serif text-2xl font-bold text-red-700 mt-0.5">{failingPercentage}%</div>
                  <span className="font-mono text-[10px] text-red-700">{failingMarks.length} Failing Evaluations</span>
                </div>
              </div>

              <div className="bg-white p-5 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)] flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 border border-amber-500 text-amber-700 flex items-center justify-center font-bold">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#1a1a1a]/60">Negative Sentiment %</span>
                  <div className="font-serif text-2xl font-bold text-amber-800 mt-0.5">{negFeedbackRatio}%</div>
                  <span className="font-mono text-[10px] text-[#1a1a1a]/50">{negativeFeedback.length} Critical Grievances</span>
                </div>
              </div>

              <div className="bg-white p-5 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)] flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 border border-emerald-600 text-emerald-800 flex items-center justify-center font-bold">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#1a1a1a]/60">Enrolled Students</span>
                  <div className="font-serif text-2xl font-bold text-emerald-850 mt-0.5">{data.students.length}</div>
                  <span className="font-mono text-[10px] text-[#1a1a1a]/50">Across All Departments</span>
                </div>
              </div>
            </div>

            {/* Tables Grid */}
            <div className="flex flex-col gap-6">
              {/* PDF Report Export Banner Card */}
              <div className="border-[1.5px] border-[#1a1a1a] bg-white p-6 shadow-[4px_4px_0px_rgba(26,26,26,0.08)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#5e17eb] font-bold bg-[#5e17eb]/10 px-2 py-0.5">
                      Official Export
                    </span>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1a1a1a]">
                      Campus Risk &amp; Attendance PDF Audit Report
                    </h3>
                  </div>
                  <p className="text-xs text-[#1a1a1a]/70 font-sans leading-relaxed">
                    Compiles a comprehensive audit document including total enrollment metrics, deficit attendance registers (&lt;75% mandatory threshold), 4-tier risk evaluations, failing subject evaluators, and assigned faculty intervention statuses.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-[#1a1a1a]/60 pt-1">
                    <span>Format: <strong className="text-[#1a1a1a]">A4 PDF</strong></span>
                    <span>&bull;</span>
                    <span>Engine: <strong className="text-[#1a1a1a]">jsPDF Light</strong></span>
                    <span>&bull;</span>
                    <span>Auditor: <strong className="text-[#1a1a1a]">{currentProfile?.name || "Campus Admin"}</strong></span>
                  </div>
                </div>

                <button
                  onClick={handleDownloadPdf}
                  className="px-6 py-3.5 bg-[#1a1a1a] hover:bg-[#5e17eb] text-white font-mono text-xs font-bold uppercase transition-all border border-[#1a1a1a] shadow-[3px_3px_0px_rgba(26,26,26,1)] flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <FileText className="w-4 h-4 text-white" />
                  <span>Generate &amp; Download PDF</span>
                </button>
              </div>

              {/* Department Attendance Table */}
              <div className="bg-white p-5 sm:p-6 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1a1a1a]/15">
                  <h3 className="font-serif text-base font-bold text-[#1a1a1a]">
                    Department-Wide Average Attendance
                  </h3>
                  <span className="font-mono text-[10px] uppercase text-[#1a1a1a]/60">By Academic Division</span>
                </div>
                <div className="overflow-x-auto border-[1.5px] border-[#1a1a1a]">
                  <table className="w-full text-xs text-left min-w-[420px]">
                    <thead className="bg-[#f8f7f4] text-[#1a1a1a] uppercase border-b-[1.5px] border-[#1a1a1a]">
                      <tr>
                        <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold">Department</th>
                        <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold text-center">Students</th>
                        <th className="px-3.5 py-2.5 font-mono text-[10px] tracking-wider font-bold text-right">Average Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a1a1a]/10">
                      {Object.entries(
                        data.students.reduce((acc, s) => {
                          acc[s.Department] = acc[s.Department] || [];
                          const att = data.attendance.find(a => a.StudentID === s.StudentID);
                          if (att) acc[s.Department].push(parseFloat(att.AttendancePercentage || "0"));
                          return acc;
                        }, {} as Record<string, number[]>)
                      ).map(([dept, pcts]: [string, number[]]) => {
                        const avg = pcts.length > 0 ? (pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1) : "0.0";
                        return (
                          <tr key={dept} className="hover:bg-[#f8f7f4] transition">
                            <td className="px-3.5 py-2.5 font-medium text-[#1a1a1a]">{dept}</td>
                            <td className="px-3.5 py-2.5 text-center font-mono text-[#1a1a1a]/70">{pcts.length}</td>
                            <td className="px-3.5 py-2.5 text-right font-mono font-bold text-[#5e17eb]">{avg}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sentiment Ratio & Complaints */}
              <div className="bg-white p-5 sm:p-6 border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)]">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1a1a1a]/15">
                  <h3 className="font-serif text-base font-bold text-[#1a1a1a]">
                    Feedback Sentiment Breakdown Ratio
                  </h3>
                  <span className="font-mono text-[10px] uppercase text-[#1a1a1a]/60">NLP Classification Distribution</span>
                </div>
                <div className="space-y-3.5 mb-6">
                  {["Positive", "Neutral", "Negative"].map(sent => {
                    const count = data.feedback.filter(f => f.Sentiment === sent).length;
                    const pct = data.feedback.length > 0 ? ((count / data.feedback.length) * 100).toFixed(1) : "0.0";
                    const color =
                      sent === "Positive"
                        ? "bg-emerald-600"
                        : sent === "Negative"
                        ? "bg-red-600"
                        : "bg-slate-500";
                    return (
                      <div key={sent} className="space-y-1 text-xs">
                        <div className="flex justify-between font-mono font-bold text-[#1a1a1a]">
                          <span>{sent}</span>
                          <span>{count} logs ({pct}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-[#f8f7f4] border border-[#1a1a1a]/20 overflow-hidden">
                          <div className={`h-full ${color}`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1a1a1a]/15">
                  <h3 className="font-serif text-base font-bold text-red-700">
                    Top Recurring Campus Grievances / Complaints
                  </h3>
                  <span className="font-mono text-[10px] uppercase text-red-700">Flagged Keywords</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["projector", "classroom", "maintenance", "broken", "wifi", "strict"].map(word => (
                    <span
                      key={word}
                      className="px-2.5 py-1 bg-red-50 text-red-800 border-[1.5px] border-red-500 font-mono text-xs font-bold uppercase"
                    >
                      #{word}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: AI CAMPUS COMMUNICATOR & CHATBOT */}
        {activeTab === 9 && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-[1.5px] border-[#1a1a1a] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#5e17eb] font-bold bg-[#5e17eb]/10 px-2 py-0.5 rounded">
                    Unit 09 &bull; AI Powered
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1a1a1a]">
                    Gemini Campus Communicator &amp; AI Advisor
                  </h2>
                </div>
                <p className="font-mono text-xs text-[#1a1a1a]/60">
                  Multi-turn conversational intelligence for student counseling, parent notice drafting, remedial study schedules, and campus risk queries.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#5e17eb] text-white text-xs font-mono font-bold transition cursor-pointer"
                  title="Download Campus PDF Audit Report"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Audit PDF</span>
                </button>
              </div>
            </div>

            {/* Embedded Gemini Chat Interface */}
            <GeminiChatCommunicator
              campusData={data}
              currentProfile={currentProfile}
              mode="embedded"
            />
          </div>
        )}
      </main>

      {/* Floating Quick AI Communicator Toggle Button */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {!floatingChatOpen && (
          <button
            onClick={() => setFloatingChatOpen(true)}
            className="px-4 py-3 bg-[#5e17eb] hover:bg-[#4d10c7] text-white font-mono text-xs font-bold uppercase shadow-[4px_4px_0px_rgba(26,26,26,1)] border-[1.5px] border-[#1a1a1a] flex items-center gap-2.5 transition transform hover:-translate-y-0.5 cursor-pointer"
            title="Open Gemini AI Campus Assistant & Communicator"
          >
            <Bot className="w-4 h-4 text-white" />
            <span>AI Communicator</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </button>
        )}
      </div>

      {/* Floating Quick AI Communicator Widget */}
      {floatingChatOpen && (
        <GeminiChatCommunicator
          campusData={data}
          currentProfile={currentProfile}
          mode="floating"
          onClose={() => setFloatingChatOpen(false)}
        />
      )}

      {/* Toast Notification for PDF Generation */}
      {pdfToast && (
        <div className="fixed bottom-6 left-6 z-50 bg-[#1a1a1a] text-white px-5 py-3 border-[1.5px] border-[#5e17eb] shadow-xl flex items-center gap-3 font-mono text-xs animate-bounce">
          <FileText className="w-4 h-4 text-[#5e17eb]" />
          <span>{pdfToast}</span>
        </div>
      )}

      {/* Editorial Footer */}
      <footer className="mt-16 border-t-[1.5px] border-[#1a1a1a] pt-6 pb-12 flex flex-wrap items-center justify-between gap-4 font-mono text-[11px] text-[#1a1a1a]/60 px-6 sm:px-8 max-w-7xl mx-auto">
        <div>&copy; 2024 Present Sir OS</div>
        <div>STU_SYS_VER_4.0</div>
        <div>ENV: Production / Academics</div>
      </footer>

      {/* Python Desktop Code & Terminal Modal */}
      {pythonModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1a1a1a]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl border-[1.5px] border-[#1a1a1a] shadow-[8px_8px_0px_rgba(26,26,26,0.2)] flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#1a1a1a] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#1a1a1a]">
              <div className="flex items-center space-x-2">
                <Code2 className="w-5 h-5 text-white" />
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold">Python Desktop Architecture &amp; Test Suite Inspector</h3>
              </div>
              <button
                onClick={() => setPythonModalOpen(false)}
                className="text-white hover:text-rose-300 text-lg font-bold px-2 py-0.5 rounded cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* File list */}
              <div className="w-full md:w-56 bg-[#f8f7f4] p-3 border-r-[1.5px] border-[#1a1a1a] space-y-1 overflow-y-auto text-xs">
                <span className="font-mono font-bold text-[10px] text-[#1a1a1a]/60 uppercase tracking-widest block mb-2 px-1">
                  Source Files
                </span>
                {["main.py", "models.py", "nlp_engine.py", "analytics.py", "gui.py", "requirements.txt", "README.md"].map(
                  f => (
                    <button
                      key={f}
                      onClick={() => setSelectedPythonFile(f)}
                      className={`w-full text-left px-3 py-2 font-mono text-xs transition cursor-pointer ${
                        selectedPythonFile === f
                          ? "bg-[#1a1a1a] text-white font-bold"
                          : "hover:bg-white text-[#1a1a1a]"
                      }`}
                    >
                      {f}
                    </button>
                  )
                )}

                <div className="pt-4 px-1">
                  <button
                    onClick={handleRunPythonTest}
                    disabled={testing}
                    className="w-full bg-[#5e17eb] hover:bg-[#4d10c7] text-white font-mono text-xs font-bold py-2 uppercase shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Verification</span>
                  </button>
                </div>
              </div>

              {/* Code viewer & test terminal */}
              <div className="flex-1 flex flex-col bg-[#1a1a1a] text-white overflow-hidden">
                <div className="bg-[#111113] px-4 py-2 border-b border-white/10 text-xs font-mono text-[#5e17eb] flex items-center justify-between">
                  <span>Viewing: {selectedPythonFile}</span>
                  <span className="text-[11px] text-white/50">Zero placeholder statements | Production Ready</span>
                </div>
                <div className="flex-1 p-4 overflow-auto font-mono text-xs text-white/90 leading-relaxed whitespace-pre select-all">
                  {pythonFiles[selectedPythonFile] || "Loading source file..."}
                </div>

                {/* Test Output Panel */}
                {testOutput && (
                  <div className="bg-[#0f0f11] p-3 border-t border-white/10 text-xs font-mono max-h-48 overflow-y-auto">
                    <div className="text-emerald-400 font-bold mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Terminal Execution Output:
                    </div>
                    <pre className="text-white/80 whitespace-pre-wrap">{testOutput}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 bg-[#1a1a1a]/60 backdrop-blur-xs z-35 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Floating Side Taskbar Opener for Mobile */}
      <button
        onClick={() => setMobileDrawerOpen(true)}
        className="fixed bottom-4 left-4 z-30 md:hidden p-3 bg-[#1a1a1a] text-white border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.2)] flex items-center gap-2 font-mono font-bold text-xs cursor-pointer active:scale-95 transition"
        title="Open Side Taskbar to view all options"
        aria-label="Open Side Taskbar"
      >
        <LayoutGrid className="w-4 h-4 text-white" />
        <span>View Modules</span>
      </button>

      {/* Docked Side Accessible Taskbar (Variation 3 Editorial Sidebar) */}
      <nav
        id="accessible-bottom-taskbar"
        aria-label="Campus Options Side Taskbar"
        className={`fixed top-0 bottom-0 left-0 z-40 bg-[#f8f7f4] text-[#1a1a1a] border-r-[1.5px] border-[#1a1a1a] shadow-[4px_0_12px_rgba(26,26,26,0.06)] flex flex-col transition-all duration-300 select-none w-72 sm:w-80 max-w-[85vw] ${
          sideTaskbarOpen ? "md:w-64" : "md:w-20"
        } ${
          mobileDrawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Taskbar Top Brand & Toggle Header */}
        <div className="p-3.5 border-b-[1.5px] border-[#1a1a1a] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <button
              onClick={() => {
                setActiveTab(0);
                setMobileDrawerOpen(false);
              }}
              className="w-8 h-8 border-[1.5px] border-[#1a1a1a] bg-[#1a1a1a] text-white flex items-center justify-center font-serif font-bold text-sm shrink-0 transition hover:bg-[#5e17eb] cursor-pointer"
              title="Return to Overview"
            >
              PS
            </button>
            <div className={`overflow-hidden ${!sideTaskbarOpen ? "md:hidden" : "block"}`}>
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-sm font-bold tracking-tight text-[#1a1a1a] truncate">Present Sir OS</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse shrink-0" title="System Online" />
              </div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#1a1a1a]/50 block truncate">Campus Taskbar</span>
            </div>
          </div>

          {/* Desktop Collapse / Mobile Close button */}
          <div className="flex items-center">
            <button
              onClick={() => setSideTaskbarOpen(prev => !prev)}
              className="hidden md:flex absolute left-full top-3.5 ml-2 z-50 w-7 h-7 bg-white hover:bg-[#1a1a1a] text-[#1a1a1a] hover:text-white border-[1.5px] border-[#1a1a1a] shadow-xs items-center justify-center transition-all cursor-pointer"
              title={sideTaskbarOpen ? "Collapse Side Taskbar" : "Expand Side Taskbar"}
              aria-label="Toggle Side Taskbar Width"
            >
              {sideTaskbarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="md:hidden p-1.5 border-[1.5px] border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white active:scale-95 transition cursor-pointer"
              aria-label="Close Side Taskbar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Hub Filter when expanded */}
        <div className={`px-3 pt-2.5 pb-2 shrink-0 border-b border-[#1a1a1a]/15 ${!sideTaskbarOpen ? "md:hidden" : "block"}`}>
          <div className="flex items-center text-[10px] font-mono uppercase tracking-widest text-[#1a1a1a]/60 font-bold mb-1.5 px-0.5">
            <span>Filter Modules</span>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-white p-1 border border-[#1a1a1a]/20 text-[10px] font-mono font-semibold text-center">
            <button
              onClick={() => setHubFilter("all")}
              className={`py-1 transition cursor-pointer ${
                hubFilter === "all" ? "bg-[#1a1a1a] text-white font-bold" : "text-[#1a1a1a]/70 hover:bg-[#f8f7f4]"
              }`}
            >
              All (9)
            </button>
            <button
              onClick={() => setHubFilter("core")}
              className={`py-1 transition cursor-pointer ${
                hubFilter === "core" ? "bg-[#1a1a1a] text-white font-bold" : "text-[#1a1a1a]/70 hover:bg-[#f8f7f4]"
              }`}
            >
              Core
            </button>
            <button
              onClick={() => setHubFilter("ai")}
              className={`py-1 transition cursor-pointer ${
                hubFilter === "ai" ? "bg-[#1a1a1a] text-white font-bold" : "text-[#1a1a1a]/70 hover:bg-[#f8f7f4]"
              }`}
            >
              AI
            </button>
          </div>
        </div>

        {/* Scrollable Options List */}
        <div
          id="taskbar-scroll-container"
          className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scroll-smooth"
        >
          {[
            {
              id: 0,
              code: "00",
              label: "Overview Hub",
              category: "all",
              desc: "All Options & Stats",
              icon: LayoutGrid,
              count: null,
            },
            {
              id: 1,
              code: "01",
              label: "Students Directory",
              category: "core",
              desc: "Profiles & Enrollment",
              icon: Users,
              count: data.students.length,
            },
            {
              id: 2,
              code: "02",
              label: "Present Sir Roll",
              category: "core",
              desc: "Attendance & Alerts",
              icon: CalendarCheck,
              count: lowAttendanceList.length > 0 ? `${lowAttendanceList.length} alert` : null,
              alert: lowAttendanceList.length > 0,
            },
            {
              id: 3,
              code: "03",
              label: "Marks & Grades",
              category: "core",
              desc: "Internal & Exam Scores",
              icon: GraduationCap,
              count: failingMarks.length > 0 ? `${failingMarks.length} fail` : null,
              alert: failingMarks.length > 0,
            },
            {
              id: 4,
              code: "04",
              label: "Feedback & Grievance",
              category: "core",
              desc: "Student Sentiment",
              icon: MessageSquare,
              count: data.feedback.length,
            },
            {
              id: 5,
              code: "05",
              label: "NLP Sandbox",
              category: "ai",
              desc: "Tokens & Polarity Test",
              icon: Cpu,
              count: null,
            },
            {
              id: 6,
              code: "06",
              label: "Risk Engine",
              category: "ai",
              desc: "Multi-Factor Scoring",
              icon: AlertTriangle,
              count: data.riskAnalysis.filter(r => r.RiskLevel === "High Risk" || r.RiskLevel === "Support Required").length || null,
              alert: true,
            },
            {
              id: 7,
              code: "07",
              label: "Recommendations",
              category: "ai",
              desc: "Institutional Actions",
              icon: Lightbulb,
              count: data.recommendations.filter(r => r.Status === "Pending").length || null,
            },
            {
              id: 8,
              code: "08",
              label: "Analytics & Trends",
              category: "ai",
              desc: "NumPy / Pandas Stats",
              icon: BarChart3,
              count: null,
            },
            {
              id: 9,
              code: "09",
              label: "AI Communicator",
              category: "ai",
              desc: "Gemini Chat & Advising",
              icon: MessageSquareText,
              count: "AI",
            }
          ]
            .filter(tab => hubFilter === "all" || tab.id === 0 || tab.category === hubFilter)
            .map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`taskbar-btn-${tab.id}`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition relative cursor-pointer border ${
                    active
                      ? "bg-[#1a1a1a] text-white border-[#1a1a1a] shadow-xs font-bold"
                      : "bg-transparent text-[#1a1a1a] border-transparent hover:bg-white hover:border-[#1a1a1a]/15"
                  }`}
                  title={`${tab.label} — ${tab.desc}`}
                >
                  <div
                    className={`w-6 h-6 flex items-center justify-center font-mono text-[10px] shrink-0 ${
                      active
                        ? "bg-white text-[#1a1a1a] font-bold"
                        : "bg-white border border-[#1a1a1a]/20 text-[#1a1a1a]/70"
                    }`}
                  >
                    {tab.code}
                  </div>

                  <div className={`flex-1 min-w-0 ${!sideTaskbarOpen ? "md:hidden" : "block"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate block">{tab.label}</span>
                      {active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5e17eb] shrink-0 ml-1" />
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className={`text-[10px] truncate block ${active ? "text-white/70" : "text-[#1a1a1a]/50"}`}>{tab.desc}</span>
                      {tab.count !== null && (
                        <span
                          className={`ml-1 px-1.5 py-0.2 text-[9px] font-mono font-bold shrink-0 ${
                            tab.alert && activeTab !== tab.id
                              ? "bg-rose-600 text-white"
                              : active
                              ? "bg-white/20 text-white"
                              : "bg-[#1a1a1a]/10 text-[#1a1a1a]"
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                    </div>
                  </div>

                  {!sideTaskbarOpen && tab.count !== null && (
                    <span
                      className={`hidden md:block absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                        tab.alert && activeTab !== tab.id ? "bg-rose-600" : "bg-[#5e17eb]"
                      }`}
                    />
                  )}
                </button>
              );
            })}
        </div>

        {/* Sidebar Footer: User Profile, Switch User, Sync Actions (Variation 3 Editorial) */}
        <div className="p-3 border-t-[1.5px] border-[#1a1a1a] bg-white shrink-0 font-mono">
          {/* Expanded View */}
          <div className={`${!sideTaskbarOpen ? "md:hidden" : "block"}`}>
            {currentProfile && (
              <div className="p-2.5 bg-[#f8f7f4] border border-[#1a1a1a]/20 mb-2.5 flex items-center gap-2.5">
                <div className="w-7 h-7 border-[1.5px] border-[#1a1a1a] bg-[#1a1a1a] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {currentProfile.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-[#1a1a1a] truncate">{currentProfile.name}</div>
                  <div className="text-[9px] text-[#5e17eb] uppercase tracking-wider truncate">
                    {currentProfile.role} &bull; {currentProfile.id}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-2 border-[1.5px] border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] text-[10px] uppercase font-bold transition cursor-pointer"
                title={`Logged in as ${currentProfile?.name} (${currentProfile?.role}). Click to switch user or log out.`}
              >
                <LogOut className="w-3 h-3" />
                <span>Switch</span>
              </button>

              <button
                onClick={() => fetchData()}
                disabled={loading}
                className={`w-full flex items-center justify-center gap-1.5 py-2 px-2 border-[1.5px] border-[#1a1a1a] text-[10px] uppercase font-bold transition cursor-pointer ${
                  refreshSuccess
                    ? "bg-[#5e17eb] text-white border-[#5e17eb]"
                    : "bg-[#1a1a1a] hover:bg-[#5e17eb] text-white border-[#1a1a1a]"
                }`}
                title="Click to refresh and sync all campus data"
                aria-label="Refresh campus data"
              >
                {refreshSuccess ? (
                  <CheckCircle2 className="w-3 h-3 text-white" />
                ) : (
                  <RefreshCw
                    className={`w-3 h-3 ${
                      loading ? "animate-spin text-white" : "text-white"
                    }`}
                  />
                )}
                <span>
                  {loading ? "Syncing" : refreshSuccess ? "Synced" : "Sync"}
                </span>
              </button>
            </div>

            <button
              onClick={handleDownloadPdf}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-2 bg-[#1a1a1a] hover:bg-[#5e17eb] text-white text-[10px] uppercase font-bold transition cursor-pointer"
              title="Generate and download summarized PDF report"
            >
              <FileDown className="w-3 h-3" />
              <span>Download PDF Audit</span>
            </button>
          </div>

          {/* Collapsed View (Desktop Icon Only) */}
          <div className={`hidden ${!sideTaskbarOpen ? "md:flex" : "hidden"} flex-col items-center gap-2 py-1`}>
            {currentProfile && (
              <div
                className="w-8 h-8 border-[1.5px] border-[#1a1a1a] bg-[#1a1a1a] text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                title={`Logged in: ${currentProfile.name} (${currentProfile.role} • ${currentProfile.id})`}
              >
                {currentProfile.name.charAt(0)}
              </div>
            )}
            <button
              onClick={handleDownloadPdf}
              className="w-8 h-8 flex items-center justify-center border-[1.5px] border-[#1a1a1a] bg-[#5e17eb] text-white hover:bg-[#4d10c7] transition cursor-pointer"
              title="Download PDF Audit Report"
              aria-label="Download PDF Report"
            >
              <FileDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleLogout}
              className="w-8 h-8 flex items-center justify-center border-[1.5px] border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] transition cursor-pointer"
              title="Switch user or logout"
              aria-label="Switch user"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className={`w-8 h-8 flex items-center justify-center border-[1.5px] border-[#1a1a1a] transition cursor-pointer ${
                refreshSuccess
                  ? "bg-[#5e17eb] text-white border-[#5e17eb]"
                  : "bg-[#1a1a1a] hover:bg-[#5e17eb] text-white border-[#1a1a1a]"
              }`}
              title="Refresh / Sync campus data"
              aria-label="Refresh campus data"
            >
              {refreshSuccess ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              ) : (
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    loading ? "animate-spin text-white" : "text-white"
                  }`}
                />
              )}
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
