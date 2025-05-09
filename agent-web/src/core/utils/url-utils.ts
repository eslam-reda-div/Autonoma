/**
 * Utilities for managing URL parameters for chat persistence
 */

/**
 * Updates the URL with the chat UUID without reloading the page
 * @param chatUuid The UUID of the current chat
 * @param isTemporary Whether the chat is in temporary mode
 */
export const updateUrlWithChatId = (chatUuid: string | null, isTemporary: boolean = false) => {
  // Skip updating URL for temporary chats
  if (isTemporary) {
    // Remove chat parameter if it exists
    if (window.location.search.includes('chat=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('chat');
      window.history.replaceState({}, '', url);
    }
    return;
  }

  if (typeof window === 'undefined') return;
  
  if (chatUuid) {
    // Update URL with the chat UUID
    const url = new URL(window.location.href);
    url.searchParams.set('chat', chatUuid);
    window.history.replaceState({}, '', url);
  } else {
    // Remove chat parameter if it exists
    if (window.location.search.includes('chat=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('chat');
      window.history.replaceState({}, '', url);
    }
  }
};

/**
 * Gets the chat UUID from the URL if it exists
 * @returns The chat UUID from the URL or null if not found
 */
export const getChatIdFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('chat');
};

/**
 * Validates if a UUID is in the correct format
 * This is a simple validation to ensure it's not completely invalid
 * @param uuid The UUID to validate
 */
export const isValidUUID = (uuid: string): boolean => {
  // Basic validation - check if it looks like a UUID
  // This is intentionally forgiving to accommodate different UUID formats
  return /^[0-9a-f-]+$/i.test(uuid) && uuid.length > 8;
}; 