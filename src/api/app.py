"""
FastAPI application for Autonoma.
"""

import json
import logging
import os
import uuid
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Union

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse
import asyncio
from typing import AsyncGenerator, Dict, List, Any

from src.agent.graph import build_graph
from src.config.team import TEAM_MEMBERS, TEAM_MEMBER_CONFIGRATIONS
from src.workflows.stream_workflow import run_agent_workflow
from dotenv import load_dotenv

load_dotenv()

BROWSER_HISTORY_DIR = os.getenv("BROWSER_HISTORY_DIR", "history/browser_history")
CHAT_HISTORY_DIR = os.getenv("CHAT_HISTORY_DIR", "history/chat_history")
CHAT_FOLDERS_DIR = os.path.join(CHAT_HISTORY_DIR, "folders")

# Ensure directories exist
os.makedirs(CHAT_HISTORY_DIR, exist_ok=True)
os.makedirs(CHAT_FOLDERS_DIR, exist_ok=True)

# Configure logging
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Autonoma API",
    description="API for Autonoma LangGraph-based agent workflow",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Create the graph
graph = build_graph()


class ContentItem(BaseModel):
    type: str = Field(..., description="The type of content (text, image, etc.)")
    text: Optional[str] = Field(None, description="The text content if type is 'text'")
    image_url: Optional[str] = Field(
        None, description="The image URL if type is 'image'"
    )


class ChatMessage(BaseModel):
    role: str = Field(
        ..., description="The role of the message sender (user or assistant)"
    )
    content: Union[str, List[ContentItem]] = Field(
        ...,
        description="The content of the message, either a string or a list of content items",
    )


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., description="The user input")
    debug: Optional[bool] = Field(False, description="Whether to enable debug logging")
    deep_thinking_mode: Optional[bool] = Field(
        False, description="Whether to enable deep thinking mode"
    )
    search_before_planning: Optional[bool] = Field(
        False, description="Whether to search before planning"
    )
    team_members: Optional[list] = Field(None, description="enabled team members")
    thread_id: Optional[str] = Field(
        "default", description="a specifc conversation identifier"
    )


class ChatFolder(BaseModel):
    """Folder for organizing chats"""
    name: str = Field(..., description="The name of the folder")
    folder_id: str = Field(..., description="The unique ID of the folder")
    created_at: datetime = Field(default_factory=datetime.now, description="When the folder was created")


class CreateFolderRequest(BaseModel):
    """Request to create a new folder"""
    name: str = Field(..., description="The name of the folder")


class AssignChatToFolderRequest(BaseModel):
    """Request to assign a chat to a folder"""
    folder_id: str = Field(..., description="The ID of the folder to assign the chat to")


class BulkChatOperation(BaseModel):
    """Request model for bulk operations on chats"""
    chat_uuids: List[str] = Field(..., description="List of chat UUIDs to operate on")


