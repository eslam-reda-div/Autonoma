# Adding a New Agent to the Workflow

Follow these steps to integrate a new agent into the system:

1. **Create Agent Prompt**
    - Define the agent's prompt template with clear instructions

2. **Update Configuration**
    - Add the agent to the team file in the `/config` folder
    - Configure the agent's LLM in the LLM file within the `/config` folder

3. **Implement Agent**
    - Add the agent tools file in the `/tools` folder
    - Create the agent implementation in the `/agent/agents` folder

4. **Update Processing Graph**
    - Add the agent to the graph in `/agent/graph.py`

5. **Integrate with Planner**
    - Add the agent to the planner prompt
    - Include a clear description of the agent's capabilities and purpose
