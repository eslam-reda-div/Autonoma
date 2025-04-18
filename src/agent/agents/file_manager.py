from copy import deepcopy
from langgraph.types import Command
import logging
import json
import json_repair
from typing import Literal
from src.utils.json_utils import repair_json_output
from src.agent.agents.prompts.template import apply_prompt_template
from src.agent.state import State, Router
from src.config.llm import file_manager_llm
from langchain_core.messages import HumanMessage
from langgraph.prebuilt import create_react_agent
from src.tools.file_manager_tools import tools

logger = logging.getLogger(__name__)

def file_manage_node(state: State) -> Command[Literal["supervisor"]]:
    logger.info("File manager agent starting task")
    
    file_manager_agent = create_react_agent(
        file_manager_llm,
        tools=tools,
        prompt=lambda state: apply_prompt_template('file_manager', state)
    )
    
    result = file_manager_agent.invoke(state)
    logger.info("File manager agent completed task")
    response_content = result["messages"][-1].content
    response_content = repair_json_output(response_content)
    logger.debug(f"File manager agent response: {response_content}")
    return Command(
        update={
            "messages": [
                HumanMessage(
                    content=response_content,
                    name="file_manager",
                )
            ]
        },
        goto="supervisor",
    )
