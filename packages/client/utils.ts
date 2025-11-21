export const applicationMode = (() => {
  console.log("Running in", process.env.NODE_ENV);
  if (process.env.NODE_ENV === "development") {
    return "development";
  } else {
    return "production";
  }
})();
