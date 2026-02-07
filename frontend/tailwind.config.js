export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        omron: {
          blue: "#166fc0",      // OMRON blue
          blueDark: "#0c3964ff",
          blueLight: "#2b84d6ff",
          grayBg: "#F5F7FA",
        },
      },
    },
  },
  plugins: [],
};
