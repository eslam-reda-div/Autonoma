import { type Message } from "../messaging";
import { fetchStream } from "../sse";
import { useChatHistoryStore } from "../store";
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
  let messagePayload;
  let messageContent;

  if (userMessage.type === "imagetext") {
    // Format message with image for the backend API
    const images = userMessage.content.images;
    const text = userMessage.content.text;
    
    // Process images to ensure compatibility with the backend
    const processedImages = images?.map(img => {
      // If the image is too large or in a problematic format, we might need to process it
      // For now, just ensure it's a valid base64 string
      if (img.startsWith('data:image/')) {
        return img;
      }
      // Fall back to a safer format if needed
      return img;
    }) || [];
    
    // For image messages, use a simpler format that the backend can process
    messageContent = text;
    // Create an array for the content that will contain the text and images
    type ContentItem = 
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: string };
      
    const contentArray: ContentItem[] = [
      {
        type: "text",
        text: messageContent,
      }
    ];
    
    // Loop through each processed image and add it individually
    for (const image of processedImages) {
      contentArray.push({
        type: "image_url",
        image_url: image,
      });
    }
    
    // Set the message payload with the content array
    messagePayload = {
      role: "user",
      content: contentArray,
    };
  } else {
    // Standard text message
    messageContent = userMessage.content;
    messagePayload = {
      role: "user",
      content: messageContent,
    };
  }

  const chatContent = useChatHistoryStore.getState().getChatContentSync();

  const apiRequestBody = {
    // TODO: add `thread_id` in the future
    messages: chatContent?.messages && Array.isArray(chatContent.messages) 
      ? [...chatContent.messages, messagePayload] 
      : [messagePayload],
    deep_thinking_mode: params.deepThinkingMode,
    search_before_planning: params.searchBeforePlanning,
    debug: location.search.includes("debug") && !location.search.includes("debug=false"),
    team_members: params.teamMembers,
  };
  
  return fetchStream<ChatEvent>(
    getBaseApiUrl() + "/chat/stream",
    {
      body: JSON.stringify(apiRequestBody),
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
