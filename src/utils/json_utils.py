import logging
import json
import json_repair

logger = logging.getLogger(__name__)

def repair_json_output(content: str) -> str:
    content = content.strip()
    if content.startswith(("{", "[")) or "```json" in content:
        try:
            if content.startswith("```json"):
                content = content.removeprefix("```json")

            if content.endswith("```"):
                content = content.removesuffix("```")

            repaired_content = json_repair.loads(content)
            return json.dumps(repaired_content)
        except Exception as e:
            logger.warning(f"JSON repair failed: {e}")
    return content
