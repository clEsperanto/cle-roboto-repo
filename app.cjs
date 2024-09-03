const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');
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

/**
 * Helper function to find an issue by title
 * 
 * @param {*} context 
 * @param {*} owner 
 * @param {*} repo 
 * @param {*} issue_title 
 * @param {*} issue_labels 
 * @returns 
 */
async function findIssueByTitle(context, owner, repo, issue_title, issue_labels) {
  const { data: issues } = await context.github.issues.listForRepo({
      owner,
      repo,
      state: "all",
      labels: issue_labels,
  });
  return issues.find((issue) => issue.title === issue_title);
}

/**
* Function to create an issue in the given repository if it doesn't already exist
* Will update the issue if it is closed and has the same title
* Will do nothing if the issue is open and has the same title
* Will return the issue 
* 
* @param {*} context 
* @param {*} owner 
* @param {*} repo 
* @param {*} issue_title 
* @param {*} issue_body 
* @param {*} issue_labels 
* @returns 
*/
async function createIssue(context, owner, repo, issue_title, issue_body, issue_labels) {
  try {
      let _issue = await findIssueByTitle(context, owner, repo, issue_title, issue_labels);
      if (!_issue) {
          _issue = (await context.github.issues.create({
              owner,
              repo,
              title: issue_title,
              body: issue_body,
              labels: issue_labels,
          })).data;
      } else if (_issue.state === "closed") {
          await context.github.issues.update({
              owner,
              repo,
              issue_number: _issue.number,
              state: "open",
          });
          await context.github.issues.createComment({
              owner,
              repo,
              issue_number: _issue.number,
              body: issue_body,
          });
      }
      return _issue;
  } catch (error) {
      console.error("Error creating or updating issue:", error);
      throw error;
  }
}

/**
* Helper function to find a branch by name
* 
* @param {*} context 
* @param {*} owner 
* @param {*} repo 
* @param {*} branch_name 
* @returns 
*/
async function findBranchByName(context, owner, repo, branch_name) {
  const { data: branches } = await context.github.repos.listBranches({
      owner,
      repo,
  });
  return branches.find((branch) => branch.name === branch_name);
}

/**
* Function to create a branch in the given repository if it doesn't already exist
* The branch will be created from the main branch
* Will return the branch 
* 
* @param {*} context 
* @param {*} owner 
* @param {*} repo 
* @param {*} branch_name 
* @returns 
*/
async function createBranch(context, owner, repo, branch_name) {
  try {
      let _branch = await findBranchByName(context, owner, repo, branch_name);
      if (!_branch) {
          const { data: main_branch } = await context.github.repos.getBranch({
              owner,
              repo,
              branch: "main",
          });
          _branch = (await context.github.git.createRef({
              owner,
              repo,
              ref: `refs/heads/${branch_name}`,
              sha: main_branch.commit.sha,
          })).data;
      }
      return _branch;
  } catch (error) {
      console.error("Error creating branch:", error);
      throw error;
  }
}

/**
* Helper function to find a pull request by branch name and title
* 
* @param {*} context 
* @param {*} owner 
* @param {*} repo 
* @param {*} branch_name 
* @param {*} pr_title 
* @returns 
*/
async function findPullRequest(context, owner, repo, branch_name, pr_title) {
  const { data: pull_requests } = await context.github.pulls.list({
      owner,
      repo,
      state: "open",
  });
  return pull_requests.find((pr) => pr.head.ref === branch_name && pr.title === pr_title);
}

/**
* Function to create a pull request in the given repository if it doesn't already exist
* 
* @param {*} context 
* @param {*} owner 
* @param {*} repo 
* @param {*} branch_name 
* @param {*} pr_title 
* @param {*} pr_body 
* @returns 
*/
async function createPullRequest(context, owner, repo, branch_name, pr_title, pr_body) {
  try {
      let _pr = await findPullRequest(context, owner, repo, branch_name, pr_title);
      if (!_pr) {
          _pr = (await context.github.pulls.create({
              owner,
              repo,
              title: pr_title,
              head: branch_name,
              base: "main",
              body: pr_body,
          })).data;
      }
      return _pr;
  } catch (error) {
      console.error("Error creating pull request:", error);
      throw error;
  }
}

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
    // Your code here
    app.log.info("Yay, the app was loaded!");
  
    // when an issue is opened, greet the author
    app.on("issues.opened", async (context) => {
      const user = context.payload.issue.user.login;
      const issueComment = context.issue({
        body: "Hello @" + user + "! Thanks for opening this issue. We will get back to you asap.",
      });
  
      return context.octokit.issues.createComment(issueComment);
    });
    
  
    app.on("repository_dispatch", async (context) => { 
      const { action, repository, client_payload } = context.payload;
      const releaseTag = client_payload.release_tag;
      context.log.info(`repository_dispatch action: ${action}, release_tag: ${releaseTag}`);
      context.log.info(`owner: ${repository.owner.login}, repo: ${repository.name}`);

      const title = "Update to CLIc@" + releaseTag;
      const issue_body = `
## Release Update: ${releaseTag}

A new release of [CLIc](https://github.com/clEsperanto/CLIc) is available. 

### Info:
**Release Tag:** ${releaseTag}
**Release Notes:** [Release Notes](https://github.com/clEsperanto/CLIc/releases/tag/${releaseTag})

Please review the changes and update the code bindings accordingly.
Cheers! 🎉
`;

      const { issue } = createIssue(context, repository.owner.login, repository.name, title, issue_body, ["auto-update"]);
      context.log.info(`Issue created: ${issue.html_url}`);
      const { branch } = createBranch(context, repository.owner.login, repository.name, "main", "update-clic-" + releaseTag);
      context.log.info(`Branch created: ${branch.name}`);
      updateBindings(context, repository.owner.login, repository.name, branch.name, releaseTag, "pyclesperanto_auto_update.py");
      context.log.info(`Bindings of ${repository.name} updated for CLIc release: ${releaseTag}`);


      const pr_body = `
      ## Release Update: ${releaseTag}
      
      A new release of [CLIc](https://github.com/clEsperanto/CLIc) is available. 
      
      ### Info:
      **Release Tag:** ${releaseTag}
      **Release Notes:** [Release Notes](https://github.com/clEsperanto/CLIc/releases/tag/${releaseTag})
      
      Please review the changes and update the code bindings accordingly.
      Cheers! 🎉
      
      closes #${issue.number}
      `;
      const { pr } = createPullRequest(context, repository.owner.login, repository.name, branch.name, "main", title, pr_body);
      context.log.info(`Pull Request created: ${pr.html_url}`);
    });
  

    app.on("workflow_dispatch", async (context) => {
      context.log.info("workflow_dispatch event received");
  
      const { inputs } = context.payload;
      const releaseTag = inputs.release_tag;
  
      context.log.info(`workflow_dispatch manually triggered with release_tag: ${releaseTag}`);
      // Handle the workflow_dispatch event with releaseTag
    });
  
  
    // For more information on building apps:
    // https://probot.github.io/docs/
  
    // To get your app running against GitHub, see:
    // https://probot.github.io/docs/development/
  };
