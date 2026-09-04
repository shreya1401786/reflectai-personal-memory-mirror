# ReflectAI — User-Authenticated Journaling with Gemini 3.6 Flash & Firestore
Your thoughts. Your memories. Your story.
ReflectAI is a secure, user-authenticated journaling and personal reflection web application. It combines Google Firebase Authentication, isolated Cloud Firestore persistence, and the Google Gemini 3.6 Flash API to create a mindful conversational space for unpacking thoughts, exploring perspectives, and synthesizing emotional growth.
ReflectAI is a secure, Gemini-powered personal memory mirror that helps users journal, revisit their past reflections, discover recurring patterns, connect memories, explore decisions, and write messages to their future selves.
---

## Architecture & Tech Stack

| Component | Technology | Purpose & Security Stance |
| :--- | :--- | :--- |
| **User Identity** | Firebase Authentication | Google Sign-In with zero plaintext passwords or email storage. |
| **Backend Database** | Cloud Firestore | Owner-bound document isolation (`/users/{userId}/...`) governed by Firestore Security Rules. |
| **AI Engine** | Gemini 3.6 Flash | Express server-side proxy (`/api/gemini/*`) with multi-model fallback ladder. |
| **Sentiment Analytics** | D3.js Visualization | Dynamic timeline tracking emotional valence & tone across reflections. |
| **Secret Hygiene** | Google Cloud Secret Manager | Dynamic API key injection without client exposure. |

## Core Features

### 🪞 Ask My Memory
Ask questions about your previous reflections and retrieve relevant memories from your personal archive.

### 🔎 Pattern Radar
Discover recurring themes, challenges, coping strategies, and patterns across your reflections.

### 🗺️ Memory Map
Optionally attach locations to memories and revisit reflections associated with meaningful places.

### ⏳ Reflection Replay
Look back across a period of time and generate a narrative of how your thoughts and experiences evolved.

### 🔗 Memory Connections
Connect new reflections with related memories from the past.

### ⚖️ Decision Timeline
Record important decisions and revisit them using later journal evidence.

### ✉️ Future Me
Write private time-capsule messages to your future self with a scheduled unlock date.

### 🔐 Privacy Center
Understand how authentication, user isolation, Firestore rules, and server-side secrets protect personal reflections.

## What Makes ReflectAI Different

ReflectAI goes beyond traditional journaling.

Instead of treating each journal entry as an isolated note, it turns a user's reflections into a personal memory system.

The core experience follows:

WRITE → REMEMBER → CONNECT → DISCOVER → REPLAY → REFLECT

The application can retrieve previous memories, identify recurring patterns, connect related experiences, revisit decisions, and create future-facing reflections.


## 1. Environment & Prerequisites

Ensure the following Google Cloud APIs are enabled in your project:

```bash
# Set your project ID
export PROJECT_ID="YOUR_PROJECT_ID"
export REGION="asia-southeast1" # Or your target region
export SERVICE_NAME="reflect-ai"

gcloud config set project $PROJECT_ID

# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com
```

## 2. Secret Management Setup (Gemini API Key)

The Gemini API key is stored securely in Google Cloud Secret Manager and injected at runtime into the Cloud Run service.

```bash
# 1. Create the secret in Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# 2. Add your Gemini API key value
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Retrieve your project number
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# 4. Grant the default Compute Service Account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Database Security Configuration (Cloud Firestore)

Firestore documents are strictly isolated per user under `/users/{userId}/...`.

### Firestore Security Rules (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User-isolated interactions and journal entries
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/entries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/entries/{entryId}/messages/{messageId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/future_letters/{letterId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      }
  }
}
```

Deploy the rules using the Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

---

## 4. Cloud Run Deployment Flow

Deploy the container directly to Google Cloud Run:

