export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        omron: {
          blue: "#003A8F",      // OMRON deep blue
          blueDark: "#002A66",
          blueLight: "#1F5FBF",
          grayBg: "#F5F7FA",
        },
      },
    },
  },
  plugins: [],
};
