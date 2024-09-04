const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');
const execPromise = promisify(exec);

/**
 * Helper function to update the code of the bindings of a repository
 * 
 * @param {*} context 
 * @param {*} owner 
 * @param {*} repo 
 * @param {*} branch_name 
 * @param {*} tag 
 * @param {*} scriptName 
 * @returns {Promise<void>}
 */
async function updateBindings(context, owner, repo, branch_name, tag, scriptName) {
    context.log.info(`Updating bindings of ${owner}-${repo} to ${tag} using ${scriptName} on branch ${branch_name}`);
    const { data: gencle_data } = await context.octokit.repos.get({
      owner: 'clEsperanto',
      repo: 'gencle',
    });
    const gencle_dir = path.join('/tmp', 'gencle');
    await execPromise(`git clone ${gencle_data.clone_url} ${gencle_dir}`);
  
    const { data: repo_data } = await context.octokit.repos.get({
      owner,
      repo,
    });
    const repo_dir = path.join('/tmp', repo);
    await execPromise(`git clone ${repo_data.clone_url} ${repo_dir}`);
  
    console.log(`gencle_dir: ${gencle_dir}`);
    console.log(`repo_dir: ${repo_dir}`);
  
    await execPromise(`cd ${repo_dir} && git fetch && git checkout ${branch_name}`);
    const { stdout: py_stdout } = await execPromise(`python ${gencle_dir}/update_scripts/${scriptName} ${repo_dir} ${tag}`);
    console.log(py_stdout);
  
    const { stdout: diff } = await execPromise(`cd ${repo_dir} && git status --porcelain`);
    if (diff) {
      console.log('There are changes:', diff);
      await execPromise(`
        git config --global user.name "github-actions[bot]" && \
        git config --global user.email "github-actions[bot]@users.noreply.github.com" && \
        cd ${repo_dir} && \
        git add . && \
        git commit -m "Update to ${tag}" && \
        git push https://github-actions[bot]:${process.env.GITHUB_TOKEN}@github.com/${owner}/${repo}.git ${branch_name}
      `);
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
   * @returns {Object|undefined} The issue object if found, otherwise undefined
   */
  async function findIssueByTitle(context, owner, repo, issue_title, issue_labels) {
    try {
      const { data: issues } = await context.octokit.issues.listForRepo({
          owner: owner,
          repo: repo,
          state: "all",
          labels: issue_labels.join(","),
      });
      return issues.find((issue) => issue.title === issue_title);
    }
    catch (error) {
      console.error("Error finding issue:", error);
      throw error;
    }
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
  * @returns {Object} The issue object that was created or found
  */
  async function createIssue(context, owner, repo, issue_title, issue_body, issue_labels) {
    try {
        let _issue = await findIssueByTitle(context, owner, repo, issue_title, issue_labels);
        if (_issue === undefined) {
            _issue = (await context.octokit.issues.create({
                owner: owner,
                repo: repo,
                title: issue_title,
                body: issue_body,
                labels: issue_labels,
            })).data;
        } else if (_issue.state === "closed") {
            await context.octokit.issues.update({
                owner: owner,
                repo: repo,
                issue_number: _issue.number,
                state: "open",
            });
            await context.octokit.issues.createComment({
                owner: owner,
                repo: repo,
                issue_number: _issue.number,
                body: issue_body,
            });
        }
        if (_issue === undefined) {
            throw new Error("We are about to return an undefined issue");
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
  * @returns {Object|undefined} The branch object if found, otherwise undefined
  */
  async function findBranchByName(context, owner, repo, branch_name) {
    try {
      const { data: branches } = await context.octokit.repos.listBranches({
          owner: owner,
          repo: repo,
      });
      return branches.find((branch) => branch.name === branch_name);
    } catch (error) {
      console.error("Error finding branch:", error);
      throw error;
    }
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
  * @returns {Object} The branch object that was created or found
  */
  async function createBranch(context, owner, repo, branch_name) {
    try {
        let _branch = await findBranchByName(context, owner, repo, branch_name);
        if (_branch === undefined) {
            const { data: main_branch } = await context.octokit.repos.getBranch({
                owner: owner,
                repo: repo,
                branch: "main",
            });
            _branch = (await context.octokit.git.createRef({
                owner: owner,
                repo: repo,
                ref: `refs/heads/${branch_name}`,
                sha: main_branch.commit.sha,
            })).data;
            _branch.name = branch_name;
        }
        if (_branch === undefined) {
            throw new Error("We are about to return an undefined branch");
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
  * @returns {Object|undefined} The pull request object if found, otherwise undefined
  */
  async function findPullRequest(context, owner, repo, branch_name, pr_title) {
    try {
      const { data: pull_requests } = await context.octokit.pulls.list({
          owner: owner,
          repo: repo,
          state: "open",
      });
      return pull_requests.find((pr) => pr.head.ref === branch_name && pr.title === pr_title);
    } catch (error) {
      console.error("Error finding pull request:", error);
      throw error;
    }
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
  * @returns {Object} The pull request object that was created or found
  */
  async function createPullRequest(context, owner, repo, branch_name, pr_title, pr_body) {
    try {
      let _pr = await findPullRequest(context, owner, repo, branch_name, pr_title);
      if (_pr === undefined) {
          _pr = (await context.octokit.pulls.create({
              owner: owner,
              repo: repo,
              title: pr_title,
              head: branch_name,
              base: "main",
              body: pr_body,
          })).data;
      }
      if (_pr === undefined) {
          throw new Error("We are about to return an undefined pull request");
      }
      return _pr;
    } catch (error) {
      console.error("Error creating pull request:", error);
      throw error;
    }
  }

module.exports = {
    updateBindings,
    createIssue,
    createBranch,
    createPullRequest,
    };