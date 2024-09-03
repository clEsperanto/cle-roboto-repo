import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execPromise = promisify(exec);

async function updateBindings(context, owner, repo, branch_name, tag, scriptName) {
  const { data: gencle_data } = await context.github.repos.get({
    owner,
    repo: 'gencle',
  });
  const gencle_dir = path.join('/tmp', 'gencle');
  await execPromise(`git clone ${gencle_data.clone_url} ${gencle_dir}`);
  const { data: repo_data } = await context.github.repos.get({
    owner,
    repo,
  });
  const repo_dir = path.join('/tmp', repo);
  await execPromise(`git clone ${repo_data.clone_url} ${repo_dir}`);
  await execPromise(`cd ${repo_dir} && git fetch && git checkout ${branch_name}`);
  await execPromise(`pip3 install requests`);
  await execPromise(`python3 ${gencle_dir}/update_scripts/${scriptName} ${repo_dir} ${tag}`);
  const { stdout: diff } = await execPromise(`cd ${repo_dir} && git diff`);
  if (diff) {
    await execPromise(`cd ${repo_dir} && git add . && git commit -m "Update to ${tag}" && git push`);
  } else {
    console.log("No changes made by the update script");
  }
  // Clean up
  await execPromise(`rm -rf ${gencle_dir}`);
  await execPromise(`rm -rf ${repo_dir}`);
}

export = { updateBindings };  