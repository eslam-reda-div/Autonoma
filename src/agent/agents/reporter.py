from langgraph.types import Command
import logging
from typing import Literal
from src.utils.json_utils import repair_json_output
from src.agent.agents.prompts.template import apply_prompt_template
from src.agent.state import State
from src.config.llm import reporter_llm
from langchain_core.messages import HumanMessage

logger = logging.getLogger(__name__)

def reporter_node(state: State) -> Command[Literal["supervisor"]]:
    logger.info("Reporter write final report")
    messages = apply_prompt_template("reporter", state)
    response = reporter_llm.invoke(messages)
    logger.debug(f"Current state messages: {state['messages']}")
    response_content = response.content
    response_content = repair_json_output(response_content)
    logger.debug(f"reporter response: {response_content}")

    return Command(
        update={
            "messages": [
                HumanMessage(
                    content=response_content,
                    name="reporter",
                )
            ]
        },
        goto="supervisor",
    )