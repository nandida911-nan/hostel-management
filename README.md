# 🏢 HostelEase — College Hostel Management System

A full-stack web application designed to digitize daily campus living—replacing manual registers and paperwork for room allocations, out-passes with QR verification, maintenance complaints, digital mess menu, and campus announcements.

---

## 🚀 How to Run on Your Laptop

### Quick Start (Single Command)
Open **PowerShell** or **Terminal** in the project root (`d:\Hostel management`) and run:

```bash
npm run dev
```

This single command starts:
- 🚀 **Backend Express API Server**: `http://localhost:5000`
- 💻 **Frontend React Web Portal**: `http://localhost:5173`

Now open **[http://localhost:5173](http://localhost:5173)** in your browser!

---

## 🔑 Demo Login Accounts (For Guide & Viva Presentation)

The login screen includes **1-Click Quick Demo Login Buttons** to switch between user roles in 1 second:

| Role | Demo Email | Password | What to Demo |
| :--- | :--- | :--- | :--- |
| 🎓 **Student** | `student@campus.edu` | `student123` | Apply for Night Out-Pass, View High-Res QR Gate Pass, File Maintenance Tickets, View 7-Day Mess Menu |
| 🛡️ **Warden / Admin** | `warden@campus.edu` | `warden123` | Review & Approve Out-Pass Requests, Room Allocation Matrix & Bed Occupancy, Assign Technicians, Broadcast Notices |
| 🚪 **Gate Security** | `security@campus.edu` | `guard123` | Search Roll No (`22CS101`) or Scan QR, Instant **APPROVED (Green)** / **INVALID (Red)** check, 1-Click Check-Out & Check-In Logger |

---

## 🌟 Core Features & Workflows

### 1. Student Portal
- **Out-Pass with Dynamic QR Code**: Apply for night out, weekend leave, or emergency passes. Once approved by the warden, a tamper-proof cryptographically signed QR code appears ready for scanning.
- **Maintenance Helpdesk**: File complaint tickets (Electrical, Plumbing, Wi-Fi, Carpentry) and track status in real-time (`OPEN` ➔ `IN PROGRESS` ➔ `RESOLVED`).
- **7-Day Mess Schedule**: Interactive weekly dining menu for Breakfast, Lunch, Evening Snacks, and Dinner with special items.
- **Urgent Campus Broadcasts**: Read real-time announcements posted by hostel administration.

### 2. Warden & Admin Dashboard
- **Out-Pass Approvals Queue**: Review pending applications, view student & parent contact numbers, and approve or reject with one click.
- **Room Allocation Matrix**: Visual block/floor grid showing occupied vs. available beds with instant student room allocation modals.
- **Complaint Ticket Dispatch**: Assign campus electricians and plumbers to open tickets and track resolution progress.
- **Notice Board Publisher**: Broadcast urgent or general notices to all residents.

### 3. Gate Security Portal
- **Rapid Roll No & QR Verification**: Search student roll number (e.g. `22CS101`) or scan QR code.
- **Visual Status Banner**:
  - 🟢 **APPROVED FOR CHECKOUT**: Student is cleared to leave campus.
  - 🔵 **VALID FOR CHECKIN**: Student is currently outside and cleared to re-enter.
  - 🔴 **PENDING / REJECTED / EXPIRED**: Unapproved student cannot leave gate.
- **Gate Movement Register**: Automatically logs timestamps and guard IDs for check-outs and check-ins.

---

## 🏗️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express, Better-SQLite3, JSON Web Tokens (JWT), Bcrypt, QRCode
- **Database**: SQLite (`backend/data/hostel.db`)
- **Version Control**: Git