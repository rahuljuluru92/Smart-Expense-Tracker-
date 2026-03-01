# Smart Expense Tracker (AI-Powered)

A comprehensive expense tracking application with AI-powered insights, real-time analytics, and gamification features.

## Features

- 📊 **Smart Analytics:** AI-powered spending insights and predictions
- 🎯 **Budget Management:** Set and track budgets by category
- 📱 **Real-time Sync:** Live updates across all devices
- 🏆 **Gamification:** Achievements and rewards for smart spending
- 📍 **Location Tracking:** Track spending by location
- 🔔 **Smart Notifications:** Personalized alerts and reminders
- 📸 **Receipt Scanning:** OCR-powered receipt analysis
- 📈 **Advanced Charts:** Beautiful visualizations of spending patterns

## Tech Stack

### Frontend
- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Shadcn/ui
- **State Management:** Zustand
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts + Chart.js
- **Animations:** Framer Motion

### Backend
- **Runtime:** Node.js + Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Authentication:** JWT + bcryptjs
- **Real-time:** Socket.IO
- **Security:** Helmet, CORS, Rate limiting

### AI/ML Service
- **Framework:** FastAPI (Python)
- **ML Libraries:** TensorFlow, Scikit-learn
- **AI APIs:** OpenAI, Hugging Face
- **Image Processing:** OpenCV, Tesseract OCR
- **Predictions:** Prophet

### DevOps
- **Containerization:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Deployment:** Vercel (Frontend), Railway (Backend)

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Python (v3.8 or higher)
- PostgreSQL (v12 or higher)
- Docker (optional)

### Step 1: Clone and Install
```bash
# Clone the repository
git clone [https://github.com/rahuljuluru92/smart-expense-tracker.git](https://github.com/rahuljuluru92/smart-expense-tracker.git)
cd smart-expense-tracker

# Install dependencies
npm install
cd client && npm install
cd ../server && npm install
cd ../ai-service && pip install -r requirements.txt
```
### Step 2: Environment Setup
```bash
# Create a .env file in the root directory:
DATABASE_URL="postgresql://username:password@localhost:5432/expense_tracker"
JWT_SECRET="your-super-secret-key"
OPENAI_API_KEY="your-api-key"
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_AI_SERVICE_URL="http://localhost:8000"
```
### Step 3: Step 3: Run the Application
```bash 
#Option A: Using Docker (Recommended)
docker-compose up -d
```
```bash
#Option B: Manual Start
# Terminal 1 (Backend)
cd server
npm run dev

# Terminal 2 (Frontend)
cd client
npm run dev

# Terminal 3 (AI Service)
cd ai-service
python -m uvicorn main:app --reload
```

## 📘 API Documentation

### 🔐 Authentication

**POST /api/auth/register**  
Register a new user.

**POST /api/auth/login**  
Login an existing user.

**GET /api/auth/me**  
Retrieve the currently authenticated user.


### 💸 Expenses

**GET /api/expenses**  
Fetch all expenses for the user.

**POST /api/expenses**  
Create a new expense entry.

**GET /api/analytics/spending**  
Retrieve AI-powered spending analytics.


### 🤖 AI Service

**POST /ai/analyze-expense**  
Analyze an expense for categorization using AI.

**POST /ai/predict-spending**  
Predict future spending patterns.


---

## 📂 Project Structure
```bash
smart-expense-tracker/
├── client/                 # Next.js frontend
│   ├── src/app/           # App router pages
│   └── src/components/    # React components
├── server/                # Express.js backend
│   ├── src/routes/        # API routes
│   └── src/middleware/    # Auth middleware
├── ai-service/            # FastAPI AI service
│   └── main.py           # ML logic
├── database/             # Prisma schema
└── docker-compose.yml   # Container setup

```
