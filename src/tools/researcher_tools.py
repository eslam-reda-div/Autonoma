from src.tools.search_tools.travily import tavily_tool
from src.tools.search_tools.crawl import crawl_tool
from src.tools.search_tools.duck_duck_go import duck_duck_go_tool
from src.tools.search_tools.yahoo_finance_news import yahoo_finance_news_tool
from src.tools.search_tools.youtube_search import youtube_search_tool
from src.tools.search_tools.wikipedia_search import wikipedia_search_tool
from src.tools.search_tools.open_weather_map_search import open_weather_map_search_tool
# from src.tools.search_tools.youtube_channel_search import youtube_channel_search_tool
# from src.tools.search_tools.youtube_video_search import youtube_video_search_tool
# from src.tools.search_tools.website_search import website_search_tool
# from src.tools.search_tools.code_docs_search import code_docs_search_tool
# from src.tools.search_tools.serper_dev_search import serper_dev_search_tool
# from src.tools.search_tools.firecrawl_scrape_website import firecrawl_scrape_website_tool
# from src.tools.search_tools.firecrawl_search import firecrawl_search_tool
# from src.tools.search_tools.selenium_scraping import selenium_scraping_tool
# from src.tools.search_tools.website_scrape import website_scrape_tool
# from src.tools.search_tools.scrape_element import scrape_element_tool
# from src.tools.search_tools.firecrawl_crawl_website import firecrawl_crawl_website_tool
from src.tools.search_tools.hyper_browser import hyperbrowser_extract_tool

tools = [
    tavily_tool,
    crawl_tool,
    duck_duck_go_tool,
    yahoo_finance_news_tool,
    youtube_search_tool,
    wikipedia_search_tool,
    open_weather_map_search_tool,
    # youtube_channel_search_tool,
    # youtube_video_search_tool,
    # website_search_tool,
    # code_docs_search_tool,
    # serper_dev_search_tool,
    # firecrawl_scrape_website_tool,
    # firecrawl_search_tool,
    # selenium_scraping_tool,
    # website_scrape_tool,
    # scrape_element_tool,
    # firecrawl_crawl_website_tool,
    hyperbrowser_extract_tool
]