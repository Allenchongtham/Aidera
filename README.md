# Aidera 
### AI-Powered Disaster Logistics & Relief Camp Grievance Assistant

---

## Problem Statement

Imagine stepping into an overcrowded relief camp in Manipur at dawn, where families displaced by prolonged ethnic conflict queue up for hours under leaky tin roofs. Water taps run dry, sanitation blocks overflow, and children suffer from sudden fevers with zero medical supplies in sight. The camp administrator is entirely blind to these escalating deficits, drowned under a chaotic flood of fragmented notes, word-of-mouth complaints, and delayed bureaucratic paperwork.

This isolated emergency is part of a massive, systemic breakdown during humanitarian displacement:

* **The Communication Void:** Displaced populations face severe language and administrative barriers in communicating urgent daily needs to state authorities, resulting in critical delays where basic necessities like clean water, sanitation repairs, and medical kits arrive long after outbreaks begin.
* **Operational Blindness & Administrative Lag:** State-level authorities and camp administrators lack real-time visibility and ground-truth telemetry, struggling to filter duplicate grievances or identify critical life-saving priorities from thousands of residents across multiple shelters.
* **The Human Cost:** The lack of streamlined reporting and rapid logistics has led to profound human suffering. Recent ground reports and legal scrutiny have highlighted severe living constraints, inadequate nutrition, and critical medical deficits inside shelters.

---

## Real-World Relevance & News Sources

The operational challenges addressed by Aidera mirror pressing humanitarian realities documented across relief shelters:

### National News & Legal Oversight

