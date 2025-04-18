import logging
from typing import Annotated, Optional, Dict, Any
import os

from langchain_core.tools import tool
from crewai_tools import RagTool
from src.tools.decorators import log_io
from dotenv import load_dotenv
from src.config.llm import crewai_tools_config

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def rag_search_tool(
    query: Annotated[str, "The question or query to search for in the knowledge base"],
    data_source_type: Annotated[str, "Type of data source (file, web_page, youtube_video, directory, etc.)"],
    source_path_or_url: Annotated[Optional[str], "Path to file/directory or URL to web content"] = None,
    content: Annotated[Optional[str], "Content to query directly"] = None,
    summarize: Annotated[bool, "Whether to summarize the retrieved content"] = False
) -> str:
    """Use this to perform semantic search on various data sources using RAG."""
    try:
        logger.info(f"Searching with RAG for query '{query}' using data source type '{data_source_type}'")
        
        rag_tool = RagTool(
            config=crewai_tools_config,
            summarize=summarize
        )
        
        # Add the appropriate data source based on type
        if data_source_type == 'file':
            if os.path.exists(source_path_or_url):
                rag_tool.add(data_type="file", path=source_path_or_url)
            else:
                error_msg = f"File not found at {source_path_or_url}"
                logger.error(error_msg)
                return error_msg
                
        elif data_source_type == 'web_page':
            rag_tool.add(data_type="web_page", url=source_path_or_url)
            
        elif data_source_type == 'youtube_video':
            rag_tool.add(data_type="youtube_video", url=source_path_or_url)
            
        elif data_source_type == 'directory':
            if os.path.isdir(source_path_or_url):
                rag_tool.add(data_type="directory", path=source_path_or_url)
            else:
                error_msg = f"Directory not found at {source_path_or_url}"
                logger.error(error_msg)
                return error_msg
        
        elif data_source_type in ['csv', 'json', 'text', 'docx', 'xml', 'mdx', 'github_repo', 'discord', 'slack']:
            kwargs = {}
            
            if source_path_or_url:
                if 'url' in data_source_type or data_source_type in ['github_repo', 'discord', 'slack']:
                    kwargs['url'] = source_path_or_url
                else:
                    kwargs['path'] = source_path_or_url
            if content:
                kwargs['content'] = content
                
            rag_tool.add(data_type=data_source_type, **kwargs)
        
        else:
            error_msg = "Invalid data source type provided."
            logger.error(error_msg)
            return error_msg
        
        response = rag_tool.run(query)
        return response
    except BaseException as e:
        error_msg = f"Failed to search with RAG. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
