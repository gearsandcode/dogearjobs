/// <reference types="chrome"/>

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById(
    "bookmarkFile"
  ) as HTMLInputElement | null;
  const loadButton = document.getElementById(
    "loadBookmarks"
  ) as HTMLButtonElement | null;
  const statusDiv = document.getElementById("status") as HTMLDivElement | null;
  const fileNameDisplay = document.getElementById(
    "file-name"
  ) as HTMLDivElement | null;
  const bookmarkPreview = document.getElementById(
    "bookmarkPreview"
  ) as HTMLDivElement | null;

  if (
    fileInput &&
    loadButton &&
    statusDiv &&
    fileNameDisplay &&
    bookmarkPreview
  ) {
    // Listen for file selection
    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];

        // Display selected file name
        fileNameDisplay.textContent = file.name;
        fileNameDisplay.style.display = "block";

        // Enable the load button
        loadButton.disabled = false;

        // Preview the bookmarks
        previewBookmarks(file);
      } else {
        fileNameDisplay.style.display = "none";
        loadButton.disabled = true;
        bookmarkPreview.style.display = "none";
      }
    });

    // Process button click
    loadButton.addEventListener("click", () => {
      if (fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];

        // Show loading status
        showStatus("loading", `Reading ${file.name}...`);

        const reader = new FileReader();

        reader.onload = (event) => {
          if (event.target && typeof event.target.result === "string") {
            showStatus("loading", "Parsing bookmarks...");

            const bookmarkGroups = parseBookmarks(event.target.result);

            // Only send non-empty groups
            const nonEmptyGroups = bookmarkGroups.filter(
              (group) => group.urls.length > 0
            );

            if (nonEmptyGroups.length > 0) {
              // Count total bookmarks
              const totalBookmarks = nonEmptyGroups.reduce(
                (sum, group) => sum + group.urls.length,
                0
              );

              showStatus(
                "loading",
                `Creating ${nonEmptyGroups.length} tab groups with ${totalBookmarks} bookmarks...`
              );

              chrome.runtime.sendMessage(
                {
                  action: "createBookmarkGroups",
                  bookmarkGroups: nonEmptyGroups,
                },
                (response) => {
                  if (response && response.success) {
                    showStatus("success", "Tab groups created successfully!");
                    fileInput.value = "";
                    fileNameDisplay.style.display = "none";
                    bookmarkPreview.style.display = "none";
                    loadButton.disabled = true;

                    // Close popup after a brief delay to show success message
                    setTimeout(() => {
                      window.close();
                    }, 2000);
                  } else {
                    showStatus("error", "Error creating tab groups.");
                  }
                }
              );
            } else {
              showStatus(
                "error",
                "No bookmark groups with URLs found in the file"
              );
            }
          }
        };

        reader.onerror = () => {
          showStatus("error", "Error reading file");
        };

        reader.readAsText(file);
      } else {
        showStatus("error", "Please select a bookmarks file");
      }
    });
  } else {
    console.error("Required elements not found for bookmark file handling");
  }

  // Function to preview bookmarks before processing
  function previewBookmarks(file: File) {
    if (!bookmarkPreview) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target && typeof event.target.result === "string") {
        const bookmarkGroups = parseBookmarks(event.target.result);

        // Only show non-empty groups
        const nonEmptyGroups = bookmarkGroups.filter(
          (group) => group.urls.length > 0
        );

        // Display preview
        if (nonEmptyGroups.length > 0) {
          bookmarkPreview.innerHTML = "";

          nonEmptyGroups.forEach((group) => {
            const folderItem = document.createElement("div");
            folderItem.className = "folder-item";

            const folderName = document.createElement("div");
            folderName.className = "folder-name";

            folderName.innerHTML = `
              ${group.name}
              <span class="bookmark-count">${group.urls.length} bookmarks</span>
            `;

            folderItem.appendChild(folderName);
            bookmarkPreview.appendChild(folderItem);
          });

          bookmarkPreview.style.display = "block";

          // Show status with summary
          const totalBookmarks = nonEmptyGroups.reduce(
            (sum, group) => sum + group.urls.length,
            0
          );
          showStatus(
            "loading",
            `Found ${nonEmptyGroups.length} folders with ${totalBookmarks} bookmarks`
          );
        } else {
          bookmarkPreview.style.display = "none";
          showStatus("error", "No bookmark folders found in this file");
        }
      }
    };

    reader.onerror = () => {
      showStatus("error", "Error reading file for preview");
    };

    reader.readAsText(file);
  }

  // Helper function to show status messages with appropriate styling
  function showStatus(type: "loading" | "success" | "error", message: string) {
    if (!statusDiv) return;

    // Clear previous classes and add appropriate class
    statusDiv.className = "";
    statusDiv.classList.add(`status-${type}`);

    // Set message and ensure it's visible
    statusDiv.textContent = message;
    statusDiv.style.display = "block";
  }
});

// Parse bookmarks HTML file to extract folders and URLs
function parseBookmarks(html: string): { name: string; urls: string[] }[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  console.log("Parsing bookmarks HTML...");

  // Array to hold all bookmark groups
  const bookmarkGroups: { name: string; urls: string[] }[] = [];

  const allFolderHeaders = doc.querySelectorAll("h3");

  allFolderHeaders.forEach((headerElement) => {
    const folderName = headerElement.textContent?.trim() || "Unnamed Folder";
    console.log("Found folder:", folderName);

    // Skip root folders
    if (
      folderName === "Bookmarks" ||
      folderName.includes("PERSONAL_TOOLBAR_FOLDER")
    ) {
      return;
    }

    // Find the DL element that follows this H3
    let dlElement = headerElement.nextElementSibling;
    while (dlElement && dlElement.tagName !== "DL") {
      dlElement = dlElement.nextElementSibling;
    }

    if (dlElement) {
      // Find all A elements (links) within this DL
      const links = dlElement.querySelectorAll("a");
      const urls: string[] = [];

      links.forEach((link) => {
        const url = link.getAttribute("href");
        if (url) {
          console.log(`Found URL in ${folderName}:`, url);
          urls.push(url);
        }
      });

      if (urls.length > 0) {
        bookmarkGroups.push({ name: folderName, urls });
      }
    }
  });

  console.log("Parsed bookmark groups:", bookmarkGroups);
  return bookmarkGroups;
}
