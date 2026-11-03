
# Nudge - Advanced AI Sales Outreach Platform

![Nudge Banner](https://img.shields.io/badge/Status-Beta-blue?style=for-the-badge) ![Version](https://img.shields.io/badge/Version-1.0.0-purple?style=for-the-badge)

![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white) ![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi) ![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54) ![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white) ![Inngest](https://img.shields.io/badge/Inngest-333?style=for-the-badge&logo=inngest&logoColor=white) ![Clerk](https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)

**Nudge** is a cutting-edge, AI-powered sales engagement platform designed to automate personalized cold outreach sequences. By leveraging generative AI and intelligent workflow automation, Nudge helps modern sales teams scale their outbound efforts without sacrificing personalization.

---

## Screenshots
<!-- Add your own screenshots here -->

## 🚀 Features

### 🤖 Intelligent Automation
*   **AI-Generated Copy**: Uses **Google Gemini 1.5 Flash** to craft hyper-personalized emails based on prospect data.
*   **Smart Sequences**: Automated multi-step email campaigns with custom time delays.
*   **Reply Detection**: Automatically stops follow-ups when a lead replies, preventing awkward double-messaging.

### 📊 Powerful Analytics
*   **Real-time Dashboard**: Tracks emails sent, open rates, reply rates, and bounce rates.
*   **Campaign Insights**: Granular performance metrics for each specific campaign.
*   **Lead Scoring**: (Coming Soon) AI-driven prioritization of high-intent prospects.

### 🛠️ Robust Infrastructure
*   **Idempotent Workflows**: Built on **Inngest** for reliable, durable execution of complex email sequences.
*   **High Deliverability**: Integrated with **Resend** for enterprise-grade email infrastructure.
*   **Secure Auth**: Authentication powered by **Clerk**, ensuring data privacy and security.

---

## 🏗️ Tech Stack

### Frontend (Client)
*   **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **UI Components**: [Shadcn UI](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
*   **Animations**: [Framer Motion](https://www.framer.com/motion/)
*   **State Management**: [TanStack Query](https://tanstack.com/query/latest)
*   **Icons**: [Lucide React](https://lucide.dev/)

### Backend (Server)
*   **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
*   **Database**: [PostgreSQL](https://www.postgresql.org/)
*   **ORM**: [SQLModel](https://sqlmodel.tiangolo.com/) (SQLAlchemy + Pydantic)
*   **AI Model**: [Google Gemini API](https://ai.google.dev/)
*   **Background Jobs**: [Inngest](https://www.inngest.com/)
*   **Email Service**: [Resend](https://resend.com/)

---

## 🛠️ Getting Started

### Prerequisites
*   Node.js 18+
*   Python 3.10+
*   PostgreSQL
*   Bun (optional, but recommended for frontend)

### Installation

1.  **Clone the repository**
    ```bash
    git clone <your-repository-url>
    cd nudge
    ```

2.  **Frontend Setup**
    ```bash
    cd client
    bun install
    bun dev
    ```

3.  **Backend Setup**
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    uvicorn app.main:app --reload
    ```

4.  **Inngest Dev Server**
    ```bash
    npx inngest-cli@latest dev
    ```

### Environment Variables

Create `.env` files in both `client` and `backend` directories.

**Backend (`backend/.env`)**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/nudge_db
GEMINI_API_KEY=your_google_api_key
RESEND_API_KEY=re_123456789
CLERK_SECRET_KEY=sk_test_...
INNGEST_SIGNING_KEY=sign_...
```

**Frontend (`client/.env.local`)**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📂 Project Structure

```
nudge/
├── backend/
│   ├── app/
│   │   ├── api/          # REST API endpoints
│   │   ├── core/         # Config & security
│   │   ├── db/           # Database engine
│   │   ├── models/       # SQLModel definitions
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   └── workflows/    # Inngest workflows
│   └── tests/
├── client/
│   ├── app/
│   │   ├── (auth)/       # Authentication pages
│   │   ├── (dashboard)/  # App dashboard layout
│   │   └── pages/        # Landing pages
│   ├── components/       # Reusable UI components
│   └── lib/              # Utilities & API hooks
└── README.md
```


---
