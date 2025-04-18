import { type WorkflowTask } from "./tasks";

interface GenericWorkflowStep<T extends string> {
  id: string;
  type: T;
  tasks: WorkflowTask[];
  isCompleted?: boolean;
}

export interface AgenticStep extends GenericWorkflowStep<"agentic"> {
  agentId: string;
  agentName: string;
}

export type WorkflowStep = AgenticStep;
