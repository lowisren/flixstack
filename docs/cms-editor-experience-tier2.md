# CMS Editor Experience — Tier 2 (Editorial Process)

Implementation notes for Tier 2 of [cms-editor-experience-plan.md](cms-editor-experience-plan.md):
the review **workflow**, custom **roles**, and production **publish rules**. This is the
editorial backbone that turns "anyone can publish anything" into a reviewed, gated flow.

> **What is scriptable vs. not.** Workflows, custom roles, and publish rules are all
> creatable through the Management API and are handled by
> [`scripts/setup-workflow.mjs`](../scripts/setup-workflow.mjs). **Inviting users and
> assigning them to roles is an organization-level task** that a stack management token
> cannot do — it's done in the Contentstack UI (Settings → Users / Invitations). Stage
> **email notifications** and enforcing a strict **linear** stage order are also UI
> refinements (see the caveats below).

## Current stack state

Baseline before rollout: only the three built-in roles, no workflows, no publish rules;
environments development (`blt91f97ad1f970a2b8`) and production (`blt966bd3d76333d63f`).

**Applied 2026-07-15** via `pnpm setup-workflow`:

| Object | UID |
|---|---|
| Role — Content Editor | `blte172a637f6819238` |
| Role — Reviewer | `bltabd184e34b4cb877` |
| Workflow — Editorial Review | `blt9c10e098b21c3591` |
| — stage "Ready to Publish" | `bltcb1a750916f7fde6` |
| Publish rule — production/publish | `bltca5c8233f137e4ce` |

Still outstanding: the manual follow-up below (user invites, notifications, optional
linear order + SEO gate).

---

## The script

```bash
# Preview every payload, write nothing:
pnpm setup-workflow all --dry

# Apply in order (roles first so the workflow can reference them):
pnpm setup-workflow roles       # custom Content Editor + Reviewer roles
pnpm setup-workflow workflow    # the Editorial Review workflow (5 stages)
pnpm setup-workflow rules       # gate production publishing
# …or all at once:
pnpm setup-workflow all
```

All three phases are **idempotent** — re-running updates the existing role / workflow /
rule in place (matched by name) rather than duplicating it. Roles are resolved **by name**
at run time, so the workflow and rules phases pick up whatever role UIDs exist.

---

## 2.1 Roles (`roles` phase)

Two custom roles are created by cloning the built-in **Content Manager** rule set and
narrowing only the `environment` module — which is what governs *which environments a role
may publish to*.

| Role | Entries & assets | Publish to `development` | Publish to `production` | Content types / settings |
|---|---|---|---|---|
| **Content Editor** (new) | create / edit / delete | ✅ | ❌ | ❌ |
| **Reviewer** (new) | create / edit / delete | ✅ | ✅ | ❌ |
| **Admin** (built-in) | ✅ | ✅ | ✅ | ✅ |
| **Developer** (built-in) | ✅ | ✅ | ✅ | ✅ + roles/users |

This is the mechanism behind the Tier 2 role matrix: production publishing is denied to
editors at the **role** level (no production environment in their rules), and reinforced at
the **workflow/publish-rule** level below.

> **Role rule schema (POST ≠ GET).** The custom-role rules are derived from Content
> Manager's, but the create schema is stricter than the read representation, so the script
> adapts three things (learned from `error_code 157`):
> - the `branch` / `branch_alias` / `locale` / `environment` modules each need an explicit
>   `acl` (the GET form omits it);
> - `branches` / `branch_aliases` reject the `$all` shorthand — real names only (branch is
>   set to `main`, branch_aliases to `[]`);
> - only the `environment` list differs between the two roles (dev vs. dev+prod).
>
> The token must have **admin scope** to manage roles.

---

## 2.2 Workflow "Editorial Review" (`workflow` phase)

Applied to the 8 editorial content types: `movie`, `tv_series`, `episode`, `page`,
`hero_banner`, `homepage_rail`, `genre`, `person`.

| Stage | Colour | Who can move an entry here (SYS_ACL) |
|---|---|---|
| **Draft** | grey `#909090` | Everyone (`allUsers`) |
| **In Review** | amber `#e0a22b` | Content Editor, Reviewer, Developer, Admin |
| **Changes Requested** | red `#c4553b` | Reviewer, Developer, Admin |
| **Ready to Publish** | blue `#3d72b8` | Reviewer, Developer, Admin |
| **Published** | green `#4e8a57` | Reviewer, Developer, Admin |

`SYS_ACL` per stage controls who may set an entry *to* that stage — so an editor can submit
to **In Review** but cannot self-approve to **Ready to Publish**.

> **Caveat — linear order.** Stage UIDs don't exist until the workflow is created, so the
> script sets `next_available_stages: ["$all"]` (any stage reachable from any stage). To
> enforce a strict Draft → In Review → Ready → Published path, either wire
> `next_available_stages` per stage in the UI, or add a second pass that re-`PUT`s the
> workflow with the real stage UIDs after creation. The gating that actually matters for
> going live (production) is enforced by the publish rule below regardless of transition
> order.

---

## 2.3 Production publish rule (`rules` phase)

Creates one publishing rule on the Editorial Review workflow:

- **Environment:** `production`
- **Action:** `publish` (a rule targets a single action — add a second rule for `unpublish` if needed)
- **Applies to:** the workflow's 8 content types (a rule on a content-type-scoped workflow **cannot** use `$all`), locale `en-us`, branch `main`
- **Bound stage:** **Ready to Publish**
- **Approvers:** Reviewer + Admin roles

Effect: an entry can only be published to **production** once it's in *Ready to Publish*,
and the publish must be approved by a Reviewer or Admin. Development publishing stays open
for fast iteration.

> **Workflow stage ACL.** A stage ACL cannot be empty — "all users" via a `_default` flag
> is rejected (`error_code 337`); the Draft stage instead enumerates all role UIDs, which
> is equivalent (every user has a role).

---

## Manual follow-up (not scriptable here)

1. **Invite users & assign roles** — Settings → Users. Assign each teammate Content
   Editor, Reviewer, or Admin. (Org-level; a stack management token can't invite users.)
2. **Stage email notifications** — enable "notify" on entry into *In Review* (to Reviewers)
   and *Changes Requested* / *Ready to Publish* (to the entry owner) in the workflow's stage
   settings.
3. **Optional SEO gate** — block the *Ready to Publish* transition unless `seo.meta_title`
   and `seo.meta_description` are filled (workflow stage transition rule).
4. **Confirm the linear order** if you want to hard-enforce it (see the workflow caveat).

## Rollback

- Delete the publish rule: `DELETE /workflows/publishing_rules/{uid}`
- Disable or delete the workflow: `PUT /workflows/{uid}` with `enabled:false`, or `DELETE`
- Delete custom roles: `DELETE /roles/{uid}` (reassign any users first)