@app.post("/api/chat/stream")
async def chat_endpoint(request: ChatRequest, req: Request):
    """
    Chat endpoint for LangGraph invoke.

    Args:
        request: The chat request
        req: The FastAPI request object for connection state checking

    Returns:
        The streamed response
    """
    try:
        # Convert Pydantic models to dictionaries and normalize content format
        messages = []
        for msg in request.messages:
            message_dict = {"role": msg.role}

            # Handle both string content and list of content items
            if isinstance(msg.content, str):
                message_dict["content"] = msg.content
            else:
                # For content as a list, convert to the format expected by the workflow
                content_items = []
                for item in msg.content:
                    if item.type == "text" and item.text:
                        content_items.append({"type": "text", "text": item.text})
                    elif item.type == "image_url" and item.image_url:
                        content_items.append(
                            {
                                "type": "image_url", 
                                "image_url": {
                                    "url": item.image_url,
                                    "detail": "high"
                                }
                            }
                        )

                message_dict["content"] = content_items

            messages.append(message_dict)

        async def event_generator():
            try:
                async for event in run_agent_workflow(
                    messages,
                    request.debug,
                    request.deep_thinking_mode,
                    request.search_before_planning,
                    request.team_members,
                    request.thread_id,
                ):
                    # Check if client is still connected
                    if await req.is_disconnected():
                        logger.info("Client disconnected, stopping workflow")
                        break
                    yield {
                        "event": event["event"],
                        "data": json.dumps(event["data"], ensure_ascii=False),
                    }
            except asyncio.CancelledError:
                logger.info("Stream processing cancelled")
                raise
            except Exception as e:
                logger.error(f"Error in workflow: {e}")
                raise

        return EventSourceResponse(
            event_generator(),
            media_type="text/event-stream",
            sep="\n",
        )
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/browser_history/{filename}")
async def get_browser_history_file(filename: str):
    """
    Get a specific browser history GIF file.

    Args:
        filename: The filename of the GIF to retrieve

    Returns:
        The GIF file
    """
    try:
        file_path = os.path.join(BROWSER_HISTORY_DIR, filename)
        if not os.path.exists(file_path) or not filename.endswith(".gif"):
            raise HTTPException(status_code=404, detail="File not found")

        return FileResponse(file_path, media_type="image/gif", filename=filename)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving browser history file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/team_members")
