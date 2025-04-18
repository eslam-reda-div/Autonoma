"""Node for initializing the interview process."""

from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableConfig

from src.agent.agents.web_researcher.state import InterviewState, Editor, State

EXPERT_NAME = "expert"

async def initialize_interview(state: State, config: RunnableConfig) -> InterviewState:
    """Initialize the interview state with editors from perspectives."""
    
    # Get editors from perspectives
    if not state.perspectives:
        raise ValueError("No perspectives found in state")
        
    perspectives = state.perspectives
    editors = perspectives.get("editors", [])

    if not editors:
        raise ValueError("No editors found in perspectives")
    
    # Convert editors to proper Editor objects
    editors_list = [
        Editor(**editor)for editor in editors
    ]
    
    # Start with the first editor
    initial_message = AIMessage(
        content=f"So you said you were writing an article on {state.outline.page_title if state.outline else 'this topic'}?",
        name=EXPERT_NAME
    )
    
    return InterviewState(
        messages=[initial_message],
        editor=editors_list[0],
        references={},
        editors=editors_list,
        current_editor_index=0
    ) 