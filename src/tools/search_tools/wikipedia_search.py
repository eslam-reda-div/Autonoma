import logging
from typing import Annotated

from langchain_core.tools import tool
from langchain_community.tools.wikipedia.tool import WikipediaQueryRun
from langchain_community.utilities.wikipedia import WikipediaAPIWrapper
from src.tools.decorators import log_io
from dotenv import load_dotenv

load_dotenv()


logger = logging.getLogger(__name__)

@tool
@log_io
def wikipedia_search_tool(
    query: Annotated[str, "The Wikipedia search query."],
) -> str:
    """Use this to search for information on Wikipedia."""
    try:
        logger.info(f"Searching Wikipedia for '{query}'")
        wiki_tool = WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper())
        results = wiki_tool.invoke({"query": query})
        return results
    except BaseException as e:
        error_msg = f"Failed to search Wikipedia. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
