import { type Message } from "../messaging";
import { fetchStream } from "../sse";

import { getApiUrl } from "./api-url-store";
import { type TeamMember, type ChatEvent } from "./types";

// Helper function to get the API URL (from Zustand store or fallback to env)
function getBaseApiUrl(): string {
  // Use the helper function from our store which handles both client and server side
  return getApiUrl();
}

export function chatStream(
  userMessage: Message,
  state: { messages: { role: string; content: string }[] },
  params: {
    deepThinkingMode: boolean;
    searchBeforePlanning: boolean;
    teamMembers: string[];
  },
  options: { abortSignal?: AbortSignal } = {},
) {
  return fetchStream<ChatEvent>(
    getBaseApiUrl() + "/chat/stream",
    {
      body: JSON.stringify({
        // TODO: add `thread_id` in the future
        messages: [userMessage],
        deep_thinking_mode: params.deepThinkingMode,
        search_before_planning: params.searchBeforePlanning,
        debug:
          location.search.includes("debug") &&
          !location.search.includes("debug=false"),
        team_members: params.teamMembers,
      }),
      signal: options.abortSignal,
    },
  );
}

export async function queryTeamMembers() {
  try {
    const response = await fetch(
      getBaseApiUrl() + "/team_members",
      { method: "GET" },
    );
    const { team_members } = (await response.json()) as {
      team_members: Record<string, TeamMember>;
    };
    const allTeamMembers = Object.values(team_members);
    return [
      ...allTeamMembers.filter((member) => !member.is_optional),
      ...allTeamMembers.filter((member) => member.is_optional),
    ];
  } catch (err) {
    console.warn(
      "🖐️️ [Autonoma]\n\nError connecting to Autonoma backend. Please ensure the latest version is running locally.\n\nRaw network error: ",
    );
    console.error(err);
    return [];
  }
}
