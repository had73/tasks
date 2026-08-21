from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import re
import uuid
import logging
import bcrypt
import jwt as pyjwt
import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from motor.motor_asyncio import AsyncIOMotorClient

# ---------- Setup ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

app = FastAPI(title="TaskFlow API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("taskflow")

# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7),
               "type": "access"}
    return pyjwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def strip_id(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    # also support session_token cookie (Google)
    session_token = request.cookies.get("session_token")
    if session_token and not token:
        sess = await db.google_sessions.find_one({"session_token": session_token})
        if sess:
            exp = sess.get("expires_at")
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp and exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp and exp > datetime.now(timezone.utc):
                user = await db.users.find_one({"id": sess["user_id"]}, {"_id": 0, "password_hash": 0})
                if user:
                    return user
        raise HTTPException(status_code=401, detail="Session expired")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Account disabled")
    return user

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin required")
    return user

def set_auth_cookie(response: Response, token: str):
    response.set_cookie("access_token", token, httponly=True, secure=True,
                        samesite="none", max_age=7 * 24 * 3600, path="/")

# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    first_name: str
    last_name: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    first_name: str
    last_name: str
    avatar_url: Optional[str] = None
    role: str
    active: bool = True
    created_at: str

class UserAdminUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = None
    active: Optional[bool] = None

class LabelIn(BaseModel):
    name: str
    description: Optional[str] = ""
    color: str = "#64748b"
    active: bool = True

class StatusIn(BaseModel):
    name: str
    color: str = "#64748b"
    order: int = 0
    active: bool = True
    is_terminal: bool = False

class TaskIn(BaseModel):
    title: str
    description_html: Optional[str] = ""
    due_date: Optional[str] = None
    status_id: str
    label_ids: List[str] = []
    assignee_ids: List[str] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description_html: Optional[str] = None
    due_date: Optional[str] = None
    status_id: Optional[str] = None
    label_ids: Optional[List[str]] = None
    assignee_ids: Optional[List[str]] = None

# ---------- Sanitize HTML (basic) ----------
_SCRIPT_RE = re.compile(r"<\s*script.*?>.*?<\s*/\s*script\s*>", re.IGNORECASE | re.DOTALL)
_STYLE_RE = re.compile(r"<\s*style.*?>.*?<\s*/\s*style\s*>", re.IGNORECASE | re.DOTALL)
_ONEVENT_QUOTED = re.compile(r"\son\w+\s*=\s*(\"[^\"]*\"|'[^']*')", re.IGNORECASE)
_ONEVENT_UNQUOTED = re.compile(r"\son\w+\s*=\s*[^\s>]+", re.IGNORECASE)
_JS_URL = re.compile(r"(href|src)\s*=\s*(\"|'|)\s*javascript:[^\s\"'>]*", re.IGNORECASE)

def sanitize_html(html: str) -> str:
    if not html:
        return ""
    html = _SCRIPT_RE.sub("", html)
    html = _STYLE_RE.sub("", html)
    html = _ONEVENT_QUOTED.sub("", html)
    html = _ONEVENT_UNQUOTED.sub("", html)
    html = _JS_URL.sub(r"\1=\2#\2", html)
    return html.replace("=#", "=\"#\"")

# ---------- Auth Endpoints ----------
@api.post("/auth/register")
async def register(data: RegisterIn, response: Response):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email již existuje")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id, "email": email,
        "password_hash": hash_password(data.password),
        "first_name": data.first_name, "last_name": data.last_name,
        "avatar_url": None, "role": "user", "active": True,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    set_auth_cookie(response, token)
    return {**strip_id(doc), "token": token}

@api.post("/auth/login")
async def login(data: LoginIn, response: Response):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Neplatné přihlašovací údaje")
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Účet je deaktivován")
    token = create_access_token(user["id"], email)
    set_auth_cookie(response, token)
    return {**strip_id(user), "token": token}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

@api.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session id")
    async with httpx.AsyncClient(timeout=15) as h:
        r = await h.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Google auth selhal")
    data = r.json()
    email = data["email"].lower()
    user = await db.users.find_one({"email": email})
    if not user:
        user_id = str(uuid.uuid4())
        name_parts = (data.get("name") or "").strip().split(" ", 1)
        user_doc = {
            "id": user_id, "email": email, "password_hash": None,
            "first_name": name_parts[0] if name_parts else "Uživatel",
            "last_name": name_parts[1] if len(name_parts) > 1 else "",
            "avatar_url": data.get("picture"),
            "role": "admin" if email == os.environ.get("ADMIN_EMAIL", "").lower() else "user",
            "active": True, "created_at": now_iso(),
        }
        await db.users.insert_one(user_doc)
        user = user_doc
    session_token = data["session_token"]
    await db.google_sessions.insert_one({
        "session_token": session_token, "user_id": user["id"],
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
    })
    response.set_cookie("session_token", session_token, httponly=True, secure=True,
                        samesite="none", max_age=7 * 24 * 3600, path="/")
    return strip_id(dict(user))

# ---------- Users ----------
@api.get("/users")
async def list_users(user: dict = Depends(get_current_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    return users

@api.patch("/users/{user_id}")
async def admin_update_user(user_id: str, data: UserAdminUpdate, admin: dict = Depends(require_admin)):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user_id}, {"$set": updates})
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return u

@api.delete("/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(400, "Nemůžete smazat sebe")
    await db.users.update_one({"id": user_id}, {"$set": {"active": False}})
    return {"ok": True}

# ---------- Labels ----------
@api.get("/labels")
async def list_labels(user: dict = Depends(get_current_user)):
    return await db.labels.find({}, {"_id": 0}).to_list(500)

@api.post("/labels")
async def create_label(data: LabelIn, admin: dict = Depends(require_admin)):
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": now_iso()}
    await db.labels.insert_one(doc)
    return strip_id(doc)

@api.patch("/labels/{label_id}")
async def update_label(label_id: str, data: LabelIn, admin: dict = Depends(require_admin)):
    await db.labels.update_one({"id": label_id}, {"$set": data.model_dump()})
    return await db.labels.find_one({"id": label_id}, {"_id": 0})

@api.delete("/labels/{label_id}")
async def delete_label(label_id: str, admin: dict = Depends(require_admin)):
    await db.labels.delete_one({"id": label_id})
    return {"ok": True}

# ---------- Statuses ----------
@api.get("/statuses")
async def list_statuses(user: dict = Depends(get_current_user)):
    items = await db.statuses.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    return items

@api.post("/statuses")
async def create_status(data: StatusIn, admin: dict = Depends(require_admin)):
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": now_iso()}
    await db.statuses.insert_one(doc)
    return strip_id(doc)

@api.patch("/statuses/{sid}")
async def update_status(sid: str, data: StatusIn, admin: dict = Depends(require_admin)):
    await db.statuses.update_one({"id": sid}, {"$set": data.model_dump()})
    return await db.statuses.find_one({"id": sid}, {"_id": 0})

@api.delete("/statuses/{sid}")
async def delete_status(sid: str, admin: dict = Depends(require_admin)):
    if await db.tasks.find_one({"status_id": sid}):
        raise HTTPException(400, "Stav je používán úkoly")
    await db.statuses.delete_one({"id": sid})
    return {"ok": True}

# ---------- Tasks ----------
async def add_history(task_id: str, user_id: str, changes: dict):
    entries = []
    for k, v in changes.items():
        entries.append({
            "id": str(uuid.uuid4()), "task_id": task_id, "user_id": user_id,
            "field": k, "old_value": v.get("old"), "new_value": v.get("new"),
            "timestamp": now_iso(),
        })
    if entries:
        await db.task_history.insert_many(entries)

@api.get("/tasks")
async def list_tasks(
    user: dict = Depends(get_current_user),
    q: Optional[str] = None,
    status_id: Optional[str] = None,
    label_id: Optional[str] = None,
    assignee_id: Optional[str] = None,
    due_from: Optional[str] = None,
    due_to: Optional[str] = None,
    author_id: Optional[str] = None,
):
    query: dict = {}
    if status_id:
        query["status_id"] = status_id
    if label_id:
        query["label_ids"] = label_id
    if assignee_id:
        query["assignee_ids"] = assignee_id
    if author_id:
        query["author_id"] = author_id
    if due_from or due_to:
        query["due_date"] = {}
        if due_from:
            query["due_date"]["$gte"] = due_from
        if due_to:
            query["due_date"]["$lte"] = due_to
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"title": rx}, {"description_html": rx}]
    tasks = await db.tasks.find(query, {"_id": 0}).to_list(2000)
    return tasks

