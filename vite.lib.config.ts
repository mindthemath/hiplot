import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import remToPx from "postcss-rem-to-pixel";

function packageNameFull(isDebug: boolean): string {
  const version = process.env.HIPLOT_VERSION ?? "0.0.0";
  return `lib-hiplot-${version}${isDebug ? "-dbg" : ""}`;
}

export default defineConfig(({ mode }) => {
  const isDebug = mode === "development";
  return {
    plugins: [react(), cssInjectedByJsPlugin()],
    define: {
      HIPLOT_PACKAGE_NAME_FULL: JSON.stringify(packageNameFull(isDebug)),
      define: "undefined",
    },
    build: {
      outDir: "npm-dist",
      emptyOutDir: false,
      sourcemap: true,
      target: "es2020",
      lib: {
        entry: path.resolve(__dirname, "src", "hiplot.tsx"),
        name: "hiplot",
        formats: ["umd"],
        fileName: () => "hiplot.lib.js",
      },
      rollupOptions: {
        external: ["react"],
        output: {
          globals: {
            react: "React",
          },
        },
      },
    },
    css: {
      modules: {
        generateScopedName: isDebug ? "[local]_[hash:base64:5]" : "[hash:base64:5]",
      },
      postcss: {
        plugins: [
          remToPx({
            propList: ["font", "font-size", "line-height", "letter-spacing", "padding*", "border*"],
          }),
        ],
      },
    },
  };
});
