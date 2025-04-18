"""Node for handling invalid topics and waiting for user input."""

from typing import Dict
from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableConfig

from src.agent.agents.web_researcher.state import State

async def request_topic(state: State, config: RunnableConfig) -> Dict:
    """Request a new topic from the user."""
    message = state.topic.get('message', 'Please provide a specific topic for research.')
    
    new_message = AIMessage(content=message)
    new_messages = state.messages + [new_message]
    
    return {
        "messages": new_messages
    } 