async def get_team_members():
    """
    Get the configuration of all team members.

    Returns:
        dict: A dictionary containing team member configurations
    """
    try:
        return {"team_members": TEAM_MEMBER_CONFIGRATIONS}
    except Exception as e:
        logger.error(f"Error getting team members: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Chat History Pydantic Models
class ChatHistoryArgs(BaseModel):
    """Arguments for saving a chat history"""
    title: str = Field(..., description="The title of the chat")
    uuid: Optional[str] = Field(None, description="Custom UUID for the chat (generated if not provided)")
    created_at: Optional[datetime] = Field(None, description="When the chat was created")
    updated_at: Optional[datetime] = Field(None, description="When the chat was last updated")
    model: Optional[str] = Field(None, description="The model used for the chat")
    is_pinned: Optional[bool] = Field(False, description="Whether the chat is pinned")
    is_favorite: Optional[bool] = Field(False, description="Whether the chat is favorited")
    tags: Optional[List[str]] = Field(default_factory=list, description="Tags associated with this chat")


class SaveChatRequest(BaseModel):
    """Request model for saving a chat history"""
    args: ChatHistoryArgs = Field(..., description="Arguments for the chat history")
    chat: Any = Field(..., description="The chat content to save")


class UpdateChatRequest(BaseModel):
    """Request model for updating a chat history"""
    args: Optional[ChatHistoryArgs] = Field(None, description="Updated arguments for the chat history")
    chat: Optional[Any] = Field(None, description="Updated chat content")


class ChatHistoryItem(BaseModel):
    """Basic information about a saved chat"""
    title: str = Field(..., description="The title of the chat")
    uuid: str = Field(..., description="UUID of the chat")


@app.post("/api/chat/save")
async def save_chat_history(request: SaveChatRequest):
    """
    Save a chat history to a JSON file.
    
    Args:
        request: The SaveChatRequest containing chat args and content
        
    Returns:
        dict: A dictionary with the UUID of the saved chat
    """
    try:
        # Generate UUID if not provided
        chat_uuid = request.args.uuid or str(uuid.uuid4())
        
        # Create the folder path
        folder_path = os.path.join(CHAT_FOLDERS_DIR, chat_uuid)
        os.makedirs(folder_path, exist_ok=True)
        
        # Create the file path
        file_path = os.path.join(folder_path, "chat.json")
        
        # Set timestamps
        now = datetime.now().isoformat()
        created_at = request.args.created_at.isoformat() if request.args.created_at else now
        updated_at = request.args.updated_at.isoformat() if request.args.updated_at else now
        
        # Prepare data to save
        save_data = {
            "args": {
                "title": request.args.title,
                "uuid": chat_uuid,
                "created_at": created_at,
                "updated_at": updated_at,
                "model": request.args.model or "default",
                "is_pinned": request.args.is_pinned,
                "is_favorite": request.args.is_favorite,
                "tags": request.args.tags
            },
            "chat": request.chat
        }
        
        # Save to JSON file
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(save_data, f, ensure_ascii=False, indent=2)
        
        return {"uuid": chat_uuid, "status": "success"}
    except Exception as e:
        logger.error(f"Error saving chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/history")
async def list_chat_history():
    """
    Get a list of all saved chats.
    
    Returns:
        list: A list of ChatHistoryItem objects with title and UUID
    """
    try:
        result = []
        
        # Get all folders in the chat history directory
        folders = [f for f in os.listdir(CHAT_FOLDERS_DIR) if os.path.isdir(os.path.join(CHAT_FOLDERS_DIR, f))]
        
        for folder_name in folders:
            file_path = os.path.join(CHAT_FOLDERS_DIR, folder_name, "chat.json")
            
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    chat_data = json.load(f)
                    
                # Extract title and UUID
                if "args" in chat_data and "title" in chat_data["args"]:
                    title = chat_data["args"]["title"]
                    chat_uuid = chat_data["args"]["uuid"]
                    
                    result.append(ChatHistoryItem(title=title, uuid=chat_uuid))
            except Exception as e:
                logger.warning(f"Error reading chat history file {file_path}: {e}")
                continue
        
        return {"history": result}
    except Exception as e:
        logger.error(f"Error listing chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/history/{chat_uuid}")
async def get_chat_history(chat_uuid: str):
    """
    Get a specific chat history by UUID.
    
    Args:
        chat_uuid: The UUID of the chat to retrieve
        
    Returns:
        dict: The full chat history data
    """
    try:
        file_path = os.path.join(CHAT_FOLDERS_DIR, chat_uuid, "chat.json")
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Chat with UUID {chat_uuid} not found")
        
        with open(file_path, "r", encoding="utf-8") as f:
            chat_data = json.load(f)
        
        return chat_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/chat/history/{chat_uuid}")
async def update_chat_history(chat_uuid: str, request: UpdateChatRequest):
    """
    Update an existing chat history by UUID.
    
    Args:
        chat_uuid: The UUID of the chat to update
        request: The UpdateChatRequest containing updated chat data
        
    Returns:
        dict: A dictionary with the status of the update operation
    """
    try:
        file_path = os.path.join(CHAT_FOLDERS_DIR, chat_uuid, "chat.json")
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Chat with UUID {chat_uuid} not found")
        
        # Read existing data
        with open(file_path, "r", encoding="utf-8") as f:
            existing_data = json.load(f)
        
        # Update the data with new values if provided
        if request.args:
            # Keep the UUID constant, only update the title
            if request.args.title:
                existing_data["args"]["title"] = request.args.title
            if request.args.is_pinned is not None:
                existing_data["args"]["is_pinned"] = request.args.is_pinned
            if request.args.is_favorite is not None:
                existing_data["args"]["is_favorite"] = request.args.is_favorite
            if request.args.tags is not None:
                existing_data["args"]["tags"] = request.args.tags
        
        if request.chat is not None:
            existing_data["chat"] = request.chat
        
        # Save updated data back to file
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=2)
        
        return {"uuid": chat_uuid, "status": "updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/chat/history/{chat_uuid}")
async def delete_chat_history(chat_uuid: str):
    """
    Delete a specific chat history by UUID.
    
    Args:
        chat_uuid: The UUID of the chat to delete
        
    Returns:
        dict: A dictionary with the status of the delete operation
    """
    try:
        folder_path = os.path.join(CHAT_FOLDERS_DIR, chat_uuid)
        
        if not os.path.exists(folder_path):
            raise HTTPException(status_code=404, detail=f"Chat with UUID {chat_uuid} not found")
        
        # Delete the folder and its contents
        shutil.rmtree(folder_path)
        
        return {"uuid": chat_uuid, "status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/folders")
