from langgraph.graph import StateGraph, START
from langgraph.checkpoint.memory import MemorySaver

from src.agent.state import State
from src.agent.agents.coordinator import coordinator_node
from src.agent.agents.planner import planner_node
from src.agent.agents.supervisor import supervisor_node
from src.agent.agents.researcher import research_node
from src.agent.agents.coder import code_node
from src.agent.agents.browser import browser_node
from src.agent.agents.reporter import reporter_node
from src.agent.agents.file_manager import file_manage_node
from src.agent.agents.computer import computer_node

from dotenv import load_dotenv
import os

load_dotenv()

def build_graph():
    memory = MemorySaver()

    builder = StateGraph(State)
    builder.add_edge(START, "coordinator")
    builder.add_node("coordinator", coordinator_node)
    builder.add_node("planner", planner_node)
    builder.add_node("supervisor", supervisor_node)
    builder.add_node("researcher", research_node)
    builder.add_node("file_manager", file_manage_node)
    builder.add_node("coder", code_node)
    builder.add_node("browser", browser_node)
    builder.add_node("computer", computer_node)
    builder.add_node("reporter", reporter_node)
    
    if os.getenv("USE_GRAPH_MEMORY", "False") == "True":
        return builder.compile(checkpointer=memory)
    else:
        return builder.compile()

graph = build_graph()