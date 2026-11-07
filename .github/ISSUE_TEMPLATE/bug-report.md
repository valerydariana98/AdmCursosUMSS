---
name: Bug Report
about: Report a system defect
title: "[BUG] "
labels: "Bug"
---

<!--
GITHUB PROJECTS MANAGEMENT

Bug Status: Select the corresponding status in the Project.
Priority: Select the corresponding priority in the Project.
Severity: Select the corresponding severity in the Project.
Sprint: Select the corresponding sprint in the Project.
Assignee: Assign the team member responsible for analyzing or fixing the bug.

Severity scale:
- Critical: security issue, data loss, or a main flow is blocked with no workaround.
- Major: a feature does not work as specified, but there is a workaround.
- Minor: incorrect behavior with low impact (wrong message, minor validation).
- Trivial: cosmetic (typo, alignment, color).

Bug Status workflow: Open -> Triaged -> In Progress -> Fixed -> Retest -> Closed.
If the retest fails: Retest -> Reopened -> In Progress.
QA closes the bug after the retest passes, not the developer.
-->

## Description

<!-- Briefly describe the incorrect behavior. -->

## Related user story

<!-- The user story affected, when applicable.
Example: #123 -->

## Qase test case

<!-- The Qase test case that found the defect, when applicable.
Example: ACU-12 (link) -->

## Preconditions

<!-- Conditions needed to reproduce the defect (role, existing data, state).
Example: Logged in as DOCENTE; course "QA 101" exists with no groups. -->

## Steps to reproduce

1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected result

<!-- What should happen, according to the user story. -->

## Actual result

<!-- What actually happens. -->

## Environment

<!-- Where the defect was found.
Example: Local (Docker) / Deploy (Render) · Chrome 130 · Windows 11 -->

## Commit / build

<!-- Commit SHA of the version tested.
Example: b3dd359 -->

## Network / logs

<!-- From DevTools -> Network: endpoint, status code and response body.
Add console or server errors if any.
Example: POST /api/courses -> 201 Created (expected 403) -->

## Evidence

<!-- Attach screenshots, videos, files or other evidence when applicable. -->
