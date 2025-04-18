"""Node for generating the full Wikipedia article."""

from typing import Optional, List
from langchain_core.runnables import RunnableConfig
from langchain_community.vectorstores import InMemoryVectorStore
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings

from src.agent.agents.web_researcher.configuration import Configuration
from src.agent.agents.web_researcher.state import State, Section, Outline
from src.agent.agents.web_researcher.utils import load_chat_model, get_message_text, dict_to_section
from src.agent.agents.web_researcher.prompts import SECTION_WRITER_PROMPT, ARTICLE_WRITER_PROMPT

async def create_retriever(references: dict):
    """Create a retriever from the reference documents."""
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    reference_docs = [
        Document(page_content=content, metadata={"source": source})
        for source, content in references.items()
    ]
    vectorstore = InMemoryVectorStore.from_documents(
        reference_docs,
        embedding=embeddings,
    )
    return vectorstore.as_retriever(k=3)

async def generate_section(
    outline_str: str,
    section_title: str,
    topic: str,
    retriever,
    config: Optional[RunnableConfig] = None
) -> Section:
    """Generate a single section of the article."""
    # Get configuration
    configuration = Configuration.from_runnable_config(config)
    
    # Retrieve relevant documents
    docs = await retriever.ainvoke(f"{topic}: {section_title}")
    formatted_docs = "\n".join(
        f'<Document href="{doc.metadata["source"]}"/>\n{doc.page_content}\n</Document>'
        for doc in docs
    )
    
    # Create the chain
    model = load_chat_model(configuration.long_context_model, max_tokens=2000)
    chain = SECTION_WRITER_PROMPT | model.with_structured_output(Section)
    
    # Generate the section
    return await chain.ainvoke(
        {
            "outline": outline_str,
            "section": section_title,
            "docs": formatted_docs,
        },
        config
    )

async def generate_article(state: State, config: Optional[RunnableConfig] = None) -> State:
    """Generate the complete Wikipedia article."""
    if not state.outline:
        raise ValueError("No outline found in state")
        
    configuration = Configuration.from_runnable_config(config)
    model = load_chat_model(configuration.long_context_model, max_tokens=4000)
    
    # Convert dictionary outline to Outline object if needed
    current_outline = state.outline
    
    # Create retriever from references in state
    retriever = await create_retriever(state.references)
    
    # Generate each section in parallel
    sections = []
    for section in current_outline.sections:
        section_content = await generate_section(
            current_outline.as_str,
            section.section_title,
            current_outline.page_title,
            retriever,
            config
        )
        # Convert dictionary to Section object if needed
        if isinstance(section_content, dict):
            section_content = dict_to_section(section_content)
        sections.append(section_content)
    
    # Format all sections for final article generation
    draft = "\n\n".join(section.as_str for section in sections)
    
    # Update state with the generated article
    return State(
        messages=state.messages,
        outline=current_outline,
        related_topics=state.related_topics,
        perspectives=state.perspectives,
        is_last_step=True,
        article=draft,
        references=state.references
    ) 


