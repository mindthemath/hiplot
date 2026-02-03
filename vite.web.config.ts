import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import remToPx from "postcss-rem-to-pixel";

function packageNameFull(isDebug: boolean): string {
  const version = process.env.HIPLOT_VERSION ?? "0.0.0";
  const packageName = process.env.HIPLOT_PACKAGE ?? "hiplot";
  return `bundle-${packageName}-${version}${isDebug ? "-dbg" : ""}`;
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFile(src: string, dest: string) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyWebBundlesPlugin(entryName: string) {
  return {
    name: "copy-hiplot-web-bundles",
    writeBundle() {
      const distPath = path.resolve(__dirname, "npm-dist");
      const pyBuilt = path.resolve(__dirname, "hiplot", "static", "built");
      const installToFolders = [
        path.resolve(pyBuilt, ""),
        path.resolve(distPath, "streamlit_component"),
      ];

      if (entryName === "hiplot") {
        installToFolders.forEach((sc) => {
          copyFile(
            path.resolve(distPath, "hiplot.bundle.js"),
            path.resolve(sc, "hiplot.bundle.js"),
          );
        });
      }

      if (entryName === "hiplot_streamlit") {
        installToFolders.forEach((sc) => {
          copyFile(
            path.resolve(distPath, "hiplot_streamlit.bundle.js"),
            path.resolve(sc, "streamlit_component", "hiplot_streamlit.bundle.js"),
          );
          copyFile(
            path.resolve(__dirname, "src", "index_streamlit.html"),
            path.resolve(sc, "streamlit_component", "index.html"),
          );
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const isDebug = mode === "development";
  const entryName = process.env.HIPLOT_WEB_NAME ?? "hiplot";
  const entryPath =
    process.env.HIPLOT_WEB_ENTRY ??
    path.resolve(__dirname, "src", "hiplot_web.tsx");
  return {
    plugins: [react(), cssInjectedByJsPlugin(), copyWebBundlesPlugin(entryName)],
    define: {
      HIPLOT_PACKAGE_NAME_FULL: JSON.stringify(packageNameFull(isDebug)),
      define: "undefined",
    },
    build: {
      outDir: "npm-dist",
      emptyOutDir: false,
      sourcemap: true,
      target: "es2020",
      rollupOptions: {
        input: entryPath,
        output: {
          format: "iife",
          name: "hiplot",
          entryFileNames: `${entryName}.bundle.js`,
          inlineDynamicImports: true,
        },
      },
    },
    css: {
      modules: {
        generateScopedName: isDebug ? "[local]_[hash:base64:5]" : "[hash:base64:5]",
      },
      postcss: {
        plugins: [
          // Keep rem-to-px conversion (previously applied to global CSS only).
          remToPx({
            propList: ["font", "font-size", "line-height", "letter-spacing", "padding*", "border*"],
          }),
        ],
      },
    },
  };
});
