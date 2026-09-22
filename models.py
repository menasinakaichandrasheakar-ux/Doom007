"""
models.py
Core Data Models, Custom Exceptions, and Manager Classes
Unit 1 - 4: Syntax, Control Flow, Data Structures, OOP & Exception Handling
"""

import csv
import os
from typing import Dict, List, Optional, Tuple, Any

# =====================================================================
# CUSTOM EXCEPTIONS (Unit 4: OOP & Exception Handling)
# =====================================================================

class CampusSystemError(Exception):
    """Base exception for Campus Monitoring System."""
    pass

class DuplicateIDError(CampusSystemError):
    """Raised when an entity with an existing ID is inserted."""
    def __init__(self, entity: str, identifier: str):
        super().__init__(f"{entity} with ID '{identifier}' already exists.")
        self.entity = entity
        self.identifier = identifier

class RecordNotFoundError(CampusSystemError):
    """Raised when an expected record is not found."""
    def __init__(self, entity: str, identifier: str):
        super().__init__(f"{entity} with ID '{identifier}' was not found.")
        self.entity = entity
        self.identifier = identifier

class ValidationError(CampusSystemError):
    """Raised when input validation fails (invalid marks, non-numeric values, empty strings)."""
    pass


# =====================================================================
# DATA CLASSES / ENTITIES
# =====================================================================

class Student:
    """Represents a student enrolled in the institution."""
    def __init__(self, student_id: str, name: str, department: str, semester: int, email: str, is_active: bool = True):
        self.student_id = str(student_id).strip()
        self.name = str(name).strip()
        self.department = str(department).strip()
        self.semester = int(semester)
        self.email = str(email).strip()
        self.is_active = bool(is_active)
        self.validate()

    def validate(self) -> None:
        if not self.student_id:
            raise ValidationError("Student ID cannot be empty.")
        if not self.name:
            raise ValidationError("Student Name cannot be empty.")
        if not self.department:
            raise ValidationError("Department cannot be empty.")
        if self.semester < 1 or self.semester > 12:
            raise ValidationError(f"Invalid semester '{self.semester}'. Must be between 1 and 12.")
        if "@" not in self.email or "." not in self.email:
            raise ValidationError(f"Invalid email address format: '{self.email}'.")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "StudentID": self.student_id,
            "Name": self.name,
            "Department": self.department,
            "Semester": str(self.semester),
            "Email": self.email
        }


class AttendanceRecord:
    """Represents attendance performance for a student."""
    def __init__(self, record_id: str, student_id: str, total_classes: int, classes_attended: int, percentage: Optional[float] = None):
        self.record_id = str(record_id).strip()
        self.student_id = str(student_id).strip()
        self.total_classes = int(total_classes)
        self.classes_attended = int(classes_attended)
        
        self.validate()
        if percentage is None:
            self.percentage = self.calculate_percentage()
        else:
            self.percentage = round(float(percentage), 2)

    def calculate_percentage(self) -> float:
        if self.total_classes == 0:
            return 0.0
        return round((self.classes_attended / self.total_classes) * 100.0, 2)

    def validate(self) -> None:
        if not self.record_id:
            raise ValidationError("Record ID cannot be empty.")
        if not self.student_id:
            raise ValidationError("Student ID cannot be empty.")
        if self.total_classes < 0:
            raise ValidationError("Total classes cannot be negative.")
        if self.classes_attended < 0:
            raise ValidationError("Classes attended cannot be negative.")
        if self.classes_attended > self.total_classes:
            raise ValidationError(
                f"Classes attended ({self.classes_attended}) cannot exceed total classes ({self.total_classes})."
            )

    @property
    def is_low_attendance(self) -> bool:
        return self.percentage < 75.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "RecordID": self.record_id,
            "StudentID": self.student_id,
            "TotalClasses": str(self.total_classes),
            "ClassesAttended": str(self.classes_attended),
            "AttendancePercentage": f"{self.percentage:.2f}"
        }


