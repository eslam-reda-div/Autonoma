from typing import Literal
from typing_extensions import TypedDict
from langgraph.graph import MessagesState

from src.config.team import TEAM_MEMBERS

OPTIONS = TEAM_MEMBERS + ["FINISH"]

class Router(TypedDict):
    next: Literal[*OPTIONS]

class State(MessagesState):
    TEAM_MEMBERS: list[str]
    TEAM_MEMBER_CONFIGRATIONS: dict[str, dict]
    next: str
    full_plan: str
    deep_thinking_mode: bool
    search_before_planning: bool



