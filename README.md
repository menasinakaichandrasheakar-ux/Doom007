# AI-Enabled Smart Campus Monitoring and Intelligent Student Support System

A production-ready, modular Python desktop application aligned strictly with **Units 1 through 6** of core academic curriculum:
1. **Unit 1: Basic Syntax & Input Handling** – Data ingestion, sanitization, robust schema definitions.
2. **Unit 2: Control Flow & Logic** – Attendance percentage calculations, low-attendance alert flags (< 75%), passing threshold checks (< 40%).
3. **Unit 3: Functions & Data Structures** – Relational linkages across dictionaries, tuples, lists, and CSV collections.
4. **Unit 4: Object-Oriented Programming (OOP) & Exception Handling** – Custom exceptions (`DuplicateIDError`, `RecordNotFoundError`, `ValidationError`), encapsulated managers, and file validation.
5. **Unit 5: Data Science Libraries (Pandas, NumPy)** – Campus-wide attendance averages, marks binning, and sentiment ratios.
6. **Unit 6: NLP / AI Integration & Modern GUI** – Tokenization, stopword removal, rule-based & polarity sentiment scoring, multi-factor risk engine, automated recommendations, and Tkinter `ttk.Notebook` 8-tab GUI.

---

## 📁 Architecture & File Layout

```
├── main.py               # Application entry point, CLI verification suite & GUI launcher
├── models.py             # Domain models (Student, Attendance, Marks, Feedback), CRUD, and CSV storage
├── nlp_engine.py         # NLP FeedbackProcessor: Tokenization, Sentiment, Category & Keyword extraction
├── analytics.py          # StudentRiskEngine, RecommendationEngine, and Pandas/NumPy CampusAnalytics
├── gui.py                # Modern Tkinter 8-tab Notebook interface with colored tags & interactive forms
├── requirements.txt      # Python dependencies (pandas, numpy, nltk)
├── students.csv          # [StudentID, Name, Department, Semester, Email]
├── attendance.csv        # [RecordID, StudentID, TotalClasses, ClassesAttended, AttendancePercentage]
├── marks.csv             # [RecordID, StudentID, Subject, InternalMarks, ExamMarks, TotalMarks]
├── feedback.csv          # [FeedbackID, StudentID, Timestamp, FeedbackText, Sentiment, Category, ExtractedKeywords]
├── risk_analysis.csv     # [AnalysisID, StudentID, CalculatedScore, RiskLevel, DateEvaluated]
└── recommendations.csv   # [RecID, StudentID, RiskLevel, RecommendedAction, Status]
```

---

## 🚀 How to Run the Desktop Python Application

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```
*(On Ubuntu/Debian, ensure Tkinter is installed: `sudo apt-get install python3-tk`)*

### 2. Launch Desktop Tkinter Application
```bash
python main.py
```

### 3. Run Automated Academic Verification Suite
```bash
python main.py --test
```

---

## 🗂️ 8-Tab Modern Tkinter GUI Layout

1. **Student Management**: Full CRUD operations, search by ID/Name, tabular TreeView, instant form binding.
2. **Attendance Records**: Log total & attended classes, auto-calculated percentage, highlighted low attendance alerts (< 75%).
3. **Academic Marks**: Enter internal and exam marks, calculate totals, color-coded weak/failing subject detector.
4. **Feedback & Grievance**: Multiline student grievance submissions automatically analyzed by NLP upon saving.
5. **NLP Analysis View**: Live tester widget displaying tokens, polarity score (-1.0 to +1.0), category tag, and top 3 keywords.
6. **Student Risk Analysis**: Multi-factor AI engine evaluating attendance (35%), marks (35%), feedback (20%), and frequency (10%), stratified with colored badges.
7. **Intelligent Recommendations**: Automated institutional interventions mapped to specific risk triggers with status tracking.
8. **Analytics & Reports**: Summary KPIs, department-wide averages, grade distributions, sentiment breakdown, and top recurring campus complaints.
