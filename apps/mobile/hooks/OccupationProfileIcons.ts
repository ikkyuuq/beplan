export type OccupationIconData = {
  color: string;
  icon: string;
  label: string;
};

// Map of occupations to icon data
export const OCCUPATION_ICONS: Record<string, OccupationIconData> = {
  // Education
  Student: {
    color: "#4285F4",
    icon: "school",
    label: "Student",
  },
  Teacher: {
    color: "#34A853",
    icon: "library",
    label: "Teacher",
  },

  // Tech
  "Software Developer": {
    color: "#333333",
    icon: "code-slash",
    label: "Developer",
  },
  Designer: {
    color: "#EA4C89",
    icon: "color-palette",
    label: "Designer",
  },
  Engineer: {
    color: "#0A66C2",
    icon: "construct",
    label: "Engineer",
  },

  // Business
  "Business Owner": {
    color: "#0077B5",
    icon: "briefcase",
    label: "Business",
  },
  Marketing: {
    color: "#FF5A5F",
    icon: "megaphone",
    label: "Marketing",
  },
  Sales: {
    color: "#1DA1F2",
    icon: "trending-up",
    label: "Sales",
  },
  Manager: {
    color: "#7A5DC7",
    icon: "people",
    label: "Manager",
  },
  Accountant: {
    color: "#2E7D32",
    icon: "calculator",
    label: "Accountant",
  },

  // Healthcare
  Doctor: {
    color: "#E91E63",
    icon: "medical",
    label: "Doctor",
  },
  "Healthcare Professional": {
    color: "#00BCD4",
    icon: "fitness",
    label: "Healthcare",
  },

  // Creative
  Artist: {
    color: "#FF9800",
    icon: "brush",
    label: "Artist",
  },
  Freelancer: {
    color: "#673AB7",
    icon: "laptop",
    label: "Freelancer",
  },

  // Other
  Other: {
    color: "#757575",
    icon: "person",
    label: "Other",
  },
};

/**
 * Get profile icon data based on occupation
 * @param occupation User's occupation
 * @returns Icon data for the given occupation or a default one
 */
export function getOccupationIconData(
  occupation: string | null | undefined
): OccupationIconData {
  if (!occupation) {
    return OCCUPATION_ICONS["Other"];
  }

  // find an exact match
  if (OCCUPATION_ICONS[occupation]) {
    return OCCUPATION_ICONS[occupation];
  }

  // Try to find a partial match (if occupation contains a key)
  // If the occupation does not match any of the keys, but has a partial match, such as "Software Developer and Architect", it finds the key in this string (in this case, "Software Developer") and returns the icon for that key.
  const partialMatch = Object.keys(OCCUPATION_ICONS).find((key) =>
    occupation.toLowerCase().includes(key.toLowerCase())
  );

  if (partialMatch) {
    return OCCUPATION_ICONS[partialMatch];
  }

  // Default to "Other" if no match found
  return OCCUPATION_ICONS["Other"];
}
