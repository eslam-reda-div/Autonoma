import logging
from typing import Annotated

from langchain_core.tools import tool
from langchain_community.tools.yahoo_finance_news import YahooFinanceNewsTool
from src.tools.decorators import log_io
from dotenv import load_dotenv

load_dotenv()


logger = logging.getLogger(__name__)

@tool
@log_io
def yahoo_finance_news_tool(
    query: Annotated[str, "The company ticker query to look up."],
) -> str:
    """Use this to search for financial news using Yahoo Finance."""
    try:
        logger.info(f"Searching Yahoo Finance for '{query}'")
        search_tool = YahooFinanceNewsTool()
        results = search_tool.invoke({"query": query})
        return results
    except BaseException as e:
        error_msg = f"Failed to search Yahoo Finance news. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
