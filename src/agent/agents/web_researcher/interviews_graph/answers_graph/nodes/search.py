"""Node for searching relevant context for answers."""

from langchain_core.runnables import RunnableConfig
from langchain_core.messages import AIMessage, HumanMessage

from src.agent.agents.web_researcher.state import InterviewState
from src.agent.agents.web_researcher.tools import search
from src.agent.agents.web_researcher.utils import swap_roles

EXPERT_NAME = "expert"

async def search_for_context(state: InterviewState, config: RunnableConfig) -> InterviewState:
    """Search for relevant information to answer the question."""
    
    if state.editor is None:
        raise ValueError("Editor not found in state")
    
    # Swap roles to get the correct perspective
    swapped_state = swap_roles(state, EXPERT_NAME)
    
    # Get the last question (now as HumanMessage after swap)
    last_question = next(
        (msg for msg in reversed(swapped_state.messages) 
         if isinstance(msg, HumanMessage)),
        None
    )
    
    if not last_question:
        return state
    
    # Perform search
    search_results = await search(last_question.content, config=config)
        
    # Store results in references
    if search_results:
        references = state.references or {}
        for result in search_results:
            if isinstance(result, dict):
                references[result.get("url", "unknown")] = result.get("content", "")
            elif isinstance(result, str):
                references[f"source_{len(references)}"] = result
            
        return InterviewState(
            messages=state.messages,
            references=references,
            editor=state.editor,
            editors=state.editors,
            current_editor_index=state.current_editor_index
        )
    
    return state 