```bash
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

---

## 5. Required Campaign Labeling

Apply the mandatory verification label to register the service:

```bash
gcloud run services update $SERVICE_NAME \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=$REGION
```

---

## 6. Functional Verification Walkthrough

Follow these sequential steps to verify all features and modules:

1. **Authentication Flow**:
   - Navigate to the application URL.
   - Confirm the landing page renders with zero plain-text password forms.
   - Click **"Continue with Google"**. Complete authentication and confirm redirection to the private dashboard.

2. **Reflection & Multi-Turn Conversation**:
   - Write a journal entry in the textarea.
   - Select a mode chip (**Deep Reflection**, **Summary**, **Brainstorming**, or **Action Plan**).
   - Press **Reflect with Gemini** (or `⌘+Enter`).
   - Confirm Gemini returns formatted markdown insights.
   - Reply to continue the conversation in the same thread.
   - Observe the **"Connected Memories"** card dynamically linking this thought to relevant past reflections.

3. **Synthesis & Categorization**:
   - Click **"Summarize & Tag"**.
   - Verify Gemini analyzes the conversation, sets a title, and populates mood/reflection tags.

4. **Sentiment Trend Analysis (D3.js)**:
   - Observe the **Emotional Tone & Sentiment Trend** D3.js chart in the dashboard.
   - Verify that data points plot chronologically across the continuous scale `[-1.0 ... +1.0]`.
   - Hover over individual points to inspect the tooltip displaying title, date, score, emotional label, and text snippet.
   - Click any dot on the curve to navigate directly to that archived reflection.

5. **Personal Memory Mirror — Flagship "Ask My Memory"**:
   - Click the **"Ask My Memory"** navigation tab.
   - Enter questions like *"What causes me the most stress and how do I cope?"* or *"How have my priorities shifted over time?"*.
   - Confirm Gemini synthesizes answers citing specific dated reflections with direct references.

6. **Pattern Radar & Behavioral Synthesis**:
   - Switch to **"Pattern Radar"**.
   - Review the automated recurring cognitive themes, emotional rhythms, growth indicators, and constructive blind spots synthesized from your journal archive.

7. **Memory Map & Geographic Archive**:
   - Click **"Memory Map"**.
   - Tag memories with physical locations (e.g. *"Kyoto, Japan"*, *"Home Office"*).
   - Inspect memories grouped geographically and read place-specific memory cards.

8. **Reflection Replay & Storytelling**:
   - Open **"Replay"**.
   - Filter by date range or specific tag.
   - Generate a narrative chapter and step through sequential memory cards.

9. **Decisions Timeline & Crossroads**:
   - Open **"Decisions"**.
   - Tag any reflection as a crossroads decision with stage (**Considering**, **Decided**, **Outcome**, **Reflection**).
   - Run AI decision evaluation to assess alignment with long-term values.

10. **Future Me Time-Capsule Letters**:
    - Navigate to **"Future Me"**.
    - Seal an encrypted message to your future self with an unlock date.
    - Confirm letters remain locked until the set delivery date arrives.

11. **Semantic Search**:
    - Click **"Search"**.
    - Perform concept queries (e.g., *"times I felt proud of learning something hard"*).
    - Review relevance rankings and AI explanation blurbs.

12. **Isolated Firestore Persistence & Privacy Center**:
    - Click **"Privacy"** to review the cryptographic and access control architecture.
    - Check the **"Firestore Synced"** indicator.
    - Sign out, sign in with a different account, and confirm that the second user cannot see the first user's reflections or letters.

## Security & Privacy

- Google Sign-In through Firebase Authentication.
- Firestore data is isolated by authenticated user ID.
- Firestore Security Rules enforce owner-only access.
- Gemini API credentials are kept server-side.
- Secrets are managed through Google Cloud Secret Manager.
- API keys are never hardcoded in client-side code.
- Location tagging is optional and user-controlled.
- Future Me content is intended to remain private until its unlock date.

## Project Status

ReflectAI is an ideathon prototype demonstrating:

- Firebase Authentication
- User-isolated Cloud Firestore
- Gemini-powered reflection
- Personal memory retrieval
- Pattern analysis
- Memory mapping
- Reflection replay
- Decision tracking
- Future Me time capsules
- Privacy-focused architecture