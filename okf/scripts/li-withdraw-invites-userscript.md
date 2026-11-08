---
type: Script
title: LinkedIn Withdraw Invites
description: Withdraws pending invitations in bulk with a dry run, confirm and per-invite log.
repo: https://github.com/chirag127/li-withdraw-invites-userscript
install: https://github.com/chirag127/li-withdraw-invites-userscript/raw/main/li-withdraw-invites-userscript.user.js
version: "1.0.0"
tags: [userscript, li]
timestamp: 2026-11-09T00:00:00Z
---

# LinkedIn Withdraw Invites

Withdraws pending invitations in bulk with a dry run, confirm and per-invite log.

## Method

Row scan for Withdraw buttons, click, accept the modal, verify the row left the DOM.

## Limits

- Driven through the UI because no stable endpoint exists
- One page at a time
- LinkedIn may rate-limit after a few hundred
