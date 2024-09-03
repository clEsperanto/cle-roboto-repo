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
      context.log.info("repository_dispatch event received");
  
      const { action, repository, client_payload } = context.payload;
      const releaseTag = client_payload.release_tag;
  
      context.log.info(`repository_dispatch action: ${action}, release_tag: ${releaseTag}, from repository: ${repository.full_name}`);
      // Handle the repository_dispatch event with releaseTag
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
