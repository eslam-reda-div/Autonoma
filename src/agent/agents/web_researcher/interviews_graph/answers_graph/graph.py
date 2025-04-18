"""Define the answer generation workflow graph."""

from langgraph.graph import StateGraph, START, END

from src.agent.agents.web_researcher.state import InterviewState
from src.agent.agents.web_researcher.interviews_graph.answers_graph.nodes.search import search_for_context
from src.agent.agents.web_researcher.interviews_graph.answers_graph.nodes.generate import generate_expert_answer

builder = StateGraph(InterviewState)

# Add nodes
builder.add_node("search_context", search_for_context)
builder.add_node("generate_answer", generate_expert_answer)

# Add edges
builder.add_edge(START, "search_context")
builder.add_edge("search_context", "generate_answer")
builder.add_edge("generate_answer", END)

answer_graph = builder.compile()
answer_graph.name = "Answer Generator"
