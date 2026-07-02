# App Factory Sync Tool

This app (GhostChat / SecretTalk) ships as 9 separate GitHub repos, each disguised
as a different innocuous app (calculator, weather, clock, notes, chat) for app-store
listing purposes. They all share the same core `index.html`, but have diverged
branding/content over time, so they can't just be overwritten wholesale.

`gc-calculator` is treated as the canonical core.

## Usage

From `tools/`:

```powershell
.\sync-siblings.ps1           # sync + commit locally (never pushes)
.\sync-siblings.ps1 -DryRun   # preview only, no writes
```

For each sibling in `sync-config.json`, the script diffs `index.html` in
gc-calculator between that sibling's last-synced commit and current `HEAD`, and
tries to apply that diff directly to the sibling's `index.html`. If it applies
cleanly, it commits locally (never pushes - review and `git push` yourself) and
records the new baseline SHA.

## When it can't auto-apply

If a sibling has diverged too much around the changed lines, `git apply` will
fail and the script reports a CONFLICT and skips that repo without touching it.
Fall back to the manual approach: clone/open the sibling, hand a fresh agent the
literal old_string/new_string patch content (see the chat history from
2026-07-02 for the pattern used to mirror the "fixed header + scrollable body /
theme-aware modals" UI fix across all 8 repos) and let it adapt to that repo's
specific wording/branding, then commit.

## secretchat

`secretchat`'s actual app file lives at `www/index.html` (older Cordova layout)
and is missing entire features present elsewhere (weather screen, world-clock
list, notes list, new-chat/recall/contact-picker modals). It's excluded from
auto-sync (`lastSynced: null`). Don't add it back without deciding whether to
first bring it up to feature parity by hand.

## Pushing

This tool intentionally never runs `git push`. After a sync run, check
`git -C <sibling> log --oneline -3` and push each repo yourself once you're
happy with the diff.
