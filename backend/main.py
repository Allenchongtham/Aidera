from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
import traceback
from dotenv import load_dotenv
from groq import Groq
from supabase import create_client, Client

load_dotenv()

app = FastAPI(title="Aidera AI Logistics Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq Client
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Initialize Supabase Admin Client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

class ReportIngest(BaseModel):
    camp_id: str
    resident_name: str
    tent_number: str
    raw_input: str
    category: str

@app.get("/")
def read_root():
    return {"status": "Aidera Backend Engine Online", "ai_model": "openai/gpt-oss-20b"}

@app.post("/api/audio/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        temp_file_path = f"temp_{file.filename}"
        with open(temp_file_path, "wb") as buffer:
            buffer.write(await file.read())

        with open(temp_file_path, "rb") as audio_file:
            transcription = groq_client.audio.transcriptions.create(
                file=(temp_file_path, audio_file.read()),
                model="whisper-large-v3-turbo",
                prompt="Accurately transcribe phonetic local terms or English mixed speech in relief camps, such as cheng, kompor, ishing, idan, latrin, toilet."
            )

        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

        return {"status": "success", "text": transcription.text}

    except Exception as e:
        print("--- AUDIO TRANSCRIPTION ERROR ---")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/govt/ai-summary")
def generate_govt_summary():
    try:
        camps_res = supabase.table("camps").select("*").execute()
        camp_map = {c["id"]: c["name"] for c in (camps_res.data or [])}

        response = supabase.table("resident_reports").select("*").eq("review_status", "ESCALATED_GOVT").execute()
        reports = response.data or []

        if not reports:
            return {
                "priority_level": "STABLE",
                "headline": "All Systems Stable",
                "summary": "No escalated state grievances currently pending review."
            }

        formatted_reports = []
        for r in reports:
            raw_camp_id = r.get("camp_id")
            camp_name = camp_map.get(raw_camp_id, "Relief Camp")
            formatted_reports.append({
                "camp_name": camp_name,
                "general_category": r.get("category"),
                "specific_item": r.get("specific_item"),
                "quantity": r.get("quantity"),
                "raw_input": r.get("raw_input")
            })

        reports_text = json.dumps(formatted_reports)

        prompt = f"""
        You are an elite state disaster management AI analyst for Manipur. 
        Analyze these live escalated grievances from relief camps: {reports_text}
        
        You must evaluate crisis severity with strict prioritization: Medical, health, and vaccination emergencies MUST always be classified as the #1 Critical Priority.
        When writing the headline and summary, ALWAYS use the official camp names provided (e.g., "Relief Camp 1 - Imphal West"), never use raw IDs or UUID strings.
        
        Return ONLY a valid JSON object with these keys:
        - "priority_level": string ("CRITICAL_MEDICAL", "HIGH_DEMAND", or "STABLE")
        - "headline": string (A punchy headline for state authorities referencing the specific camp name)
        - "summary": string (A concise 2-sentence professional narrative describing the bottlenecks and recommending immediate triage actions for that camp.)
        """

        completion = groq_client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )

        ai_analysis = json.loads(completion.choices[0].message.content)
        return ai_analysis

    except Exception as e:
        print("--- GOVT SUMMARY ERROR ---")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/reports/ingest")
def ingest_report(report: ReportIngest):
    try:
        prompt = f"""
        You are an elite AI triage engine for emergency relief camps in Manipur. 
        Analyze this citizen grievance text: "{report.raw_input}"
        The user-selected category hint is: "{report.category}".
        
        CRITICAL DIALECT & CATEGORY TRANSLATION RULES:
        - "cheng", "mongi cheng", "cheng kannei", "chakkang" refer strictly to RICE and FOOD provisions. They are NEVER water or sanitation.
        - "ishing", "ishing kouba" refer to water supply.
        - "latrin", "toilet", "bathroom", "washroom", "drain", "sewage", "faecal waste" refer strictly to Sanitation.
        - "hidak" refers to medical/medicine.
        
        Extract and return ONLY a valid JSON object with these exact keys:
        - "general_category": string (Strictly choose ONE of these four: "Food", "Winter Wear", "Medical", "Sanitation")
        - "specific_item": string (A concise 2-4 word summary of the exact item or need, e.g., "Rice Pack Needed", "Winter Blankets", "Latrine Repair", "Drinking Water")
        - "quantity": integer (extracted count from text, default to 1 if unspecified)
        - "urgency": string ("High", "Medium", or "Low")
        - "confidence_score": integer (between 80 and 99)
        """

        completion = groq_client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )

        raw_content = completion.choices[0].message.content
        ai_data = json.loads(raw_content)

        # DETERMINISTIC OVERRIDE: Prioritize categories cleanly with explicit sanitation terms
        specific_lower = ai_data.get("specific_item", "").lower()
        raw_input_lower = report.raw_input.lower()
        combined_text = f"{specific_lower} {raw_input_lower}"
        
        if any(w in combined_text for w in ["rice", "cheng", "food", "potato", "dal", "vegetable", "cang", "chng", "mongi", "chakkang"]):
            general_cat = "Food"
        elif any(w in combined_text for w in ["doctor", "medicine", "hidak", "naba", "vaccination", "health", "medical", "dengue", "sick", "fever", "leina"]):
            general_cat = "Medical"
        elif any(w in combined_text for w in ["blanket", "jacket", "winter", "phurit", "phiron", "kompor", "kampor", "warm"]):
            general_cat = "Winter Wear"
        elif any(w in combined_text for w in ["latrin", "latrine", "toilet", "bathroom", "washroom", "sanitation", "ishing", "water", "wash", "drain", "sewage"]):
            general_cat = "Sanitation"
        else:
            ai_gen = ai_data.get("general_category", "Food")
            general_cat = ai_gen if ai_gen in ["Food", "Winter Wear", "Medical", "Sanitation"] else "Food"

        db_payload = {
            "camp_id": report.camp_id,
            "resident_name": report.resident_name,
            "tent_number": report.tent_number,
            "raw_input": report.raw_input,
            "category": general_cat,
            "specific_item": ai_data.get("specific_item", report.category),
            "quantity": int(ai_data.get("quantity", 1)),
            "status": "PENDING",
            "review_status": "PENDING_REVIEW",  
            "govt_status": "NOT_ESCALATED"       
        }

        db_response = supabase.table("resident_reports").insert(db_payload).execute()

        return {
            "status": "success",
            "message": "Report processed successfully with verified category routing.",
            "ai_extraction": ai_data,
            "db_record": db_response.data
        }

    except Exception as e:
        print("--- BACKEND ERROR TRACEBACK ---")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))