async def create_folder(request: CreateFolderRequest):
    """
    Create a new folder for organizing chats.
    
    Args:
        request: The CreateFolderRequest containing folder name
        
    Returns:
        dict: A dictionary with the created folder info
    """
    try:
        folder_id = str(uuid.uuid4())
        
        # Create the folder metadata file
        folder_metadata_path = os.path.join(CHAT_FOLDERS_DIR, "folders.json")
        
        # Load existing folders or create new list
        if os.path.exists(folder_metadata_path):
            with open(folder_metadata_path, "r", encoding="utf-8") as f:
                folders = json.load(f)
        else:
            folders = []
        
        # Add new folder
        new_folder = {
            "name": request.name,
            "folder_id": folder_id,
            "created_at": datetime.now().isoformat()
        }
        folders.append(new_folder)
        
        # Save updated folder list
        with open(folder_metadata_path, "w", encoding="utf-8") as f:
            json.dump(folders, f, ensure_ascii=False, indent=2)
        
        return {"folder_id": folder_id, "name": request.name, "status": "created"}
    except Exception as e:
        logger.error(f"Error creating folder: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/folders")
async def list_folders():
    """
    Get a list of all folders.
    
    Returns:
        list: A list of folder objects
    """
    try:
        folder_metadata_path = os.path.join(CHAT_FOLDERS_DIR, "folders.json")
        
        if not os.path.exists(folder_metadata_path):
            return {"folders": []}
        
        with open(folder_metadata_path, "r", encoding="utf-8") as f:
            folders = json.load(f)
        
        return {"folders": folders}
    except Exception as e:
        logger.error(f"Error listing folders: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/chat/history/{chat_uuid}/folder")
async def assign_chat_to_folder(chat_uuid: str, request: AssignChatToFolderRequest):
    """
    Assign a chat to a folder.
    
    Args:
        chat_uuid: The UUID of the chat to assign
        request: The request containing the folder ID
        
    Returns:
        dict: A dictionary with the status of the operation
    """
    try:
        chat_file_path = os.path.join(CHAT_FOLDERS_DIR, chat_uuid, "chat.json")
        
        if not os.path.exists(chat_file_path):
            raise HTTPException(status_code=404, detail=f"Chat with UUID {chat_uuid} not found")
        
        # Verify the folder exists
        folder_metadata_path = os.path.join(CHAT_FOLDERS_DIR, "folders.json")
        
        if not os.path.exists(folder_metadata_path):
            raise HTTPException(status_code=404, detail="No folders exist")
        
        with open(folder_metadata_path, "r", encoding="utf-8") as f:
            folders = json.load(f)
        
        # Check if the folder exists
        folder_exists = any(folder["folder_id"] == request.folder_id for folder in folders)
        if not folder_exists:
            raise HTTPException(status_code=404, detail=f"Folder with ID {request.folder_id} not found")
        
        # Update the chat's folder assignment
        folder_assignment_path = os.path.join(CHAT_FOLDERS_DIR, chat_uuid, "folder.json")
        
        with open(folder_assignment_path, "w", encoding="utf-8") as f:
            json.dump({"folder_id": request.folder_id}, f, ensure_ascii=False, indent=2)
        
        return {"uuid": chat_uuid, "folder_id": request.folder_id, "status": "assigned"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning chat to folder: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/chat/history/{chat_uuid}/pin")
async def pin_chat(chat_uuid: str, pin_status: bool = True):
    """
    Pin or unpin a chat.
    
    Args:
        chat_uuid: The UUID of the chat to pin/unpin
        pin_status: Whether to pin (True) or unpin (False) the chat
        
    Returns:
        dict: A dictionary with the status of the operation
    """
    try:
        file_path = os.path.join(CHAT_FOLDERS_DIR, chat_uuid, "chat.json")
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Chat with UUID {chat_uuid} not found")
        
        # Read existing data
        with open(file_path, "r", encoding="utf-8") as f:
            existing_data = json.load(f)
        
        # Update pin status
        existing_data["args"]["is_pinned"] = pin_status
        existing_data["args"]["updated_at"] = datetime.now().isoformat()
        
        # Save updated data back to file
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=2)
        
        return {"uuid": chat_uuid, "is_pinned": pin_status, "status": "updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating pin status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/chat/history/{chat_uuid}/favorite")
