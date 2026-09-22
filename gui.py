"""
gui.py
Tkinter Graphical User Interface for AI-Enabled Smart Campus Monitoring System
Unit 6: Modern ttk.Notebook GUI with 8 Integrated Functional Tabs
"""

import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime
from typing import Optional, List, Dict, Any

from models import (
    CSVStorageHandler, Student, StudentManager,
    AttendanceMonitor, AcademicAnalyzer, FeedbackRecord,
    DuplicateIDError, RecordNotFoundError, ValidationError, CampusSystemError
)
from nlp_engine import FeedbackProcessor
from analytics import StudentRiskEngine, RecommendationEngine, CampusAnalytics


class CampusMonitoringApp:
    """
    Main Tkinter Desktop Application implementing the 8-tab
    AI-Enabled Smart Campus Monitoring & Intelligent Student Support System.
    """

    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("AI-Enabled Smart Campus Monitoring and Intelligent Student Support System")
        self.root.geometry("1180x780")
        self.root.minsize(980, 680)

        # Initialize Backend Services
        self.storage = CSVStorageHandler()
        self.student_mgr = StudentManager(self.storage)
        self.attendance_monitor = AttendanceMonitor(self.storage)
        self.academic_analyzer = AcademicAnalyzer(self.storage)
        self.nlp_processor = FeedbackProcessor()
        self.risk_engine = StudentRiskEngine(self.storage)
        self.rec_engine = RecommendationEngine(self.storage)
        self.analytics = CampusAnalytics(self.storage)

        # Apply Modern Styling
        self.setup_styles()

        # Build Main Header & Notebook
        self.build_header()
        self.build_notebook()

        # Initial Data Refresh
        self.refresh_all_views()

    def setup_styles(self) -> None:
        """Configures ttk styles with clean, professional colors and typography."""
        self.style = ttk.Style()
        try:
            self.style.theme_use("clam")
        except Exception:
            pass

        # Color Palette
        bg_main = "#f8fafc"
        card_bg = "#ffffff"
        primary = "#1e3a8a"      # Navy
        accent = "#2563eb"       # Royal Blue
        text_dark = "#0f172a"

        self.root.configure(bg=bg_main)

        # General ttk widget styling
        self.style.configure("TNotebook", background=bg_main, borderwidth=0)
        self.style.configure("TNotebook.Tab", padding=[14, 8], font=("Segoe UI", 9, "bold"))
        self.style.map("TNotebook.Tab",
                       background=[("selected", primary), ("active", "#3b82f6")],
                       foreground=[("selected", "#ffffff"), ("active", "#ffffff")])

        self.style.configure("TFrame", background=bg_main)
        self.style.configure("Card.TFrame", background=card_bg, relief="flat", borderwidth=1)
        self.style.configure("Header.TLabel", font=("Segoe UI", 13, "bold"), foreground=primary, background=card_bg)
        self.style.configure("SubHeader.TLabel", font=("Segoe UI", 10), foreground="#475569", background=card_bg)
        self.style.configure("Field.TLabel", font=("Segoe UI", 9, "bold"), foreground="#334155", background=card_bg)

        # Button Styling
        self.style.configure("Primary.TButton", font=("Segoe UI", 9, "bold"), background=primary, foreground="#ffffff", padding=6)
        self.style.map("Primary.TButton", background=[("active", accent)])

        self.style.configure("Success.TButton", font=("Segoe UI", 9, "bold"), background="#10b981", foreground="#ffffff", padding=6)
        self.style.map("Success.TButton", background=[("active", "#059669")])

        self.style.configure("Danger.TButton", font=("Segoe UI", 9, "bold"), background="#ef4444", foreground="#ffffff", padding=6)
        self.style.map("Danger.TButton", background=[("active", "#dc2626")])

        self.style.configure("Secondary.TButton", font=("Segoe UI", 9), padding=5)

        # TreeView Styling
        self.style.configure("Treeview",
                             font=("Segoe UI", 9),
                             rowheight=26,
                             background="#ffffff",
                             fieldbackground="#ffffff",
                             foreground=text_dark)
        self.style.configure("Treeview.Heading",
                             font=("Segoe UI", 9, "bold"),
                             background="#e2e8f0",
                             foreground="#1e293b",
                             padding=5)
        self.style.map("Treeview", background=[("selected", "#dbeafe")], foreground=[("selected", "#1e3a8a")])

    def build_header(self) -> None:
        """Top Application Header Bar."""
        header_frame = tk.Frame(self.root, bg="#1e3a8a", height=64)
        header_frame.pack(fill="x", side="top")

        title_lbl = tk.Label(
            header_frame,
            text="AI-Enabled Smart Campus Monitoring and Intelligent Student Support System",
            font=("Segoe UI", 14, "bold"),
            fg="#ffffff",
            bg="#1e3a8a",
            padx=16,
            pady=10
        )
        title_lbl.pack(side="left")

        status_lbl = tk.Label(
            header_frame,
            text="Core Units 1-6 Architecture | CSV Persistence Active",
            font=("Segoe UI", 9),
            fg="#93c5fd",
            bg="#1e3a8a",
            padx=16
        )
        status_lbl.pack(side="right")

    def build_notebook(self) -> None:
        """Builds the 8 required tabs inside a ttk.Notebook."""
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill="both", expand=True, padx=12, pady=10)

        # 8 Tabs as specified in requirements
        self.tab1_students = ttk.Frame(self.notebook)
        self.tab2_attendance = ttk.Frame(self.notebook)
        self.tab3_marks = ttk.Frame(self.notebook)
        self.tab4_feedback = ttk.Frame(self.notebook)
        self.tab5_nlp_tester = ttk.Frame(self.notebook)
        self.tab6_risk = ttk.Frame(self.notebook)
        self.tab7_recommendations = ttk.Frame(self.notebook)
        self.tab8_analytics = ttk.Frame(self.notebook)

        self.notebook.add(self.tab1_students, text="  1. Students  ")
        self.notebook.add(self.tab2_attendance, text="  2. Attendance  ")
        self.notebook.add(self.tab3_marks, text="  3. Academic Marks  ")
        self.notebook.add(self.tab4_feedback, text="  4. Feedback  ")
        self.notebook.add(self.tab5_nlp_tester, text="  5. NLP Analyzer  ")
        self.notebook.add(self.tab6_risk, text="  6. Risk Engine  ")
        self.notebook.add(self.tab7_recommendations, text="  7. Recommendations  ")
        self.notebook.add(self.tab8_analytics, text="  8. Reports & Analytics  ")

        # Initialize UI components for each tab
        self.init_tab1_students()
        self.init_tab2_attendance()
        self.init_tab3_marks()
        self.init_tab4_feedback()
        self.init_tab5_nlp_tester()
        self.init_tab6_risk()
        self.init_tab7_recommendations()
        self.init_tab8_analytics()

    # =================================================================
    # TAB 1: STUDENT INFORMATION MANAGEMENT (CRUD & Search)
    # =================================================================
    def init_tab1_students(self) -> None:
        pane = tk.PanedWindow(self.tab1_students, orient="horizontal", bg="#e2e8f0", sashwidth=4)
        pane.pack(fill="both", expand=True, padx=4, pady=4)

        # Left: Form
        form_frame = ttk.Frame(pane, style="Card.TFrame", padding=14)
        pane.add(form_frame, minsize=320)

        ttk.Label(form_frame, text="Student Demographics", style="Header.TLabel").grid(row=0, column=0, columnspan=2, sticky="w", pady=(0, 10))

        ttk.Label(form_frame, text="Student ID *", style="Field.TLabel").grid(row=1, column=0, sticky="w", pady=4)
        self.t1_id = ttk.Entry(form_frame, font=("Segoe UI", 9))
        self.t1_id.grid(row=1, column=1, sticky="ew", pady=4)

        ttk.Label(form_frame, text="Full Name *", style="Field.TLabel").grid(row=2, column=0, sticky="w", pady=4)
        self.t1_name = ttk.Entry(form_frame, font=("Segoe UI", 9))
        self.t1_name.grid(row=2, column=1, sticky="ew", pady=4)

        ttk.Label(form_frame, text="Department *", style="Field.TLabel").grid(row=3, column=0, sticky="w", pady=4)
        self.t1_dept = ttk.Combobox(form_frame, values=[
            "Computer Science", "Information Technology", "Mechanical Engineering",
            "Electronics & Comm", "Civil Engineering", "Electrical Engineering"
        ], font=("Segoe UI", 9))
        self.t1_dept.grid(row=3, column=1, sticky="ew", pady=4)

        ttk.Label(form_frame, text="Semester (1-12) *", style="Field.TLabel").grid(row=4, column=0, sticky="w", pady=4)
        self.t1_sem = ttk.Spinbox(form_frame, from_=1, to=12, font=("Segoe UI", 9))
        self.t1_sem.grid(row=4, column=1, sticky="ew", pady=4)

        ttk.Label(form_frame, text="Institutional Email *", style="Field.TLabel").grid(row=5, column=0, sticky="w", pady=4)
        self.t1_email = ttk.Entry(form_frame, font=("Segoe UI", 9))
        self.t1_email.grid(row=5, column=1, sticky="ew", pady=4)

        form_frame.columnconfigure(1, weight=1)

        # Buttons
        btn_box = ttk.Frame(form_frame, style="Card.TFrame")
        btn_box.grid(row=6, column=0, columnspan=2, pady=16, sticky="ew")

        ttk.Button(btn_box, text="Add Student", style="Primary.TButton", command=self.handle_add_student).pack(side="left", padx=2, fill="x", expand=True)
        ttk.Button(btn_box, text="Update Details", style="Secondary.TButton", command=self.handle_update_student).pack(side="left", padx=2, fill="x", expand=True)
        ttk.Button(btn_box, text="Delete", style="Danger.TButton", command=self.handle_delete_student).pack(side="left", padx=2, fill="x", expand=True)
        ttk.Button(btn_box, text="Clear", style="Secondary.TButton", command=self.clear_student_form).pack(side="left", padx=2)

        # Right: Search & TreeView Table
        table_frame = ttk.Frame(pane, style="Card.TFrame", padding=10)
        pane.add(table_frame, minsize=550)

        search_bar = ttk.Frame(table_frame, style="Card.TFrame")
        search_bar.pack(fill="x", pady=(0, 8))

        ttk.Label(search_bar, text="Search (ID / Name):", font=("Segoe UI", 9, "bold")).pack(side="left", padx=(0, 6))
        self.t1_search = ttk.Entry(search_bar, font=("Segoe UI", 9))
        self.t1_search.pack(side="left", fill="x", expand=True, padx=4)
        ttk.Button(search_bar, text="Search", style="Secondary.TButton", command=self.handle_search_students).pack(side="left", padx=2)
        ttk.Button(search_bar, text="Reset", style="Secondary.TButton", command=self.refresh_students_tree).pack(side="left", padx=2)

        # Student TreeView
        cols = ("StudentID", "Name", "Department", "Semester", "Email")
        self.t1_tree = ttk.Treeview(table_frame, columns=cols, show="headings", selectmode="browse")
        for col in cols:
            self.t1_tree.heading(col, text=col)
            self.t1_tree.column(col, width=110, anchor="center" if col in ("StudentID", "Semester") else "w")
        self.t1_tree.column("Name", width=140)
        self.t1_tree.column("Email", width=160)

        t1_scroll = ttk.Scrollbar(table_frame, orient="vertical", command=self.t1_tree.yview)
        self.t1_tree.configure(yscrollcommand=t1_scroll.set)
        self.t1_tree.pack(side="left", fill="both", expand=True)
        t1_scroll.pack(side="right", fill="y")

        self.t1_tree.bind("<<TreeviewSelect>>", self.on_student_select)

    def handle_add_student(self) -> None:
        try:
            student = Student(
                student_id=self.t1_id.get(),
                name=self.t1_name.get(),
                department=self.t1_dept.get(),
                semester=int(self.t1_sem.get() or 0),
                email=self.t1_email.get()
            )
            self.student_mgr.add_student(student)
            messagebox.showinfo("Success", f"Student '{student.name}' ({student.student_id}) added successfully.")
            self.refresh_students_tree()
            self.clear_student_form()
            self.update_student_dropdowns()
        except DuplicateIDError as e:
            messagebox.showerror("Duplicate Student ID", str(e))
        except (ValidationError, ValueError) as e:
            messagebox.showwarning("Validation Error", str(e))
        except Exception as e:
            messagebox.showerror("System Error", str(e))

    def handle_update_student(self) -> None:
        try:
            student = Student(
                student_id=self.t1_id.get(),
                name=self.t1_name.get(),
                department=self.t1_dept.get(),
                semester=int(self.t1_sem.get() or 0),
                email=self.t1_email.get()
            )
            self.student_mgr.update_student(student)
            messagebox.showinfo("Updated", f"Student '{student.student_id}' details updated successfully.")
            self.refresh_students_tree()
        except RecordNotFoundError as e:
            messagebox.showerror("Not Found", str(e))
        except (ValidationError, ValueError) as e:
            messagebox.showwarning("Validation Error", str(e))
        except Exception as e:
            messagebox.showerror("System Error", str(e))

    def handle_delete_student(self) -> None:
        sid = self.t1_id.get().strip()
        if not sid:
            messagebox.showwarning("Warning", "Please select a student to delete.")
            return
        if messagebox.askyesno("Confirm Delete", f"Are you sure you want to delete student record '{sid}'?"):
            try:
                self.student_mgr.delete_student(sid)
                messagebox.showinfo("Deleted", f"Student '{sid}' deleted.")
                self.refresh_students_tree()
                self.clear_student_form()
                self.update_student_dropdowns()
            except RecordNotFoundError as e:
                messagebox.showerror("Error", str(e))

    def clear_student_form(self) -> None:
        self.t1_id.delete(0, tk.END)
        self.t1_name.delete(0, tk.END)
        self.t1_dept.set("")
        self.t1_sem.delete(0, tk.END)
        self.t1_sem.insert(0, "1")
        self.t1_email.delete(0, tk.END)

    def on_student_select(self, event) -> None:
        selected = self.t1_tree.selection()
        if not selected:
            return
        item = self.t1_tree.item(selected[0])
        vals = item["values"]
        if vals:
            self.clear_student_form()
            self.t1_id.insert(0, str(vals[0]))
            self.t1_name.insert(0, str(vals[1]))
            self.t1_dept.set(str(vals[2]))
            self.t1_sem.delete(0, tk.END)
            self.t1_sem.insert(0, str(vals[3]))
            self.t1_email.insert(0, str(vals[4]))

    def refresh_students_tree(self) -> None:
        for row in self.t1_tree.get_children():
            self.t1_tree.delete(row)
        students = self.student_mgr.get_all_students()
        for s in students:
            self.t1_tree.insert("", "end", values=(s.student_id, s.name, s.department, s.semester, s.email))

    def handle_search_students(self) -> None:
        q = self.t1_search.get()
        results = self.student_mgr.search_students(q)
        for row in self.t1_tree.get_children():
            self.t1_tree.delete(row)
        for s in results:
            self.t1_tree.insert("", "end", values=(s.student_id, s.name, s.department, s.semester, s.email))

    # =================================================================
    # TAB 2: ATTENDANCE RECORDS (Logging & Low Attendance Alerts)
    # =================================================================
    def init_tab2_attendance(self) -> None:
        top_frame = ttk.Frame(self.tab2_attendance, style="Card.TFrame", padding=12)
        top_frame.pack(fill="x", padx=6, pady=6)

        ttk.Label(top_frame, text="Attendance Monitor & Entry", style="Header.TLabel").grid(row=0, column=0, columnspan=6, sticky="w", pady=(0, 8))

        ttk.Label(top_frame, text="Student ID *", style="Field.TLabel").grid(row=1, column=0, sticky="w", padx=4)
        self.t2_student_cb = ttk.Combobox(top_frame, font=("Segoe UI", 9), width=18)
        self.t2_student_cb.grid(row=1, column=1, sticky="w", padx=4)

        ttk.Label(top_frame, text="Total Classes *", style="Field.TLabel").grid(row=1, column=2, sticky="w", padx=4)
        self.t2_total = ttk.Entry(top_frame, font=("Segoe UI", 9), width=12)
        self.t2_total.grid(row=1, column=3, sticky="w", padx=4)

        ttk.Label(top_frame, text="Classes Attended *", style="Field.TLabel").grid(row=1, column=4, sticky="w", padx=4)
        self.t2_attended = ttk.Entry(top_frame, font=("Segoe UI", 9), width=12)
        self.t2_attended.grid(row=1, column=5, sticky="w", padx=4)

        ttk.Button(top_frame, text="Record Attendance", style="Primary.TButton", command=self.handle_record_attendance).grid(row=1, column=6, padx=8)

        # Split pane for All Attendance vs Low Attendance Alerts
        split_frame = ttk.Frame(self.tab2_attendance)
        split_frame.pack(fill="both", expand=True, padx=6, pady=4)

        # Left: All Records
        left_box = ttk.Frame(split_frame, style="Card.TFrame", padding=10)
        left_box.pack(side="left", fill="both", expand=True, padx=(0, 4))
        ttk.Label(left_box, text="All Student Attendance Logs", style="Header.TLabel").pack(anchor="w", pady=(0, 6))

        cols = ("RecordID", "StudentID", "Total", "Attended", "Percentage", "Status")
        self.t2_all_tree = ttk.Treeview(left_box, columns=cols, show="headings")
        for c in cols:
            self.t2_all_tree.heading(c, text=c)
            self.t2_all_tree.column(c, width=75, anchor="center")
        self.t2_all_tree.column("Status", width=110)

        # Tag for low attendance alert
        self.t2_all_tree.tag_configure("low_att", background="#fee2e2", foreground="#b91c1c")
        self.t2_all_tree.tag_configure("good_att", background="#f0fdf4", foreground="#15803d")
        self.t2_all_tree.pack(fill="both", expand=True)

        # Right: Low Attendance Alert Table
        right_box = ttk.Frame(split_frame, style="Card.TFrame", padding=10)
        right_box.pack(side="right", fill="both", expand=True, padx=(4, 0))
        ttk.Label(right_box, text="Low Attendance Alerts (< 75% Threshold)", font=("Segoe UI", 11, "bold"), foreground="#dc2626").pack(anchor="w", pady=(0, 6))

        alert_cols = ("StudentID", "Attended", "Total", "Percentage", "AlertFlag")
        self.t2_alert_tree = ttk.Treeview(right_box, columns=alert_cols, show="headings")
        for c in alert_cols:
            self.t2_alert_tree.heading(c, text=c)
            self.t2_alert_tree.column(c, width=80, anchor="center")
        self.t2_alert_tree.column("AlertFlag", width=140)
        self.t2_alert_tree.tag_configure("alert", background="#fef2f2", foreground="#991b1b")
        self.t2_alert_tree.pack(fill="both", expand=True)

    def handle_record_attendance(self) -> None:
        sid = self.t2_student_cb.get().strip()
        total_str = self.t2_total.get().strip()
        att_str = self.t2_attended.get().strip()

        try:
            if not sid:
                raise ValidationError("Please select or enter a Student ID.")
            total = int(total_str)
            attended = int(att_str)
            rec = self.attendance_monitor.record_attendance(sid, total, attended)
            status_msg = f"Attendance logged for {sid}: {rec.percentage:.1f}%"
            if rec.is_low_attendance:
                status_msg += " (Low Attendance Flagged!)"
            messagebox.showinfo("Attendance Saved", status_msg)
            self.refresh_attendance_views()
        except ValueError:
            messagebox.showwarning("Input Error", "Total and Attended classes must be valid positive integers.")
        except ValidationError as e:
            messagebox.showwarning("Validation Error", str(e))
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def refresh_attendance_views(self) -> None:
        for r in self.t2_all_tree.get_children():
            self.t2_all_tree.delete(r)
        for r in self.t2_alert_tree.get_children():
            self.t2_alert_tree.delete(r)

        records = self.attendance_monitor.get_all_records()
        for r in records:
            status = "Flagged (<75%)" if r.is_low_attendance else "Satisfactory"
            tag = "low_att" if r.is_low_attendance else "good_att"
            self.t2_all_tree.insert("", "end", values=(
                r.record_id, r.student_id, r.total_classes, r.classes_attended, f"{r.percentage:.2f}%", status
            ), tags=(tag,))

            if r.is_low_attendance:
                self.t2_alert_tree.insert("", "end", values=(
                    r.student_id, r.classes_attended, r.total_classes, f"{r.percentage:.2f}%", "CRITICAL DEFICIT"
                ), tags=("alert",))

    # =================================================================
    # TAB 3: ACADEMIC MARKS & WEAK SUBJECT HIGHLIGHTER
    # =================================================================
    def init_tab3_marks(self) -> None:
        form_frame = ttk.Frame(self.tab3_marks, style="Card.TFrame", padding=12)
        form_frame.pack(fill="x", padx=6, pady=6)

        ttk.Label(form_frame, text="Academic Evaluation Entry", style="Header.TLabel").grid(row=0, column=0, columnspan=7, sticky="w", pady=(0, 8))

        ttk.Label(form_frame, text="Student ID *", style="Field.TLabel").grid(row=1, column=0, padx=4)
        self.t3_student_cb = ttk.Combobox(form_frame, font=("Segoe UI", 9), width=16)
        self.t3_student_cb.grid(row=1, column=1, padx=4)

        ttk.Label(form_frame, text="Subject *", style="Field.TLabel").grid(row=1, column=2, padx=4)
        self.t3_subj = ttk.Entry(form_frame, font=("Segoe UI", 9), width=18)
        self.t3_subj.grid(row=1, column=3, padx=4)

        ttk.Label(form_frame, text="Internal (0-50) *", style="Field.TLabel").grid(row=1, column=4, padx=4)
        self.t3_internal = ttk.Entry(form_frame, font=("Segoe UI", 9), width=10)
        self.t3_internal.grid(row=1, column=5, padx=4)

        ttk.Label(form_frame, text="Exam (0-50) *", style="Field.TLabel").grid(row=1, column=6, padx=4)
        self.t3_exam = ttk.Entry(form_frame, font=("Segoe UI", 9), width=10)
        self.t3_exam.grid(row=1, column=7, padx=4)

        ttk.Button(form_frame, text="Add Subject Marks", style="Primary.TButton", command=self.handle_add_marks).grid(row=1, column=8, padx=8)

        # Marks Table with Weak Subject Highlighter
        table_frame = ttk.Frame(self.tab3_marks, style="Card.TFrame", padding=10)
        table_frame.pack(fill="both", expand=True, padx=6, pady=4)

        top_bar = ttk.Frame(table_frame, style="Card.TFrame")
        top_bar.pack(fill="x", pady=(0, 6))
        ttk.Label(top_bar, text="Subject Marks Records & Weak Subject Highlighter", style="Header.TLabel").pack(side="left")
        ttk.Label(top_bar, text="Red = Failing (< 40%) | Orange = Weak (< 55%) | Green = Good (>= 55%)", font=("Segoe UI", 9, "italic"), foreground="#475569").pack(side="right")

        cols = ("RecordID", "StudentID", "Subject", "Internal", "Exam", "TotalMarks", "Status")
        self.t3_tree = ttk.Treeview(table_frame, columns=cols, show="headings")
        for c in cols:
            self.t3_tree.heading(c, text=c)
            self.t3_tree.column(c, width=90, anchor="center" if c not in ("Subject",) else "w")
        self.t3_tree.column("Subject", width=180)

        # Highlight tags
        self.t3_tree.tag_configure("fail", background="#fee2e2", foreground="#991b1b")
        self.t3_tree.tag_configure("weak", background="#fef3c7", foreground="#92400e")
        self.t3_tree.tag_configure("pass", background="#f0fdf4", foreground="#166534")

        t3_scroll = ttk.Scrollbar(table_frame, orient="vertical", command=self.t3_tree.yview)
        self.t3_tree.configure(yscrollcommand=t3_scroll.set)
        self.t3_tree.pack(side="left", fill="both", expand=True)
        t3_scroll.pack(side="right", fill="y")

    def handle_add_marks(self) -> None:
        sid = self.t3_student_cb.get().strip()
        subj = self.t3_subj.get().strip()
        int_str = self.t3_internal.get().strip()
        exam_str = self.t3_exam.get().strip()

        try:
            if not sid or not subj:
                raise ValidationError("Student ID and Subject Name cannot be empty.")
            im = float(int_str)
            em = float(exam_str)
            rec = self.academic_analyzer.add_marks_record(sid, subj, im, em)
            msg = f"Logged {subj} for {sid}: Total {rec.total_marks}/100"
            if rec.is_failing:
                msg += " (FAIL - Below 40%)"
            messagebox.showinfo("Marks Logged", msg)
            self.refresh_marks_view()
            self.t3_subj.delete(0, tk.END)
            self.t3_internal.delete(0, tk.END)
            self.t3_exam.delete(0, tk.END)
        except DuplicateIDError as e:
            messagebox.showerror("Duplicate Subject", str(e))
        except (ValidationError, ValueError) as e:
            messagebox.showwarning("Validation Error", str(e))
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def refresh_marks_view(self) -> None:
        for r in self.t3_tree.get_children():
            self.t3_tree.delete(r)

        records = self.academic_analyzer.get_all_records()
        for r in records:
            if r.is_failing:
                status = "FAIL (< 40%)"
                tag = "fail"
            elif r.is_weak:
                status = "WEAK (< 55%)"
                tag = "weak"
            else:
                status = "PASS"
                tag = "pass"

            self.t3_tree.insert("", "end", values=(
                r.record_id, r.student_id, r.subject, f"{r.internal_marks:.1f}", f"{r.exam_marks:.1f}", f"{r.total_marks:.1f}", status
            ), tags=(tag,))

    # =================================================================
    # TAB 4: FEEDBACK & GRIEVANCE (Submission & Real-Time NLP Tagging)
    # =================================================================
    def init_tab4_feedback(self) -> None:
        form_frame = ttk.Frame(self.tab4_feedback, style="Card.TFrame", padding=12)
        form_frame.pack(fill="x", padx=6, pady=6)

        ttk.Label(form_frame, text="Student Feedback & Grievance Lodgement", style="Header.TLabel").pack(anchor="w", pady=(0, 6))

        top_row = ttk.Frame(form_frame, style="Card.TFrame")
        top_row.pack(fill="x", pady=4)
        ttk.Label(top_row, text="Student ID *", style="Field.TLabel").pack(side="left", padx=(0, 8))
        self.t4_student_cb = ttk.Combobox(top_row, font=("Segoe UI", 9), width=18)
        self.t4_student_cb.pack(side="left")

        ttk.Label(form_frame, text="Feedback / Grievance Description *", style="Field.TLabel").pack(anchor="w", pady=(6, 2))
        self.t4_text = tk.Text(form_frame, height=3, font=("Segoe UI", 9), wrap="word")
        self.t4_text.pack(fill="x", pady=(0, 6))

        btn_row = ttk.Frame(form_frame, style="Card.TFrame")
        btn_row.pack(fill="x")
        ttk.Button(btn_row, text="Submit & Auto-Analyze with NLP", style="Primary.TButton", command=self.handle_submit_feedback).pack(side="left")
        ttk.Button(btn_row, text="Clear Text", style="Secondary.TButton", command=lambda: self.t4_text.delete("1.0", tk.END)).pack(side="left", padx=6)

        # Table of Feedback
        table_frame = ttk.Frame(self.tab4_feedback, style="Card.TFrame", padding=10)
        table_frame.pack(fill="both", expand=True, padx=6, pady=4)
        ttk.Label(table_frame, text="Feedback Submission History & NLP Classifications", style="Header.TLabel").pack(anchor="w", pady=(0, 6))

        cols = ("FeedbackID", "StudentID", "Timestamp", "Category", "Sentiment", "ExtractedKeywords", "FeedbackText")
        self.t4_tree = ttk.Treeview(table_frame, columns=cols, show="headings")
        for c in cols:
            self.t4_tree.heading(c, text=c)
            self.t4_tree.column(c, width=100, anchor="center" if c not in ("ExtractedKeywords", "FeedbackText") else "w")
        self.t4_tree.column("FeedbackText", width=320)
        self.t4_tree.column("ExtractedKeywords", width=140)

        self.t4_tree.tag_configure("Negative", background="#fee2e2", foreground="#991b1b")
        self.t4_tree.tag_configure("Positive", background="#f0fdf4", foreground="#166534")
        self.t4_tree.tag_configure("Neutral", background="#f1f5f9", foreground="#334155")

        t4_scroll = ttk.Scrollbar(table_frame, orient="vertical", command=self.t4_tree.yview)
        self.t4_tree.configure(yscrollcommand=t4_scroll.set)
        self.t4_tree.pack(side="left", fill="both", expand=True)
        t4_scroll.pack(side="right", fill="y")

    def handle_submit_feedback(self) -> None:
        sid = self.t4_student_cb.get().strip()
        text = self.t4_text.get("1.0", tk.END).strip()

        if not sid or not text:
            messagebox.showwarning("Validation Error", "Please specify Student ID and feedback text.")
            return

        try:
            # Run NLP Analysis Pipeline
            nlp_res = self.nlp_processor.analyze_feedback(text)
            all_fb = self.storage.read_csv("feedback.csv")
            fid = f"FB{len(all_fb) + 301}"
            ts = datetime.now().strftime("%Y-%m-%d %H:%M")

            record = FeedbackRecord(
                feedback_id=fid,
                student_id=sid,
                timestamp=ts,
                feedback_text=text,
                sentiment=nlp_res["sentiment"],
                category=nlp_res["category"],
                extracted_keywords=nlp_res["extracted_keywords"]
            )
            self.storage.append_csv("feedback.csv", record.to_dict())

            messagebox.showinfo(
                "NLP Classification Result",
                f"Feedback recorded!\n"
                f"- Category: {nlp_res['category']}\n"
                f"- Sentiment: {nlp_res['sentiment']} (Polarity: {nlp_res['polarity_score']})\n"
                f"- Keywords: {nlp_res['extracted_keywords']}"
            )
            self.t4_text.delete("1.0", tk.END)
            self.refresh_feedback_view()
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def refresh_feedback_view(self) -> None:
        for r in self.t4_tree.get_children():
            self.t4_tree.delete(r)
        rows = self.storage.read_csv("feedback.csv")
        for r in rows:
            sent = r.get("Sentiment", "Neutral")
            self.t4_tree.insert("", "end", values=(
                r.get("FeedbackID"), r.get("StudentID"), r.get("Timestamp"),
                r.get("Category"), sent, r.get("ExtractedKeywords"), r.get("FeedbackText")
            ), tags=(sent,))

    # =================================================================
    # TAB 5: NLP ANALYSIS VIEW (Interactive Live Text Tester)
    # =================================================================
    def init_tab5_nlp_tester(self) -> None:
        box = ttk.Frame(self.tab5_nlp_tester, style="Card.TFrame", padding=16)
        box.pack(fill="both", expand=True, padx=8, pady=8)

        ttk.Label(box, text="Live NLP Feedback & Sentiment Engine Tester", style="Header.TLabel").pack(anchor="w", pady=(0, 4))
        ttk.Label(box, text="Test real-time tokenization, polarity scoring, category matching, and critical keyword extraction.", style="SubHeader.TLabel").pack(anchor="w", pady=(0, 10))

        ttk.Label(box, text="Enter Raw Student Feedback / Grievance Text:", style="Field.TLabel").pack(anchor="w")
        self.t5_input = tk.Text(box, height=4, font=("Segoe UI", 10), wrap="word")
        self.t5_input.pack(fill="x", pady=(4, 10))
        self.t5_input.insert("1.0", "The library wifi is very slow and computers in the lab are broken and unhelpful.")

        btn_row = ttk.Frame(box, style="Card.TFrame")
        btn_row.pack(fill="x", pady=(0, 12))
        ttk.Button(btn_row, text="Execute NLP Pipeline", style="Primary.TButton", command=self.handle_live_nlp_test).pack(side="left")
        ttk.Button(btn_row, text="Sample: Positive Academic", style="Secondary.TButton", command=lambda: self.set_nlp_sample(1)).pack(side="left", padx=4)
        ttk.Button(btn_row, text="Sample: Critical Grievance", style="Secondary.TButton", command=lambda: self.set_nlp_sample(2)).pack(side="left", padx=4)

        # Output Cards Grid
        grid_frame = ttk.Frame(box, style="Card.TFrame")
        grid_frame.pack(fill="both", expand=True)
        grid_frame.columnconfigure(0, weight=1)
        grid_frame.columnconfigure(1, weight=1)

        # Card 1: Sentiment & Polarity
        c1 = tk.LabelFrame(grid_frame, text="Sentiment Classification", font=("Segoe UI", 10, "bold"), bg="#ffffff", fg="#1e3a8a", padx=12, pady=10)
        c1.grid(row=0, column=0, sticky="nsew", padx=6, pady=6)
        self.t5_sentiment_badge = tk.Label(c1, text="Sentiment: --", font=("Segoe UI", 13, "bold"), bg="#ffffff", fg="#475569")
        self.t5_sentiment_badge.pack(anchor="w", pady=4)
        self.t5_polarity_lbl = tk.Label(c1, text="Polarity Score: 0.00 (-1.0 to +1.0)", font=("Segoe UI", 10), bg="#ffffff", fg="#334155")
        self.t5_polarity_lbl.pack(anchor="w", pady=2)

        # Card 2: Category Detection
        c2 = tk.LabelFrame(grid_frame, text="Domain Category", font=("Segoe UI", 10, "bold"), bg="#ffffff", fg="#1e3a8a", padx=12, pady=10)
        c2.grid(row=0, column=1, sticky="nsew", padx=6, pady=6)
        self.t5_cat_lbl = tk.Label(c2, text="Category: --", font=("Segoe UI", 13, "bold"), bg="#ffffff", fg="#2563eb")
        self.t5_cat_lbl.pack(anchor="w", pady=4)
        self.t5_cat_rule_lbl = tk.Label(c2, text="Classification: Rule-Based Keyword Match", font=("Segoe UI", 9), bg="#ffffff", fg="#64748b")
        self.t5_cat_rule_lbl.pack(anchor="w", pady=2)

        # Card 3: Extracted Keywords
        c3 = tk.LabelFrame(grid_frame, text="Top Extracted Concern Keywords", font=("Segoe UI", 10, "bold"), bg="#ffffff", fg="#1e3a8a", padx=12, pady=10)
        c3.grid(row=1, column=0, sticky="nsew", padx=6, pady=6)
        self.t5_keywords_lbl = tk.Label(c3, text="Keywords: --", font=("Segoe UI", 11, "bold"), bg="#ffffff", fg="#b91c1c")
        self.t5_keywords_lbl.pack(anchor="w", pady=4)

        # Card 4: Tokens & Cleaned
        c4 = tk.LabelFrame(grid_frame, text="Tokenization & Preprocessing Preview", font=("Segoe UI", 10, "bold"), bg="#ffffff", fg="#1e3a8a", padx=12, pady=10)
        c4.grid(row=1, column=1, sticky="nsew", padx=6, pady=6)
        self.t5_tokens_lbl = tk.Label(c4, text="Total Tokens: 0 | Stopwords Filtered", font=("Segoe UI", 9), bg="#ffffff", fg="#334155")
        self.t5_tokens_lbl.pack(anchor="w", pady=2)
        self.t5_tokens_preview = tk.Label(c4, text="Tokens: []", font=("Segoe UI", 9, "italic"), bg="#ffffff", fg="#64748b", wraplength=420, justify="left")
        self.t5_tokens_preview.pack(anchor="w", pady=2)

    def set_nlp_sample(self, sample_id: int) -> None:
        self.t5_input.delete("1.0", tk.END)
        if sample_id == 1:
            self.t5_input.insert("1.0", "The professor explained data structures algorithms with exceptional clarity and inspiring lectures.")
        else:
            self.t5_input.insert("1.0", "Canteen food is completely unhygienic and washrooms on the 2nd floor are broken and dirty.")
        self.handle_live_nlp_test()

    def handle_live_nlp_test(self) -> None:
        raw_text = self.t5_input.get("1.0", tk.END).strip()
        if not raw_text:
            return

        res = self.nlp_processor.analyze_feedback(raw_text)

        # Update Sentiment Badge
        sent = res["sentiment"]
        pol = res["polarity_score"]
        if sent == "Positive":
            color = "#15803d"
        elif sent == "Negative":
            color = "#b91c1c"
        else:
            color = "#475569"

        self.t5_sentiment_badge.config(text=f"Sentiment: {sent}", fg=color)
        self.t5_polarity_lbl.config(text=f"Polarity Score: {pol:+.3f} (Range: -1.00 to +1.00)")
        self.t5_cat_lbl.config(text=f"Category: {res['category']}")
        self.t5_keywords_lbl.config(text=f"Keywords: {res['extracted_keywords']}")
        self.t5_tokens_lbl.config(text=f"Total Word Tokens: {res['token_count']}")
        self.t5_tokens_preview.config(text=f"Filtered Content Tokens: {res['content_tokens'][:12]}")

    # =================================================================
    # TAB 6: STUDENT RISK ANALYSIS (Multi-Factor Scoring & Badges)
    # =================================================================
    def init_tab6_risk(self) -> None:
        top_bar = ttk.Frame(self.tab6_risk, style="Card.TFrame", padding=12)
        top_bar.pack(fill="x", padx=6, pady=6)

        ttk.Label(top_bar, text="AI Multi-Factor Risk Assessment Engine", style="Header.TLabel").pack(side="left")
        ttk.Button(top_bar, text="Evaluate & Recompute All Students Risk", style="Primary.TButton", command=self.handle_compute_all_risks).pack(side="right", padx=4)

        # Legend Box
        legend = ttk.Frame(top_bar, style="Card.TFrame")
        legend.pack(side="right", padx=16)
        tk.Label(legend, text="Low (<30)", bg="#dcfce7", fg="#15803d", font=("Segoe UI", 8, "bold"), padx=6, pady=2).pack(side="left", padx=2)
        tk.Label(legend, text="Moderate (30-59)", bg="#fef3c7", fg="#b45309", font=("Segoe UI", 8, "bold"), padx=6, pady=2).pack(side="left", padx=2)
        tk.Label(legend, text="High (60-79)", bg="#ffedd5", fg="#c2410c", font=("Segoe UI", 8, "bold"), padx=6, pady=2).pack(side="left", padx=2)
        tk.Label(legend, text="Support Required (>=80)", bg="#fee2e2", fg="#b91c1c", font=("Segoe UI", 8, "bold"), padx=6, pady=2).pack(side="left", padx=2)

        # Risk Table
        table_frame = ttk.Frame(self.tab6_risk, style="Card.TFrame", padding=10)
        table_frame.pack(fill="both", expand=True, padx=6, pady=4)

        cols = ("AnalysisID", "StudentID", "CalculatedScore", "RiskLevel", "AttendanceFactor", "AcademicFactor", "SentimentFactor", "EvaluatedOn")
        self.t6_tree = ttk.Treeview(table_frame, columns=cols, show="headings")
        for c in cols:
            self.t6_tree.heading(c, text=c)
            self.t6_tree.column(c, width=100, anchor="center")
        self.t6_tree.column("RiskLevel", width=140)
        self.t6_tree.column("EvaluatedOn", width=130)

        # Tag colors for Risk Level badges
        self.t6_tree.tag_configure("low", background="#f0fdf4", foreground="#166534")
        self.t6_tree.tag_configure("mod", background="#fefce8", foreground="#854d0e")
        self.t6_tree.tag_configure("high", background="#fff7ed", foreground="#9a3412")
        self.t6_tree.tag_configure("critical", background="#fef2f2", foreground="#991b1b")

        t6_scroll = ttk.Scrollbar(table_frame, orient="vertical", command=self.t6_tree.yview)
        self.t6_tree.configure(yscrollcommand=t6_scroll.set)
        self.t6_tree.pack(side="left", fill="both", expand=True)
        t6_scroll.pack(side="right", fill="y")

    def handle_compute_all_risks(self) -> None:
        try:
            records = self.risk_engine.evaluate_and_persist_all()
            self.rec_engine.refresh_all_recommendations()
            messagebox.showinfo("Risk Engine", f"Evaluated and updated risk profiles for {len(records)} students.")
            self.refresh_risk_view()
            self.refresh_recommendations_view()
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def refresh_risk_view(self) -> None:
        for r in self.t6_tree.get_children():
            self.t6_tree.delete(r)

        evals = self.risk_engine.get_persisted_evaluations()
        for r in evals:
            detailed = self.risk_engine.evaluate_student_risk(r.student_id)
            lvl = r.risk_level
            if lvl == "Low Risk":
                tag = "low"
            elif lvl == "Moderate Risk":
                tag = "mod"
            elif lvl == "High Risk":
                tag = "high"
            else:
                tag = "critical"

            self.t6_tree.insert("", "end", values=(
                r.analysis_id, r.student_id, f"{r.calculated_score:.1f} / 100",
                r.risk_level,
                f"{detailed['AttendancePenalty']} pts ({detailed['AttendancePercentage']}%)",
                f"{detailed['AcademicPenalty']} pts (avg {detailed['AverageMarks']})",
                f"{detailed['SentimentPenalty']} pts",
                r.date_evaluated
            ), tags=(tag,))

    # =================================================================
    # TAB 7: INTELLIGENT RECOMMENDATIONS (Actionable Interventions)
    # =================================================================
    def init_tab7_recommendations(self) -> None:
        top_bar = ttk.Frame(self.tab7_recommendations, style="Card.TFrame", padding=12)
        top_bar.pack(fill="x", padx=6, pady=6)

        ttk.Label(top_bar, text="Automated Institutional Action & Support Workflow", style="Header.TLabel").pack(side="left")
        ttk.Button(top_bar, text="Regenerate Recommendations", style="Primary.TButton", command=self.handle_refresh_recs).pack(side="right", padx=4)

        action_bar = ttk.Frame(self.tab7_recommendations, style="Card.TFrame", padding=8)
        action_bar.pack(fill="x", padx=6, pady=(0, 6))

        ttk.Label(action_bar, text="Selected Task Action:", font=("Segoe UI", 9, "bold")).pack(side="left", padx=4)
        ttk.Button(action_bar, text="Set 'In Progress'", style="Secondary.TButton", command=lambda: self.update_rec_status("In Progress")).pack(side="left", padx=4)
        ttk.Button(action_bar, text="Set 'Completed / Resolved'", style="Success.TButton", command=lambda: self.update_rec_status("Completed")).pack(side="left", padx=4)

        # Recommendations Tree
        table_frame = ttk.Frame(self.tab7_recommendations, style="Card.TFrame", padding=10)
        table_frame.pack(fill="both", expand=True, padx=6, pady=4)

        cols = ("RecID", "StudentID", "RiskLevel", "RecommendedAction", "Status")
        self.t7_tree = ttk.Treeview(table_frame, columns=cols, show="headings")
        for c in cols:
            self.t7_tree.heading(c, text=c)
            self.t7_tree.column(c, width=100, anchor="center" if c not in ("RecommendedAction",) else "w")
        self.t7_tree.column("RecommendedAction", width=420)
        self.t7_tree.column("RiskLevel", width=130)

        self.t7_tree.tag_configure("Pending", background="#fff7ed", foreground="#c2410c")
        self.t7_tree.tag_configure("In Progress", background="#eff6ff", foreground="#1d4ed8")
        self.t7_tree.tag_configure("Completed", background="#f0fdf4", foreground="#15803d")

        t7_scroll = ttk.Scrollbar(table_frame, orient="vertical", command=self.t7_tree.yview)
        self.t7_tree.configure(yscrollcommand=t7_scroll.set)
        self.t7_tree.pack(side="left", fill="both", expand=True)
        t7_scroll.pack(side="right", fill="y")

    def handle_refresh_recs(self) -> None:
        try:
            recs = self.rec_engine.refresh_all_recommendations()
            messagebox.showinfo("Success", f"Generated {len(recs)} automated recommendations.")
            self.refresh_recommendations_view()
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def update_rec_status(self, new_status: str) -> None:
        selected = self.t7_tree.selection()
        if not selected:
            messagebox.showwarning("Select Row", "Please select a recommendation task to update.")
            return
        item = self.t7_tree.item(selected[0])
        rec_id = str(item["values"][0])
        self.rec_engine.update_status(rec_id, new_status)
        self.refresh_recommendations_view()
        messagebox.showinfo("Status Updated", f"Task {rec_id} status updated to '{new_status}'.")

    def refresh_recommendations_view(self) -> None:
        for r in self.t7_tree.get_children():
            self.t7_tree.delete(r)
        recs = self.rec_engine.get_all_recommendations()
        for r in recs:
            self.t7_tree.insert("", "end", values=(
                r.rec_id, r.student_id, r.risk_level, r.recommended_action, r.status
            ), tags=(r.status,))

    # =================================================================
    # TAB 8: ANALYTICS & REPORTS (Pandas, NumPy, Aggregations)
    # =================================================================
    def init_tab8_analytics(self) -> None:
        top_bar = ttk.Frame(self.tab8_analytics, style="Card.TFrame", padding=12)
        top_bar.pack(fill="x", padx=6, pady=6)

        ttk.Label(top_bar, text="Institutional Descriptive Analytics & Statistical Reports", style="Header.TLabel").pack(side="left")
        ttk.Button(top_bar, text="Re-compute Summary Statistics", style="Primary.TButton", command=self.refresh_analytics_view).pack(side="right")

        # KPI Summary Cards
        kpi_frame = ttk.Frame(self.tab8_analytics, style="Card.TFrame", padding=10)
        kpi_frame.pack(fill="x", padx=6, pady=(0, 6))
        kpi_frame.columnconfigure(0, weight=1)
        kpi_frame.columnconfigure(1, weight=1)
        kpi_frame.columnconfigure(2, weight=1)
        kpi_frame.columnconfigure(3, weight=1)

        self.kpi1_val = tk.Label(kpi_frame, text="--", font=("Segoe UI", 16, "bold"), fg="#1e3a8a", bg="#ffffff")
        self.kpi1_val.grid(row=0, column=0)
        tk.Label(kpi_frame, text="Overall Avg Attendance", font=("Segoe UI", 9), fg="#64748b", bg="#ffffff").grid(row=1, column=0)

        self.kpi2_val = tk.Label(kpi_frame, text="--", font=("Segoe UI", 16, "bold"), fg="#b91c1c", bg="#ffffff")
        self.kpi2_val.grid(row=0, column=1)
        tk.Label(kpi_frame, text="Failing Subjects %", font=("Segoe UI", 9), fg="#64748b", bg="#ffffff").grid(row=1, column=1)

        self.kpi3_val = tk.Label(kpi_frame, text="--", font=("Segoe UI", 16, "bold"), fg="#b45309", bg="#ffffff")
        self.kpi3_val.grid(row=0, column=2)
        tk.Label(kpi_frame, text="Negative Sentiment %", font=("Segoe UI", 9), fg="#64748b", bg="#ffffff").grid(row=1, column=2)

        self.kpi4_val = tk.Label(kpi_frame, text="--", font=("Segoe UI", 16, "bold"), fg="#0f766e", bg="#ffffff")
        self.kpi4_val.grid(row=0, column=3)
        tk.Label(kpi_frame, text="Total Enrolled Students", font=("Segoe UI", 9), fg="#64748b", bg="#ffffff").grid(row=1, column=3)

        # Two split frames for tables
        data_split = ttk.Frame(self.tab8_analytics)
        data_split.pack(fill="both", expand=True, padx=6, pady=4)

        # Left: Department-wide Attendance & Grade Distribution
        left_f = ttk.Frame(data_split, style="Card.TFrame", padding=10)
        left_f.pack(side="left", fill="both", expand=True, padx=(0, 4))

        ttk.Label(left_f, text="Department-Wide Average Attendance", style="Header.TLabel").pack(anchor="w", pady=(0, 4))
        self.t8_dept_tree = ttk.Treeview(left_f, columns=("Department", "AvgAttendance", "StudentCount"), show="headings", height=5)
        self.t8_dept_tree.heading("Department", text="Department")
        self.t8_dept_tree.heading("AvgAttendance", text="Average Attendance")
        self.t8_dept_tree.heading("StudentCount", text="Student Count")
        self.t8_dept_tree.pack(fill="x", pady=(0, 10))

        ttk.Label(left_f, text="Academic Grade Distribution (Marks Bands)", style="Header.TLabel").pack(anchor="w", pady=(0, 4))
        self.t8_grade_tree = ttk.Treeview(left_f, columns=("GradeBand", "Count"), show="headings", height=5)
        self.t8_grade_tree.heading("GradeBand", text="Grade Band")
        self.t8_grade_tree.heading("Count", text="Subject Records Count")
        self.t8_grade_tree.pack(fill="both", expand=True)

        # Right: Sentiment Breakdown & Top 5 Complaints
        right_f = ttk.Frame(data_split, style="Card.TFrame", padding=10)
        right_f.pack(side="right", fill="both", expand=True, padx=(4, 0))

        ttk.Label(right_f, text="Feedback Sentiment Breakdown Ratio", style="Header.TLabel").pack(anchor="w", pady=(0, 4))
        self.t8_sent_tree = ttk.Treeview(right_f, columns=("Sentiment", "Count", "Ratio"), show="headings", height=4)
        self.t8_sent_tree.heading("Sentiment", text="Sentiment")
        self.t8_sent_tree.heading("Count", text="Feedback Logs")
        self.t8_sent_tree.heading("Ratio", text="Percentage")
        self.t8_sent_tree.pack(fill="x", pady=(0, 10))

        ttk.Label(right_f, text="Top 5 Recurring Campus Grievances / Complaints", font=("Segoe UI", 11, "bold"), foreground="#dc2626").pack(anchor="w", pady=(0, 4))
        self.t8_complaints_tree = ttk.Treeview(right_f, columns=("Keyword", "Occurrences"), show="headings", height=5)
        self.t8_complaints_tree.heading("Keyword", text="Grievance / Issue Keyword")
        self.t8_complaints_tree.heading("Occurrences", text="Frequency")
        self.t8_complaints_tree.pack(fill="both", expand=True)

    def refresh_analytics_view(self) -> None:
        # Dept Attendance
        dept_data = self.analytics.get_department_attendance_summary()
        self.kpi1_val.config(text=f"{dept_data['overall_avg']:.1f}%")
        for r in self.t8_dept_tree.get_children():
            self.t8_dept_tree.delete(r)
        for d in dept_data["departments"]:
            self.t8_dept_tree.insert("", "end", values=(d["Department"], f"{d['AverageAttendance']:.1f}%", d["StudentCount"]))

        # Grade Distribution
        grade_data = self.analytics.get_grade_distribution()
        self.kpi2_val.config(text=f"{grade_data['failing_percentage']:.1f}%")
        for r in self.t8_grade_tree.get_children():
            self.t8_grade_tree.delete(r)
        for band, count in grade_data.get("distribution", {}).items():
            self.t8_grade_tree.insert("", "end", values=(band, count))

        # Sentiment Breakdown
        sent_data = self.analytics.get_sentiment_breakdown()
        self.kpi3_val.config(text=f"{sent_data['NegativeRatio']:.1f}%")
        for r in self.t8_sent_tree.get_children():
            self.t8_sent_tree.delete(r)
        tot = max(sent_data["Total"], 1)
        for s in ("Positive", "Neutral", "Negative"):
            c = sent_data[s]
            pct = (c / tot) * 100.0
            self.t8_sent_tree.insert("", "end", values=(s, c, f"{pct:.1f}%"))

        # Top 5 Complaints
        complaints = self.analytics.get_top_recurring_complaints(5)
        for r in self.t8_complaints_tree.get_children():
            self.t8_complaints_tree.delete(r)
        for comp in complaints:
            self.t8_complaints_tree.insert("", "end", values=(comp["keyword"], f"{comp['frequency']} mentions"))

        # Total Students KPI
        students = self.student_mgr.get_all_students()
        self.kpi4_val.config(text=str(len(students)))

    # =================================================================
    # COMMON HELPERS
    # =================================================================
    def update_student_dropdowns(self) -> None:
        students = self.student_mgr.get_all_students()
        sids = [s.student_id for s in students]
        self.t2_student_cb["values"] = sids
        self.t3_student_cb["values"] = sids
        self.t4_student_cb["values"] = sids

    def refresh_all_views(self) -> None:
        self.refresh_students_tree()
        self.update_student_dropdowns()
        self.refresh_attendance_views()
        self.refresh_marks_view()
        self.refresh_feedback_view()
        self.refresh_risk_view()
        self.refresh_recommendations_view()
        self.refresh_analytics_view()
        self.handle_live_nlp_test()
