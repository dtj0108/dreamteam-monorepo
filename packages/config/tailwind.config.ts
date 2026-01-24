import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";
import tailwindReactAriaComponents from "tailwindcss-react-aria-components";

const config: Partial<Config> = {
  darkMode: "class",
  plugins: [tailwindAnimate, tailwindReactAriaComponents],
};

export default config;

