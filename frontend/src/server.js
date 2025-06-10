export const server = "https://shopingse.id.vn/api/v2";

export const backend_url = "https://shopingse.id.vn";

// Helper function to ensure image URLs are properly formatted
export const getImageUrl = (path) => {
  if (!path) return "";
  
  // If path already starts with /uploads/, just prepend the backend_url
  if (path.startsWith("/uploads/")) {
    return `${backend_url}${path}`;
  } 
  
  // Otherwise, ensure /uploads/ is included
  return `${backend_url}/uploads/${path}`;
};
