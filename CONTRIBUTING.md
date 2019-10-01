# Contributing

## Guidelines

Guidelines for contributing.

### How can I get involved?

There are a number of areas where contributions can be accepted:

* Write features
* Write sample functions
* Review pull requests
* Test out new features or work-in-progress
* Manage, triage and research Issues and Pull Requests
* Engage with the growing community by providing technical support on GitHub/Stack Overflow
* Create docs, guides and write blogs

This is just a short list of ideas, if you have other ideas for contributing please make a suggestion.

### I want to contribute on GitHub

#### I've found a typo

* A Pull Request is not necessary. Raise an [Issue](https://github.com/openfaas/faas/issues) and we'll fix it as soon as we can. 

#### I have a (great) idea

The React Native Query Builder maintainers would like to make React Native Query Builder the best it can be and welcome new contributions that align with the project's goals. Our time is limited so we'd like to make sure we agree on the proposed work before you spend time doing it. Saying "no" is hard which is why we'd rather say "yes" ahead of time. You need to raise a proposal.

What makes a good proposal?

* Brief summary including motivation/context
* Pros + Cons
* Effort required up front
* Effort required for CI/CD, release, ongoing maintenance
* Backwards-compatibility
* Clear examples of how to reproduce any issue the proposal is addressing

Once your proposal receives a `approved` label you may go ahead and start work on your Pull Request.

If you are proposing a new tool or service please do due diligence. Does this tool already exist in a 3rd party project or library? Can we reuse it?

Every effort will be made to work with contributors who do not follow the process. Your PR may be closed or marked as `invalid` if it is left inactive, or the proposal cannot move into a `approved` status.

#### Paperwork for Pull Requests

Please read this whole guide and make sure you agree to the Developer Certificate of Origin (DCO) agreement (included below):

* See guidelines on commit messages (below)
* Sign-off your commits (`git commit --signoff` or `-s`)
* Complete the whole template for issues and pull requests
* [Reference addressed issues](https://help.github.com/articles/closing-issues-using-keywords/) in the PR description & commit messages - use 'Fixes #IssueNo' 
* Always give instructions for testing
 * Provide us CLI commands and output or screenshots where you can

##### Commit messages

The first line of the commit message is the *subject*, this should be followed by a blank line and then a message describing the intent and purpose of the commit. These guidelines are based upon a [post by Chris Beams](https://chris.beams.io/posts/git-commit/).

* When you run `git commit` make sure you sign-off the commit by typing `git commit --signoff` or `git commit -s`
* The commit subject-line should start with an uppercase letter
* The commit subject-line should not exceed 72 characters in length
* The commit subject-line should not end with punctuation (., etc)

> Note: please do not use the GitHub suggestions feature, since it will not allow your commits to be signed-off.

When giving a commit body:
* Leave a blank line after the subject-line
* Make sure all lines are wrapped to 72 characters

Here's an example that would be accepted:

```
Add alexellis to the .DEREK.yml file

We need to add alexellis to the .DEREK.yml file for project maintainer
duties.

Signed-off-by: Alex Ellis <alex@openfaas.com>
```

Some invalid examples:

```
(feat) Add page about X to documentation
```

> This example does not follow the convention by adding a custom scheme of `(feat)`

```
Update the documentation for page X so including fixing A, B, C and D and F.
```

> This example will be truncated in the GitHub UI and via `git log --oneline`


If you would like to ammend your commit follow this guide: [Git: Rewriting History](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History)

#### Unit testing with JavaScript

—


#### I have a question, a suggestion or need help 

If you feel there is an issue with React Native Query Builder, raise an [Issue](https://github.com/openfaas/faas/issues) and we'll address it as soon as we can.


### How are releases made?

Releases are made by the *Project Lead* on a regular basis and when deemed necessary. If you want to request a new release then mention this on your PR or Issue.

## Branding guidelines

For press, branding, logos and marks see the [React Native Query Builder media repository](https://github.com/openfaas/media).


### Roadmap

* Browse open issues in [openfaas/faas](https://github.com/openfaas/faas/issues)

## License

This project is licensed under the MIT License.

### Copyright notice

It is important to state that you retain copyright for your contributions, but agree to license them for usage by the project and author(s) under the MIT license. Git retains history of authorship, but we use a catch-all statement rather than individual names. 

Please add a Copyright notice to new files you add where this is not already present.

```
// Copyright (c) React Native Query Builder Author(s) 2019. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
```

### Sign your work

> Note: every commit in your PR or Patch must be signed-off.

The sign-off is a simple line at the end of the explanation for a patch. Your
signature certifies that you wrote the patch or otherwise have the right to pass
it on as an open-source patch. The rules are pretty simple: if you can certify
the below (from [developercertificate.org](http://developercertificate.org/)):

```
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.
1 Letterman Drive
Suite D4700
San Francisco, CA, 94129

Everyone is permitted to copy and distribute verbatim copies of this
license document, but changing it is not allowed.

Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

Then you just add a line to every git commit message:

    Signed-off-by: Joe Smith <joe.smith@email.com>

Use your real name (sorry, no pseudonyms or anonymous contributions.)

If you set your `user.name` and `user.email` git configs, you can sign your
commit automatically with `git commit -s`.

Please sign your commits with `git commit -s` so that commits are traceable.

This is different from digital signing using GPG, GPG is not required for 
making contributions to the project. 

If you forgot to sign your work and want to fix that, see the following 
guide: [Git: Rewriting History](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History)
