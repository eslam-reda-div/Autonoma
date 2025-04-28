from copy import deepcopy
from langchain_core.messages import HumanMessage
from langgraph.types import Command

from src.tools.search_tools.travily import tavily_tool
import logging
import json
import json_repair
import logging
from typing import Literal
from langgraph.types import Command
from src.utils.json_utils import repair_json_output
from src.agent.agents.prompts.template import apply_prompt_template
from src.agent.state import State
from src.config.llm import planner_llm
from src.tools.planner_tools import search

logger = logging.getLogger(__name__)

def planner_node(state: State) -> Command[Literal["supervisor", "__end__"]]:
    logger.info("Planner generating full plan")
    messages = apply_prompt_template("planner", state)
    llm = planner_llm(state.get('deep_thinking_mode'))
    if state.get("search_before_planning"):
        searched_content = search(state["messages"][-1].content)
        if isinstance(searched_content, list):
            messages = deepcopy(messages)
            messages[-1].content += f"\n\n# Relative Search Results\n\n{json.dumps([{'title': elem['title'], 'content': elem['content']} for elem in searched_content], ensure_ascii=False)}"
        else:
            logger.error(
                f"Tavily search returned malformed response: {searched_content}"
            )
   
    stream = llm.stream(messages)
    full_response = ""
    for chunk in stream:
        full_response += chunk.content
    
    logger.debug(f"Current state messages: {state['messages']}")
    logger.debug(f"Planner response: {full_response}")

    if full_response.startswith("```json"):
        full_response = full_response.removeprefix("```json")

    if full_response.endswith("```"):
        full_response = full_response.removesuffix("```")

    # print(full_response)

    goto = "supervisor"
    try:
        repaired_response = json_repair.loads(full_response)
        full_response = json.dumps(repaired_response)
    except json.JSONDecodeError:
        logger.warning("Planner response is not a valid JSON")
        goto = "__end__"

    return Command(
        update={
            "messages": [HumanMessage(content=full_response, name="planner")],
            "full_plan": full_response,
        },
        goto=goto,
    )