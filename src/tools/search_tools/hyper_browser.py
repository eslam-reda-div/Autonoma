import logging
import os
import json
from typing import Annotated
from pydantic import BaseModel, Field

from langchain_core.tools import tool
from src.tools.decorators import log_io
from dotenv import load_dotenv
from hyperbrowser import Hyperbrowser
from hyperbrowser.models.extract import StartExtractJobParams

load_dotenv()

logger = logging.getLogger(__name__)

# Initialize Hyperbrowser client
client = Hyperbrowser(api_key=os.getenv("HYPERBROWSER_API_KEY"))

@tool
@log_io
def hyperbrowser_extract_tool(
    website_url: Annotated[str, "The URL of the website to extract data from. Must include protocol (http:// or https://)."],
    prompt: Annotated[str, "The extraction prompt that describes what data to extract from the website."],
    extraction_schema: Annotated[str, "Optional JSON string defining the extraction schema. Leave empty to use default extraction."] = ""
) -> str:
    """
    Extracts structured data from a website using Hyperbrowser AI.
    Provide a URL, extraction prompt, and optionally a schema in JSON format.
    """
    try:
        # Parse schema if provided
        schema = None
        if extraction_schema:
            try:
                schema_dict = json.loads(extraction_schema)
                # Create a dynamic BaseModel class for the schema
                schema = type('DynamicSchema', (BaseModel,), schema_dict)
            except json.JSONDecodeError:
                logger.warning("Invalid schema JSON provided, proceeding without schema")
        
        # Set up extraction parameters
        params = StartExtractJobParams(
            urls=[website_url],
            prompt=prompt,
            schema=schema
        )
        
        logger.info(f"Extracting data from '{website_url}' using Hyperbrowser")
        
        # Run extraction
        result = client.extract.start_and_wait(params=params)
        
        # Format and return results
        return json.dumps(result.data, indent=2)
    
    except BaseException as e:
        error_msg = f"Failed to extract data from website. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg