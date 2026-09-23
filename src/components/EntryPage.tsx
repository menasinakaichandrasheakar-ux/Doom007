import React, { useState } from "react";
import {
  Users,
  Shield,
  UserPlus,
  ArrowRight,
  AlertCircle,
  UserCheck,
  ChevronRight
} from "lucide-react";
import { Student, VisitorProfile } from "../types";

interface EntryPageProps {
  students: Student[];
  onEnter: (profile: VisitorProfile) => void;
  onRefreshData?: () => void;
}

export default function EntryPage({ students, onEnter, onRefreshData }: EntryPageProps) {
  const [activeMode, setActiveMode] = useState<"enter-details" | "quick-select">("enter-details");
  const [role, setRole] = useState<"Student" | "Faculty" | "Visitor">("Student");

  // Suggest next ID based on existing students
  const suggestNextStudentId = () => {
    const nums = students
      .map(s => {
        const m = (s.StudentID || "").match(/\d+/);
        return m ? parseInt(m[0], 10) : 0;
      })
      .filter(n => n > 0);
    const max = nums.length > 0 ? Math.max(...nums) : 100;
    return `S${max + 1}`;
  };

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    customId: "",
    department: "Computer Science & Engineering",
    semester: "4",
    designation: "External Evaluator / Professor",
    email: "",
    totalClasses: "100",
    classesAttended: "85"
  });

  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchExisting, setSearchExisting] = useState<string>("");

  // Update auto-id when role changes
  const computedId = formData.customId.trim() || (role === "Student" ? suggestNextStudentId() : role === "Faculty" ? "FAC-101" : "VIS-101");

  // Handle auto-email generation if user types name
  const handleNameChange = (val: string) => {
    setFormData(prev => {
      const sanitized = val.toLowerCase().replace(/[^a-z0-9]/g, ".");
      const autoEmail = prev.email ? prev.email : sanitized ? `${sanitized}@campus.edu` : "";
      return { ...prev, name: val, email: autoEmail };
    });
  };

  // Submit Details Entry
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const name = formData.name.trim();
    const finalId = computedId.trim().toUpperCase();
    const email = (formData.email.trim() || `${name.toLowerCase().replace(/\s+/g, ".")}@campus.edu`).toLowerCase();

    if (!name) {
      setErrorMessage("Please enter your Full Name.");
      return;
    }

    setSaving(true);

    try {
      if (role === "Student") {
        // Persist to backend students.csv and attendance.csv
        const res = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: finalId,
            name: name,
            department: formData.department,
            semester: formData.semester,
            email: email,
            action: "add"
          })
        });

        const json = await res.json();
        if (!res.ok) {
          if (res.status !== 409) {
            throw new Error(json.error || "Failed to save student details");
          }
        }

        // Save initial attendance if provided
        const total = parseInt(formData.totalClasses, 10);
        const attended = parseInt(formData.classesAttended, 10);
        if (!isNaN(total) && !isNaN(attended) && total > 0 && attended <= total) {
          try {
            await fetch("/api/attendance", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                student_id: finalId,
                total_classes: total,
                classes_attended: attended
              })
            });
          } catch (attErr) {
            console.warn("Attendance auto-sync note:", attErr);
          }
        }
      }

      const profile: VisitorProfile = {
        id: finalId,
        name: name,
        role: role,
        department: formData.department,
        semester: role === "Student" ? formData.semester : undefined,
        designation: role !== "Student" ? formData.designation : undefined,
        email: email
      };

      if (onRefreshData) onRefreshData();
      onEnter(profile);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while saving details.");
    } finally {
      setSaving(false);
    }
  };

  // Quick Select Existing Student
  const handleSelectExisting = (s: Student) => {
    const profile: VisitorProfile = {
      id: s.StudentID,
      name: s.Name,
      role: "Student",
      department: s.Department,
      semester: s.Semester,
      email: s.Email
    };
    onEnter(profile);
  };

  // Quick Admin Login
  const handleAdminAccess = () => {
    const profile: VisitorProfile = {
      id: "ADMIN-01",
      name: "Prof. Sharma (Campus Admin)",
      role: "Admin",
      department: "Administration & Evaluation",
      designation: "Academic Dean / Project Evaluator",
      email: "admin.evaluator@campus.edu"
    };
    onEnter(profile);
  };

  const filteredStudents = students.filter(s =>
    s.Name.toLowerCase().includes(searchExisting.toLowerCase()) ||
    s.StudentID.toLowerCase().includes(searchExisting.toLowerCase()) ||
    s.Department.toLowerCase().includes(searchExisting.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1a1a1a] flex flex-col justify-between selection:bg-[#1a1a1a] selection:text-white font-sans">
      {/* Editorial Top Header */}
      <header className="border-b-[1.5px] border-[#1a1a1a] bg-[#f8f7f4] sticky top-0 z-30 px-6 sm:px-12 py-5 flex items-center justify-between">
        <div className="w-28 hidden sm:block"></div>

        <div className="flex-1 flex justify-center text-center">
          <div className="font-serif font-display headline-texture text-2xl sm:text-3xl font-bold tracking-tight text-[#1a1a1a] text-center">
            Academic Student Campus
          </div>
        </div>

        <div className="flex items-center gap-4 justify-end">
          <button
            onClick={handleAdminAccess}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono font-bold bg-transparent border-[1.5px] border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-all cursor-pointer shadow-[2px_2px_0px_rgba(26,26,26,1)]"
            title="Quickly enter as Faculty / Academic Evaluator"
          >
            <Shield className="w-3.5 h-3.5 text-[#5e17eb]" />
            <span className="hidden sm:inline">EVALUATOR BYPASS</span>
            <span className="sm:hidden">ADMIN</span>
          </button>
        </div>
      </header>

      {/* Hero Header Block */}
      <div className="border-b border-[#1a1a1a]/10 px-6 sm:px-12 py-10 sm:py-14 max-w-7xl mx-auto w-full flex flex-col items-center text-center">
        <div className="flex flex-col items-center text-center max-w-3xl">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#5e17eb] mb-3 font-bold text-center">
            Academic Risk &amp; Sentiment Intelligence
          </div>
          <h2 className="font-serif font-display headline-texture text-4xl sm:text-6xl lg:text-7xl font-bold leading-[0.92] text-[#1a1a1a] text-center">
            All In One<br />Present Sir.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#1a1a1a]/70 max-w-2xl font-sans leading-relaxed text-center mx-auto">
            Modular academic intelligence system for student risk assessment, attendance thresholds, NLP grievance classification, and automated interventions.
          </p>
        </div>
      </div>

      {/* Main Interactive Form Area */}
      <main className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full flex flex-col items-center">
        {/* Mode Switcher */}
        <div className="flex items-center border-[1.5px] border-[#1a1a1a] bg-white mb-8">
          <button
            onClick={() => setActiveMode("enter-details")}
            className={`flex items-center gap-2 px-6 py-2.5 text-xs font-mono uppercase font-bold tracking-wider transition-all cursor-pointer ${
              activeMode === "enter-details"
                ? "bg-[#1a1a1a] text-white"
                : "bg-white text-[#1a1a1a]/70 hover:text-[#1a1a1a]"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Enter Visitor Details</span>
          </button>
          <button
            onClick={() => setActiveMode("quick-select")}
            className={`flex items-center gap-2 px-6 py-2.5 text-xs font-mono uppercase font-bold tracking-wider transition-all cursor-pointer border-l-[1.5px] border-[#1a1a1a] ${
              activeMode === "quick-select"
                ? "bg-[#1a1a1a] text-white"
                : "bg-white text-[#1a1a1a]/70 hover:text-[#1a1a1a]"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Enrolled Directory ({students.length})</span>
          </button>
        </div>

        {/* Panel 1: Enter Details Form */}
        {activeMode === "enter-details" && (
          <div className="w-full max-w-2xl bg-white border-[1.5px] border-[#1a1a1a] p-6 sm:p-10 shadow-[6px_6px_0px_rgba(26,26,26,0.15)] relative">
            {errorMessage && (
              <div className="mb-6 p-3 bg-[#fff1f2] border border-rose-300 text-rose-800 text-xs flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Role Selector */}
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#1a1a1a] font-bold mb-2">
                  Select Role / Evaluation Mode
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      { id: "Student", label: "Student", desc: "Profile & Attendance" },
                      { id: "Faculty", label: "Faculty", desc: "Evaluation & Grading" },
                      { id: "Visitor", label: "Guest Evaluator", desc: "Inspection Mode" }
                    ] as const
                  ).map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setRole(opt.id);
                        if (opt.id === "Faculty") {
                          setFormData(prev => ({
                            ...prev,
                            customId: "FAC-101",
                            designation: "Professor / Academic Evaluator"
                          }));
                        } else if (opt.id === "Visitor") {
                          setFormData(prev => ({
                            ...prev,
                            customId: "VIS-101",
                            designation: "Institutional Auditor"
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            customId: suggestNextStudentId(),
                            designation: ""
                          }));
                        }
                      }}
                      className={`p-3 text-left transition-all border-[1.5px] cursor-pointer ${
                        role === opt.id
                          ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                          : "bg-[#f8f7f4] border-[#1a1a1a]/20 text-[#1a1a1a]/80 hover:border-[#1a1a1a]"
                      }`}
                    >
                      <div className="font-mono font-bold text-xs uppercase tracking-wide">
                        {opt.label}
                      </div>
                      <div className={`text-[10px] font-sans mt-0.5 truncate ${role === opt.id ? "text-white/70" : "text-[#1a1a1a]/50"}`}>
                        {opt.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-[#1a1a1a] font-bold mb-1">
                    Full Name <span className="text-[#5e17eb]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder={role === "Student" ? "e.g. Aditi Sharma" : "e.g. Dr. A. Sharma"}
                    className="w-full px-3.5 py-2.5 bg-white border-[1.5px] border-[#1a1a1a] focus:border-[#5e17eb] text-[#1a1a1a] text-xs font-sans transition-all outline-none"
                  />
                </div>

                {/* ID Field */}
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-[#1a1a1a] font-bold mb-1">
                    {role === "Student" ? "Student ID" : "Staff / Visitor ID"}
                  </label>
                  <input
                    type="text"
                    value={formData.customId || computedId}
                    onChange={e => setFormData({ ...formData, customId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border-[1.5px] border-[#1a1a1a] focus:border-[#5e17eb] text-[#5e17eb] font-mono text-xs font-bold transition-all outline-none"
                    placeholder="e.g. S106"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-[#1a1a1a] font-bold mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border-[1.5px] border-[#1a1a1a] focus:border-[#5e17eb] text-[#1a1a1a] text-xs font-sans transition-all outline-none cursor-pointer"
                  >
                    <option value="Computer Science & Engineering">Computer Science &amp; Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Artificial Intelligence & Data Science">Artificial Intelligence &amp; Data Science</option>
                    <option value="Electronics & Communication">Electronics &amp; Communication</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                  </select>
                </div>

                {/* Semester or Designation */}
                {role === "Student" ? (
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-[#1a1a1a] font-bold mb-1">
                      Current Semester
                    </label>
                    <select
                      value={formData.semester}
                      onChange={e => setFormData({ ...formData, semester: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border-[1.5px] border-[#1a1a1a] focus:border-[#5e17eb] text-[#1a1a1a] text-xs font-sans transition-all outline-none cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                        <option key={sem} value={String(sem)}>
                          Semester {sem}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-[#1a1a1a] font-bold mb-1">
                      Designation / Role
                    </label>
                    <input
                      type="text"
                      value={formData.designation}
                      onChange={e => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border-[1.5px] border-[#1a1a1a] focus:border-[#5e17eb] text-[#1a1a1a] text-xs font-sans transition-all outline-none"
                      placeholder="e.g. Project Evaluator"
                    />
                  </div>
                )}

                {/* Email Address */}
                <div className="sm:col-span-2">
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-[#1a1a1a] font-bold mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="username@campus.edu"
                    className="w-full px-3.5 py-2.5 bg-white border-[1.5px] border-[#1a1a1a] focus:border-[#5e17eb] text-[#1a1a1a] text-xs font-sans transition-all outline-none"
                  />
                </div>

                {/* Initial Attendance (Student role) */}
                {role === "Student" && (
                  <div className="sm:col-span-2 p-4 bg-[#f8f7f4] border-[1.5px] border-[#1a1a1a]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#1a1a1a]">Initial Attendance Metric</span>
                      <span className="font-serif text-lg font-bold text-[#5e17eb]">
                        {formData.totalClasses && parseInt(formData.totalClasses, 10) > 0
                          ? ((parseInt(formData.classesAttended || "0", 10) / parseInt(formData.totalClasses, 10)) * 100).toFixed(1) + "%"
                          : "0.0%"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-mono text-[10px] uppercase text-[#1a1a1a]/70 font-bold mb-1">Total Classes</label>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={formData.totalClasses}
                          onChange={e => setFormData({ ...formData, totalClasses: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border-[1.5px] border-[#1a1a1a] text-xs font-mono text-[#1a1a1a] outline-none focus:border-[#5e17eb]"
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-[10px] uppercase text-[#1a1a1a]/70 font-bold mb-1">Classes Attended</label>
                        <input
                          type="number"
                          min="0"
                          max={formData.totalClasses || "100"}
                          value={formData.classesAttended}
                          onChange={e => setFormData({ ...formData, classesAttended: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border-[1.5px] border-[#1a1a1a] text-xs font-mono text-[#1a1a1a] outline-none focus:border-[#5e17eb]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 px-6 bg-[#1a1a1a] hover:bg-[#5e17eb] text-white font-mono font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group border-none shadow-[3px_3px_0px_rgba(26,26,26,0.2)] active:translate-y-0.5"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>SAVING DETAILS • INITIALIZING SESSION...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>AUTHENTICATE &amp; ENTER CAMPUS OS</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Panel 2: Quick Select Existing Student */}
        {activeMode === "quick-select" && (
          <div className="w-full max-w-2xl bg-white border-[1.5px] border-[#1a1a1a] p-6 sm:p-10 shadow-[6px_6px_0px_rgba(26,26,26,0.15)]">
            <div className="flex items-center justify-between mb-4 border-b border-[#1a1a1a]/10 pb-3">
              <div>
                <h3 className="font-serif font-display headline-texture text-xl font-bold text-[#1a1a1a]">Enrolled Student Directory</h3>
                <p className="font-sans text-xs text-[#1a1a1a]/60">Select any active record to authenticate session</p>
              </div>
              <span className="font-mono text-xs px-2.5 py-1 bg-[#f8f7f4] border-[1.5px] border-[#1a1a1a] font-bold text-[#1a1a1a]">
                {students.length} ENROLLED
              </span>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by student name, ID (e.g. S101), or department..."
                value={searchExisting}
                onChange={e => setSearchExisting(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border-[1.5px] border-[#1a1a1a] text-xs font-mono text-[#1a1a1a] placeholder-[#1a1a1a]/40 focus:outline-none focus:border-[#5e17eb]"
              />
            </div>

            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-[#1a1a1a]/50">
                  No matching student records found. Switch to "Enter Visitor Details" to create one.
                </div>
              ) : (
                filteredStudents.map((student, idx) => (
                  <div
                    key={student.StudentID}
                    onClick={() => handleSelectExisting(student)}
                    className="p-3 border-b border-[#1a1a1a]/10 hover:border-[#1a1a1a] hover:bg-[#f8f7f4] hover:pl-5 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-[#1a1a1a]/40 w-6">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#1a1a1a] group-hover:text-[#5e17eb] transition-colors font-sans">
                            {student.Name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 border border-[#1a1a1a]/20 text-[#5e17eb] font-bold">
                            {student.StudentID}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#1a1a1a]/60 font-sans">
                          {student.Department} • Sem {student.Semester}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[#1a1a1a] group-hover:text-[#5e17eb] text-xs font-mono">
                      <span className="underline">ENTER</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-[#1a1a1a]/10 flex items-center justify-between text-xs text-[#1a1a1a]/60 font-sans">
              <span>Want to register a new profile instead?</span>
              <button
                type="button"
                onClick={() => setActiveMode("enter-details")}
                className="text-[#5e17eb] hover:underline font-mono text-xs cursor-pointer uppercase font-bold"
              >
                Enter Visitor Details &rarr;
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

