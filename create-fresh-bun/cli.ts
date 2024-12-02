#!/usr/bin/env bun
import path from "node:path";
import fs from "node:fs";

function copyTemplate(srcDir: string, destDir: string) {
    fs.mkdirSync(destDir, { recursive: true });

    for (const file of fs.readdirSync(srcDir)) {
        const srcPath = path.join(srcDir, file);
        const destPath = path.join(destDir, file);

        if (fs.statSync(srcPath).isDirectory()) {
            copyTemplate(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

async function calculateDefaultProjectName(currentPath: string) {
    let defaultProjectName = '';
    let isCurrentFolder = false;
    if (Bun.argv.length > 2) {
        const lastArg = Bun.argv.at(-1);
        if (lastArg) {
            defaultProjectName = lastArg?.trim() ?? '';
        }
    }

    if (defaultProjectName === '' || defaultProjectName === '.') {
        defaultProjectName = path.basename(path.dirname(path.join(currentPath, 'x')));
        isCurrentFolder = true;
    }
    return { defaultProjectName, isCurrentFolder };
}

const currentPath = (await Bun.$`pwd`.text())?.trim();
const { defaultProjectName, isCurrentFolder } = await calculateDefaultProjectName(currentPath);

const projectName = prompt(`Project name:`, defaultProjectName) ?? defaultProjectName;
const projectPath = path.join(currentPath, projectName.trim());

const templateName = 'basic'

const templateFolder = path.join(import.meta.dirname, 'templates', templateName);
copyTemplate(templateFolder, projectPath);

let packageJsonContent = await Bun.file(path.join(projectPath, 'package.json')).text();
packageJsonContent = packageJsonContent.replaceAll('{{ project_name }}', projectName);

await Bun.write(path.join(projectPath, 'package.json'), packageJsonContent);
console.log('Installing dependencies...');
await Bun.$`cd ${projectPath}; bun i`;

console.log('Ready!');
if (!isCurrentFolder) {
    console.log(`> cd ${projectName}`);
}
console.log(`> bun run dev`);