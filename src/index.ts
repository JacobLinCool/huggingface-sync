import os from "node:os";
import path from "node:path";
import { execSync } from "child_process";
import fs from "fs-extra";
import * as core from "@actions/core";
import * as github from "@actions/github";

main();

async function main(): Promise<void> {
	try {
		const user: string = core.getInput("user");
		const space: string = core.getInput("space");
		const token: string = core.getInput("token");
		const github_token: string = core.getInput("github");
		const emoji: string = core.getInput("emoji");
		const colorFrom: string = core.getInput("colorFrom");
		const colorTo: string = core.getInput("colorTo");
		const sdk: string = core.getInput("sdk");
		const python_version: string = core.getInput("python_version");
		const sdk_version: string = core.getInput("sdk_version");
		const app_file: string = core.getInput("app_file");
		const app_port: string = core.getInput("app_port");
		const base_path: string = core.getInput("base_path");
		const fullWidth: string = core.getInput("fullWidth");
		const pinned: string = core.getInput("pinned");

		core.debug(`Syncing ${user}/${space} with token ${token.slice(0, 5)}*** ...`);

		const octokit = github.getOctokit(github_token);

		const repo = await octokit.rest.repos.get({ ...github.context.repo });

		// clone the current directory to a temporary directory
		const tmp_path = path.join(os.tmpdir(), ".space-sync");
		core.debug(`Cloning ${repo.data.clone_url} to ${tmp_path} ...`);
		fs.mkdirSync(tmp_path, { recursive: true });
		fs.copySync(".", tmp_path, {
			filter: (src, dest) => {
				if (src === "." || src === "./.git") return false;
				return true;
			},
		});

		// initialize the git repository and commit
		core.debug(`Initializing git repository ...`);
		execSync("git init -b main", { cwd: tmp_path, stdio: "inherit" });

		// add spaces config to README.md
		core.debug(`Adding spaces config to README.md ...`);
		let config = `---
title: ${repo.data.name}
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
		if (pinned) {
			config += `pinned: ${pinned}\n`;
		}
		if (repo.data.topics?.length) {
			config += `tags: [${repo.data.topics.map((topic) => `"${topic}"`).join(", ")}]\n`;
		}
		config += `---\n\n`;

		fs.writeFileSync(
			path.join(tmp_path, "README.md"),
			config + fs.readFileSync(path.join(tmp_path, "README.md")),
		);

		// Commit and push
		execSync("git commit -m 'Sync to HuggingFace Spaces'", { cwd: tmp_path, stdio: "inherit" });
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
