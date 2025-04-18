import logging
from src.config.team import TEAM_MEMBER_CONFIGRATIONS, TEAM_MEMBERS
from src.agent.graph import build_graph
import os
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

def enable_debug_logging():
    logging.getLogger(__name__).setLevel(logging.DEBUG)

logger = logging.getLogger(__name__)

graph = build_graph()

chat = []

def run_agent_workflow(
    user_input: str, 
    debug: bool = False,
    deep_thinking_mode: bool = False,
    search_before_planning: bool = False
):
    global chat
    if not user_input:
        raise ValueError("Input could not be empty")

    if debug:
        enable_debug_logging()

    logger.info(f"Starting workflow with user input: {user_input}")
    result = graph.invoke(
        {
            "TEAM_MEMBERS": TEAM_MEMBERS,
            "TEAM_MEMBER_CONFIGRATIONS": TEAM_MEMBER_CONFIGRATIONS,
            "messages": chat + [{"role": "user", "content": user_input}],
            "deep_thinking_mode": deep_thinking_mode,
            "search_before_planning": search_before_planning,
        },
        config={
            "configurable": {
                "thread_id": "default"
            }
        }
    )
    # logger.debug(f"Final workflow state: {result}")
    chat = result.get("messages", [])
    logger.info("Workflow completed successfully")
    return result