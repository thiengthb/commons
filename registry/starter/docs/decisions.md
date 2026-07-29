# Knowledge log — &lt;app&gt;

> Architecture decisions and the _why_, recorded so the next session does not re-derive them.
> Append-only, **newest on top**. Record only the non-obvious: a decision a reasonable person would
> make differently, a trap that cost real time, a tradeoff that was actually weighed.
>
> Not a changelog. "Added a settings page" belongs in git; "settings are a single row because a
> per-key table made every read a join and nothing ever needed the flexibility" belongs here.
>
> Standard: `platform/standards/documentation.md`. Written as you go, or by `/session-wrap` at the end
> of a pass.

---

## &lt;YYYY-MM-DD&gt; — &lt;the decision, as a claim&gt;

**Context:** &lt;what forced a choice&gt;
**Decision:** &lt;what was chosen&gt;
**Why:** &lt;the reasoning, including what was rejected and what it would have cost&gt;
**Watch out:** &lt;the trap this creates for the next person&gt;

---

_(Add new decisions above this line, newest on top.)_
