import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_STRAPI_API_URL || "http://localhost:1337";
const API_TOKEN = process.env.NEXT_PUBLIC_STRAPI_API_TOKEN;

// Configure axios with default headers
const api = axios.create({
  baseURL: API_URL,
  headers: API_TOKEN
    ? {
        Authorization: `Bearer ${API_TOKEN}`,
      }
    : {},
});

export const fetcher = (url: string) => api.get(url).then((res) => res.data);

export const getSites = async () => {
  try {
    const response = await api.get(`/api/sites?populate=tags`);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching sites:", error);
    throw error;
  }
};

export const getTerms = async () => {
  try {
    const response = await api.get(`/api/terms`);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching terms:", error);
    throw error;
  }
};

export const getCollections = async () => {
  try {
    // Use explicit population for nested relations
    const response = await api.get(
      `/api/collections?populate[0]=tags&populate[1]=Terms&populate[2]=Terms.term`
    );
    console.log("Collections data:", response.data.data);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching collections:", error);
    throw error;
  }
};

export const getCollection = async (id: string) => {
  try {
    // Use explicit population for nested relations
    const response = await api.get(
      `/api/collections/${id}?populate[0]=tags&populate[1]=Terms&populate[2]=Terms.term`
    );
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching collection ${id}:`, error);
    throw error;
  }
};
