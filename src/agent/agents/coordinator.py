import logging
import json
import json_repair
import logging
from typing import Literal
from langchain_core.messages import AIMessage
from langgraph.types import Command
from src.utils.json_utils import repair_json_output
from src.agent.agents.prompts.template import apply_prompt_template
from src.agent.state import State
from src.config.llm import coordinator_llm
from langchain_core.tools import tool

logger = logging.getLogger(__name__)

@tool
def handoff_to_planner():
    """Handoff to planner agent to do plan."""
    return "done"

def coordinator_node(state: State) -> Command[Literal["planner", "__end__"]]:
    logger.info("Coordinator talking.")
    messages = apply_prompt_template("coordinator", state)

    response = (
        coordinator_llm
            .bind_tools([handoff_to_planner])
            .invoke(messages)
    )

    goto = "__end__"
    if len(response.tool_calls) > 0:
        goto = "planner"
        
    if goto == "__end__":
        return Command(
            update={
                "messages": [
                    AIMessage(
                        content=response.content,
                        name="coordinator",
                    )
                ]
            },
            goto=goto,
        )
    else:
        return Command(goto=goto)