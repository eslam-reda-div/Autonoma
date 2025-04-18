import json
import os
import re
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

def save_conversation(result):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"conversation_{timestamp}.json"
    conversations_dir = os.getenv("CONVERSATIONS_DIR")
    filepath = os.path.join(conversations_dir, filename)
    os.makedirs(conversations_dir, exist_ok=True)
    
    # Handle string representation of dict
    if isinstance(result, str) and result.startswith("{'messages':"):
        try:
            # Convert string to proper JSON format for parsing
            result_str = result.replace("'", "\"")
            # Handle the HumanMessage objects in the string
            pattern = r'HumanMessage\(([^)]+)\)'
            
            def replace_message_obj(match):
                content = match.group(1)
                # Convert the attributes to a JSON object
                attributes = {}
                for attr_match in re.finditer(r'(\w+)=([^,]+)', content):
                    key, value = attr_match.groups()
                    if value.startswith("'") and value.endswith("'"):
                        value = value[1:-1]  # Remove quotes
                    attributes[key] = value
                return json.dumps(attributes)
            
            result_str = re.sub(pattern, replace_message_obj, result_str)
            data = json.loads(result_str)
            
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return
        except Exception as e:
            print(f"Error parsing string result: {e}")
            # Fall back to default handling
    
    # Original conversion logic
    if hasattr(result, 'dict'):
        serializable_result = result.dict()
    elif hasattr(result, 'to_dict'):
        serializable_result = result.to_dict()
    elif isinstance(result, list):
        serializable_result = []
        for item in result:
            if hasattr(item, 'dict'):
                serializable_result.append(item.dict())
            elif hasattr(item, 'to_dict'):
                serializable_result.append(item.to_dict())
            elif hasattr(item, 'content') and hasattr(item, 'type'):
                serializable_result.append({"content": item.content, "type": item.type})
            else:
                serializable_result.append(str(item))
    else:
        serializable_result = str(result)
        
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(serializable_result, f, indent=2, ensure_ascii=False)