@api.post("/tasks")
async def create_task(data: TaskIn, user: dict = Depends(get_current_user)):
    tid = str(uuid.uuid4())
    doc = {
        "id": tid, "title": data.title,
        "description_html": sanitize_html(data.description_html or ""),
        "due_date": data.due_date, "status_id": data.status_id,
        "label_ids": data.label_ids, "assignee_ids": data.assignee_ids,
        "author_id": user["id"],
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.tasks.insert_one(doc)
    await add_history(tid, user["id"], {"created": {"old": None, "new": data.title}})
    return strip_id(doc)

@api.get("/tasks/{tid}")
async def get_task(tid: str, user: dict = Depends(get_current_user)):
    t = await db.tasks.find_one({"id": tid}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Úkol nenalezen")
    return t

@api.patch("/tasks/{tid}")
async def update_task(tid: str, data: TaskUpdate, user: dict = Depends(get_current_user)):
    existing = await db.tasks.find_one({"id": tid}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Úkol nenalezen")
    payload = data.model_dump(exclude_unset=True)
    if "description_html" in payload:
        payload["description_html"] = sanitize_html(payload["description_html"] or "")
    changes = {}
    for k, v in payload.items():
        if existing.get(k) != v:
            changes[k] = {"old": existing.get(k), "new": v}
    payload["updated_at"] = now_iso()
    await db.tasks.update_one({"id": tid}, {"$set": payload})
    await add_history(tid, user["id"], changes)
    return await db.tasks.find_one({"id": tid}, {"_id": 0})

@api.delete("/tasks/{tid}")
async def delete_task(tid: str, user: dict = Depends(get_current_user)):
    t = await db.tasks.find_one({"id": tid})
    if not t:
        raise HTTPException(404, "Úkol nenalezen")
    if user["role"] != "admin" and t.get("author_id") != user["id"]:
        raise HTTPException(403, "Nedostatečné oprávnění")
    await db.tasks.delete_one({"id": tid})
    await db.task_history.delete_many({"task_id": tid})
    return {"ok": True}

@api.get("/tasks/{tid}/history")
async def task_history(tid: str, user: dict = Depends(get_current_user)):
    items = await db.task_history.find({"task_id": tid}, {"_id": 0}).sort("timestamp", -1).to_list(500)
    return items

# ---------- Dashboard ----------
@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(5000)
    statuses = await db.statuses.find({}, {"_id": 0}).to_list(500)
    labels = await db.labels.find({}, {"_id": 0}).to_list(500)
    terminal_ids = {s["id"] for s in statuses if s.get("is_terminal")}
    today = datetime.now(timezone.utc).date().isoformat()
    week_end = (datetime.now(timezone.utc) + timedelta(days=7)).date().isoformat()
    open_tasks = [t for t in tasks if t.get("status_id") not in terminal_ids]
    overdue = [t for t in open_tasks if t.get("due_date") and t["due_date"] < today]
    due_today = [t for t in open_tasks if t.get("due_date") == today]
    due_week = [t for t in open_tasks if t.get("due_date") and today <= t["due_date"] <= week_end]
    my_tasks = [t for t in open_tasks if user["id"] in (t.get("assignee_ids") or [])]
    by_status = {s["id"]: len([t for t in tasks if t.get("status_id") == s["id"]]) for s in statuses}
    by_label = {l["id"]: len([t for t in tasks if l["id"] in (t.get("label_ids") or [])]) for l in labels}
    recent = sorted(tasks, key=lambda t: t.get("updated_at", ""), reverse=True)[:6]
    return {
        "open_count": len(open_tasks),
        "overdue_count": len(overdue),
        "today_count": len(due_today),
        "week_count": len(due_week),
        "my_count": len(my_tasks),
        "by_status": by_status,
        "by_label": by_label,
        "recent": recent,
    }

# ---------- Seed ----------
async def seed_data():
    await db.users.create_index("email", unique=True)
    await db.tasks.create_index("status_id")
    await db.tasks.create_index("due_date")

    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_pw = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": admin_email,
            "password_hash": hash_password(admin_pw),
            "first_name": "Martin", "last_name": "Hadrava",
            "avatar_url": None, "role": "admin", "active": True,
            "created_at": now_iso(),
        })
    elif existing.get("password_hash") and not verify_password(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_pw), "role": "admin"}})

    # Demo users
    demo = [
        ("anna.novakova@taskflow.dev", "Anna", "Nováková",
         "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop"),
        ("jan.svoboda@taskflow.dev", "Jan", "Svoboda",
         "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop"),
        ("petra.dvorakova@taskflow.dev", "Petra", "Dvořáková",
         "https://images.unsplash.com/photo-1609436132311-e4b0c9370469?w=200&h=200&fit=crop"),
        ("tomas.horak@taskflow.dev", "Tomáš", "Horák",
         "https://images.pexels.com/photos/37148308/pexels-photo-37148308.jpeg?w=200&h=200&fit=crop"),
    ]
    for email, fn, ln, avatar in demo:
        if not await db.users.find_one({"email": email}):
            await db.users.insert_one({
                "id": str(uuid.uuid4()), "email": email,
                "password_hash": hash_password("User123!"),
                "first_name": fn, "last_name": ln,
                "avatar_url": avatar, "role": "user", "active": True,
                "created_at": now_iso(),
            })

    # Statuses
    default_statuses = [
        ("Nový", "#3b82f6", 1, False),
        ("Rozpracovaný", "#a855f7", 2, False),
        ("Čeká na vyřízení", "#f59e0b", 3, False),
        ("Dokončený", "#10b981", 4, True),
        ("Zrušený", "#64748b", 5, True),
    ]
    if await db.statuses.count_documents({}) == 0:
        for name, color, order, terminal in default_statuses:
            await db.statuses.insert_one({
                "id": str(uuid.uuid4()), "name": name, "color": color,
                "order": order, "active": True, "is_terminal": terminal,
                "created_at": now_iso(),
            })

    # Labels
    default_labels = [
        ("Marketing", "#f43f5e", "Marketingové aktivity"),
        ("Vývoj", "#3b82f6", "Vývoj produktu"),
        ("Design", "#a855f7", "UX/UI a grafika"),
        ("Urgentní", "#ef4444", "Nejvyšší priorita"),
        ("Backlog", "#64748b", "Odložené úkoly"),
    ]
    if await db.labels.count_documents({}) == 0:
        for name, color, desc in default_labels:
            await db.labels.insert_one({
                "id": str(uuid.uuid4()), "name": name, "color": color,
                "description": desc, "active": True, "created_at": now_iso(),
            })

    # Tasks
    if await db.tasks.count_documents({}) == 0:
        users_all = await db.users.find({}, {"_id": 0}).to_list(50)
        statuses = await db.statuses.find({}, {"_id": 0}).sort("order", 1).to_list(50)
        labels = await db.labels.find({}, {"_id": 0}).to_list(50)
        admin = next(u for u in users_all if u["email"] == admin_email)
        others = [u for u in users_all if u["email"] != admin_email]
        today = datetime.now(timezone.utc).date()
        samples = [
            ("Q4 marketingová kampaň", "<h2>Cíl</h2><p>Připravit <strong>kampaň pro čtvrté čtvrtletí</strong> s důrazem na sociální sítě.</p><ul><li>Rozpočet</li><li>Kanály</li><li>KPI</li></ul>",
             -3, 0, [0], [0, 1]),
            ("Redesign přihlašovací stránky", "<p>Nový vizuál v souladu s <em>Material Design</em> principy.</p>",
             2, 1, [2], [1]),
            ("API pro mobilní aplikaci", "<h3>Endpointy</h3><ol><li>Autentizace</li><li>Úkoly</li><li>Uživatelé</li></ol>",
             7, 1, [1], [2, 3]),
            ("Onboarding pro nové zaměstnance", "<blockquote>Vytvořit jednotný proces onboardingu.</blockquote>",
             14, 0, [4], [0]),
            ("Oprava kritické chyby v exportu", "<p><strong>Priorita: vysoká.</strong> Export CSV padá při větším množství dat.</p>",
             0, 2, [3, 1], [1, 2]),
            ("Prezentace pro board meeting", "<p>Roadmapa Q1 a výsledky Q4.</p>",
             -1, 3, [0], [0]),
            ("Migrace databáze", "<p>Migrace na novou verzi MongoDB.</p>", 21, 0, [1, 3], [3]),
            ("Zákaznický průzkum", "<p>Rozeslat dotazník key zákazníkům.</p>", 5, 1, [0, 4], [2, 0]),
        ]
        for title, desc, due_offset, st_idx, lb_idxs, as_idxs in samples:
            due = (today + timedelta(days=due_offset)).isoformat()
            assignees = [others[i]["id"] for i in as_idxs if i < len(others)]
            lbls = [labels[i]["id"] for i in lb_idxs if i < len(labels)]
            await db.tasks.insert_one({
                "id": str(uuid.uuid4()), "title": title,
                "description_html": desc, "due_date": due,
                "status_id": statuses[st_idx]["id"],
                "label_ids": lbls, "assignee_ids": assignees,
                "author_id": admin["id"],
                "created_at": now_iso(), "updated_at": now_iso(),
            })

@app.on_event("startup")
async def on_startup():
    try:
        await seed_data()
        logger.info("Seed complete")
    except Exception as e:
        logger.exception(f"Seed error: {e}")

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()
