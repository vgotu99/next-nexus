# Contributing to next-nexus

First off, thank you for considering contributing to next-nexus! Your contribution is appreciated.

## Development Setup

1.  Fork the repository and clone it to your local machine.
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  This project uses `lefthook` to manage Git hooks. After `npm install`, it should be set up automatically.

## Language

All public-facing communication, including issues, pull requests, discussions, and commit messages, must be in English. This is to ensure the project is accessible to a global audience.

## Contribution Process

### Step 1: Create an Issue

Before starting work on a new feature or a significant bug fix, [please check the existing issues](https://github.com/next-nexus-org/next-nexus/issues) to see if a similar one has already been reported.

If not, create a new issue to describe the feature you want to add or the bug you want to fix. This allows us to discuss the change and make sure it aligns with the project's direction before you spend time on implementation.

For small changes like fixing a typo, you can submit a pull request directly without creating an issue.

### Step 2: Submitting a Pull Request

Once an issue has been discussed and you're ready to work on it:

1.  Create a new branch for your feature or bug fix.
2.  Make your changes.
3.  Run tests to ensure everything is working correctly:
    ```bash
    npm test
    ```
4.  Commit your changes following the commit message guidelines below. The pre-commit hooks will automatically format and lint your code.
5.  Push your branch and open a Pull Request, linking the issue it resolves.

#### A Note on Tests

We take testing very seriously. For any new feature or bug fix, a corresponding test is required to ensure the stability of the library.

**However, if you are a new contributor and are unsure how to write tests, please don't let that stop you!** You can submit your pull request without tests and leave a comment explaining that you need help. A maintainer will be happy to guide you or help add the necessary tests.

## Commit Message Guidelines

We use the [Conventional Commits](https://www.conventionalcommits.org/) specification. Your commit messages should be structured as follows:

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

**Example:**

```
feat(hooks): add useNexusAction hook for server actions
```

Common types include: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

The `commit-msg` hook managed by `lefthook` will automatically check your commit message format.
