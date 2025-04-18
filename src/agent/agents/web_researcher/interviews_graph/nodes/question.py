"""Node for generating interview questions from editors."""

from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.runnables import RunnableConfig

from src.agent.agents.web_researcher.configuration import Configuration
from src.agent.agents.web_researcher.state import InterviewState
from src.agent.agents.web_researcher.prompts import INTERVIEW_QUESTION_PROMPT
from src.agent.agents.web_researcher.utils import load_chat_model
from src.agent.agents.web_researcher.utils import sanitize_name, swap_roles

async def generate_question(state: InterviewState, config: RunnableConfig):
    """Generate a question from the editor's perspective."""
    configuration = Configuration.from_runnable_config(config)
    model = load_chat_model(configuration.fast_llm_model)
    
    if state.editor is None:
        raise ValueError("Editor not found in state. Make sure to set the editor before starting the interview.")
    
    editor = state.editor
    editor_name = sanitize_name(editor.name)
    swapped = swap_roles(state, editor_name)
    
    chain = INTERVIEW_QUESTION_PROMPT | model
    
    result = await chain.ainvoke(
        {"messages": swapped.messages, "persona": editor.persona},
        config
    )
    
    content = result.content if hasattr(result, 'content') else str(result)
    
    return InterviewState(
        messages=state.messages + [AIMessage(content=content, name=editor_name)],
        editor=state.editor,
        references=state.references,
        editors=state.editors,
        current_editor_index=state.current_editor_index
    ) 