import logging
from langchain_community.tools.tavily_search import TavilySearchResults
from src.tools.decorators import create_logged_tool
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

logger.info("Loading Tavily search tool...")

LoggedTavilySearch = create_logged_tool(TavilySearchResults)
tavily_tool = LoggedTavilySearch(name="planner_tavily_search", max_results=5)

def search(query):
    return tavily_tool.invoke({"query": query})