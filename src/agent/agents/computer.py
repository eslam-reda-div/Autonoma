import logging
import json
from typing import Literal
from langchain_core.messages import HumanMessage
from langgraph.types import Command
from langgraph.types import Command
from src.utils.json_utils import repair_json_output
from src.agent.agents.prompts.template import apply_prompt_template
from src.agent.state import State
from src.config.llm import computer_llm
from langgraph.prebuilt import create_react_agent
from src.tools.computer_tools import tools

logger = logging.getLogger(__name__)

def computer_node(state: State) -> Command[Literal["supervisor"]]:
    logger.info("Computer agent starting task")

    computer_agent = create_react_agent(
        computer_llm,
        tools=tools,
        prompt=lambda state: apply_prompt_template('computer', state)
    )

    result = computer_agent.invoke(state)
    logger.info("Computer agent completed task")
    response_content = result["messages"][-1].content
    response_content = repair_json_output(response_content)
    logger.debug(f"Computer response: {response_content}")
    return Command(
        update={
            "messages": [
                HumanMessage(
                    content=response_content,
                    name="computer",
                )
            ]
        },
        goto="supervisor",
    )