async def favorite_chat(chat_uuid: str, favorite_status: bool = True):
    """
    Favorite or unfavorite a chat.
    
    Args:
        chat_uuid: The UUID of the chat to favorite/unfavorite
        favorite_status: Whether to favorite (True) or unfavorite (False) the chat
        
    Returns:
        dict: A dictionary with the status of the operation
    """
    try:
        file_path = os.path.join(CHAT_FOLDERS_DIR, chat_uuid, "chat.json")
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Chat with UUID {chat_uuid} not found")
        
        # Read existing data
        with open(file_path, "r", encoding="utf-8") as f:
            existing_data = json.load(f)
        
        # Update favorite status
        existing_data["args"]["is_favorite"] = favorite_status
        existing_data["args"]["updated_at"] = datetime.now().isoformat()
        
        # Save updated data back to file
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=2)
        
        return {"uuid": chat_uuid, "is_favorite": favorite_status, "status": "updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating favorite status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/search")
async def search_chats(query: str = "", folder_id: Optional[str] = None, filter_pinned: bool = False, filter_favorites: bool = False, filter_tags: Optional[List[str]] = None):
    """
    Search through chat history.
    
    Args:
        query: The search query string
        folder_id: Optional filter by folder ID
        filter_pinned: Whether to filter for pinned chats only
        filter_favorites: Whether to filter for favorite chats only
        filter_tags: Optional list of tags to filter by
        
    Returns:
        list: A list of chat history items matching the search criteria
    """
    try:
        result = []
        
        # Get all folders in the chat history directory
        folders = [f for f in os.listdir(CHAT_FOLDERS_DIR) if os.path.isdir(os.path.join(CHAT_FOLDERS_DIR, f))]
        
        for folder_name in folders:
            # Skip if not a UUID directory
            if folder_name == "folders":
                continue
                
            chat_file_path = os.path.join(CHAT_FOLDERS_DIR, folder_name, "chat.json")
            
            if not os.path.exists(chat_file_path):
                continue
                
            try:
                # Check if this chat belongs to the specified folder
                if folder_id:
                    folder_assignment_path = os.path.join(CHAT_FOLDERS_DIR, folder_name, "folder.json")
                    if not os.path.exists(folder_assignment_path):
                        continue
                        
                    with open(folder_assignment_path, "r", encoding="utf-8") as f:
                        folder_data = json.load(f)
                        if folder_data.get("folder_id") != folder_id:
                            continue
                
                with open(chat_file_path, "r", encoding="utf-8") as f:
                    chat_data = json.load(f)
                
                # Apply search filters
                if filter_pinned and not chat_data.get("args", {}).get("is_pinned", False):
                    continue
                    
                if filter_favorites and not chat_data.get("args", {}).get("is_favorite", False):
                    continue
                    
                if filter_tags:
                    chat_tags = chat_data.get("args", {}).get("tags", [])
                    if not any(tag in chat_tags for tag in filter_tags):
                        continue
                
                # Apply text search
                if query:
                    title = chat_data.get("args", {}).get("title", "")
                    # Simple text search in title
                    if query.lower() not in title.lower():
                        # Search in chat content (as a fallback)
                        chat_content = json.dumps(chat_data.get("chat", {}))
                        if query.lower() not in chat_content.lower():
                            continue
                
                # Extract metadata for results
                chat_uuid = chat_data.get("args", {}).get("uuid", "")
                title = chat_data.get("args", {}).get("title", "")
                created_at = chat_data.get("args", {}).get("created_at", "")
                is_pinned = chat_data.get("args", {}).get("is_pinned", False)
                is_favorite = chat_data.get("args", {}).get("is_favorite", False)
                tags = chat_data.get("args", {}).get("tags", [])
                
                result.append({
                    "uuid": chat_uuid,
                    "title": title,
                    "created_at": created_at,
                    "is_pinned": is_pinned,
                    "is_favorite": is_favorite,
                    "tags": tags
                })
            except Exception as e:
                logger.warning(f"Error reading chat file {chat_file_path}: {e}")
                continue
        
        # Sort results by created_at (newest first)
        result.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        return {"results": result}
    except Exception as e:
        logger.error(f"Error searching chats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/chat/bulk-delete")