class MarksRecord:
    """Represents subject evaluation marks for a student."""
    def __init__(self, record_id: str, student_id: str, subject: str, internal_marks: float, exam_marks: float, total_marks: Optional[float] = None):
        self.record_id = str(record_id).strip()
        self.student_id = str(student_id).strip()
        self.subject = str(subject).strip()
        self.internal_marks = float(internal_marks)
        self.exam_marks = float(exam_marks)

        self.validate()
        if total_marks is None:
            self.total_marks = round(self.internal_marks + self.exam_marks, 2)
        else:
            self.total_marks = round(float(total_marks), 2)

    def validate(self) -> None:
        if not self.record_id:
            raise ValidationError("Record ID cannot be empty.")
        if not self.student_id:
            raise ValidationError("Student ID cannot be empty.")
        if not self.subject:
            raise ValidationError("Subject cannot be empty.")
        if self.internal_marks < 0 or self.internal_marks > 50:
            raise ValidationError(f"Internal marks must be between 0 and 50. Got {self.internal_marks}.")
        if self.exam_marks < 0 or self.exam_marks > 50:
            raise ValidationError(f"Exam marks must be between 0 and 50. Got {self.exam_marks}.")
        
    @property
    def is_failing(self) -> bool:
        # Pass threshold is 40% out of 100
        return self.total_marks < 40.0

    @property
    def is_weak(self) -> bool:
        return self.total_marks < 55.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "RecordID": self.record_id,
            "StudentID": self.student_id,
            "Subject": self.subject,
            "InternalMarks": f"{self.internal_marks:.2f}",
            "ExamMarks": f"{self.exam_marks:.2f}",
            "TotalMarks": f"{self.total_marks:.2f}"
        }


class FeedbackRecord:
    """Represents qualitative student feedback or grievance."""
    def __init__(self, feedback_id: str, student_id: str, timestamp: str, feedback_text: str, sentiment: str, category: str, extracted_keywords: str):
        self.feedback_id = str(feedback_id).strip()
        self.student_id = str(student_id).strip()
        self.timestamp = str(timestamp).strip()
        self.feedback_text = str(feedback_text).strip()
        self.sentiment = str(sentiment).strip()
        self.category = str(category).strip()
        self.extracted_keywords = str(extracted_keywords).strip()

        self.validate()

    def validate(self) -> None:
        if not self.feedback_id:
            raise ValidationError("Feedback ID cannot be empty.")
        if not self.student_id:
            raise ValidationError("Student ID cannot be empty.")
        if not self.feedback_text:
            raise ValidationError("Feedback text cannot be empty.")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "FeedbackID": self.feedback_id,
            "StudentID": self.student_id,
            "Timestamp": self.timestamp,
            "FeedbackText": self.feedback_text,
            "Sentiment": self.sentiment,
            "Category": self.category,
            "ExtractedKeywords": self.extracted_keywords
        }


class RiskAnalysisRecord:
    """Represents calculated composite student risk evaluation."""
    def __init__(self, analysis_id: str, student_id: str, calculated_score: float, risk_level: str, date_evaluated: str):
        self.analysis_id = str(analysis_id).strip()
        self.student_id = str(student_id).strip()
        self.calculated_score = round(float(calculated_score), 2)
        self.risk_level = str(risk_level).strip()
        self.date_evaluated = str(date_evaluated).strip()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "AnalysisID": self.analysis_id,
            "StudentID": self.student_id,
            "CalculatedScore": f"{self.calculated_score:.2f}",
            "RiskLevel": self.risk_level,
            "DateEvaluated": self.date_evaluated
        }


class RecommendationRecord:
    """Represents an automated institutional intervention task."""
    def __init__(self, rec_id: str, student_id: str, risk_level: str, recommended_action: str, status: str = "Pending"):
        self.rec_id = str(rec_id).strip()
        self.student_id = str(student_id).strip()
        self.risk_level = str(risk_level).strip()
        self.recommended_action = str(recommended_action).strip()
        self.status = str(status).strip()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "RecID": self.rec_id,
            "StudentID": self.student_id,
            "RiskLevel": self.risk_level,
            "RecommendedAction": self.recommended_action,
            "Status": self.status
        }


