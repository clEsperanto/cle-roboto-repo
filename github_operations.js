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

module.exports = {
    findIssueByTitle,
    createIssue,
    findBranchByName,
    createBranch,
    findPullRequest,
    createPullRequest
};