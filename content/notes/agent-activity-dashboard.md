I’ve updated [Agent Systems Lab](https://github.com/saski/agent-systems-lab) to make agent activity clearer and easier to follow.

Think of an agent as a worker with a task and a limited set of tools. The dashboard helps you see:

- What each agent has done and which tools its role can use.
- Where tasks are waiting, and for how long.
- How to intervene through the operator’s terminal.
- Whether recorded history still matches a saved checkpoint.

## Two different kinds of waiting

The dashboard makes two different queues visible: **work waiting for human review** and **records waiting to be sent**. Each needs a different kind of attention. A task waiting for a decision is not the same problem as an observation waiting to reach its receiver.

<figure>
  <a href="https://www.saski.com/notes/assets/agent-dashboard-work-2026-10-15.svg"><img src="https://www.saski.com/notes/assets/agent-dashboard-work-2026-10-15.svg" width="1585" height="665" alt="Annotated dashboard separating task states and waiting times from records awaiting delivery" decoding="async"></a>
  <figcaption>Task counts, waiting time and observation delivery are separate signals. Open the image for the full-size view.</figcaption>
</figure>

## A reference point for history

A saved history checkpoint contains an event count and a digital fingerprint. Comparing it checks whether the recorded history still matches that reference point, even after later events have been added.

That does not encrypt the records or stop a database administrator rewriting them. Keep a trusted checkpoint separately if you want to detect changes against that copy.

<figure>
  <a href="https://www.saski.com/notes/assets/agent-dashboard-checkpoint-2026-10-15.svg"><img src="https://www.saski.com/notes/assets/agent-dashboard-checkpoint-2026-10-15.svg" width="1240" height="550" alt="A saved checkpoint through event 34 matching a history that now contains 35 events, with an explanation of its limits" decoding="async"></a>
  <figcaption>Later events are allowed; the saved reference point must still match. Open the image for the full-size view.</figcaption>
</figure>

The [illustrated dashboard guide](https://github.com/saski/agent-systems-lab/blob/main/docs/dashboard.md) walks through each view with annotated screenshots and examples, for developers who use AI assistants but are new to agent systems.

This remains an experimental playground. The examples use scripted model responses and test records to explain the workflow and controls, not to establish real-model quality or worker health.
