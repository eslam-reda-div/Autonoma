from src.tools.search_tools.travily import tavily_tool

def search(query):
    return tavily_tool.invoke({"query": query})