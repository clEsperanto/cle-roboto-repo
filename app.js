
import github_ops from "./github_operations";
import script_ops from "./script_operations";

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
export default (app) => {
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
      context.log.info(`repository_dispatch action: ${action}, release_tag: ${releaseTag}, from repository: ${repository.full_name}`);

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

      const { issue } = github_ops.createIssue(context, repository.owner.login, repository.name, title, issue_body, ["auto-update"]);
      context.log.info(`Issue created: ${issue.html_url}`);
      const { branch } = github_ops.createBranch(context, repository.owner.login, repository.name, "main", "update-clic-" + releaseTag);
      context.log.info(`Branch created: ${branch.name}`);
      script_ops.updateBindings(context, repository.owner.login, repository.name, branch.name, releaseTag, "pyclesperanto_auto_update.py");
      context.log.info(`Bindings of ${repository.name} updated for CLIc release: ${releaseTag}`);
      const { pr } = github_ops.createPullRequest(context, repository.owner.login, repository.name, branch.name, "main", title, pr_body);
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
