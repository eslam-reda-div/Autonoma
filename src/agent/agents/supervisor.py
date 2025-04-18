from copy import deepcopy
from langgraph.types import Command
import logging
import json
import json_repair
from typing import Literal
from src.utils.json_utils import repair_json_output
from src.agent.agents.prompts.template import apply_prompt_template
from src.agent.state import State, Router
from src.config.llm import supervisor_llm
from src.config.team import TEAM_MEMBERS
from langchain_core.messages import HumanMessage, BaseMessage

logger = logging.getLogger(__name__)

RESPONSE_FORMAT = "Response from {}:\n\n<response>\n{}\n</response>\n\n*Please execute the next step.*"

def supervisor_node(state: State) -> Command[Literal[*TEAM_MEMBERS, "__end__"]]:
    logger.info("Supervisor evaluating next action")
    messages = apply_prompt_template("supervisor", state)
    messages = deepcopy(messages)
    for message in messages:
        if isinstance(message, BaseMessage) and message.name in TEAM_MEMBERS:
            message.content = RESPONSE_FORMAT.format(message.name, message.content)
    response = supervisor_llm.invoke(messages)
    try:
        if hasattr(response, "content"):
            response_content = response.content
            parsed_response = json.loads(repair_json_output(response_content))
            goto = parsed_response.get("next")
        else:
            goto = response["next"] if isinstance(response, dict) else "FINISH"
    except Exception as e:
        logger.error(f"Error parsing supervisor response: {e}")
        goto = "FINISH"  # Default to finish on error
    logger.debug(f"Current state messages: {state['messages']}")
    logger.debug(f"Supervisor response: {response}")

    if goto == "FINISH":
        goto = "__end__"
        logger.info("Workflow completed")
    else:
        logger.info(f"Supervisor delegating to: {goto}")

    return Command(goto=goto, update={"next": goto})
