"""Router functions for managing interview flow."""

from langchain_core.messages import AIMessage

from src.agent.agents.web_researcher.state import InterviewState
from src.agent.agents.web_researcher.utils import sanitize_name

MAX_TURNS = 3
EXPERT_NAME = "expert"

def route_messages(state: InterviewState) -> str:
    """Determine whether to continue the interview or end it."""
    if not state.messages:
        return "end"
        
    messages = state.messages
    current_editor_name = sanitize_name(state.editor.name)
    
    # Find where the current editor's conversation started
    conversation_start = 0
    for i, m in enumerate(messages):
        if (isinstance(m, AIMessage) and 
            m.name == "system" and 
            current_editor_name in m.content):
            conversation_start = i
            break
    
    # Only look at messages after the conversation start
    current_messages = messages[conversation_start:]
    
    # Get the last message
    if current_messages:
        last_message = current_messages[-1]
        
        # If the last message was from the expert, wait for editor's response
        if isinstance(last_message, AIMessage) and last_message.name == EXPERT_NAME:
            return "ask_question"
            
        # If the last message was from the editor
        if isinstance(last_message, AIMessage) and last_message.name == current_editor_name:
            # Count expert responses in this conversation
            expert_responses = len([
                m for m in current_messages 
                if isinstance(m, AIMessage) and m.name == EXPERT_NAME
            ])
            
            # Check if we've reached max turns or got a thank you
            if (expert_responses >= MAX_TURNS or 
                last_message.content.endswith("Thank you so much for your help!")):
                return "next_editor"
                
            return "next_editor"
    
    # If we're just starting, ask a question
    return "ask_question" 