# =====================================================================
# CSV STORAGE PERSISTENCE HANDLER (Auto-header, Exception-Safe)
# =====================================================================

class CSVStorageHandler:
    """
    Handles CSV persistence across all 6 files with automatic schema initialization
    and robust error handling.
    """
    FILE_SCHEMAS: Dict[str, List[str]] = {
        "students.csv": ["StudentID", "Name", "Department", "Semester", "Email"],
        "attendance.csv": ["RecordID", "StudentID", "TotalClasses", "ClassesAttended", "AttendancePercentage"],
        "marks.csv": ["RecordID", "StudentID", "Subject", "InternalMarks", "ExamMarks", "TotalMarks"],
        "feedback.csv": ["FeedbackID", "StudentID", "Timestamp", "FeedbackText", "Sentiment", "Category", "ExtractedKeywords"],
        "risk_analysis.csv": ["AnalysisID", "StudentID", "CalculatedScore", "RiskLevel", "DateEvaluated"],
        "recommendations.csv": ["RecID", "StudentID", "RiskLevel", "RecommendedAction", "Status"]
    }

    def __init__(self, data_dir: str = "."):
        self.data_dir = data_dir
        self.ensure_all_files()

    def get_file_path(self, filename: str) -> str:
        return os.path.join(self.data_dir, filename)

    def ensure_all_files(self) -> None:
        """Checks existence of each CSV file; auto-initializes headers if missing."""
        for filename, headers in self.FILE_SCHEMAS.items():
            filepath = self.get_file_path(filename)
            if not os.path.exists(filepath):
                try:
                    with open(filepath, mode="w", newline="", encoding="utf-8") as f:
                        writer = csv.writer(f)
                        writer.writerow(headers)
                except OSError as e:
                    raise CampusSystemError(f"Failed to initialize CSV storage for '{filename}': {e}")
            else:
                # Check if file is empty
                if os.path.getsize(filepath) == 0:
                    with open(filepath, mode="w", newline="", encoding="utf-8") as f:
                        writer = csv.writer(f)
                        writer.writerow(headers)

    def read_csv(self, filename: str) -> List[Dict[str, str]]:
        """Reads rows from a CSV file returning a list of dictionaries."""
        filepath = self.get_file_path(filename)
        if not os.path.exists(filepath):
            self.ensure_all_files()

        records: List[Dict[str, str]] = []
        try:
            with open(filepath, mode="r", newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # Strip whitespace from keys and values
                    cleaned_row = {k.strip(): (v.strip() if v else "") for k, v in row.items() if k}
                    records.append(cleaned_row)
            return records
        except FileNotFoundError:
            self.ensure_all_files()
            return []
        except Exception as e:
            raise CampusSystemError(f"Error reading '{filename}': {e}")

    def write_csv(self, filename: str, rows: List[Dict[str, Any]]) -> None:
        """Writes all rows to a CSV file with defined headers."""
        filepath = self.get_file_path(filename)
        headers = self.FILE_SCHEMAS.get(filename)
        if not headers:
            raise ValueError(f"Unrecognized CSV filename: '{filename}'")

        try:
            with open(filepath, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=headers)
                writer.writeheader()
                for row in rows:
                    filtered_row = {k: row.get(k, "") for k in headers}
                    writer.writerow(filtered_row)
        except Exception as e:
            raise CampusSystemError(f"Error writing to '{filename}': {e}")

    def append_csv(self, filename: str, row: Dict[str, Any]) -> None:
        """Appends a single row to a CSV file."""
        filepath = self.get_file_path(filename)
        headers = self.FILE_SCHEMAS.get(filename)
        if not headers:
            raise ValueError(f"Unrecognized CSV filename: '{filename}'")

        try:
            with open(filepath, mode="a", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=headers)
                filtered_row = {k: row.get(k, "") for k in headers}
                writer.writerow(filtered_row)
        except Exception as e:
            raise CampusSystemError(f"Error appending to '{filename}': {e}")


# =====================================================================
# STUDENT MANAGER CLASS (Unit 1: CRUD Operations & Relational Linking)
# =====================================================================

class StudentManager:
    """
    Manages Student demographics and links with Attendance, Marks, and Feedback.
    """
    def __init__(self, storage: Optional[CSVStorageHandler] = None):
        self.storage = storage or CSVStorageHandler()
        self.filename = "students.csv"

    def get_all_students(self) -> List[Student]:
        rows = self.storage.read_csv(self.filename)
        students = []
        for r in rows:
            try:
                students.append(Student(
                    student_id=r["StudentID"],
                    name=r["Name"],
                    department=r["Department"],
                    semester=int(r["Semester"]),
                    email=r["Email"]
                ))
            except (ValueError, KeyError, ValidationError):
                continue
        return students

    def get_student_by_id(self, student_id: str) -> Student:
        student_id = str(student_id).strip()
        students = self.get_all_students()
        for s in students:
            if s.student_id.upper() == student_id.upper():
                return s
        raise RecordNotFoundError("Student", student_id)

    def add_student(self, student: Student) -> None:
        """Adds a student; raises DuplicateIDError if ID already exists."""
        student.validate()
        existing = [s for s in self.get_all_students() if s.student_id.upper() == student.student_id.upper()]
        if existing:
            raise DuplicateIDError("Student", student.student_id)
        self.storage.append_csv(self.filename, student.to_dict())

    def update_student(self, student: Student) -> None:
        """Updates details of an existing student."""
        student.validate()
        students = self.get_all_students()
        found = False
        updated_rows = []
        for s in students:
            if s.student_id.upper() == student.student_id.upper():
                updated_rows.append(student.to_dict())
                found = True
            else:
                updated_rows.append(s.to_dict())

        if not found:
            raise RecordNotFoundError("Student", student.student_id)
        self.storage.write_csv(self.filename, updated_rows)

    def delete_student(self, student_id: str) -> None:
        """Deletes a student and cascades soft deletion where applicable."""
        student_id = str(student_id).strip()
        students = self.get_all_students()
        remaining = [s.to_dict() for s in students if s.student_id.upper() != student_id.upper()]
        if len(remaining) == len(students):
            raise RecordNotFoundError("Student", student_id)
        self.storage.write_csv(self.filename, remaining)

    def search_students(self, query: str) -> List[Student]:
        """Searches students by ID or Name (case-insensitive substring match)."""
        query = str(query).strip().lower()
        if not query:
            return self.get_all_students()
        results = []
        for s in self.get_all_students():
            if query in s.student_id.lower() or query in s.name.lower() or query in s.department.lower():
                results.append(s)
        return results


# =====================================================================
# ATTENDANCE MONITOR CLASS (Unit 2: Tracking & Automated Alerts)
# =====================================================================

class AttendanceMonitor:
    """
    Calculates attendance percentage, logs records, and flags low attendance.
    """
    def __init__(self, storage: Optional[CSVStorageHandler] = None):
        self.storage = storage or CSVStorageHandler()
        self.filename = "attendance.csv"

    def get_all_records(self) -> List[AttendanceRecord]:
        rows = self.storage.read_csv(self.filename)
        records = []
        for r in rows:
            try:
                records.append(AttendanceRecord(
                    record_id=r["RecordID"],
                    student_id=r["StudentID"],
                    total_classes=int(r["TotalClasses"]),
                    classes_attended=int(r["ClassesAttended"]),
                    percentage=float(r.get("AttendancePercentage", 0))
                ))
            except (ValueError, KeyError, ValidationError):
                continue
        return records

    def get_record_by_student(self, student_id: str) -> Optional[AttendanceRecord]:
        student_id = str(student_id).strip().upper()
        for r in self.get_all_records():
            if r.student_id.upper() == student_id:
                return r
        return None

    def record_attendance(self, student_id: str, total_classes: int, classes_attended: int, record_id: Optional[str] = None) -> AttendanceRecord:
        """Creates or updates attendance for a student."""
        student_id = str(student_id).strip()
        all_records = self.get_all_records()
        
        # Check if record already exists for this student
        existing = self.get_record_by_student(student_id)
        if not record_id:
            record_id = existing.record_id if existing else f"ATT{len(all_records) + 101}"

        record = AttendanceRecord(
            record_id=record_id,
            student_id=student_id,
            total_classes=total_classes,
            classes_attended=classes_attended
        )

        updated_rows = []
        found = False
        for r in all_records:
            if r.student_id.upper() == student_id.upper():
                updated_rows.append(record.to_dict())
                found = True
            else:
                updated_rows.append(r.to_dict())

        if not found:
            updated_rows.append(record.to_dict())

        self.storage.write_csv(self.filename, updated_rows)
        return record

    def get_low_attendance_students(self, threshold: float = 75.0) -> List[AttendanceRecord]:
        """Returns records of students below the mandatory attendance threshold."""
        return [r for r in self.get_all_records() if r.percentage < threshold]


# =====================================================================
# ACADEMIC ANALYZER CLASS (Unit 2: Marks, Weak Subjects, GPA)
# =====================================================================

class AcademicAnalyzer:
    """
    Stores subject-wise internal and exam marks, identifies weak/failing subjects,
    and aggregates academic GPA/averages.
    """
    def __init__(self, storage: Optional[CSVStorageHandler] = None):
        self.storage = storage or CSVStorageHandler()
        self.filename = "marks.csv"

    def get_all_records(self) -> List[MarksRecord]:
        rows = self.storage.read_csv(self.filename)
        records = []
        for r in rows:
            try:
                records.append(MarksRecord(
                    record_id=r["RecordID"],
                    student_id=r["StudentID"],
                    subject=r["Subject"],
                    internal_marks=float(r["InternalMarks"]),
                    exam_marks=float(r["ExamMarks"]),
                    total_marks=float(r.get("TotalMarks", 0))
                ))
            except (ValueError, KeyError, ValidationError):
                continue
        return records

    def get_records_by_student(self, student_id: str) -> List[MarksRecord]:
        student_id = str(student_id).strip().upper()
        return [r for r in self.get_all_records() if r.student_id.upper() == student_id]

    def add_marks_record(self, student_id: str, subject: str, internal_marks: float, exam_marks: float, record_id: Optional[str] = None) -> MarksRecord:
        student_id = str(student_id).strip()
        subject = str(subject).strip()
        all_records = self.get_all_records()
        
        # Check if record for same student and subject exists
        for r in all_records:
            if r.student_id.upper() == student_id.upper() and r.subject.upper() == subject.upper():
                raise DuplicateIDError("Marks Record", f"{student_id} - {subject}")

        if not record_id:
            record_id = f"MRK{len(all_records) + 201}"

        record = MarksRecord(
            record_id=record_id,
            student_id=student_id,
            subject=subject,
            internal_marks=internal_marks,
            exam_marks=exam_marks
        )
        self.storage.append_csv(self.filename, record.to_dict())
        return record

    def get_failing_records(self) -> List[MarksRecord]:
        """Identifies subjects with total marks < 40%."""
        return [r for r in self.get_all_records() if r.is_failing]

    def get_student_academic_summary(self, student_id: str) -> Dict[str, Any]:
        """Computes average marks, weak subject count, and aggregate GPA equivalent for a student."""
        records = self.get_records_by_student(student_id)
        if not records:
            return {
                "student_id": student_id,
                "total_subjects": 0,
                "average_marks": 0.0,
                "gpa": 0.0,
                "failing_subjects": [],
                "weak_subjects": []
            }

        total_marks = sum(r.total_marks for r in records)
        avg_marks = round(total_marks / len(records), 2)
        # Approximate 10-point GPA scale (Marks / 10)
        gpa = round(avg_marks / 10.0, 2)
        failing = [r.subject for r in records if r.is_failing]
        weak = [r.subject for r in records if r.is_weak]

        return {
            "student_id": student_id,
            "total_subjects": len(records),
            "average_marks": avg_marks,
            "gpa": gpa,
            "failing_subjects": failing,
            "weak_subjects": weak
        }
