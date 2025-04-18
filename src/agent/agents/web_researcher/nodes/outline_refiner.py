"""Node for refining the outline based on interview results."""

from typing import Optional
from langchain_core.runnables import RunnableConfig

from src.agent.agents.web_researcher.configuration import Configuration
from src.agent.agents.web_researcher.state import State, Outline
from src.agent.agents.web_researcher.utils import load_chat_model, get_message_text
from src.agent.agents.web_researcher.prompts import REFINE_OUTLINE_PROMPT

async def refine_outline(
    state: State, 
    config: Optional[RunnableConfig] = None
) -> State:
    """Refine the outline based on interview results."""
    configuration = Configuration.from_runnable_config(config)
    model = load_chat_model(configuration.tool_model)
    
    if not state.outline:
        raise ValueError("No initial outline found in state")
   
    current_outline = state.outline
        
    # Format conversations from the state's messages
    conversations = "\n\n".join(
        f"### {m.name}\n\n{get_message_text(m)}" 
        for m in state.messages
    )
    
    # Create the chain with structured output
    chain = REFINE_OUTLINE_PROMPT | model.with_structured_output(Outline)
    
    # Generate refined outline with explicit structure validation
    refined_outline = await chain.ainvoke(
        {
            "topic": current_outline.page_title,
            "old_outline": current_outline.as_str,
            "conversations": conversations,
        },
        config
    )
    
    # Ensure we maintain the structure
    if not refined_outline.sections:
        # If no sections, copy the sections from the current outline
        refined_outline.sections = current_outline.sections
    elif len(refined_outline.sections) < len(current_outline.sections):
        # If we lost sections, merge with original
        existing_sections = {s.section_title: s for s in current_outline.sections}
        refined_sections = {s.section_title: s for s in refined_outline.sections}
        # Update existing sections with refined ones, keeping any that weren't refined
        existing_sections.update(refined_sections)
        refined_outline.sections = list(existing_sections.values())
    
    # Return updated state with new outline
    return State(
        messages=state.messages,
        outline=refined_outline,
        related_topics=state.related_topics,
        perspectives=state.perspectives,
        is_last_step=state.is_last_step
    ) 