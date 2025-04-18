import logging
from typing import Annotated
from pydantic import BaseModel, Field

from langchain_core.tools import tool
from crewai_tools import CodeDocsSearchTool
from src.tools.decorators import log_io
from dotenv import load_dotenv
from src.config.llm import crewai_tools_config

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def code_docs_search_tool(
    docs_url: Annotated[str, "URL of the documentation to search through"],
    search_query: Annotated[str, "The search query to find relevant information in the documentation"],
) -> str:
    """Use this to search through code documentation websites for specific information."""
    try:
        browser_tool = CodeDocsSearchTool(config=crewai_tools_config)
        results = browser_tool.run(docs_url=docs_url, search_query=search_query)
        return results
    except BaseException as e:
        error_msg = f"Failed to search code documentation. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
