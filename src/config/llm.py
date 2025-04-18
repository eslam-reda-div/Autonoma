from dotenv import load_dotenv
import os
from huggingface_hub import login
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from langchain_huggingface import HuggingFacePipeline
from langchain_deepseek import ChatDeepSeek
from langchain_huggingface import HuggingFacePipeline
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from openai import OpenAI
import json
from pathlib import Path

load_dotenv()

def load_credentials():
    base_path = Path(__file__).parent.parent.parent
    credentials_path = base_path / "credentials.json"
    try:
        with open(credentials_path, 'r') as file:
            return json.load(file)
    except FileNotFoundError:
        raise FileNotFoundError(f"Credentials file not found at {credentials_path}")
    except json.JSONDecodeError:
        raise ValueError(f"Invalid JSON in credentials file at {credentials_path}")

tokens = load_credentials()

single_agent_llm = ChatOpenAI(
    model=tokens["single_agent_llm"]["model"],
    api_key=tokens["single_agent_llm"]["api_key"],
    base_url=os.getenv("MODEL_BASE_URL"),
)

coordinator_llm = ChatOpenAI(
    model=tokens["coordinator_llm"]["model"],
    api_key=tokens["coordinator_llm"]["api_key"],
    base_url=os.getenv("MODEL_BASE_URL"),
)

supervisor_llm = ChatGoogleGenerativeAI(
    model=tokens["supervisor_llm"]["model"],
    google_api_key=tokens["supervisor_llm"]["api_key"],
)

researcher_llm = ChatGoogleGenerativeAI(
    model=tokens["researcher_llm"]["model"],
    google_api_key=tokens["researcher_llm"]["api_key"],
)

coder_llm = ChatGoogleGenerativeAI(
    model=tokens["coder_llm"]["model"],
    google_api_key=tokens["coder_llm"]["api_key"],
)

browser_llm = ChatOpenAI(
    model=tokens["browser_llm"]["model"],
    api_key=tokens["browser_llm"]["api_key"],
    base_url=os.getenv("MODEL_BASE_URL"),
)

reporter_llm = ChatOpenAI(
    model=tokens["reporter_llm"]["model"],
    api_key=tokens["reporter_llm"]["api_key"],
    base_url=os.getenv("MODEL_BASE_URL"),
)

file_manager_llm = ChatGoogleGenerativeAI(
    model=tokens["file_manager_llm"]["model"],
    google_api_key=tokens["file_manager_llm"]["api_key"],
)

computer_llm = ChatGoogleGenerativeAI(
    model=tokens["computer_llm"]["model"],
    google_api_key=tokens["computer_llm"]["api_key"],
)

browser_tool_llm = ChatOpenAI(
    model=tokens["browser_tool_llm"]["model"],
    api_key=tokens["browser_tool_llm"]["api_key"],
    base_url=os.getenv("MODEL_BASE_URL"),
)

deep_researcher_llm = ChatOpenAI(
    model=tokens["deep_researcher_llm"]["model"],
    api_key=tokens["deep_researcher_llm"]["api_key"],
    base_url=os.getenv("MODEL_BASE_URL"),
)

computer_tool_llm = OpenAI(
    base_url=os.getenv("MODEL_BASE_URL"),
    api_key=tokens["computer_tool_llm"]["api_key"],
)

def planner_llm(deep_thinking_mode: bool = False):
    if deep_thinking_mode:
        return ChatOpenAI(
            model=tokens["planner_deepthinking_llm"]["model"],
            api_key=tokens["planner_deepthinking_llm"]["api_key"],
            base_url=os.getenv("MODEL_BASE_URL"),
        )
    else:
        return ChatOpenAI(
            model=tokens["planner_llm"]["model"],
            api_key=tokens["planner_llm"]["api_key"],
            base_url=os.getenv("MODEL_BASE_URL"),
        )
    
crewai_tools_config = None
