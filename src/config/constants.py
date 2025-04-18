from src.config.team import TEAM_MEMBERS
from enum import Enum

# List of streaming LLM agents
STREAMING_LLM_AGENTS = [*TEAM_MEMBERS, "planner", "coordinator"]


# Event type enumeration
class EventType(Enum):
    CHAIN_START = "on_chain_start"
    CHAIN_END = "on_chain_end"
    CHAT_MODEL_START = "on_chat_model_start"
    CHAT_MODEL_END = "on_chat_model_end"
    CHAT_MODEL_STREAM = "on_chat_model_stream"
    TOOL_START = "on_tool_start"
    TOOL_END = "on_tool_end"