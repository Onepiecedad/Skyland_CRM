from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, Path as PathParam
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from databases import Database
import os
import logging
from pathlib import Path
from dotenv import load_dotenv
import uuid

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database connection
DATABASE_URL = os.environ['DATABASE_URL']
database = Database(DATABASE_URL)

# API Token for authentication
API_TOKEN = os.environ['API_TOKEN']

# Create the main app
app = FastAPI(title="Skyland CRM API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Pydantic Models
class Customer(BaseModel):
    customer_id: uuid.UUID
    name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    created_at: datetime
    updated_at: datetime

class CustomerOverview(BaseModel):
    customer_id: uuid.UUID
    name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    latest_inbox_id: Optional[uuid.UUID]
    latest_activity_at: Optional[datetime]
    latest_message: Optional[str]
    latest_service_type: Optional[str]
    latest_vehicle_type: Optional[str]
    unread_messages: int
    total_messages: int
    open_leads: int

class CustomerThread(BaseModel):
    customer_id: uuid.UUID
    event_type: str  # message, lead_created, lead_updated
    occurred_at: datetime
    title: Optional[str]
    body: Optional[str]
    ref_inbox_id: Optional[uuid.UUID]
    ref_lead_id: Optional[uuid.UUID]
    status: Optional[str]
    channel: Optional[str]
    source: Optional[str]

class Lead(BaseModel):
    lead_id: uuid.UUID
    customer_id: uuid.UUID
    inbox_ref: Optional[uuid.UUID]
    intent: Optional[str]
    status: Optional[str]
    channel: Optional[str]
    summary: Optional[str]
    description: Optional[str]
    urgency: Optional[str]
    urgency_score: Optional[int]
    expected_close_date: Optional[date]
    created_at: datetime
    updated_at: datetime
    dedupe_key: Optional[str]

class Inbox(BaseModel):
    inbox_id: uuid.UUID
    source: Optional[str]
    channel: Optional[str]
    type: Optional[str]
    name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    service_type: Optional[str]
    message_raw: Optional[str]
    ai_json: Optional[Dict[str, Any]]
    dedupe_key: Optional[str]
    received_at: Optional[datetime]
    status: Optional[str]
    urgency_score: Optional[int]
    urgency_level: Optional[str]
    customer_id: Optional[uuid.UUID]
    created_at: datetime
    updated_at: datetime

# Authentication dependency
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials != API_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    return credentials

# API Endpoints

@api_router.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Skyland CRM API is running"}

@api_router.get("/customers/overview", response_model=List[CustomerOverview])
async def get_customers_overview(
    q: Optional[str] = Query(None, description="Search name/email/phone"),
    sort: str = Query("latest_activity_at desc", description="Sort field and direction"),
    has_unread: Optional[bool] = Query(None, description="Filter by unread messages"),
    has_open_leads: Optional[bool] = Query(None, description="Filter by open leads"),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    _: str = Depends(verify_token)
):
    """Get customers overview with filters and sorting"""
    
    query = """
    SELECT customer_id, name, email, phone, latest_inbox_id, latest_activity_at,
           latest_message, latest_service_type, latest_vehicle_type,
           unread_messages, total_messages, open_leads
    FROM public.customer_overview
    WHERE 1=1
    """
    
    values = {}
    
    # Add search filter
    if q:
        query += " AND (name ILIKE :search OR email ILIKE :search OR phone ILIKE :search)"
        values['search'] = f"%{q}%"
    
    # Add unread messages filter
    if has_unread is not None:
        if has_unread:
            query += " AND unread_messages > 0"
        else:
            query += " AND unread_messages = 0"
    
    # Add open leads filter
    if has_open_leads is not None:
        if has_open_leads:
            query += " AND open_leads > 0"
        else:
            query += " AND open_leads = 0"
    
    # Add sorting
    valid_sorts = ["latest_activity_at desc", "latest_activity_at asc", "name asc", "name desc"]
    if sort in valid_sorts:
        query += f" ORDER BY {sort}"
    else:
        query += " ORDER BY latest_activity_at DESC"
    
    # Add pagination
    query += " LIMIT :limit OFFSET :offset"
    values.update({'limit': limit, 'offset': offset})
    
    try:
        rows = await database.fetch_all(query=query, values=values)
        return [CustomerOverview(**dict(row)) for row in rows]
    except Exception as e:
        logger.error(f"Error fetching customers overview: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(
    customer_id: uuid.UUID = PathParam(...),
    _: str = Depends(verify_token)
):
    """Get individual customer details"""
    
    query = """
    SELECT customer_id, name, email, phone, created_at, updated_at
    FROM public.customers
    WHERE customer_id = :customer_id
    """
    
    try:
        row = await database.fetch_one(query=query, values={'customer_id': customer_id})
        if not row:
            raise HTTPException(status_code=404, detail="Customer not found")
        return Customer(**dict(row))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching customer {customer_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/customers/{customer_id}/thread", response_model=List[CustomerThread])
async def get_customer_thread(
    customer_id: uuid.UUID = PathParam(...),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    _: str = Depends(verify_token)
):
    """Get customer thread (messages + lead events timeline)"""
    
    query = """
    SELECT customer_id, event_type, occurred_at, title, body,
           ref_inbox_id, ref_lead_id, status, channel, source
    FROM public.customer_thread
    WHERE customer_id = :customer_id
    ORDER BY occurred_at DESC
    LIMIT :limit OFFSET :offset
    """
    
    try:
        rows = await database.fetch_all(query=query, values={
            'customer_id': customer_id,
            'limit': limit,
            'offset': offset
        })
        return [CustomerThread(**dict(row)) for row in rows]
    except Exception as e:
        logger.error(f"Error fetching customer thread for {customer_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/leads", response_model=List[Lead])
async def get_leads(
    status: Optional[str] = Query(None, description="Filter by status"),
    intent: Optional[str] = Query(None, description="Filter by intent"),
    urgency: Optional[str] = Query(None, description="Filter by urgency"),
    customer_id: Optional[uuid.UUID] = Query(None, description="Filter by customer"),
    channel: Optional[str] = Query(None, description="Filter by channel"),
    sort: str = Query("updated_at desc", description="Sort field and direction"),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    _: str = Depends(verify_token)
):
    """Get leads with filtering and sorting"""
    
    query = """
    SELECT lead_id, customer_id, inbox_ref, intent, status, channel,
           summary, description, urgency, urgency_score, expected_close_date,
           created_at, updated_at, dedupe_key
    FROM public.leads
    WHERE 1=1
    """
    
    values = {}
    
    # Add filters
    if status:
        query += " AND status = :status"
        values['status'] = status
    
    if intent:
        query += " AND intent = :intent"
        values['intent'] = intent
    
    if urgency:
        query += " AND urgency = :urgency"
        values['urgency'] = urgency
    
    if customer_id:
        query += " AND customer_id = :customer_id"
        values['customer_id'] = customer_id
    
    if channel:
        query += " AND channel = :channel"
        values['channel'] = channel
    
    # Add sorting
    valid_sorts = ["updated_at desc", "updated_at asc", "created_at desc", "created_at asc", "expected_close_date desc", "expected_close_date asc"]
    if sort in valid_sorts:
        query += f" ORDER BY {sort}"
    else:
        query += " ORDER BY updated_at DESC"
    
    # Add pagination
    query += " LIMIT :limit OFFSET :offset"
    values.update({'limit': limit, 'offset': offset})
    
    try:
        rows = await database.fetch_all(query=query, values=values)
        return [Lead(**dict(row)) for row in rows]
    except Exception as e:
        logger.error(f"Error fetching leads: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/inbox", response_model=List[Inbox])
async def get_inbox(
    customer_id: Optional[uuid.UUID] = Query(None, description="Filter by customer (null for unlinked)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    type: Optional[str] = Query(None, description="Filter by type"),
    source: Optional[str] = Query(None, description="Filter by source"),
    channel: Optional[str] = Query(None, description="Filter by channel"),
    unlinked_only: bool = Query(False, description="Show only unlinked messages"),
    sort: str = Query("received_at desc", description="Sort field and direction"),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    _: str = Depends(verify_token)
):
    """Get inbox messages with filtering"""
    
    query = """
    SELECT inbox_id, source, channel, type, name, email, phone, service_type,
           message_raw, ai_json, dedupe_key, received_at, status, urgency_score,
           urgency_level, customer_id, created_at, updated_at
    FROM public.inbox
    WHERE 1=1
    """
    
    values = {}
    
    # Handle unlinked filter (common use case)
    if unlinked_only:
        query += " AND customer_id IS NULL"
    elif customer_id is not None:
        query += " AND customer_id = :customer_id"
        values['customer_id'] = customer_id
    
    # Add other filters
    if status:
        query += " AND status = :status"
        values['status'] = status
    
    if type:
        query += " AND type = :type"
        values['type'] = type
    
    if source:
        query += " AND source = :source"
        values['source'] = source
    
    if channel:
        query += " AND channel = :channel"
        values['channel'] = channel
    
    # Add sorting
    valid_sorts = ["received_at desc", "received_at asc", "created_at desc", "created_at asc"]
    if sort in valid_sorts:
        query += f" ORDER BY {sort}"
    else:
        query += " ORDER BY received_at DESC"
    
    # Add pagination
    query += " LIMIT :limit OFFSET :offset"
    values.update({'limit': limit, 'offset': offset})
    
    try:
        rows = await database.fetch_all(query=query, values=values)
        return [Inbox(**dict(row)) for row in rows]
    except Exception as e:
        logger.error(f"Error fetching inbox: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Include the router in the main app
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection events
@app.on_event("startup")
async def startup():
    await database.connect()
    logger.info("Database connected")

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()
    logger.info("Database disconnected")