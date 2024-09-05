# cle-roboto 

This is a GitHub Action build up from [Probot](https://github.com/probot/probot) :robot:.
This action can be used in clEsperanto repository for automation. 
It currently covers code update for `pyclesperanto` and `clesperantoJ` when a new `CLIc` version is released.
More functionalities will come later if needed.


## Setup

In a `clEsperanto` repository, add a workflow file with the step:
```
- uses: clEsperanto/cle-roboto-repo@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

> [!CAUTION]
> It may be required to setup a python and install the package `requests` for correct usage.

## Example

See the [workflow](https://github.com/clEsperanto/bot_playground/blob/main/.github/workflows/call-cle-roboto.yml) of the [bot_playground](https://github.com/clEsperanto/bot_playground) repo for basic example usage.

## Call for help

This would benefit from behing a proper `bot` though it would require deploying it on a server. More info in the [Probot Doc](https://probot.github.io/docs/deployment/). Help is welcomee for this task.