* **Supreme Court Scrutiny on Relief Conditions:** The Supreme Court expressed grave concern and took strong exception to unaddressed health and infrastructure challenges leading to unnatural deaths inside Manipur relief camps, demanding strict administrative accountability and status transparency for internally displaced persons (IDPs). For further details, read the coverage by [The Hindu - SC Seeks Manipur Report on Relief Camp Deaths](https://www.thehindu.com) and [The New Indian Express](https://www.newindianexpress.com).
* **Healthcare & Medicine Shortages:** Medical teams and investigative assessments have repeatedly warned of severe medicine shortages and paralyzed healthcare systems across relief camps, risking potential outbreaks if urgent tracking and intervention measures are ignored. Read the medical findings highlighted by [Rediff News - Healthcare Deficits in Relief Camps](https://www.rediff.com) and [Deccan Herald](https://www.deccanherald.com).

### Local Reporting (*The Sangai Express*)

* **Supply Chain Bottlenecks:** Local reporting from *The Sangai Express* highlights persistent hurdles in distributing essential life-saving commodities, rations, and clean water supplies efficiently to remote camps. Read the regional dispatches on [The Sangai Express - Relief Distribution Challenges](https://www.thesangaiexpress.com) and [Imphal Free Press](https://www.ifp.co.in).
* **Infrastructure & Sanitation Crises:** Regional journalism has continuously documented overflowing latrines, non-functional water filtration units, and the urgent need for infrastructure repairs before monsoon exacerbates health risks. Explore local coverage on [The Sangai Express - Camp Infrastructure Deficits](https://www.thesangaiexpress.com).

---

## The Proposed Solution: Aidera

Aidera is an end-to-end disaster logistics command platform designed specifically to bridge the friction gap between displaced residents inside relief camps and state decision-makers. It transforms every resident with a phone into an active telemetry node, turning raw audio notes and unstructured text grievances into actionable intelligence for emergency responders.

### How Aidera Solves the Crisis

Aidera replaces administrative blind spots and bureaucratic delays with real-time ground visibility through a streamlined four-step workflow:

1. **Eliminating Language & Literacy Barriers**
   Displaced residents do not need to fill out complex forms or navigate difficult paperwork. They can simply tap a button and speak about their household deficits naturally in their local dialect or English. Our **Groq Whisper** integration transcribes their raw observation instantly.

2. **Semantic Triage & Deterministic Guardrails**
   Raw reports pass through a hybrid processing engine. The **Groq LLM** handles semantic extraction and multi-lingual processing, while deterministic keyword overrides act as critical safety guardrails to ensure life-saving medical and sanitation emergencies are never misclassified.

3. **Smart Geospatial Clustering & Anonymized Public Mapping**
   When multiple households within a camp report the same deficit, authorities do not need to process hundreds of separate notifications. Aidera aggregates reports by camp and category, displaying verified pins and live relief deficits on an interactive GIS map. **Privacy Protection:** While residents provide their names and tent numbers for administrative verification inside the camp portal, once a report is published to the public map, all personal credentials are completely stripped away—leaving only an anonymized map pin and aggregate deficit count to safeguard resident identity.

4. **Executive Telemetry & Work-Order Management**
   Government officials and camp administrators receive live situational briefs and macro crisis telemetry (`/api/govt/ai-summary`). They can inspect audio evidence, track real-time resolution statuses, and authorize bulk relief dispatch in a few clicks.

### What Aidera Delivers

* **For Residents (Dignity & Privacy Protection):** A fast, voice-based reporting channel backed by unique reference UUIDs and strict identity shielding when published to public view.
* **For Camp Administrators (Operational Focus):** Isolated camp consoles featuring AI-clustered reports, voice playback, and rapid review controls to manage shelter needs efficiently.
* **For State Authorities (Strategic Oversight):** A centralized government portal providing cross-camp telemetry, priority intelligence briefs, and streamlined work-order management.

---

## Completed Features

| Category | Feature | Status |
| :--- | :--- | :---: |
| **Community Reporting** | Multilingual Voice Recording & Groq Whisper Audio Transcription | ✅ |
| **Community Reporting** | Manual Text Grievance Submissions & Metadata Capture | ✅ |
| **Community Reporting** | 24-Hour Duplicate Submission Rate-Limiting Protection | ✅ |
| **Privacy & Security** | Resident Identity Stripping (Credentials wiped upon public map publication) | ✅ |
| **GIS & Mapping** | Interactive Leaflet GIS Map with Active Camp Pins | ✅ |
| **GIS & Mapping** | Statewide Relief & Donation Hub View with Category Aggregation | ✅ |
| **AI Engine** | **Groq LLM Specific Item Extraction** (Parses local dialects & phrasing into structured item tags like `Item: Food and Water`) | ✅ |
| **AI Engine** | Groq LLM Semantic Triage & Multi-Lingual Categorization | ✅ |
| **AI Engine** | Autonomous Camp Clustering & Vulnerability Urgency Scoring | ✅ |
| **AI Engine** | Automated Government Telemetry Briefings (`/api/govt/ai-summary`) | ✅ |
| **Camp Admin Console** | Secure Passcode Gate (`demo123`) & Camp-Isolated Feeds | ✅ |
| **Camp Admin Console** | Voice Note Audio Playback & Batch Status Review Controls | ✅ |
| **Government Portal** | Cross-Camp Escalation Work Orders & State Action Controls | ✅ |
| **Infrastructure** | Supabase Real-Time Subscriptions & Sync Channels | ✅ |



## Tech Stack

| Layer | Technology / Model | Function |
| :--- | :--- | :--- |
| **Frontend** | React + Vite | Core web application interface & responsive layouts |
| **Styling** | Tailwind CSS | UI system and styling framework |
| **GIS & Mapping** | Leaflet & React Leaflet | Interactive maps for relief camp locations and public donation hubs |
| **Voice Processing** | Groq Whisper API | High-accuracy multilingual audio transcription for local dialects and Hinglish |
| **Backend API** | FastAPI (Python) | Asynchronous backend telemetry, routing, and triage pipelines |
| **AI Intelligence** | Groq LLM API | Semantic triage, category classification, and specific item extraction (`Item: Water Supply`, etc.) |
| **Database & Sync** | Supabase (PostgreSQL) | Real-time telemetry storage, resident reports, and live synchronization channels |
| **Security** | Supabase Auth & RLS | Secure passcodes, camp isolation, and role-based access control |


## Platform User Journeys

```text
Aidera Platform User Journeys
│
├── Journey A: Resident (Reporting & Tracking Pipeline)
│   ├── Step 1: Access Citizen Portal & Select Relief Camp
│   ├── Step 2: Input Grievance (Voice Recording via Groq Whisper or Manual Text)
│   ├── Step 3: Secure Submission -> Generates Unique Reference UUID & Enforces Rate Limits
│   └── Step 4: Audit Real-Time Status via the Built-In Visual Tracker
│
├── Journey B: Camp Administrator (Local Camp Console)
│   ├── Step 1: Secure Passcode Authentication (demo123) for Selected Camp
│   ├── Step 2: Review AI-Clustered Resident Reports & Specific Item Tags
│   ├── Step 3: Inspect Resident Voice Notes and Urgency Analysis
│   └── Step 4: Publish to Public Donation Map (Stripping Personal Credentials) or Escalate to State
│
└── Journey C: Government Nodal Authority (State Command Portal)
    ├── Step 1: Secure State Authentication Gate
    ├── Step 2: Review Groq AI Situational Briefing & Priority Intelligence (`/api/govt/ai-summary`)
    ├── Step 3: Manage Cross-Camp Work Orders & Clustered Deficits
    └── Step 4: Update State Status (In Progress -> Resolved & Fulfilled)



```
## End-to-End Technical Architecture Flow

```text
[ Resident / Displaced Citizen ]
        │
        ├─► [1. Voice Audio / Text] ────► Groq Whisper API (Multilingual Transcription)
        │         │
        │         ▼
        ├─► [2. Semantic & Item Extraction] ─► FastAPI Backend ──► Groq LLM Engine
        │         │                                                   │
        │         ▼                                                   ▼
        │     [ Supabase DB ] ◄────────────────────────────── Assigned Category & Item Tag
        │         │
        │         ▼
        ├─► [3. Camp Aggregation] ─────► Camp Admin Console (Cluster Review & Credential Stripping)
        │         │
        │         ▼
        └─► [4. State Escalation] ─────► Government Portal & AI Situational Briefing (/api/govt/ai-summary)



```
## AI Core Engine Architecture

```text
Aidera AI Core Engine
│
├── 1. Voice Ingestion & Multilingual Transcription Layer
│   └── Component: Groq Whisper API
│       ├── Input: Resident voice recordings (WebM blobs containing local dialects, Hinglish, or regional phrasing)
│       └── Output: High-accuracy timestamped transcript text
│
├── 2. Semantic Triage & Specific Item Extraction
│   └── Component: Groq LLM Engine + Deterministic Guardrails
│       ├── Input: Raw resident grievance transcript / text
│       └── Processing: Semantic analysis combined with safety keyword overrides for high-priority sectors
│       └── Output: Standardized categories (Food, Medical, Sanitation, Winter Wear) & structured item tags (e.g., `Item: Water Supply`, `Item: Latrine Repair`)
│
├── 3. Autonomous Cluster Analysis & Urgency Scoring
│   └── Component: Backend Aggregation & Ruleset Engine
│       ├── Processing: Grouping household reports by camp and scanning for vulnerability keywords (children, elderly, medical, fever)
│       └── Output: Dynamic urgency scoring and actionable crisis clusters
│
└── 4. Executive Telemetry Summarization
    └── Component: `/api/govt/ai-summary` Endpoint
        ├── Processing: Synthesis of live state escalation metrics and cross-camp deficits
        └── Output: Dynamic headlines, priority tiers, and executive briefing summaries for state authorities





```
## Platform Impact

### For Displaced Residents (Dignity & Privacy Protection)
* **Zero-Barrier Voice Reporting:** Groq Whisper empowers residents to report critical shelter deficits instantly in local dialects or Hinglish, entirely bypassing literacy and bureaucratic hurdles.
* **Identity Shielding:** Personal credentials (names and tent numbers) used for local camp verification are completely stripped away when reports are published to the public map, safeguarding resident privacy.
* **Transparent Tracking:** Unique reference UUIDs and visual milestone timelines allow residents to audit their report status in real time.

### For Camp Administrators (Operational Efficiency)
* **AI-Powered Item & Cluster Parsing:** Groq LLM automatically parses unstructured grievances into structured item tags (e.g., `Item: Water Supply`, `Item: Latrine Repair`), eliminating duplicate administrative overhead.
* **Actionable Triage:** Instantly highlights critical health or sanitation deficits so camp managers can prioritize life-saving interventions and coordinate relief efficiently.

### For State Authorities (Strategic Oversight)
* **Centralized Telemetry & Briefings:** Provides a unified command dashboard featuring live AI situational briefings (`/api/govt/ai-summary`) aggregating cross-camp deficits.
* **Streamlined Accountability:** Replaces chaotic communication channels with verifiable work-order controls, audio inspection tools, and secure audit trails.




## Team Glitch

* Chongtham Allen
* James Khuraijam
* Khuraijam Dijen
* Surjakanta Thangjam