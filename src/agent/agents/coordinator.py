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

logger = logging.getLogger(__name__)

def coordinator_node(state: State) -> Command[Literal["planner", "__end__"]]:
    logger.info("Coordinator talking.")
    messages = apply_prompt_template("coordinator", state)
    
    response = coordinator_llm.invoke(messages)
    
    logger.debug(f"Current state messages: {state['messages']}")
    response_content = response.content
    response_content = repair_json_output(response_content)
    logger.debug(f"Coordinator response: {response_content}")

    goto = "__end__"
    if "handoff_to_planner" in response_content:
        goto = "planner"

    response.content = response_content

    if goto == "__end__":
        return Command(
            update={
                "messages": [
                    AIMessage(
                        content=response_content,
                        name="coordinator",
                    )
                ]
            },
            goto=goto,
        )
    else:
        return Command(goto=goto)