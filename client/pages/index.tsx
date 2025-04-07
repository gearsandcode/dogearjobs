import { useEffect, useState } from "react";
import Head from "next/head";
import { getSites, getCollections, getTerms } from "@/lib/api";

interface Tag {
  id: number;
  name: string;
}

interface Site {
  id: number;
  documentId: string;
  site: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  tags: Tag[];
}

// Updated Term interface to match the actual structure
interface Term {
  id: number;
  term: {
    id: number;
    term: string; // The actual term string is nested inside the term object
  };
  operator: string;
  negative: boolean;
}

interface Collection {
  id: number;
  collection: string;
  description: string;
  range: string;
  Terms: Term[];
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Function to map range to Google's time parameter
const rangeToGoogleParam = (range: string): string => {
  switch (range) {
    case "Past hour":
      return "h";
    case "Past 24 hours":
      return "d";
    case "Past week":
      return "w";
    case "Past 2 weeks":
      return "w2";
    case "Past month":
      return "m";
    case "Past 2 months":
      return "m2";
    case "Past 4 months":
      return "m4";
    case "Past 6 months":
      return "m6";
    case "Past year":
      return "y";
    default:
      return "";
  }
};

// Function to format search term with proper quotes - UPDATED
const formatTerm = (termObj: Term): string => {
  const termText = termObj.term?.term || "";
  const formattedTerm = termText.includes(" ") ? `"${termText}"` : termText;
  return termObj.negative ? `-${formattedTerm}` : formattedTerm;
};

// Function to build the search query for a collection and site
const buildSearchQuery = (site: string, collection: Collection): string => {
  if (!collection.Terms || collection.Terms.length === 0) {
    return "";
  }

  // Group terms by their operator (positive vs negative)
  const positiveTerms = collection.Terms.filter((term) => !term.negative);
  const negativeTerms = collection.Terms.filter((term) => term.negative);

  // Format positive terms with the appropriate operator
  let query = `site:${site}`;

  if (positiveTerms.length > 0) {
    const operator = positiveTerms[0].operator || "OR";
    const formattedPositive = positiveTerms
      .map((term) => formatTerm(term))
      .join(` ${operator} `);

    query += ` (${formattedPositive})`;
  }

  // Add negative terms
  if (negativeTerms.length > 0) {
    const formattedNegative = negativeTerms
      .map((term) => formatTerm(term))
      .join(" ");

    query += ` ${formattedNegative}`;
  }

  // Add time range parameter if specified
  const timeParam = rangeToGoogleParam(collection.range);
  const timeQuery = timeParam ? `&tbs=qdr:${timeParam}` : "";

  return `https://www.google.com/search?q=${encodeURIComponent(query)}${timeQuery}`;
};

// Function to generate bookmarks HTML file
const generateBookmarksHtml = (
  collection: Collection,
  sites: Site[]
): string => {
  const now = Math.floor(Date.now() / 1000);

  // Start with the bookmarks file header
  let bookmarksHtml = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">${collection.collection}</H3>
    <DL><p>`;

  // Add each site as a bookmark
  sites.forEach((site) => {
    const searchUrl = buildSearchQuery(
      site.site.replace(/^https?:\/\//, ""),
      collection
    );

    if (searchUrl) {
      // Extract just the main domain (e.g., lever.co from jobs.lever.co)
      const fullSiteName = site.site.replace(/^https?:\/\//, "");
      const domainParts = fullSiteName.split(".");
      // If site has more than 2 parts (e.g. jobs.lever.co), keep only the last 2
      const mainDomain =
        domainParts.length > 2
          ? `${domainParts[domainParts.length - 2]}.${domainParts[domainParts.length - 1]}`
          : fullSiteName;

      // Get simplified search terms
      const searchTerms = simplifySearchTermsForDisplay(collection);

      bookmarksHtml += `
        <DT><A HREF="${searchUrl}" ADD_DATE="${now}">${mainDomain} ${searchTerms}</A>`;
    }
  });

  // Close the folder and the HTML structure
  bookmarksHtml += `
    </DL><p>
</DL><p>`;

  return bookmarksHtml;
};

// New helper function to create simplified search terms for bookmark names
const simplifySearchTermsForDisplay = (collection: Collection): string => {
  // Group terms by their operator (positive vs negative)
  const positiveTerms =
    collection.Terms?.filter((term) => !term.negative) || [];
  const negativeTerms = collection.Terms?.filter((term) => term.negative) || [];

  let displayText = "";

  if (positiveTerms.length > 0) {
    const operator = positiveTerms[0].operator || "OR";
    displayText += positiveTerms
      .map((term) => `"${term.term?.term || term.term}"`)
      .join(` ${operator} `);
  }

  if (negativeTerms.length > 0) {
    displayText += ` ${negativeTerms
      .map((term) => `-"${term.term?.term || term.term}"`)
      .join(" ")}`;
  }

  return displayText;
};

// Keep the original helper function for other uses
const formatSearchTermsForDisplay = (collection: Collection): string => {
  // Group terms by their operator (positive vs negative)
  const positiveTerms =
    collection.Terms?.filter((term) => !term.negative) || [];
  const negativeTerms = collection.Terms?.filter((term) => term.negative) || [];

  let displayText = "";

  if (positiveTerms.length > 0) {
    const operator = positiveTerms[0].operator || "OR";
    displayText += `(${positiveTerms
      .map((term) => `"${term.term?.term || term.term}"`)
      .join(` ${operator} `)})`;
  }

  if (negativeTerms.length > 0) {
    displayText += ` ${negativeTerms
      .map((term) => `-"${term.term?.term || term.term}"`)
      .join(" ")}`;
  }

  return displayText;
};

// Helper function to download the generated bookmarks file
const downloadBookmarks = (collection: Collection, sites: Site[]) => {
  const bookmarksHtml = generateBookmarksHtml(collection, sites);
  const blob = new Blob([bookmarksHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bookmarks-${collection.collection.replace(/\s+/g, "-").toLowerCase()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function Home() {
  const [sites, setSites] = useState<Site[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all data in parallel for better performance
        const [sitesData, collectionsData, termsData] = await Promise.all([
          getSites(),
          getCollections(),
          getTerms(),
        ]);

        // Create a lookup map for terms
        const termsMap = new Map();
        termsData.forEach((term) => {
          termsMap.set(term.id, term);
        });

        // Enhance collections with fully populated term data
        const enhancedCollections = collectionsData.map((collection) => {
          if (collection.Terms) {
            collection.Terms = collection.Terms.map((termComponent) => {
              // If Terms.term is not populated, use the lookup map
              if (!termComponent.term && termComponent.term_id) {
                termComponent.term = termsMap.get(termComponent.term_id);
              }
              return termComponent;
            });
          }
          return collection;
        });

        setSites(sitesData);
        setCollections(enhancedCollections);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data from the API");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container">
      <Head>
        <title>DogEar Collections</title>
        <meta
          name="description"
          content="Browse collections for different sites"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>Collections</h1>

        {collections.length === 0 ? (
          <p>No collections available</p>
        ) : (
          <div className="cards-grid">
            {collections.map((collection) => (
              <div key={collection.id} className="collection-card">
                <div className="card-header">
                  <h2 className="collection-title">{collection.collection}</h2>
                  <span className="time-range">
                    {collection.range || "Any time"}
                  </span>
                </div>

                {collection.description && (
                  <p className="collection-description">
                    {collection.description}
                  </p>
                )}

                <div className="card-content">
                  <div className="terms-section">
                    <h3>Search Terms</h3>
                    {collection.Terms && collection.Terms.length > 0 ? (
                      <ul className="terms-list">
                        {collection.Terms.map((term) => (
                          <li key={term.id}>
                            <span
                              className={
                                term.negative ? "negative" : "positive"
                              }
                            >
                              {term.negative ? "- " : ""}
                              {term.term?.term || "Unknown term"}
                            </span>
                            <span className="operator">
                              {term.operator && ` (${term.operator})`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-terms">No search terms</p>
                    )}
                  </div>

                  <div className="sites-section">
                    <h3>Search on:</h3>
                    {sites.length > 0 ? (
                      <ul className="sites-list">
                        {sites.map((site) => (
                          <li key={site.id}>
                            <a
                              href={buildSearchQuery(
                                site.site.replace(/^https?:\/\//, ""),
                                collection
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="site-link"
                            >
                              {site.site.replace(/^https?:\/\//, "")}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-sites">No sites available</p>
                    )}
                  </div>

                  <div className="export-section">
                    <button
                      className="export-button"
                      onClick={() => downloadBookmarks(collection, sites)}
                      title="Export bookmarks file for this collection"
                    >
                      Export Bookmarks
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
