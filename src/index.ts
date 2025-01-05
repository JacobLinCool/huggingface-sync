import * as core from "@actions/core";
import * as github from "@actions/github";
import fs from "fs-extra";
import { execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

main();

async function main(): Promise<void> {
	try {
		const user = core.getInput("user");
		const space = core.getInput("space");
		const token = core.getInput("token");
		const github_token = core.getInput("github");
		const title = core.getInput("title");
		const emoji = core.getInput("emoji");
		const colorFrom = core.getInput("colorFrom");
		const colorTo = core.getInput("colorTo");
		const sdk = core.getInput("sdk");
		const python_version = core.getInput("python_version");
		const sdk_version = core.getInput("sdk_version");
		const suggested_hardware = core.getInput("suggested_hardware");
		const suggested_storage = core.getInput("suggested_storage");
		const app_file = core.getInput("app_file");
		const app_port = core.getInput("app_port");
		const base_path = core.getInput("base_path");
		const fullWidth = core.getInput("fullWidth");
		const header = core.getInput("header");
		const short_description = core.getInput("short_description");
		const models = core.getInput("models");
		const datasets = core.getInput("datasets");
		const tags = core.getInput("tags");
		const disable_embedding = core.getInput("disable_embedding");
		const startup_duration_timeout = core.getInput("startup_duration_timeout");
		const preload_from_hub = core.getInput("preload_from_hub");
		const pinned = core.getInput("pinned");
		const configuration = core.getInput("configuration");

		core.debug(`Syncing ${user}/${space} with token ${token.slice(0, 5)}*** ...`);

		const octokit = github.getOctokit(github_token);

		const repo = await octokit.rest.repos.get({ ...github.context.repo });

		// clone the current directory to a temporary directory
		const tmp_path = path.join(os.tmpdir(), ".space-sync");
		core.debug(`Cloning to ${tmp_path} ...`);
		fs.mkdirSync(tmp_path, { recursive: true });
		fs.copySync(".", tmp_path, {
			filter: (src) => {
				if (src === ".git") {
					return false;
				}
				return true;
			},
		});

		// Set git config
		core.debug(`Setting git config ...`);
		execSync(
			`git config --global user.email '41898282+github-actions[bot]@users.noreply.github.com'`,
			{
				cwd: tmp_path,
				stdio: "inherit",
			},
		);
		execSync(`git config --global user.name 'github-actions[bot]'`, {
			cwd: tmp_path,
			stdio: "inherit",
		});

		// initialize the git repository and commit
		core.debug(`Initializing git repository ...`);
		execSync("git init -b main", { cwd: tmp_path, stdio: "inherit" });

		// add spaces config to README.md
		core.debug(`Adding spaces config to README.md ...`);
		let config = "---\n";
		if (configuration) {
			config += fs.readFileSync(configuration, "utf-8");
		} else {
			config += `title: ${title || repo.data.name.replace(/-/g, " ")}
emoji: ${emoji}
colorFrom: ${colorFrom}
colorTo: ${colorTo}
sdk: ${sdk}
`;
			if (python_version) {
				config += `python_version: ${python_version}\n`;
			}
			if (sdk_version) {
				config += `sdk_version: ${sdk_version}\n`;
			}
			if (suggested_hardware) {
				config += `suggested_hardware: ${suggested_hardware}\n`;
			}
			if (suggested_storage) {
				config += `suggested_storage: ${suggested_storage}\n`;
			}
			if (app_file) {
				config += `app_file: ${app_file}\n`;
			}
			if (app_port) {
				config += `app_port: ${app_port}\n`;
			}
			if (base_path) {
				config += `base_path: ${base_path}\n`;
			}
			if (fullWidth) {
				config += `fullWidth: ${fullWidth}\n`;
			}
			if (header) {
				config += `header: ${header}\n`;
			}
			const short_desc =
				short_description ||
				(repo.data.description
					? repo.data.description.length > 60
						? repo.data.description.slice(0, 57) + "..."
						: repo.data.description
					: "");
			if (short_desc) {
				config += `short_description: ${short_desc}\n`;
			}
			if (models) {
				config += `models: ${models}\n`;
			}
			if (datasets) {
				config += `datasets: ${datasets}\n`;
			}
			if (tags || repo.data.topics?.length) {
				config += `tags: ${tags || `[ ${repo.data.topics?.map((t) => `"${t}"`).join(",")} ]`}\n`;
			}
			if (disable_embedding) {
				config += `disable_embedding: ${disable_embedding}\n`;
			}
			if (startup_duration_timeout) {
				config += `startup_duration_timeout: ${startup_duration_timeout}\n`;
			}
			if (preload_from_hub) {
				config += `preload_from_hub: ${preload_from_hub}\n`;
			}
			if (pinned) {
				config += `pinned: ${pinned}\n`;
			}
			if (repo.data.topics?.length) {
				config += `tags: [${repo.data.topics.map((topic) => `"${topic}"`).join(", ")}]\n`;
			}
		}
		config += `---\n\n`;

		fs.writeFileSync(
			path.join(tmp_path, "README.md"),
			config + fs.readFileSync(path.join(tmp_path, "README.md")),
		);

		// Commit and push
		core.debug(`Committing and pushing ...`);
		execSync("git add .", { cwd: tmp_path, stdio: "inherit" });
		const repoUrl = repo.data.html_url;
		const truncatedUrl = repoUrl.length > 60 ? repoUrl.slice(0, 57) + "..." : repoUrl;
		execSync(`git commit -m 'Sync from ${truncatedUrl}'`, {
			cwd: tmp_path,
			stdio: "inherit",
		});
		execSync(
			`git push https://${user}:${token}@huggingface.co/spaces/${user}/${space}.git main -f`,
			{ cwd: tmp_path, stdio: "inherit" },
		);

		core.debug(`Done!`);
	} catch (error) {
		if (error instanceof Error) {
			core.setFailed(error.message);
		}
	}
}
