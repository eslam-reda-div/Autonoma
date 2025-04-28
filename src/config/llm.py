from dotenv import load_dotenv
import os
from huggingface_hub import login
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from langchain_huggingface import HuggingFacePipeline
from langchain_deepseek import ChatDeepSeek
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
    base_url=tokens["single_agent_llm"]["base_url"],
    temperature=tokens["single_agent_llm"]["temperature"],
)

coordinator_llm = ChatOpenAI(
    model=tokens["coordinator_llm"]["model"],
    api_key=tokens["coordinator_llm"]["api_key"],
    base_url=tokens["coordinator_llm"]["base_url"],
    temperature=tokens["coordinator_llm"]["temperature"],
)

supervisor_llm = ChatOpenAI(
    model=tokens["supervisor_llm"]["model"],
    api_key=tokens["supervisor_llm"]["api_key"],
    base_url=tokens["supervisor_llm"]["base_url"],
    temperature=tokens["supervisor_llm"]["temperature"],
)

researcher_llm = ChatOpenAI(
    model=tokens["researcher_llm"]["model"],
    api_key=tokens["researcher_llm"]["api_key"],
    base_url=tokens["researcher_llm"]["base_url"],
    temperature=tokens["researcher_llm"]["temperature"],
)

coder_llm = ChatOpenAI(
    model=tokens["coder_llm"]["model"],
    api_key=tokens["coder_llm"]["api_key"],
    base_url=tokens["coder_llm"]["base_url"],
    temperature=tokens["coder_llm"]["temperature"],
)

browser_llm = ChatOpenAI(
    model=tokens["browser_llm"]["model"],
    api_key=tokens["browser_llm"]["api_key"],
    base_url=tokens["browser_llm"]["base_url"],
    temperature=tokens["browser_llm"]["temperature"],
)

reporter_llm = ChatOpenAI(
    model=tokens["reporter_llm"]["model"],
    api_key=tokens["reporter_llm"]["api_key"],
    base_url=tokens["reporter_llm"]["base_url"],
    temperature=tokens["reporter_llm"]["temperature"],
)

file_manager_llm = ChatOpenAI(
    model=tokens["file_manager_llm"]["model"],
    api_key=tokens["file_manager_llm"]["api_key"],
    base_url=tokens["file_manager_llm"]["base_url"],
    temperature=tokens["file_manager_llm"]["temperature"],
)

computer_llm = ChatOpenAI(
    model=tokens["computer_llm"]["model"],
    api_key=tokens["computer_llm"]["api_key"],
    base_url=tokens["computer_llm"]["base_url"],
    temperature=tokens["computer_llm"]["temperature"],
)

browser_tool_llm = ChatOpenAI(
    model=tokens["browser_tool_llm"]["model"],
    api_key=tokens["browser_tool_llm"]["api_key"],
    base_url=tokens["browser_tool_llm"]["base_url"],
    temperature=tokens["browser_tool_llm"]["temperature"],
)

deep_researcher_llm = ChatOpenAI(
    model=tokens["deep_researcher_llm"]["model"],
    api_key=tokens["deep_researcher_llm"]["api_key"],
    base_url=tokens["deep_researcher_llm"]["base_url"],
    temperature=tokens["deep_researcher_llm"]["temperature"],
)

computer_tool_llm = OpenAI(
    base_url=tokens["computer_tool_llm"]["base_url"],
    api_key=tokens["computer_tool_llm"]["api_key"],
)

def planner_llm(deep_thinking_mode: bool = False):
    if deep_thinking_mode:
        return ChatOpenAI(
            model=tokens["planner_deepthinking_llm"]["model"],
            api_key=tokens["planner_deepthinking_llm"]["api_key"],
            base_url=tokens["planner_deepthinking_llm"]["base_url"],
            temperature=tokens["planner_deepthinking_llm"]["temperature"],
        )
    else:
        return ChatOpenAI(
            model=tokens["planner_llm"]["model"],
            api_key=tokens["planner_llm"]["api_key"],
            base_url=tokens["planner_llm"]["base_url"],
            temperature=tokens["planner_llm"]["temperature"],
        )
    
crewai_tools_config = None
