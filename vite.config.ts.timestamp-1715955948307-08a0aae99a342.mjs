// vite.config.ts
import { vitePlugin as remix } from "file:///Users/arminnaimi/code/octoberspring/epic-stack-mantine/node_modules/.pnpm/@remix-run+dev@2.9.1_@remix-run+react@2.9.1_@remix-run+serve@2.9.1_@types+node@20.12.11_typescript@5.4.5_vite@5.2.11/node_modules/@remix-run/dev/dist/index.js";
import { sentryVitePlugin } from "file:///Users/arminnaimi/code/octoberspring/epic-stack-mantine/node_modules/.pnpm/@sentry+vite-plugin@2.16.1/node_modules/@sentry/vite-plugin/dist/esm/index.mjs";
import { glob } from "file:///Users/arminnaimi/code/octoberspring/epic-stack-mantine/node_modules/.pnpm/glob@10.3.15/node_modules/glob/dist/esm/index.js";
import { flatRoutes } from "file:///Users/arminnaimi/code/octoberspring/epic-stack-mantine/node_modules/.pnpm/remix-flat-routes@0.6.5_@remix-run+dev@2.9.1/node_modules/remix-flat-routes/dist/index.js";
import { defineConfig } from "file:///Users/arminnaimi/code/octoberspring/epic-stack-mantine/node_modules/.pnpm/vite@5.2.11_@types+node@20.12.11/node_modules/vite/dist/node/index.js";
var MODE = process.env.NODE_ENV;
var vite_config_default = defineConfig({
	build: {
		cssMinify: MODE === "production",
		rollupOptions: {
			external: [/node:.*/, "stream", "crypto", "fsevents"],
		},
		sourcemap: true,
	},
	plugins: [
		remix({
			ignoredRouteFiles: ["**/*"],
			serverModuleFormat: "esm",
			routes: async (defineRoutes) => {
				return flatRoutes("routes", defineRoutes, {
					ignoredRouteFiles: [
						".*",
						"**/*.css",
						"**/*.test.{js,jsx,ts,tsx}",
						"**/__*.*",
						// This is for server-side utilities you want to colocate
						// next to your routes without making an additional
						// directory. If you need a route that includes "server" or
						// "client" in the filename, use the escape brackets like:
						// my-route.[server].tsx
						"**/*.server.*",
						"**/*.client.*",
					],
				});
			},
		}),
		process.env.SENTRY_AUTH_TOKEN
			? sentryVitePlugin({
					disable: MODE !== "production",
					authToken: process.env.SENTRY_AUTH_TOKEN,
					org: process.env.SENTRY_ORG,
					project: process.env.SENTRY_PROJECT,
					release: {
						name: process.env.COMMIT_SHA,
						setCommits: {
							auto: true,
						},
					},
					sourcemaps: {
						filesToDeleteAfterUpload: await glob([
							"./build/**/*.map",
							".server-build/**/*.map",
						]),
					},
				})
			: null,
	],
});
export { vite_config_default as default };
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYXJtaW5uYWltaS9jb2RlL29jdG9iZXJzcHJpbmcvZXBpYy1zdGFjay1tYW50aW5lXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvYXJtaW5uYWltaS9jb2RlL29jdG9iZXJzcHJpbmcvZXBpYy1zdGFjay1tYW50aW5lL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9hcm1pbm5haW1pL2NvZGUvb2N0b2JlcnNwcmluZy9lcGljLXN0YWNrLW1hbnRpbmUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyB2aXRlUGx1Z2luIGFzIHJlbWl4IH0gZnJvbSBcIkByZW1peC1ydW4vZGV2XCI7XG5pbXBvcnQgeyBzZW50cnlWaXRlUGx1Z2luIH0gZnJvbSBcIkBzZW50cnkvdml0ZS1wbHVnaW5cIjtcbmltcG9ydCB7IGdsb2IgfSBmcm9tIFwiZ2xvYlwiO1xuaW1wb3J0IHsgZmxhdFJvdXRlcyB9IGZyb20gXCJyZW1peC1mbGF0LXJvdXRlc1wiO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcblxuY29uc3QgTU9ERSA9IHByb2Nlc3MuZW52Lk5PREVfRU5WO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuXHRidWlsZDoge1xuXHRcdGNzc01pbmlmeTogTU9ERSA9PT0gXCJwcm9kdWN0aW9uXCIsXG5cblx0XHRyb2xsdXBPcHRpb25zOiB7XG5cdFx0XHRleHRlcm5hbDogWy9ub2RlOi4qLywgXCJzdHJlYW1cIiwgXCJjcnlwdG9cIiwgXCJmc2V2ZW50c1wiXSxcblx0XHR9LFxuXG5cdFx0c291cmNlbWFwOiB0cnVlLFxuXHR9LFxuXHRwbHVnaW5zOiBbXG5cdFx0cmVtaXgoe1xuXHRcdFx0aWdub3JlZFJvdXRlRmlsZXM6IFtcIioqLypcIl0sXG5cdFx0XHRzZXJ2ZXJNb2R1bGVGb3JtYXQ6IFwiZXNtXCIsXG5cdFx0XHRyb3V0ZXM6IGFzeW5jIChkZWZpbmVSb3V0ZXMpID0+IHtcblx0XHRcdFx0cmV0dXJuIGZsYXRSb3V0ZXMoXCJyb3V0ZXNcIiwgZGVmaW5lUm91dGVzLCB7XG5cdFx0XHRcdFx0aWdub3JlZFJvdXRlRmlsZXM6IFtcblx0XHRcdFx0XHRcdFwiLipcIixcblx0XHRcdFx0XHRcdFwiKiovKi5jc3NcIixcblx0XHRcdFx0XHRcdFwiKiovKi50ZXN0Lntqcyxqc3gsdHMsdHN4fVwiLFxuXHRcdFx0XHRcdFx0XCIqKi9fXyouKlwiLFxuXHRcdFx0XHRcdFx0Ly8gVGhpcyBpcyBmb3Igc2VydmVyLXNpZGUgdXRpbGl0aWVzIHlvdSB3YW50IHRvIGNvbG9jYXRlXG5cdFx0XHRcdFx0XHQvLyBuZXh0IHRvIHlvdXIgcm91dGVzIHdpdGhvdXQgbWFraW5nIGFuIGFkZGl0aW9uYWxcblx0XHRcdFx0XHRcdC8vIGRpcmVjdG9yeS4gSWYgeW91IG5lZWQgYSByb3V0ZSB0aGF0IGluY2x1ZGVzIFwic2VydmVyXCIgb3Jcblx0XHRcdFx0XHRcdC8vIFwiY2xpZW50XCIgaW4gdGhlIGZpbGVuYW1lLCB1c2UgdGhlIGVzY2FwZSBicmFja2V0cyBsaWtlOlxuXHRcdFx0XHRcdFx0Ly8gbXktcm91dGUuW3NlcnZlcl0udHN4XG5cdFx0XHRcdFx0XHRcIioqLyouc2VydmVyLipcIixcblx0XHRcdFx0XHRcdFwiKiovKi5jbGllbnQuKlwiLFxuXHRcdFx0XHRcdF0sXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHR9KSxcblx0XHRwcm9jZXNzLmVudi5TRU5UUllfQVVUSF9UT0tFTlxuXHRcdFx0PyBzZW50cnlWaXRlUGx1Z2luKHtcblx0XHRcdFx0XHRkaXNhYmxlOiBNT0RFICE9PSBcInByb2R1Y3Rpb25cIixcblx0XHRcdFx0XHRhdXRoVG9rZW46IHByb2Nlc3MuZW52LlNFTlRSWV9BVVRIX1RPS0VOLFxuXHRcdFx0XHRcdG9yZzogcHJvY2Vzcy5lbnYuU0VOVFJZX09SRyxcblx0XHRcdFx0XHRwcm9qZWN0OiBwcm9jZXNzLmVudi5TRU5UUllfUFJPSkVDVCxcblx0XHRcdFx0XHRyZWxlYXNlOiB7XG5cdFx0XHRcdFx0XHRuYW1lOiBwcm9jZXNzLmVudi5DT01NSVRfU0hBLFxuXHRcdFx0XHRcdFx0c2V0Q29tbWl0czoge1xuXHRcdFx0XHRcdFx0XHRhdXRvOiB0cnVlLFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHNvdXJjZW1hcHM6IHtcblx0XHRcdFx0XHRcdGZpbGVzVG9EZWxldGVBZnRlclVwbG9hZDogYXdhaXQgZ2xvYihbXG5cdFx0XHRcdFx0XHRcdFwiLi9idWlsZC8qKi8qLm1hcFwiLFxuXHRcdFx0XHRcdFx0XHRcIi5zZXJ2ZXItYnVpbGQvKiovKi5tYXBcIixcblx0XHRcdFx0XHRcdF0pLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0pXG5cdFx0XHQ6IG51bGwsXG5cdF0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBdVYsU0FBUyxjQUFjLGFBQWE7QUFDM1gsU0FBUyx3QkFBd0I7QUFDakMsU0FBUyxZQUFZO0FBQ3JCLFNBQVMsa0JBQWtCO0FBQzNCLFNBQVMsb0JBQW9CO0FBRTdCLElBQU0sT0FBTyxRQUFRLElBQUk7QUFFekIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDM0IsT0FBTztBQUFBLElBQ04sV0FBVyxTQUFTO0FBQUEsSUFFcEIsZUFBZTtBQUFBLE1BQ2QsVUFBVSxDQUFDLFdBQVcsVUFBVSxVQUFVLFVBQVU7QUFBQSxJQUNyRDtBQUFBLElBRUEsV0FBVztBQUFBLEVBQ1o7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNSLE1BQU07QUFBQSxNQUNMLG1CQUFtQixDQUFDLE1BQU07QUFBQSxNQUMxQixvQkFBb0I7QUFBQSxNQUNwQixRQUFRLE9BQU8saUJBQWlCO0FBQy9CLGVBQU8sV0FBVyxVQUFVLGNBQWM7QUFBQSxVQUN6QyxtQkFBbUI7QUFBQSxZQUNsQjtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxZQU1BO0FBQUEsWUFDQTtBQUFBLFVBQ0Q7QUFBQSxRQUNELENBQUM7QUFBQSxNQUNGO0FBQUEsSUFDRCxDQUFDO0FBQUEsSUFDRCxRQUFRLElBQUksb0JBQ1QsaUJBQWlCO0FBQUEsTUFDakIsU0FBUyxTQUFTO0FBQUEsTUFDbEIsV0FBVyxRQUFRLElBQUk7QUFBQSxNQUN2QixLQUFLLFFBQVEsSUFBSTtBQUFBLE1BQ2pCLFNBQVMsUUFBUSxJQUFJO0FBQUEsTUFDckIsU0FBUztBQUFBLFFBQ1IsTUFBTSxRQUFRLElBQUk7QUFBQSxRQUNsQixZQUFZO0FBQUEsVUFDWCxNQUFNO0FBQUEsUUFDUDtBQUFBLE1BQ0Q7QUFBQSxNQUNBLFlBQVk7QUFBQSxRQUNYLDBCQUEwQixNQUFNLEtBQUs7QUFBQSxVQUNwQztBQUFBLFVBQ0E7QUFBQSxRQUNELENBQUM7QUFBQSxNQUNGO0FBQUEsSUFDRCxDQUFDLElBQ0E7QUFBQSxFQUNKO0FBQ0QsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
