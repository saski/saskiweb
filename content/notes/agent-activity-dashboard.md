<p class="note-soundtrack">
  <a href="https://open.spotify.com/track/2N60J6h8CYShg6WWbJ4cMV?utm_source=openai&amp;utm_medium=chatgpt&amp;go=1&amp;nap_web=1&amp;request_id=4c88d49a-52fc-40d0-a7ee-780cc3bf8e0e">
    <img src="https://i.scdn.co/image/ab67616d00004851807575617e99948e4fa4dd04" width="32" height="32" alt="Systemisch album cover" decoding="async">
    <span><span class="soundtrack-label">Soundtrack · Spotify</span><span class="soundtrack-track">Mediation · Oval</span><span class="soundtrack-album">Systemisch</span></span>
  </a>
</p>

I’ve updated the dashboard in [Agent Systems Lab](https://github.com/saski/agent-systems-lab). I wanted to make it easier to follow what each agent has done, where tasks are waiting and how long they have been there.

The agents shown here work on tasks with a limited set of tools. The dashboard shows which tools each role can use and how to intervene through the operator’s terminal. It also lets me compare the recorded history with a saved checkpoint.

## Two different kinds of waiting

The dashboard shows two queues separately. One is work waiting for human review: a task needs someone to make a decision. The other is records waiting to be sent: an observation still needs to reach its receiver. Keeping them separate helps me see what needs attention.

<figure>
  <a href="https://www.saski.com/notes/assets/agent-dashboard-work-2026-10-15.svg"><img src="https://www.saski.com/notes/assets/agent-dashboard-work-2026-10-15.svg" width="1585" height="665" alt="Annotated dashboard separating task states and waiting times from records awaiting delivery" decoding="async"></a>
  <figcaption>Task counts, waiting time and observation delivery are separate signals. Open the image for the full-size view.</figcaption>
</figure>

## A reference point for history

A saved checkpoint gives me a reference for checking the history. It contains an event count and a digital fingerprint of the history up to that point. I can compare that reference with the recorded history later, even after more events have been added.

That check tells me whether the earlier history still matches. It doesn’t encrypt the records or prevent a database administrator from rewriting them. To detect changes against a checkpoint I trust, I need to keep that copy separately.

<figure>
  <a href="https://www.saski.com/notes/assets/agent-dashboard-checkpoint-2026-10-15.svg"><img src="https://www.saski.com/notes/assets/agent-dashboard-checkpoint-2026-10-15.svg" width="1240" height="550" alt="A saved checkpoint through event 34 matching a history that now contains 35 events, with an explanation of its limits" decoding="async"></a>
  <figcaption>Later events are allowed; the saved reference point must still match. Open the image for the full-size view.</figcaption>
</figure>

The [illustrated dashboard guide](https://github.com/saski/agent-systems-lab/blob/main/docs/dashboard.md) goes through each view with annotated screenshots and examples. It’s written for developers who already use AI assistants and are getting started with agent systems.

This is still an experimental playground. The examples use scripted model responses and test records to show how the workflow and controls behave. They don’t establish the quality of real models or tell us whether workers are healthy.
