from copy import deepcopy
from langgraph.types import Command
import logging
import json
import json_repair
from typing import Literal
from src.utils.json_utils import repair_json_output
from src.agent.agents.prompts.template import apply_prompt_template
from src.agent.state import State, Router
from src.config.llm import researcher_llm
from langchain_core.messages import HumanMessage
from langgraph.prebuilt import create_react_agent
from src.tools.researcher_tools import tools
from src.agent.agents.web_researcher.graph import graph

logger = logging.getLogger(__name__)

def research_node(state: State) -> Command[Literal["supervisor"]]:
    logger.info("Research agent starting task")
    
    # if state.get('deep_thinking_mode'):
    #     agent_prompt = apply_prompt_template('researcher', state)
    #     messages = state.get("messages")
    #     messages = [HumanMessage(content=agent_prompt, name="researcher")] + messages
        
    #     result = graph.invoke({
    #         "messages": messages,
    #     })
        
    #     response_content = result["article"]
    #     response_content = repair_json_output(response_content)
    # else:
    
    research_agent = create_react_agent(
        researcher_llm,
        tools=tools,
        prompt=lambda state: apply_prompt_template('researcher', state)
    )    
    result = research_agent.invoke(state)
    response_content = result["messages"][-1].content
    response_content = repair_json_output(response_content)
        
    logger.info("Research agent completed task")
    logger.debug(f"Research agent response: {response_content}")
    return Command(
        update={
            "messages": [
                HumanMessage(
                    content=response_content,
                    name="researcher",
                )
            ]
        },
        goto="supervisor",
    )
