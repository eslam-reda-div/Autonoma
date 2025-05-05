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
CHAT_GLOBAL_DIR = os.path.join(CHAT_HISTORY_DIR, "global")

# Ensure directories exist
os.makedirs(CHAT_HISTORY_DIR, exist_ok=True)
os.makedirs(CHAT_FOLDERS_DIR, exist_ok=True)
os.makedirs(CHAT_GLOBAL_DIR, exist_ok=True)

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
    filename: Optional[str] = Field(
        None, description="The filename if type is 'input_file'"
    )
    file_data: Optional[str] = Field(
        None, description="The base64 encoded file data if type is 'input_file'"
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


class MoveChatRequest(BaseModel):
    """Request to move a chat between folders or to/from global"""
    destination: str = Field(..., description="The destination ('global' or folder ID)")


class MessageItem(BaseModel):
    """Single message in a chat"""
    id: str = Field(..., description="Unique ID of the message")
    role: str = Field(..., description="Role of the message sender (user or assistant)")
    type: str = Field(..., description="Type of the message (text, imagetext, etc.)")
    content: Union[str, Dict[str, Any], List[Dict[str, Any]]] = Field(
        ..., 
        description="Content of the message, can be a string for text messages, an object for complex messages, or a list of content items for messages with multiple parts (text and images)"
    )


class SaveChatRequest(BaseModel):
    """Request model for saving a chat history"""
    title: str = Field(..., description="The title of the chat")
    messages: List[MessageItem] = Field(..., description="List of messages in the chat")
    args: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional arguments for the chat")
    folder_id: Optional[str] = Field(None, description="Optional ID of the folder to save the chat in")


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
                    elif item.type == "input_file" and item.filename and item.file_data:
                        if item.file_data and ("application/pdf" in item.file_data or item.filename.lower().endswith('.pdf')):
                            content_items.append(
                                {
                                    "type": "file",
                                    "file": {
                                        "filename": item.filename,
                                        "file_data": item.file_data,
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
    created_at: Optional[Union[datetime, str]] = Field(None, description="When the chat was created")
    updated_at: Optional[Union[datetime, str]] = Field(None, description="When the chat was last updated")
    model: Optional[str] = Field(None, description="The model used for the chat")
    is_favorite: Optional[bool] = Field(False, description="Whether the chat is favorited")
    tags: Optional[List[str]] = Field(default_factory=list, description="Tags associated with this chat")


class UpdateChatRequest(BaseModel):
    """Request model for updating a chat history"""
    title: Optional[str] = Field(None, description="The title of the chat")
    messages: Optional[List[MessageItem]] = Field(None, description="List of messages in the chat")
    args: Optional[Dict[str, Any]] = Field(None, description="Additional arguments for the chat")


class ChatHistoryItem(BaseModel):
    """Basic information about a saved chat"""
    title: str = Field(..., description="The title of the chat")
    uuid: str = Field(..., description="UUID of the chat")


@app.post("/api/chat/save")
async def save_chat_history(request: SaveChatRequest):
    """
    Save a chat history to a JSON file.
    
    Args:
        request: The SaveChatRequest containing chat title, messages and arguments
        
    Returns:
        dict: A dictionary with the UUID of the saved chat
    """
    try:
        # Generate UUID if not provided in args
        chat_uuid = str(uuid.uuid4())
        
        # Determine if this is a global chat or in a folder
        folder_id = request.folder_id
        
        if folder_id:
            # Verify the folder exists
            folder_path = os.path.join(CHAT_FOLDERS_DIR, folder_id)
            if not os.path.exists(folder_path):
                # Create the folder if it doesn't exist with a default index.json
                os.makedirs(folder_path, exist_ok=True)
                index_data = {
                    "folder_id": folder_id,
                    "name": f"Folder {folder_id[:8]}",
                    "created_at": datetime.now().isoformat()
                }
                with open(os.path.join(folder_path, "index.json"), "w", encoding="utf-8") as f:
                    json.dump(index_data, f, ensure_ascii=False, indent=2)
            
            # Create the chat folder inside the folder
            chat_folder_path = os.path.join(folder_path, chat_uuid)
        else:
            # Global chat (not in any folder)
            chat_folder_path = os.path.join(CHAT_GLOBAL_DIR, chat_uuid)
        
        # Create the chat folder
        os.makedirs(chat_folder_path, exist_ok=True)
        
        # Create the file path
        chat_file_path = os.path.join(chat_folder_path, "chat.json")
        
        # Set timestamps
        now = datetime.now().isoformat()
        
        # Extract args from request
        is_favorite = request.args.get("is_favorite", False)
        tags = request.args.get("tags", [])
        
        # Prepare data to save
        save_data = {
            "args": {
                "title": request.title,
                "uuid": chat_uuid,
                "created_at": now,
                "updated_at": now,
                "model": "default",
                "is_favorite": is_favorite,
                "tags": tags
            },
            "messages": [message.dict() for message in request.messages]
        }
        
        # Save to JSON file
        with open(chat_file_path, "w", encoding="utf-8") as f:
            json.dump(save_data, f, ensure_ascii=False, indent=2)
        
        return {"uuid": chat_uuid, "status": "success", "folder_id": folder_id}
    except Exception as e:
        logger.error(f"Error saving chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/history")
async def list_chat_history(folder_id: Optional[str] = None):
    """
    Get a list of all saved chats.
    
    Args:
        folder_id: Optional folder ID to filter chats from a specific folder
                  If 'global', returns only global chats
                  If None, returns all chats
    
    Returns:
        list: A list of ChatHistoryItem objects with title and UUID
    """
    try:
        result = []
        
        # Get global chats if requested or if no folder specified
        if folder_id is None or folder_id == "global":
            # List global chats (chats not in any folder)
            global_chat_dirs = [d for d in os.listdir(CHAT_GLOBAL_DIR) 
                              if os.path.isdir(os.path.join(CHAT_GLOBAL_DIR, d))]
            
            for chat_uuid in global_chat_dirs:
                file_path = os.path.join(CHAT_GLOBAL_DIR, chat_uuid, "chat.json")
                
                if os.path.exists(file_path):
                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            chat_data = json.load(f)
                            
                        # Extract title and UUID
                        if "args" in chat_data and "title" in chat_data["args"]:
                            title = chat_data["args"]["title"]
                            chat_uuid = chat_data["args"]["uuid"]
                            created_at = chat_data["args"]["created_at"]
                            is_favorite = chat_data["args"]["is_favorite"]
                            
                            result.append({
                                "title": title, 
                                "uuid": chat_uuid,
                                "location": "global",
                                "created_at": created_at,
                                "is_favorite": is_favorite,
                            })
                    except Exception as e:
                        logger.warning(f"Error reading global chat file {file_path}: {e}")
                        continue
        
        # Get folder chats if no specific folder requested or if specific folder requested
        if folder_id is None or (folder_id != "global" and folder_id is not None):
            # List folders in the folders directory
            if folder_id is None:
                # Get all folders
                folder_dirs = [d for d in os.listdir(CHAT_FOLDERS_DIR) 
                             if os.path.isdir(os.path.join(CHAT_FOLDERS_DIR, d))]
            else:
                # Get specific folder
                folder_dirs = [folder_id] if os.path.isdir(os.path.join(CHAT_FOLDERS_DIR, folder_id)) else []
            
            for folder_name in folder_dirs:
                folder_path = os.path.join(CHAT_FOLDERS_DIR, folder_name)
                
                # Get folder name from index.json
                folder_info = {"name": folder_name, "folder_id": folder_name}
                index_path = os.path.join(folder_path, "index.json")
                if os.path.exists(index_path):
                    try:
                        with open(index_path, "r", encoding="utf-8") as f:
                            folder_info = json.load(f)
                    except Exception as e:
                        logger.warning(f"Error reading folder index file {index_path}: {e}")
                
                # Get all chat directories in this folder
                chat_dirs = [d for d in os.listdir(folder_path) 
                           if os.path.isdir(os.path.join(folder_path, d)) and d != "index.json"]
                
                for chat_uuid in chat_dirs:
                    chat_file_path = os.path.join(folder_path, chat_uuid, "chat.json")
                    
                    if os.path.exists(chat_file_path):
                        try:
                            with open(chat_file_path, "r", encoding="utf-8") as f:
                                chat_data = json.load(f)
                                
                            # Extract title and UUID
                            if "args" in chat_data and "title" in chat_data["args"]:
                                title = chat_data["args"]["title"]
                                chat_uuid = chat_data["args"]["uuid"]
                                created_at = chat_data["args"]["created_at"]
                                is_favorite = chat_data["args"]["is_favorite"]
                            
                                result.append({
                                    "title": title, 
                                    "uuid": chat_uuid,
                                    "location": "folder",
                                    "folder_id": folder_name,
                                    "folder_name": folder_info.get("name", folder_name),
                                    "created_at": created_at,
                                    "is_favorite": is_favorite,       
                                })
                        except Exception as e:
                            logger.warning(f"Error reading folder chat file {chat_file_path}: {e}")
                            continue
        
        # Sort by updated_at (newest first)
        result.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        
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
        # First, check in global chats
        global_chat_path = os.path.join(CHAT_GLOBAL_DIR, chat_uuid, "chat.json")
        
        if os.path.exists(global_chat_path):
            with open(global_chat_path, "r", encoding="utf-8") as f:
                chat_data = json.load(f)
            chat_data["location"] = "global"
            return chat_data
        
        # If not found in global, search in folders
        for folder_name in os.listdir(CHAT_FOLDERS_DIR):
            folder_path = os.path.join(CHAT_FOLDERS_DIR, folder_name)
            
            if not os.path.isdir(folder_path):
                continue
                
            chat_path = os.path.join(folder_path, chat_uuid, "chat.json")
            
            if os.path.exists(chat_path):
                with open(chat_path, "r", encoding="utf-8") as f:
                    chat_data = json.load(f)
                
                # Get folder info
                folder_info = {"name": folder_name, "folder_id": folder_name}
                index_path = os.path.join(folder_path, "index.json")
                if os.path.exists(index_path):
                    try:
                        with open(index_path, "r", encoding="utf-8") as f:
                            folder_info = json.load(f)
                    except Exception as e:
                        logger.warning(f"Error reading folder index: {e}")
                
                chat_data["location"] = "folder"
                chat_data["folder_id"] = folder_name
                chat_data["folder_name"] = folder_info.get("name", folder_name)
                return chat_data
        
        # If we get here, the chat wasn't found
        raise HTTPException(status_code=404, detail=f"Chat with UUID {chat_uuid} not found")
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
        
        # Find the chat location (global or in a folder)
        chat_file_path = None
        location = None
        folder_id = None
        
        # Check global first
        global_chat_path = os.path.join(CHAT_GLOBAL_DIR, chat_uuid, "chat.json")
        if os.path.exists(global_chat_path):
            chat_file_path = global_chat_path
            location = "global"
        else:
            # Search in folders
            for folder_name in os.listdir(CHAT_FOLDERS_DIR):
                folder_path = os.path.join(CHAT_FOLDERS_DIR, folder_name)
                
                if not os.path.isdir(folder_path):
                    continue
                    
                potential_path = os.path.join(folder_path, chat_uuid, "chat.json")
                
                if os.path.exists(potential_path):
                    chat_file_path = potential_path
                    location = "folder"
                    folder_id = folder_name
                    break
        
        if not chat_file_path:
            raise HTTPException(status_code=404, detail=f"Chat with UUID {chat_uuid} not found")
        
        # Read existing data
        with open(chat_file_path, "r", encoding="utf-8") as f:
            existing_data = json.load(f)
        
        # Update the data with new values if provided
        if request.title:
            existing_data["args"]["title"] = request.title
            
        if request.messages is not None:
            # Convert Pydantic models to dictionaries
            existing_data["messages"] = [message.dict() for message in request.messages]
            
        if request.args:
            # Update with new args if provided
            existing_data["args"].update(request.args)
        
        # Update the timestamp
        existing_data["args"]["updated_at"] = datetime.now().isoformat()
        
        # Save updated data back to file
        with open(chat_file_path, "w", encoding="utf-8") as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=2)
        
        return {
            "uuid": chat_uuid, 
            "status": "updated",
            "location": location,
            "folder_id": folder_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating chat history: {e}")
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
        # Find the chat location (global or in a folder)
        chat_file_path = None
        location = None
        folder_id = None
        
        # Check global first
        global_chat_path = os.path.join(CHAT_GLOBAL_DIR, chat_uuid, "chat.json")
        if os.path.exists(global_chat_path):
            chat_file_path = global_chat_path
            location = "global"
        else:
            # Search in folders
            for folder_name in os.listdir(CHAT_FOLDERS_DIR):
                folder_path = os.path.join(CHAT_FOLDERS_DIR, folder_name)
                
                if not os.path.isdir(folder_path):
                    continue
                    
                potential_path = os.path.join(folder_path, chat_uuid, "chat.json")
                
                if os.path.exists(potential_path):
                    chat_file_path = potential_path
                    location = "folder"
                    folder_id = folder_name
                    break
        
        if not chat_file_path:
            raise HTTPException(status_code=404, detail=f"Chat with UUID {chat_uuid} not found")
        
        # Read existing data
        with open(chat_file_path, "r", encoding="utf-8") as f:
            existing_data = json.load(f)
        
        # Update favorite status
        existing_data["args"]["is_favorite"] = favorite_status
        existing_data["args"]["updated_at"] = datetime.now().isoformat()
        
        # Save updated data back to file
        with open(chat_file_path, "w", encoding="utf-8") as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=2)
        
        return {
            "uuid": chat_uuid, 
            "is_favorite": favorite_status, 
            "status": "updated",
            "location": location,
            "folder_id": folder_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating favorite status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/move/{chat_uuid}")
async def move_chat(chat_uuid: str, request: MoveChatRequest):
    """
    Move a chat between folders or to/from global.
    
    Args:
        chat_uuid: The UUID of the chat to move
        request: The MoveChatRequest containing the destination
        
    Returns:
        dict: A dictionary with the status of the move operation
    """
    try:
        # Find the chat location (global or in a folder)
        source_path = None
        destination_path = None
        location = None
        source_folder_id = None
        
        # Check global first
        global_chat_path = os.path.join(CHAT_GLOBAL_DIR, chat_uuid)
        if os.path.exists(global_chat_path):
            source_path = global_chat_path
            location = "global"
        else:
            # Search in folders
            for folder_name in os.listdir(CHAT_FOLDERS_DIR):
                folder_path = os.path.join(CHAT_FOLDERS_DIR, folder_name)
                
                if not os.path.isdir(folder_path):
                    continue
                    
                potential_path = os.path.join(folder_path, chat_uuid)
                
                if os.path.exists(potential_path):
                    source_path = potential_path
                    location = "folder"
                    source_folder_id = folder_name
                    break
        
        if not source_path:
            raise HTTPException(status_code=404, detail=f"Chat with UUID {chat_uuid} not found")
        
        # Determine destination path
        if request.destination == "global":
            destination_path = os.path.join(CHAT_GLOBAL_DIR, chat_uuid)
        else:
            # Verify the destination folder exists
            folder_path = os.path.join(CHAT_FOLDERS_DIR, request.destination)
            if not os.path.exists(folder_path):
                # Create the folder if it doesn't exist with a default index.json
                os.makedirs(folder_path, exist_ok=True)
                index_data = {
                    "folder_id": request.destination,
                    "name": f"Folder {request.destination[:8]}",
                    "created_at": datetime.now().isoformat()
                }
                with open(os.path.join(folder_path, "index.json"), "w", encoding="utf-8") as f:
                    json.dump(index_data, f, ensure_ascii=False, indent=2)
            
            destination_path = os.path.join(folder_path, chat_uuid)
        
        # Move the chat if it's not already at the destination
        if os.path.normpath(source_path) != os.path.normpath(destination_path):
            # Make sure destination doesn't already exist
            if os.path.exists(destination_path):
                shutil.rmtree(destination_path)
            
            # Copy the chat folder to the destination
            shutil.copytree(source_path, destination_path)
            
            # Remove the source folder
            shutil.rmtree(source_path)
        
        return {
            "uuid": chat_uuid,
            "status": "moved",
            "from": {"location": location, "folder_id": source_folder_id},
            "to": {"location": "global" if request.destination == "global" else "folder", 
                  "folder_id": None if request.destination == "global" else request.destination}
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error moving chat: {e}")
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
        # Find the chat location (global or in a folder)
        location = None
        folder_id = None
        path_to_delete = None
        
        # Check global first
        global_chat_path = os.path.join(CHAT_GLOBAL_DIR, chat_uuid)
        if os.path.exists(global_chat_path):
            path_to_delete = global_chat_path
            location = "global"
        else:
            # Search in folders
            for folder_name in os.listdir(CHAT_FOLDERS_DIR):
                folder_path = os.path.join(CHAT_FOLDERS_DIR, folder_name)
                
                if not os.path.isdir(folder_path):
                    continue
                    
                potential_path = os.path.join(folder_path, chat_uuid)
                
                if os.path.exists(potential_path):
                    path_to_delete = potential_path
                    location = "folder"
                    folder_id = folder_name
                    break
        
        if not path_to_delete:
            raise HTTPException(status_code=404, detail=f"Chat with UUID {chat_uuid} not found")
        
        # Delete the chat folder
        shutil.rmtree(path_to_delete)
        
        return {
            "uuid": chat_uuid,
            "status": "deleted",
            "location": location,
            "folder_id": folder_id
        }
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
        folder_path = os.path.join(CHAT_FOLDERS_DIR, folder_id)
        
        # Create the folder
        os.makedirs(folder_path, exist_ok=True)
        
        # Create folder index.json
        folder_data = {
            "folder_id": folder_id,
            "name": request.name,
            "created_at": datetime.now().isoformat()
        }
        
        with open(os.path.join(folder_path, "index.json"), "w", encoding="utf-8") as f:
            json.dump(folder_data, f, ensure_ascii=False, indent=2)
        
        return {
            "folder_id": folder_id,
            "name": request.name,
            "created_at": folder_data["created_at"],
            "status": "created"
        }
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
        result = []
        
        # List all folders
        folder_dirs = [d for d in os.listdir(CHAT_FOLDERS_DIR) 
                     if os.path.isdir(os.path.join(CHAT_FOLDERS_DIR, d))]
        
        for folder_id in folder_dirs:
            folder_path = os.path.join(CHAT_FOLDERS_DIR, folder_id)
            index_path = os.path.join(folder_path, "index.json")
            
            # Read folder metadata
            if os.path.exists(index_path):
                try:
                    with open(index_path, "r", encoding="utf-8") as f:
                        folder_data = json.load(f)
                        
                    # Count chats in this folder
                    chat_count = len([d for d in os.listdir(folder_path) 
                                   if os.path.isdir(os.path.join(folder_path, d)) and d != "index.json"])
                    
                    result.append({
                        "folder_id": folder_data.get("folder_id", folder_id),
                        "name": folder_data.get("name", f"Folder {folder_id[:8]}"),
                        "created_at": folder_data.get("created_at", ""),
                        "chat_count": chat_count
                    })
                except Exception as e:
                    logger.warning(f"Error reading folder metadata: {e}")
                    # Add basic info for the folder
                    result.append({
                        "folder_id": folder_id,
                        "name": f"Folder {folder_id[:8]}",
                        "created_at": "",
                        "chat_count": 0
                    })
            else:
                # Folder exists but has no index.json
                # Create a default index.json
                folder_data = {
                    "folder_id": folder_id,
                    "name": f"Folder {folder_id[:8]}",
                    "created_at": datetime.now().isoformat()
                }
                
                with open(index_path, "w", encoding="utf-8") as f:
                    json.dump(folder_data, f, ensure_ascii=False, indent=2)
                
                # Count chats in this folder
                chat_count = len([d for d in os.listdir(folder_path) 
                               if os.path.isdir(os.path.join(folder_path, d))])
                
                result.append({
                    "folder_id": folder_id,
                    "name": folder_data["name"],
                    "created_at": folder_data["created_at"],
                    "chat_count": chat_count
                })
        
        # Sort by name
        result.sort(key=lambda x: x.get("name", ""))
        
        return {"folders": result}
    except Exception as e:
        logger.error(f"Error listing folders: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/chat/folders/{folder_id}")
async def update_folder(folder_id: str, request: CreateFolderRequest):
    """
    Update a folder's name.
    
    Args:
        folder_id: The ID of the folder to update
        request: The request containing the new folder name
        
    Returns:
        dict: A dictionary with the updated folder info
    """
    try:
        folder_path = os.path.join(CHAT_FOLDERS_DIR, folder_id)
        index_path = os.path.join(folder_path, "index.json")
        
        if not os.path.exists(folder_path):
            raise HTTPException(status_code=404, detail=f"Folder with ID {folder_id} not found")
        
        # Read existing folder data
        if os.path.exists(index_path):
            with open(index_path, "r", encoding="utf-8") as f:
                folder_data = json.load(f)
        else:
            folder_data = {
                "folder_id": folder_id,
                "created_at": datetime.now().isoformat()
            }
        
        # Update folder name
        folder_data["name"] = request.name
        folder_data["updated_at"] = datetime.now().isoformat()
        
        # Save updated data
        with open(index_path, "w", encoding="utf-8") as f:
            json.dump(folder_data, f, ensure_ascii=False, indent=2)
        
        return {
            "folder_id": folder_id,
            "name": request.name,
            "status": "updated"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating folder: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/chat/folders/{folder_id}")
async def delete_folder(folder_id: str, delete_chats: bool = False):
    """
    Delete a folder. If delete_chats is True, delete all chats in the folder.
    Otherwise, move all chats to global.
    
    Args:
        folder_id: The ID of the folder to delete
        delete_chats: Whether to delete all chats in the folder
        
    Returns:
        dict: A dictionary with the status of the delete operation
    """
    try:
        folder_path = os.path.join(CHAT_FOLDERS_DIR, folder_id)
        
        if not os.path.exists(folder_path):
            raise HTTPException(status_code=404, detail=f"Folder with ID {folder_id} not found")
        
        # Get all chat directories in this folder
        chat_dirs = [d for d in os.listdir(folder_path) 
                   if os.path.isdir(os.path.join(folder_path, d)) and d != "index.json"]
        
        if delete_chats:
            # Delete all chats in the folder
            for chat_uuid in chat_dirs:
                chat_path = os.path.join(folder_path, chat_uuid)
                if os.path.exists(chat_path):
                    shutil.rmtree(chat_path)
        else:
            # Move all chats to global
            for chat_uuid in chat_dirs:
                source_path = os.path.join(folder_path, chat_uuid)
                destination_path = os.path.join(CHAT_GLOBAL_DIR, chat_uuid)
                
                if os.path.exists(source_path):
                    # Handle case where destination already exists
                    if os.path.exists(destination_path):
                        shutil.rmtree(destination_path)
                    
                    # Move chat to global
                    shutil.copytree(source_path, destination_path)
        
        # Delete the folder
        shutil.rmtree(folder_path)
        
        return {
            "folder_id": folder_id,
            "status": "deleted",
            "chats_deleted": delete_chats,
            "chats_moved": not delete_chats
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting folder: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/search")
async def search_chats(query: str = "", folder_id: Optional[str] = None, filter_favorites: bool = False, filter_tags: Optional[List[str]] = None):
    """
    Search through chat history.
    
    Args:
        query: The search query string
        folder_id: Optional filter by folder ID ('global' for global chats)
        filter_favorites: Whether to filter for favorite chats only
        filter_tags: Optional list of tags to filter by
        
    Returns:
        list: A list of chat history items matching the search criteria
    """
    try:
        result = []
        
        # Determine which locations to search
        search_global = folder_id is None or folder_id == "global"
        search_folders = folder_id is None or (folder_id != "global" and folder_id is not None)
        
        # Search in global chats
        if search_global:
            global_chat_dirs = [d for d in os.listdir(CHAT_GLOBAL_DIR) 
                              if os.path.isdir(os.path.join(CHAT_GLOBAL_DIR, d))]
            
            for chat_uuid in global_chat_dirs:
                chat_file_path = os.path.join(CHAT_GLOBAL_DIR, chat_uuid, "chat.json")
                
                if not os.path.exists(chat_file_path):
                    continue
                    
                try:
                    with open(chat_file_path, "r", encoding="utf-8") as f:
                        chat_data = json.load(f)
                    
                    # Apply filters
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
                    updated_at = chat_data.get("args", {}).get("updated_at", "")
                    is_favorite = chat_data.get("args", {}).get("is_favorite", False)
                    tags = chat_data.get("args", {}).get("tags", [])
                    
                    result.append({
                        "uuid": chat_uuid,
                        "title": title,
                        "created_at": created_at,
                        "updated_at": updated_at,
                        "is_favorite": is_favorite,
                        "tags": tags,
                        "location": "global"
                    })
                except Exception as e:
                    logger.warning(f"Error reading global chat file {chat_file_path}: {e}")
                    continue
        
        # Search in folders
        if search_folders:
            # Determine which folders to search
            if folder_id is not None and folder_id != "global":
                folder_dirs = [folder_id] if os.path.isdir(os.path.join(CHAT_FOLDERS_DIR, folder_id)) else []
            else:
                folder_dirs = [d for d in os.listdir(CHAT_FOLDERS_DIR) 
                             if os.path.isdir(os.path.join(CHAT_FOLDERS_DIR, d))]
            
            for folder_name in folder_dirs:
                folder_path = os.path.join(CHAT_FOLDERS_DIR, folder_name)
                
                # Get folder info
                folder_info = {"name": folder_name, "folder_id": folder_name}
                index_path = os.path.join(folder_path, "index.json")
                if os.path.exists(index_path):
                    try:
                        with open(index_path, "r", encoding="utf-8") as f:
                            folder_info = json.load(f)
                    except Exception as e:
                        logger.warning(f"Error reading folder metadata: {e}")
                
                # Search chats in this folder
                chat_dirs = [d for d in os.listdir(folder_path) 
                           if os.path.isdir(os.path.join(folder_path, d)) and d != "index.json"]
                
                for chat_uuid in chat_dirs:
                    chat_file_path = os.path.join(folder_path, chat_uuid, "chat.json")
                    
                    if not os.path.exists(chat_file_path):
                        continue
                        
                    try:
                        with open(chat_file_path, "r", encoding="utf-8") as f:
                            chat_data = json.load(f)
                        
                        # Apply filters
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
                        updated_at = chat_data.get("args", {}).get("updated_at", "")
                        is_favorite = chat_data.get("args", {}).get("is_favorite", False)
                        tags = chat_data.get("args", {}).get("tags", [])
                        
                        result.append({
                            "uuid": chat_uuid,
                            "title": title,
                            "created_at": created_at,
                            "updated_at": updated_at,
                            "is_favorite": is_favorite,
                            "tags": tags,
                            "location": "folder",
                            "folder_id": folder_name,
                            "folder_name": folder_info.get("name", folder_name)
                        })
                    except Exception as e:
                        logger.warning(f"Error reading folder chat file {chat_file_path}: {e}")
                        continue
        
        # Sort results by created_at or updated_at (newest first)
        result.sort(key=lambda x: x.get("updated_at", x.get("created_at", "")), reverse=True)
        
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
                # Find the chat location (global or in a folder)
                path_to_delete = None
                
                # Check global first
                global_chat_path = os.path.join(CHAT_GLOBAL_DIR, chat_uuid)
                if os.path.exists(global_chat_path):
                    path_to_delete = global_chat_path
                else:
                    # Search in folders
                    for folder_name in os.listdir(CHAT_FOLDERS_DIR):
                        folder_path = os.path.join(CHAT_FOLDERS_DIR, folder_name)
                        
                        if not os.path.isdir(folder_path):
                            continue
                            
                        potential_path = os.path.join(folder_path, chat_uuid)
                        
                        if os.path.exists(potential_path):
                            path_to_delete = potential_path
                            break
                
                if not path_to_delete:
                    results["failed"].append({"uuid": chat_uuid, "reason": "Chat not found"})
                    continue
                
                # Delete the chat folder
                shutil.rmtree(path_to_delete)
                results["successful"].append(chat_uuid)
            except Exception as e:
                results["failed"].append({"uuid": chat_uuid, "reason": str(e)})
        
        return results
    except Exception as e:
        logger.error(f"Error in bulk delete operation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/chat/bulk-move")
async def bulk_move_chats(destination: str, request: BulkChatOperation):
    """
    Move multiple chats to a folder or to global at once.
    
    Args:
        destination: The destination ('global' or folder ID)
        request: The BulkChatOperation containing chat UUIDs to move
        
    Returns:
        dict: A dictionary with the status of the bulk move operation
    """
    try:
        # If destination is not global, verify the folder exists
        if destination != "global":
            folder_path = os.path.join(CHAT_FOLDERS_DIR, destination)
            if not os.path.exists(folder_path):
                # Create the folder if it doesn't exist with a default index.json
                os.makedirs(folder_path, exist_ok=True)
                index_data = {
                    "folder_id": destination,
                    "name": f"Folder {destination[:8]}",
                    "created_at": datetime.now().isoformat()
                }
                with open(os.path.join(folder_path, "index.json"), "w", encoding="utf-8") as f:
                    json.dump(index_data, f, ensure_ascii=False, indent=2)
        
        results = {
            "successful": [],
            "failed": []
        }
        
        for chat_uuid in request.chat_uuids:
            try:
                # Find the chat location (global or in a folder)
                source_path = None
                source_location = None
                source_folder_id = None
                
                # Check global first
                global_chat_path = os.path.join(CHAT_GLOBAL_DIR, chat_uuid)
                if os.path.exists(global_chat_path):
                    source_path = global_chat_path
                    source_location = "global"
                else:
                    # Search in folders
                    for folder_name in os.listdir(CHAT_FOLDERS_DIR):
                        folder_path = os.path.join(CHAT_FOLDERS_DIR, folder_name)
                        
                        if not os.path.isdir(folder_path):
                            continue
                            
                        potential_path = os.path.join(folder_path, chat_uuid)
                        
                        if os.path.exists(potential_path):
                            source_path = potential_path
                            source_location = "folder"
                            source_folder_id = folder_name
                            break
                
                if not source_path:
                    results["failed"].append({"uuid": chat_uuid, "reason": "Chat not found"})
                    continue
                
                # Determine destination path
                if destination == "global":
                    destination_path = os.path.join(CHAT_GLOBAL_DIR, chat_uuid)
                else:
                    destination_path = os.path.join(CHAT_FOLDERS_DIR, destination, chat_uuid)
                
                # Move the chat if it's not already at the destination
                if os.path.normpath(source_path) != os.path.normpath(destination_path):
                    # Make sure destination doesn't already exist
                    if os.path.exists(destination_path):
                        shutil.rmtree(destination_path)
                    
                    # Copy the chat folder to the destination
                    shutil.copytree(source_path, destination_path)
                    
                    # Remove the source folder
                    shutil.rmtree(source_path)
                    
                    results["successful"].append({
                        "uuid": chat_uuid,
                        "from": {"location": source_location, "folder_id": source_folder_id},
                        "to": {"location": "global" if destination == "global" else "folder", 
                              "folder_id": None if destination == "global" else destination}
                    })
                else:
                    # Chat is already at the destination
                    results["successful"].append({
                        "uuid": chat_uuid,
                        "from": {"location": source_location, "folder_id": source_folder_id},
                        "to": {"location": source_location, "folder_id": source_folder_id},
                        "note": "Already at destination"
                    })
            except Exception as e:
                results["failed"].append({"uuid": chat_uuid, "reason": str(e)})
        
        return results
    except Exception as e:
        logger.error(f"Error in bulk move operation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/chat/bulk-favorite")
async def bulk_favorite_chats(favorite_status: bool, request: BulkChatOperation):
    """
    Mark multiple chats as favorite or unfavorite at once.
    
    Args:
        favorite_status: Whether to favorite (True) or unfavorite (False) the chats
        request: The BulkChatOperation containing chat UUIDs to update
        
    Returns:
        dict: A dictionary with the status of the bulk favorite operation
    """
    try:
        results = {
            "successful": [],
            "failed": []
        }
        
        for chat_uuid in request.chat_uuids:
            try:
                # Find the chat location (global or in a folder)
                chat_file_path = None
                
                # Check global first
                global_chat_path = os.path.join(CHAT_GLOBAL_DIR, chat_uuid, "chat.json")
                if os.path.exists(global_chat_path):
                    chat_file_path = global_chat_path
                else:
                    # Search in folders
                    for folder_name in os.listdir(CHAT_FOLDERS_DIR):
                        folder_path = os.path.join(CHAT_FOLDERS_DIR, folder_name)
                        
                        if not os.path.isdir(folder_path):
                            continue
                            
                        potential_path = os.path.join(folder_path, chat_uuid, "chat.json")
                        
                        if os.path.exists(potential_path):
                            chat_file_path = potential_path
                            break
                
                if not chat_file_path:
                    results["failed"].append({"uuid": chat_uuid, "reason": "Chat not found"})
                    continue
                
                # Read existing data
                with open(chat_file_path, "r", encoding="utf-8") as f:
                    existing_data = json.load(f)
                
                # Update favorite status
                existing_data["args"]["is_favorite"] = favorite_status
                existing_data["args"]["updated_at"] = datetime.now().isoformat()
                
                # Save updated data back to file
                with open(chat_file_path, "w", encoding="utf-8") as f:
                    json.dump(existing_data, f, ensure_ascii=False, indent=2)
                
                results["successful"].append(chat_uuid)
            except Exception as e:
                results["failed"].append({"uuid": chat_uuid, "reason": str(e)})
        
        return results
    except Exception as e:
        logger.error(f"Error in bulk favorite operation: {e}")
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
                # Find the chat location (global or in a folder)
                chat_file_path = None
                
                # Check global first
                global_chat_path = os.path.join(CHAT_GLOBAL_DIR, chat_uuid, "chat.json")
                if os.path.exists(global_chat_path):
                    chat_file_path = global_chat_path
                else:
                    # Search in folders
                    for folder_name in os.listdir(CHAT_FOLDERS_DIR):
                        folder_path = os.path.join(CHAT_FOLDERS_DIR, folder_name)
                        
                        if not os.path.isdir(folder_path):
                            continue
                            
                        potential_path = os.path.join(folder_path, chat_uuid, "chat.json")
                        
                        if os.path.exists(potential_path):
                            chat_file_path = potential_path
                            break
                
                if not chat_file_path:
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


