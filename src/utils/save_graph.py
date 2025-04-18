from src.agent.graph import build_graph
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

graph = build_graph()

def save_graph():
    output_dir = Path("../../")
    output_path = output_dir / "workflow_graph.png"
    graph_bytes = graph.get_graph().draw_mermaid()
    print(graph_bytes)
    # with open(output_path, "wb") as f:
    #     f.write(graph_bytes)