"""Node for generating diverse editorial perspectives."""

from typing import Dict, List

from langchain_community.retrievers import WikipediaRetriever
from langchain_core.runnables import RunnableConfig

from src.agent.agents.web_researcher.configuration import Configuration
from src.agent.agents.web_researcher.state import State, Perspectives
from src.agent.agents.web_researcher.utils import load_chat_model
from src.agent.agents.web_researcher.prompts import PERSPECTIVES_PROMPT


def format_doc(doc, max_length=1000) -> str:
    """Format a Wikipedia document for use in prompts."""
    related = "- ".join(doc.metadata["categories"])
    return f"### {doc.metadata['title']}\n\nSummary: {doc.page_content}\n\nRelated\n{related}"[:max_length]


def format_docs(docs) -> str:
    """Format multiple Wikipedia documents."""
    return "\n\n".join(format_doc(doc) for doc in docs)


async def generate_perspectives(
    state: State, config: RunnableConfig
) -> Dict[str, Perspectives]:
    """Generate diverse editorial perspectives based on related topics."""

    configuration = Configuration.from_runnable_config(config)

    # Initialize the Wikipedia retriever
    wikipedia_retriever = WikipediaRetriever(load_all_available_meta=True, top_k_results=1)
    
    # Get related topics from state
    if not state.related_topics:
        raise ValueError("No related topics found in state")
    
    # Retrieve Wikipedia documents for each topic
    retrieved_docs = await wikipedia_retriever.abatch(
        state.related_topics.dict(),
        return_exceptions=True
    )
    
    # Filter out any failed retrievals and format the successful ones
    all_docs = []
    for docs in retrieved_docs:
        if isinstance(docs, BaseException):
            continue
        all_docs.extend(docs)
    
    formatted_docs = format_docs(all_docs)
    
    # Get the original topic from messages
    last_user_message = next(
        (msg for msg in reversed(state.messages) if msg.type == "human"),
        None,
    )
    if not last_user_message:
        raise ValueError("No user message found in state")

    # Initialize the model and create the chain
    model = load_chat_model(configuration.fast_llm_model)
    chain = PERSPECTIVES_PROMPT | model.with_structured_output(Perspectives)

    # Generate perspectives
    perspectives = await chain.ainvoke(
        {
            "examples": formatted_docs,
            "topic": last_user_message.content
        },
        config
    )

    return {
        "perspectives": perspectives
    } 