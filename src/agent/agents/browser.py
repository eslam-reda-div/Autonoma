from copy import deepcopy
from langgraph.types import Command
import logging
import json
import json_repair
from typing import Literal
from src.utils.json_utils import repair_json_output
from src.agent.agents.prompts.template import apply_prompt_template
from src.agent.state import State, Router
from src.config.llm import browser_llm
from langchain_core.messages import HumanMessage
from langgraph.prebuilt import create_react_agent
from src.tools.browser_tools import tools

logger = logging.getLogger(__name__)

def browser_node(state: State) -> Command[Literal["supervisor"]]:
    logger.info("Browser agent starting task")
    
    browser_agent = create_react_agent(
        browser_llm,
        tools=tools,
        prompt=lambda state: apply_prompt_template('browser', state)
    )
    
    result = browser_agent.invoke(state)
    logger.info("Browser agent completed task")
    response_content = result["messages"][-1].content
    response_content = repair_json_output(response_content)
    logger.debug(f"Browser agent response: {response_content}")
    return Command(
        update={
            "messages": [
                HumanMessage(
                    content=response_content,
                    name="browser",
                )
            ]
        },
        goto="supervisor",
    )