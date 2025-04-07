/// <reference types="chrome"/>

const TAB_COLORS: chrome.tabGroups.ColorEnum[] = [
  "blue",
  "red",
  "yellow",
  "green",
  "pink",
  "purple",
  "cyan",
  "orange",
  "grey",
];

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "createBookmarkGroups") {
    handleBookmarkGroups(message.bookmarkGroups)
      .then(() => sendResponse({ success: true }))
      .catch((error) => {
        console.error(error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  }
  return false;
});

// Helper function to ensure URLs have proper protocol
function ensureHttps(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url}`;
}

// Get a random color for the tab group
function getRandomColor(): chrome.tabGroups.ColorEnum {
  const randomIndex = Math.floor(Math.random() * TAB_COLORS.length);
  return TAB_COLORS[randomIndex];
}

async function createTabsAndGroup(
  urls: string[],
  groupName: string
): Promise<void> {
  try {
    // Create all tabs
    const tabIds: number[] = [];

    for (const url of urls) {
      const formattedUrl = ensureHttps(url);
      const tab = await chrome.tabs.create({
        url: formattedUrl,
        active: false,
      });
      if (tab.id) tabIds.push(tab.id);
    }

    // Group the tabs
    if (tabIds.length > 0) {
      const groupId = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(groupId, {
        title: groupName,
        color: getRandomColor(),
      });
    }
  } catch (error) {
    console.error("Error creating tabs and group:", error);
    throw error;
  }
}

async function handleBookmarkGroups(
  bookmarkGroups: { name: string; urls: string[] }[]
): Promise<void> {
  try {
    console.log(`Processing ${bookmarkGroups.length} bookmark groups`);

    // Process each bookmark group
    for (const group of bookmarkGroups) {
      // Skip empty groups
      if (group.urls.length === 0) continue;

      console.log(
        `Creating group "${group.name}" with ${group.urls.length} URLs`
      );

      // Create tabs and group with the folder name
      await createTabsAndGroup(group.urls, group.name);

      // Add a small delay between creating groups to avoid overwhelming the browser
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error("Error handling bookmark groups:", error);
    throw error;
  }
}
