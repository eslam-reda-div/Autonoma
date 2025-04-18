"""Node for generating Wikipedia-style outlines."""

from typing import Dict, List
from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableConfig

from src.agent.agents.web_researcher.configuration import Configuration
from src.agent.agents.web_researcher.prompts import OUTLINE_PROMPT
from src.agent.agents.web_researcher.state import Outline, State
from src.agent.agents.web_researcher.utils import load_chat_model

async def generate_outline(
    state: State, config: RunnableConfig
) -> Dict[str, List[AIMessage]]:
    """Generate a Wikipedia-style outline for a given topic."""
    configuration = Configuration.from_runnable_config(config)
    model = load_chat_model(configuration.tool_model)
    
    # Use the validated topic from state
    if not state.topic.is_valid or not state.topic.topic:
        raise ValueError("No valid topic found in state")

    # Create the chain for outline generation with structured output
    chain = OUTLINE_PROMPT | model.with_structured_output(Outline)

    # Generate the outline using the validated topic
    response = await chain.ainvoke({"topic": state.topic.topic}, config)

    return {
        "outline": response,
    } 