async def bulk_delete_chats(request: BulkChatOperation):
    """
    Delete multiple chats at once.
    
    Args:
        request: The BulkChatOperation containing chat UUIDs to delete
        
    Returns:
        dict: A dictionary with the status of the bulk delete operation
    """
    try:
        results = {
            "successful": [],
            "failed": []
        }
        
        for chat_uuid in request.chat_uuids:
            try:
                folder_path = os.path.join(CHAT_FOLDERS_DIR, chat_uuid)
                
                if not os.path.exists(folder_path):
                    results["failed"].append({"uuid": chat_uuid, "reason": "Not found"})
                    continue
                
                # Delete the folder and its contents
                shutil.rmtree(folder_path)
                results["successful"].append(chat_uuid)
            except Exception as e:
                results["failed"].append({"uuid": chat_uuid, "reason": str(e)})
        
        return results
    except Exception as e:
        logger.error(f"Error in bulk delete operation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/chat/bulk-folder-assign")
async def bulk_assign_to_folder(folder_id: str, request: BulkChatOperation):
    """
    Assign multiple chats to a folder at once.
    
    Args:
        folder_id: The folder ID to assign chats to
        request: The BulkChatOperation containing chat UUIDs to assign
        
    Returns:
        dict: A dictionary with the status of the bulk assign operation
    """
    try:
        # Verify the folder exists
        folder_metadata_path = os.path.join(CHAT_FOLDERS_DIR, "folders.json")
        
        if not os.path.exists(folder_metadata_path):
            raise HTTPException(status_code=404, detail="No folders exist")
        
        with open(folder_metadata_path, "r", encoding="utf-8") as f:
            folders = json.load(f)
        
        # Check if the folder exists
        folder_exists = any(folder["folder_id"] == folder_id for folder in folders)
        if not folder_exists:
            raise HTTPException(status_code=404, detail=f"Folder with ID {folder_id} not found")
        
        results = {
            "successful": [],
            "failed": []
        }
        
        for chat_uuid in request.chat_uuids:
            try:
                chat_folder_path = os.path.join(CHAT_FOLDERS_DIR, chat_uuid)
                
                if not os.path.exists(chat_folder_path):
                    results["failed"].append({"uuid": chat_uuid, "reason": "Chat not found"})
                    continue
                
                # Update the chat's folder assignment
                folder_assignment_path = os.path.join(chat_folder_path, "folder.json")
                
                with open(folder_assignment_path, "w", encoding="utf-8") as f:
                    json.dump({"folder_id": folder_id}, f, ensure_ascii=False, indent=2)
                
                results["successful"].append(chat_uuid)
            except Exception as e:
                results["failed"].append({"uuid": chat_uuid, "reason": str(e)})
        
        return results
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk folder assignment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/chat/bulk-tag")
async def bulk_tag_chats(tags: List[str], request: BulkChatOperation):
    """
    Add tags to multiple chats at once.
    
    Args:
        tags: List of tags to add to the chats
        request: The BulkChatOperation containing chat UUIDs to tag
        
    Returns:
        dict: A dictionary with the status of the bulk tag operation
    """
    try:
        results = {
            "successful": [],
            "failed": []
        }
        
        for chat_uuid in request.chat_uuids:
            try:
                chat_file_path = os.path.join(CHAT_FOLDERS_DIR, chat_uuid, "chat.json")
                
                if not os.path.exists(chat_file_path):
                    results["failed"].append({"uuid": chat_uuid, "reason": "Chat not found"})
                    continue
                
                # Read existing data
                with open(chat_file_path, "r", encoding="utf-8") as f:
                    chat_data = json.load(f)
                
                # Update tags (add new tags without duplicates)
                existing_tags = chat_data.get("args", {}).get("tags", [])
                updated_tags = list(set(existing_tags + tags))
                
                chat_data["args"]["tags"] = updated_tags
                chat_data["args"]["updated_at"] = datetime.now().isoformat()
                
                # Save updated data
                with open(chat_file_path, "w", encoding="utf-8") as f:
                    json.dump(chat_data, f, ensure_ascii=False, indent=2)
                
                results["successful"].append(chat_uuid)
            except Exception as e:
                results["failed"].append({"uuid": chat_uuid, "reason": str(e)})
        
        return results
    except Exception as e:
        logger.error(f"Error in bulk tag operation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/export/{chat_uuid}")
