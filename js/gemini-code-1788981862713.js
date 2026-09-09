// Helper to strip Bulgarian & English accents/diacritics for flexible matching
function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function searchServices(query, lang = "bg") {
  if (!query || typeof query !== "string") return [];
  
  const cleanQuery = normalizeText(query.trim());

  return SERVICES.filter((item) => {
    // Safely extract language-specific string values
    const nameStr = item.name && item.name[lang] ? item.name[lang] : ""; //
    const descStr = item.desc && item.desc[lang] ? item.desc[lang] : ""; //[cite: 1]

    const normalizedName = normalizeText(nameStr);
    const normalizedDesc = normalizeText(descStr);

    // Perform partial search against both name and description
    return normalizedName.includes(cleanQuery) || normalizedDesc.includes(cleanQuery);
  });
}