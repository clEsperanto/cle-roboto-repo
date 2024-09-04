const gh_ops = require("./github_operations");

/**
 * Helper function to handle a binding update PR
 * 
 * @param {*} context 
 * @param {*} repository 
 * @param {*} releaseTag 
 * @param {*} scriptName 
 */
async function handleBindingsUpdate(context, repository, releaseTag, scriptName) {
  const title = "Update to CLIc@" + releaseTag;
  const issue_body = `
## Release Update: ${releaseTag}

A new release of [CLIc](https://github.com/clEsperanto/CLIc) is available. 

### Info:
**Release Tag:** ${releaseTag}
**Release Notes:** [Release Notes](https://github.com/clEsperanto/CLIc/releases/tag/${releaseTag})

Please review the changes and update the code bindings accordingly.
Cheers! :robot:
`;

  const issue = await gh_ops.createIssue(context, repository.owner.login, repository.name, title, issue_body, ["auto-update"]);
  console.log(`Issue created or updated ${issue.number}: ${issue.html_url}`);

  const branch = await gh_ops.createBranch(context, repository.owner.login, repository.name, "update-clic-" + releaseTag);
  console.log(`Branch created or updated ${branch.name}:`, branch);

  await gh_ops.updateBindings(context, repository.owner.login, repository.name, branch.name, releaseTag, scriptName);
  context.log.info(`Bindings of ${repository.name} updated for CLIc release: ${releaseTag}`);

  const pr_body = `
## Release Update: ${releaseTag}

A new release of [CLIc](https://github.com/clEsperanto/CLIc) is available. 

### Info:
**Release Tag:** ${releaseTag}
**Release Notes:** [Release Notes](https://github.com/clEsperanto/CLIc/releases/tag/${releaseTag})

Please review the changes and update the code bindings accordingly.
Cheers! :robot:

closes #${issue.number}
  `;
  const pr = await gh_ops.createPullRequest(context, repository.owner.login, repository.name, branch.name, title, pr_body);
  context.log.info(`Pull Request created: ${pr.number}: ${pr.html_url}`);
}

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
    app.log.info("cle-RoBoTo is loaded!");
  
    // Removed for now because it's not needed
    // when an issue is opened, greet the author
    // app.on("issues.opened", async (context) => {
    //   const user = context.payload.issue.user.login;
    //   const issueComment = context.issue({
    //     body: "Hello @" + user + "! Thanks for opening this issue. We will get back to you asap.",
    //   });

    //   return context.octokit.issues.createComment(issueComment);
    // });
    
    // dispatch event from CLIc release workflow
    app.on("repository_dispatch", async (context) => { 
      const { action, repository, client_payload } = context.payload;
      const releaseTag = client_payload.release_tag; // should be a string
      context.log.info(`repository_dispatch action: ${action}, release_tag: ${releaseTag}`);
      context.log.info(`owner: ${repository.owner.login}, repo: ${repository.name}`);

      if (action === "update-clic") {
        const scriptMapping = {
          "pyclesperanto": "pyclesperanto_auto_update.py",
          "clesperantoj": "clesperantoj_auto_update.py"
        };
        const scriptName = scriptMapping[repository.name];
        if (scriptName) {
          await handleBindingsUpdate(context, repository, releaseTag, scriptName);
        } else {
          context.log.info(`repository_dispatch action: ${action}, release_tag: ${releaseTag} not handled for ${repository.name}`);
        }
      }
    });
  
    // dispatch event from manual workflow behing triggered
    // must contain a release_tag as input (can be a branch name)
    app.on("workflow_dispatch", async (context) => {  
      const { inputs, repository } = context.payload;
      // check if inputs contains release_tag
      if (inputs.release_tag) {
        context.log.info(`workflow_dispatch manually triggered with release_tag: ${inputs.release_tag}`);
        context.log.info(`owner: ${repository.owner.login}, repo: ${repository.name}`);
        const scriptMapping = {
          "pyclesperanto": "pyclesperanto_auto_update.py",
          "clesperantoj": "clesperantoj_auto_update.py"
        };
        const scriptName = scriptMapping[repository.name];
        if (scriptName) {
          await handleBindingsUpdate(context, repository, releaseTag, scriptName);
        } else {
          for (const repoName in scriptMapping) {
            await handleBindingsUpdate(context, repository, releaseTag, scriptMapping[repoName]);
          }
        }     
       }
    });
  
  
    // For more information on building apps:
    // https://probot.github.io/docs/
  
    // To get your app running against GitHub, see:
    // https://probot.github.io/docs/development/
  };