async def export_chat(chat_uuid: str, format: str = "json"):
    """
    Export a chat in a specified format.
    
    Args:
        chat_uuid: The UUID of the chat to export
        format: The format to export in (json, markdown, etc.)
        
    Returns:
        The exported chat file
    """
    try:
        file_path = os.path.join(CHAT_FOLDERS_DIR, chat_uuid, "chat.json")
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Chat with UUID {chat_uuid} not found")
        
        with open(file_path, "r", encoding="utf-8") as f:
            chat_data = json.load(f)
        
        if format.lower() == "json":
            # Return the raw JSON
            return chat_data
        elif format.lower() == "markdown":
            # Convert to markdown format
            title = chat_data.get("args", {}).get("title", "Untitled Chat")
            created_at = chat_data.get("args", {}).get("created_at", "")
            
            markdown_content = f"# {title}\n\n"
            markdown_content += f"*Created: {created_at}*\n\n"
            
            # Format chat messages
            for message in chat_data.get("chat", []):
                role = message.get("role", "")
                content = message.get("content", "")
                
                if isinstance(content, list):
                    # Handle content items
                    text_content = ""
                    for item in content:
                        if item.get("type") == "text":
                            text_content += item.get("text", "")
                    content = text_content
                
                markdown_content += f"## {role.capitalize()}\n\n{content}\n\n---\n\n"
            
            return JSONResponse(
                content={"markdown": markdown_content},
                media_type="application/json"
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported export format: {format}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/continue/{chat_uuid}")
async def continue_chat(chat_uuid: str):
    """
    Continue a conversation from a saved chat history.
    
    Args:
        chat_uuid: The UUID of the chat to continue
        
    Returns:
        The chat data that can be loaded into the chat UI
    """
    try:
        file_path = os.path.join(CHAT_FOLDERS_DIR, chat_uuid, "chat.json")
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Chat with UUID {chat_uuid} not found")
        
        with open(file_path, "r", encoding="utf-8") as f:
            chat_data = json.load(f)
        
        # Extract the chat messages in a format suitable for the UI
        # Update the timestamp to show it was continued
        chat_data["args"]["continued_at"] = datetime.now().isoformat()
        
        # Save the updated chat with continuation timestamp
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(chat_data, f, ensure_ascii=False, indent=2)
        
        return {
            "uuid": chat_uuid,
            "title": chat_data.get("args", {}).get("title", ""),
            "chat": chat_data.get("chat", []),
            "status": "continued"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error continuing chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


