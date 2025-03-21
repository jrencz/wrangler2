import path from "node:path";
import { build } from "esbuild";
import { EXTERNAL_DEPENDENCIES } from "./deps";
import type { WatchMode } from "esbuild";

// the expectation is that this is being run from the project root
type BuildFlags = {
	watch?: boolean;
};

function watchLogger(outputPath: string): WatchMode {
	return {
		onRebuild(error, _) {
			if (error) {
				console.error(`${outputPath} build failed.\n`, error);
			} else {
				console.log(`${outputPath} updated.`);
			}
		},
	};
}

async function buildMain(flags: BuildFlags = {}) {
	await build({
		entryPoints: ["./src/cli.ts"],
		bundle: true,
		outdir: "./wrangler-dist",
		platform: "node",
		format: "cjs",
		external: EXTERNAL_DEPENDENCIES,
		sourcemap: process.env.SOURCEMAPS !== "false",
		inject: [path.join(__dirname, "../import_meta_url.js")],
		define: {
			"import.meta.url": "import_meta_url",
			"process.env.NODE_ENV": '"production"',
		},
		watch: flags.watch ? watchLogger("./wrangler-dist") : false,
	});
}

async function buildMiniflareCLI(flags: BuildFlags = {}) {
	await build({
		entryPoints: ["./src/miniflare-cli/index.ts"],
		bundle: true,
		outfile: "./miniflare-dist/index.mjs",
		platform: "node",
		format: "esm",
		external: ["miniflare", "@miniflare/core"],
		sourcemap: process.env.SOURCEMAPS !== "false",
		define: {
			"process.env.NODE_ENV": '"production"',
		},
		watch: flags.watch ? watchLogger("./miniflare-dist/index.mjs") : false,
	});
}

async function run() {
	// main cli
	await buildMain();

	// custom miniflare cli
	await buildMiniflareCLI();

	// After built once completely, rerun them both in watch mode
	if (process.argv.includes("--watch")) {
		console.log("Built. Watching for changes...");
		await Promise.all([
			buildMain({ watch: true }),
			buildMiniflareCLI({ watch: true }),
		]);
	}
}

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
