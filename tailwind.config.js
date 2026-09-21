/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0f172a", // Deep Navy
          50: "#f8fafc",
          100: "#f1f5f9",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        brandRed: {
          DEFAULT: "#dc2626", // Logo Vibrant Red
          hover: "#b91c1c",
          dark: "#991b1b",
          light: "#fef2f2",
        },
        brandDark: {
          DEFAULT: "#111827", // Logo Black Nameplate
          surface: "#1f2937",
          border: "#374151",
        },
        brandBlue: {
          DEFAULT: "#dc2626", // Map brand theme to Red
          hover: "#b91c1c",
          dark: "#991b1b",
          light: "#fee2e2",
        },
        secondary: {
          DEFAULT: "#dc2626", // Logo Red
          light: "#ef4444",
          hover: "#b91c1c",
        },
        accent: {
          DEFAULT: "#dc2626", // Logo Red
          dark: "#b91c1c",
        },
        surface: "#f8fafc", // Very Light Gray
        card: "#ffffff", // Clean White
        charcoal: "#334155", // Dark Charcoal text
        whatsapp: {
          DEFAULT: "#25D366", // Emerald Green
          hover: "#20bd5a",
          dark: "#128C7E",
        },
        success: "#25D366",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
