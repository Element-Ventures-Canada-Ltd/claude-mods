Handling: Unclassified — working

# Claude mods

Three small add-ons for the Claude Code chat window. They change only how
Claude's own interface behaves; they hold no project data and make no
network calls.

| Mod | What it does |
| :-- | :-- |
| `effort-picker` | Picks low effort for quick replies and high for security, design or debugging work, and says why. `/effort-auto` turns it off. |
| `usage-meter` | Shows `Chat 13% full (126K of 1.0M) · warm/cold`; offers a handoff note from 60% full (`/handoff`). |
| `cold-chat-warning` | Holds a message sent to a large chat that has sat idle about an hour: Send anyway, Start fresh, or Cancel. Sending the same message twice also sends it. |

"Warm" and "cold" are estimates of the prompt cache (about an hour; shorter
on usage overage). Buttons draw in the desktop app and the terminal; the
phone app and VS Code show status text only.

## Install

At the prompt of a terminal session (answer `y` to add the marketplace):

```
/plugin install effort-picker --marketplace Element-Ventures-Canada-Ltd/claude-mods
/plugin install usage-meter --marketplace Element-Ventures-Canada-Ltd/claude-mods
/plugin install cold-chat-warning --marketplace Element-Ventures-Canada-Ltd/claude-mods
```

From a shell:

```bash
claude plugin install effort-picker --marketplace Element-Ventures-Canada-Ltd/claude-mods
```

In the desktop app: click + next to the prompt box, then Plugins, Add
marketplace with `Element-Ventures-Canada-Ltd/claude-mods`, then Add plugin.

To turn one off: `/plugin`, pick it, Disable.

## Check

```bash
claude plugin validate <mod>
claude plugin test <mod>
```

## Licence

Apache-2.0. Maintained by Element Ventures (Canada) Ltd.
